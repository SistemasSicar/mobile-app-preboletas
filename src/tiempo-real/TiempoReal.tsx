/**
 * Tiempo real por WebSocket (`/ws` de la API de Preboletas).
 *
 * Protocolo real de la API:
 *   1. `POST /ws/ticket` (con el Bearer normal) → `{ticket}`: sirve una vez y vence en 60 s.
 *   2. Abrir `EXPO_PUBLIC_WS_URL` y mandar `{"ticket": "..."}` como PRIMER mensaje (nunca en la URL).
 *   3. La API responde `{"evento":"conectado"}` → "En línea". Ya no hay que volver a autenticar.
 *   4. Cada evento trae ids, no datos: aquí solo se INVALIDA la consulta y la app vuelve a pedir por REST.
 *
 * En segundo plano el socket se cierra; al volver se reconecta y se recarga lo que está en pantalla
 * (los eventos perdidos no se reenvían). Reconexión con espera creciente y un ticket nuevo por intento.
 */
import { useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";

import { api } from "@/api/cliente";
import { claves } from "@/api/consultas";
import type { TicketWs } from "@/api/tipos";
import { configuracion } from "@/config";
import { useSesion } from "@/sesion/Sesion";

export type EstadoConexion = "conectando" | "en_linea" | "sin_conexion";

const ESPERAS_S = [1, 2, 5, 10, 30];
const PING_MS = 25_000;
/** Agrupa ráfagas de eventos (una entrada de báscula dispara varios) en una sola recarga. */
const AGRUPAR_MS = 400;

interface Evento {
  evento?: string;
  preboleta_id?: number;
}

const ContextoConexion = createContext<EstadoConexion>("conectando");

export function ProveedorTiempoReal({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { recargarYo } = useSesion();
  const [estado, setEstado] = useState<EstadoConexion>("conectando");

  // Referencias para que los callbacks del socket vean siempre lo último sin reabrirlo.
  const recargarYoRef = useRef(recargarYo);
  useEffect(() => {
    recargarYoRef.current = recargarYo;
  }, [recargarYo]);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let intento = 0;
    let activo = true; // false = cerrado a propósito (segundo plano o salida de la pantalla)
    let temporizadorReconexion: ReturnType<typeof setTimeout> | null = null;
    let temporizadorPing: ReturnType<typeof setInterval> | null = null;
    let temporizadorGrupo: ReturnType<typeof setTimeout> | null = null;
    let pendientes: Evento[] = [];

    const procesarPendientes = () => {
      const eventos = pendientes;
      pendientes = [];
      temporizadorGrupo = null;
      let tocaOperacion = false;
      let tocaPendientes = false;
      let todasLasPreboletas = false;
      const ids = new Set<number>();
      for (const e of eventos) {
        const nombre = e.evento ?? "";
        if (nombre === "notificacion.nueva") {
          void qc.invalidateQueries({ queryKey: claves.avisos });
        } else if (nombre === "colaborador.actualizado") {
          recargarYoRef.current();
        } else {
          // slot.*, preboleta.*, boleta.*, incidencia.*, propuesta.*, precio_diario.*, unidad.*
          tocaOperacion = true;
          if (typeof e.preboleta_id === "number") ids.add(e.preboleta_id);
          else if (nombre.startsWith("incidencia.") || nombre.startsWith("propuesta.")) todasLasPreboletas = true;
          // Incidencias, propuestas y conciliaciones cambian con estos (un precio del día puede resolver propuestas).
          if (/^(incidencia|propuesta|boleta|precio_diario)\./.test(nombre)) tocaPendientes = true;
        }
      }
      if (tocaPendientes) {
        void qc.invalidateQueries({ queryKey: claves.resumen });
        void qc.invalidateQueries({ queryKey: claves.incidencias });
        void qc.invalidateQueries({ queryKey: claves.propuestas });
        void qc.invalidateQueries({ queryKey: claves.conciliaciones });
      }
      // Precio del día y unidades (fecha de implementación): pantallas de precios y catálogo de unidades.
      if (eventos.some((e) => /^(precio_diario|unidad)\./.test(e.evento ?? ""))) {
        void qc.invalidateQueries({ queryKey: claves.precios });
        void qc.invalidateQueries({ queryKey: ["precio-dia"] });
        void qc.invalidateQueries({ queryKey: claves.unidades });
        void qc.invalidateQueries({ queryKey: claves.basculas });
      }
      if (!tocaOperacion) return;
      // Todo cambio de operación deja movimientos: el historial abierto se recarga solo.
      void qc.invalidateQueries({ queryKey: claves.movimientos });
      void qc.invalidateQueries({ queryKey: claves.basculas });
      void qc.invalidateQueries({ queryKey: claves.preboletas });
      if (todasLasPreboletas) void qc.invalidateQueries({ queryKey: claves.todasLasPreboletas });
      else ids.forEach((id) => void qc.invalidateQueries({ queryKey: claves.preboleta(id) }));
    };

    const limpiarTemporizadores = () => {
      if (temporizadorReconexion) clearTimeout(temporizadorReconexion);
      if (temporizadorPing) clearInterval(temporizadorPing);
      temporizadorReconexion = null;
      temporizadorPing = null;
    };

    const programarReconexion = () => {
      if (!activo || temporizadorReconexion) return;
      setEstado("sin_conexion");
      const espera = ESPERAS_S[Math.min(intento, ESPERAS_S.length - 1)]!;
      intento += 1;
      temporizadorReconexion = setTimeout(() => {
        temporizadorReconexion = null;
        void conectar();
      }, espera * 1000);
    };

    const conectar = async () => {
      if (!activo) return;
      setEstado((e) => (e === "en_linea" ? e : "conectando"));
      let ticket: string;
      try {
        ({ ticket } = await api.post<TicketWs>("/ws/ticket"));
      } catch {
        // Sin red o API caída. Si la sesión terminó, la sesión ya llevó a la persona al inicio.
        programarReconexion();
        return;
      }
      if (!activo) return;

      const ws = new WebSocket(configuracion.wsUrl);
      socket = ws;
      ws.onopen = () => ws.send(JSON.stringify({ ticket }));
      ws.onmessage = (m) => {
        if (m.data === "pong" || typeof m.data !== "string") return;
        let evento: Evento;
        try {
          evento = JSON.parse(m.data) as Evento;
        } catch {
          return;
        }
        if (evento.evento === "conectado") {
          const veniaDeFuera = intento > 0;
          intento = 0;
          setEstado("en_linea");
          if (temporizadorPing) clearInterval(temporizadorPing);
          temporizadorPing = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) ws.send("ping");
          }, PING_MS);
          // Lo que pasó mientras no había socket no se reenvía: se recarga lo que está en pantalla.
          if (veniaDeFuera) void qc.invalidateQueries();
          return;
        }
        pendientes.push(evento);
        if (!temporizadorGrupo) temporizadorGrupo = setTimeout(procesarPendientes, AGRUPAR_MS);
      };
      // 4401 = ticket inválido o vencido: se reintenta con otro ticket como cualquier otro cierre.
      ws.onclose = () => {
        if (socket !== ws) return;
        socket = null;
        if (temporizadorPing) clearInterval(temporizadorPing);
        temporizadorPing = null;
        programarReconexion();
      };
      ws.onerror = () => undefined; // onclose llega después y reconecta.
    };

    const cerrar = () => {
      activo = false;
      limpiarTemporizadores();
      const s = socket;
      socket = null;
      s?.close();
    };

    const alCambiarEstadoApp = (estadoApp: string) => {
      if (estadoApp === "active") {
        if (!activo) {
          activo = true;
          intento = 1; // Marca de "venía de fuera": al conectar se recarga la pantalla.
          void conectar();
        }
      } else if (estadoApp === "background") {
        cerrar();
        setEstado("sin_conexion");
      }
    };

    void conectar();
    const suscripcion = AppState.addEventListener("change", alCambiarEstadoApp);
    return () => {
      suscripcion.remove();
      cerrar();
      if (temporizadorGrupo) clearTimeout(temporizadorGrupo);
    };
  }, [qc]);

  return <ContextoConexion.Provider value={estado}>{children}</ContextoConexion.Provider>;
}

/** Estado del WebSocket para el indicador "En línea". */
export function useConexion(): EstadoConexion {
  return useContext(ContextoConexion);
}
