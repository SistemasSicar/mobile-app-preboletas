/**
 * Sesión de la app: quién es la persona (`GET /yo`) y si puede entrar.
 *
 * - Al abrir: lee los tokens de SecureStore y pide `GET /yo`. También tras iniciar sesión y tras cada renovación.
 * - `403 sin_vinculacion` / `rol_insuficiente`: cierra la sesión y avisa "Tu cuenta no tiene acceso…".
 * - Microsoft rechaza la renovación (o la API responde 401 sin remedio): vuelve al inicio de sesión.
 * - Sin conexión al abrir: estado `error` con "Reintentar" (no se entra con datos viejos).
 * - Cerrar sesión: baja del push → borrar tokens → limpiar la caché de React Query → inicio de sesión.
 */
import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { api } from "@/api/cliente";
import { CODIGOS_SIN_ACCESO, ErrorApi, mensajeDeError } from "@/api/errores";
import type { Yo } from "@/api/tipos";
import { darDeBajaDispositivo } from "@/push/push";
import { pedirInicioDeSesion } from "./entra";
import { borrarTokens, cargarTokens, guardarTokens, suscribirFinDeSesion, suscribirRenovacion } from "./tokens";

export type EstadoSesion =
  | { tipo: "cargando" }
  | { tipo: "sin_sesion"; mensaje?: string }
  | { tipo: "error"; mensaje: string }
  | { tipo: "con_sesion"; yo: Yo };

interface ValorSesion {
  estado: EstadoSesion;
  /** Atajo: el perfil si hay sesión. */
  yo: Yo | null;
  /** Abre Microsoft, guarda los tokens y pide GET /yo. Devuelve un mensaje si no se pudo. */
  iniciarSesion: () => Promise<string | null>;
  cerrarSesion: (mensaje?: string) => Promise<void>;
  reintentar: () => void;
  recargarYo: () => void;
  /** Lo llama React Query ante un error de la API: decide si la sesión terminó. */
  revisarError: (e: unknown) => void;
}

const MENSAJE_SIN_ACCESO = "Tu cuenta no tiene acceso a Preboletas. Solicítalo a Sistemas.";
const MENSAJE_EXPIRADA = "Tu sesión expiró. Vuelve a iniciar sesión.";

const ContextoSesion = createContext<ValorSesion | null>(null);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [estado, setEstado] = useState<EstadoSesion>({ tipo: "cargando" });
  const cerrando = useRef(false);

  const cerrarLocal = useCallback(
    async (mensaje?: string) => {
      await borrarTokens().catch(() => undefined);
      qc.clear();
      setEstado({ tipo: "sin_sesion", mensaje });
    },
    [qc],
  );

  /** Pide GET /yo y deja la sesión en el estado que corresponda. */
  const cargarYo = useCallback(
    async (silencioso = false) => {
      try {
        const yo = await api.get<Yo>("/yo");
        setEstado({ tipo: "con_sesion", yo });
      } catch (e) {
        if (e instanceof ErrorApi && e.estado === 403 && CODIGOS_SIN_ACCESO.has(e.codigo)) {
          await cerrarLocal(MENSAJE_SIN_ACCESO);
        } else if (e instanceof ErrorApi && e.estado === 401) {
          await cerrarLocal(MENSAJE_EXPIRADA);
        } else if (!silencioso) {
          // Sin red o API caída: no se entra con datos viejos, se ofrece reintentar.
          setEstado({ tipo: "error", mensaje: mensajeDeError(e) });
        }
      }
    },
    [cerrarLocal],
  );

  /** Lee los tokens guardados y, si hay, pide GET /yo. El estado solo cambia al tener la respuesta. */
  const restaurar = useCallback(async () => {
    const tokens = await cargarTokens();
    if (!tokens) {
      setEstado({ tipo: "sin_sesion" });
      return;
    }
    await cargarYo();
  }, [cargarYo]);

  /** "Reintentar" desde el error: vuelve a "cargando" y repite la restauración. */
  const arrancar = useCallback(async () => {
    setEstado({ tipo: "cargando" });
    await restaurar();
  }, [restaurar]);

  // Al abrir la app el estado ya nace en "cargando": solo falta restaurar. El estado cambia en el callback
  // de la promesa (no durante el efecto) y se ignora si el efecto ya se limpió.
  useEffect(() => {
    let vigente = true;
    void cargarTokens().then((tokens) => {
      if (!vigente) return;
      if (tokens) void cargarYo();
      else setEstado({ tipo: "sin_sesion" });
    });
    return () => {
      vigente = false;
    };
  }, [cargarYo]);

  // Microsoft rechazó la renovación → al inicio de sesión. Tras cada renovación → GET /yo (roles al día).
  useEffect(() => {
    const quitarFin = suscribirFinDeSesion(() => void cerrarLocal(MENSAJE_EXPIRADA));
    const quitarRenovacion = suscribirRenovacion(() => void cargarYo(true));
    return () => {
      quitarFin();
      quitarRenovacion();
    };
  }, [cargarYo, cerrarLocal]);

  const valor = useMemo<ValorSesion>(
    () => ({
      estado,
      yo: estado.tipo === "con_sesion" ? estado.yo : null,
      iniciarSesion: async () => {
        try {
          const r = await pedirInicioDeSesion();
          if (r.tipo === "cancelado") return null;
          if (r.tipo === "error") return r.mensaje;
          await guardarTokens(r.tokens);
          await cargarYo();
          return null;
        } catch (e) {
          return mensajeDeError(e) === "Ocurrió un error inesperado."
            ? "No se pudo iniciar sesión. Revisa tu conexión e inténtalo de nuevo."
            : mensajeDeError(e);
        }
      },
      cerrarSesion: async (mensaje) => {
        if (cerrando.current) return;
        cerrando.current = true;
        try {
          await darDeBajaDispositivo(); // Necesita el token: va ANTES de borrarlo.
          await cerrarLocal(mensaje);
        } finally {
          cerrando.current = false;
        }
      },
      reintentar: () => void arrancar(),
      recargarYo: () => void cargarYo(true),
      revisarError: (e) => {
        if (!(e instanceof ErrorApi)) return;
        if (e.estado === 401) void cerrarLocal(MENSAJE_EXPIRADA);
        else if (e.estado === 403 && CODIGOS_SIN_ACCESO.has(e.codigo)) void cerrarLocal(MENSAJE_SIN_ACCESO);
      },
    }),
    [estado, arrancar, cargarYo, cerrarLocal],
  );

  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>;
}

export function useSesion(): ValorSesion {
  const valor = useContext(ContextoSesion);
  if (!valor) throw new Error("useSesion debe usarse dentro de ProveedorSesion.");
  return valor;
}

/** Perfil de quien tiene sesión. Solo para pantallas dentro de (app), donde la sesión está garantizada. */
export function useYo(): Yo {
  const { yo } = useSesion();
  if (!yo) throw new Error("useYo se usó sin sesión.");
  return yo;
}
