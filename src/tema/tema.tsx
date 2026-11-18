/**
 * Tema claro/oscuro. Sigue al sistema (`useColorScheme`) salvo que la persona elija uno en Perfil.
 * La preferencia se guarda en el teléfono (AsyncStorage): no es un dato sensible.
 * Si el almacenamiento falla, la app sigue con el tema del sistema.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";

import { claro, oscuro, type Colores } from "./colores";

export type PreferenciaTema = "sistema" | "claro" | "oscuro";

interface ValorTema {
  c: Colores;
  esOscuro: boolean;
  preferencia: PreferenciaTema;
  cambiarPreferencia: (p: PreferenciaTema) => void;
}

const LLAVE = "pb_tema";
const ContextoTema = createContext<ValorTema | null>(null);

export function ProveedorTema({ children }: { children: ReactNode }) {
  const sistema = useColorScheme();
  const [preferencia, setPreferencia] = useState<PreferenciaTema>("sistema");

  useEffect(() => {
    AsyncStorage.getItem(LLAVE)
      .then((v) => {
        if (v === "claro" || v === "oscuro") setPreferencia(v);
      })
      .catch(() => undefined);
  }, []);

  const valor = useMemo<ValorTema>(() => {
    const esOscuro = preferencia === "sistema" ? sistema === "dark" : preferencia === "oscuro";
    return {
      c: esOscuro ? oscuro : claro,
      esOscuro,
      preferencia,
      cambiarPreferencia: (p) => {
        setPreferencia(p);
        const guardar = p === "sistema" ? AsyncStorage.removeItem(LLAVE) : AsyncStorage.setItem(LLAVE, p);
        guardar.catch(() => undefined);
      },
    };
  }, [preferencia, sistema]);

  return <ContextoTema.Provider value={valor}>{children}</ContextoTema.Provider>;
}

export function useTema(): ValorTema {
  const valor = useContext(ContextoTema);
  if (!valor) throw new Error("useTema debe usarse dentro de ProveedorTema.");
  return valor;
}
