/**
 * Piezas compartidas de las pantallas de pendientes (incidencias, propuestas y conciliación):
 * - `EnlacePreboleta`: el folio que abre el detalle, solo si la persona puede ver esa preboleta.
 * - `TarjetaPendientes`: "Pendiente para ti" de la pestaña Incidencias con los contadores de `GET /resumen`.
 */
import { useRouter, type Href } from "expo-router";
import { Pressable, View } from "react-native";

import type { Resumen } from "@/api/tipos";
import { useTema } from "@/tema/tema";
import { TACTIL_MIN, espacio, radio, tamano } from "@/tema/tipografia";
import { Icono } from "./Iconos";
import { Tarjeta, Texto } from "./ui";

export function EnlacePreboleta({ id, folio, visible }: { id: number; folio: string; visible: boolean }) {
  const { c } = useTema();
  const router = useRouter();
  if (!visible) {
    return (
      <Texto peso="monoNegrita" t={tamano.chico}>
        {folio}
      </Texto>
    );
  }
  return (
    <Pressable
      onPress={() => router.push(`/preboleta/${id}`)}
      accessibilityRole="link"
      accessibilityLabel={`Ver preboleta ${folio}`}
      hitSlop={8}
      style={{ minHeight: TACTIL_MIN - 8, flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start" }}
    >
      <Texto peso="monoNegrita" t={tamano.chico} color={c.acento}>
        {folio}
      </Texto>
      <Icono nombre="adelante" color={c.acento} tamano={16} />
    </Pressable>
  );
}

/** Total de pendientes que la persona puede resolver (número de la pestaña Incidencias). */
export function totalPendientes(r: Resumen | undefined): number {
  return r ? r.incidencias + r.conciliaciones + r.propuestas : 0;
}

/** Renglones de pendientes con su ruta. `incidencias` ya viene en 0 si no es Admin ni Comprador. */
export function renglonesPendientes(r: Resumen): { texto: string; conteo: number; ruta: Href }[] {
  return [
    { texto: "Incidencias de cantidad", conteo: r.incidencias, ruta: "/incidencias" as Href },
    { texto: "Boletas por conciliar", conteo: r.conciliaciones, ruta: "/conciliacion" as Href },
    { texto: "Propuestas por autorizar", conteo: r.propuestas, ruta: "/propuestas" as Href },
  ];
}

/** "Pendiente para ti" en la pestaña Incidencias: solo los contadores mayores a 0. Sin pendientes no se dibuja. */
export function TarjetaPendientes({ resumen }: { resumen: Resumen | undefined }) {
  const { c } = useTema();
  const router = useRouter();
  if (!resumen || totalPendientes(resumen) === 0) return null;
  const renglones = renglonesPendientes(resumen).filter((r) => r.conteo > 0);
  return (
    <Tarjeta estilo={{ paddingVertical: espacio.xs }}>
      <Texto peso="negrita" t={tamano.mini} color={c.apagado} estilo={{ letterSpacing: 1, paddingTop: espacio.s }}>
        PENDIENTE PARA TI
      </Texto>
      {renglones.map((r, i) => (
        <Pressable
          key={r.texto}
          onPress={() => router.push(r.ruta)}
          accessibilityRole="button"
          accessibilityLabel={`${r.texto}: ${r.conteo}`}
          android_ripple={{ color: c.linea }}
          style={{
            minHeight: TACTIL_MIN,
            flexDirection: "row",
            alignItems: "center",
            gap: espacio.m,
            borderTopWidth: i === 0 ? 0 : 1,
            borderTopColor: c.linea,
          }}
        >
          <View
            style={{
              minWidth: 32,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: radio.pildora,
              backgroundColor: c.peligro,
              alignItems: "center",
            }}
          >
            <Texto peso="negrita" t={tamano.chico} color={c.peligroTexto} tabular>
              {r.conteo}
            </Texto>
          </View>
          <Texto peso="seminegrita" estilo={{ flex: 1 }}>
            {r.texto}
          </Texto>
          <Icono nombre="adelante" color={c.apagado} />
        </Pressable>
      ))}
    </Tarjeta>
  );
}
