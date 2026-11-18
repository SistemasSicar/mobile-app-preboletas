/**
 * Secciones de solo lectura del detalle: incidencias de la preboleta y bitácora en línea de tiempo
 * (los movimientos reales con su badge y color, no pasos fijos).
 */
import { View } from "react-native";

import type { IncidenciaPreboleta, Movimiento } from "@/api/tipos";
import { ESTADO_INCIDENCIA, TIPO_INCIDENCIA, cuando, entero } from "@/formato";
import { useTema } from "@/tema/tema";
import { espacio, tamano } from "@/tema/tipografia";
import { ChipColor, Tarjeta, Texto } from "../ui";

export function Incidencia({ i }: { i: IncidenciaPreboleta }) {
  const { c } = useTema();
  const pendiente = i.estado === "pendiente";
  return (
    <Tarjeta franja={pendiente ? c.estIncidencia : c.linea} estilo={{ gap: 4 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: espacio.s }}>
        <Texto peso="negrita">{TIPO_INCIDENCIA[i.tipo] ?? i.tipo}</Texto>
        <Texto peso="negrita" t={tamano.chico} color={pendiente ? c.estIncidencia : c.apagado}>
          {(ESTADO_INCIDENCIA[i.estado] ?? i.estado).toUpperCase()}
        </Texto>
      </View>
      <Texto t={tamano.chico} color={c.apagado}>
        {cuando(i.creado_at)}
        {i.boleta_folio ? ` · boleta ${i.boleta_folio}` : ""}
      </Texto>
      {i.cajas_acumuladas !== null && i.cajas_limite !== null ? (
        <Texto t={tamano.chico} tabular>
          {entero(i.cajas_acumuladas)} cajas contra un límite de {entero(i.cajas_limite)}
          {i.cajas_diferencia !== null ? ` (diferencia ${entero(i.cajas_diferencia)})` : ""}
        </Texto>
      ) : null}
      {i.comentario ? <Texto t={tamano.chico}>{i.comentario}</Texto> : null}
      {i.resuelto_por ? (
        <Texto t={tamano.chico} color={c.apagado}>
          Resolvió {i.resuelto_por} · {cuando(i.resuelto_at)}
        </Texto>
      ) : null}
    </Tarjeta>
  );
}

/** Bitácora en línea de tiempo con círculos marcados (estilo del mockup) y el color de cada tipo. */
export function Bitacora({ movimientos }: { movimientos: Movimiento[] }) {
  const { c } = useTema();
  return (
    <Tarjeta>
      {movimientos.map((m, i) => {
        const ultimo = i === movimientos.length - 1;
        return (
          <View key={m.id} style={{ flexDirection: "row", gap: espacio.m }}>
            <View style={{ alignItems: "center", width: 20 }}>
              <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: m.color, marginTop: 3 }} />
              {!ultimo ? <View style={{ flex: 1, width: 2, backgroundColor: c.linea, marginVertical: 2 }} /> : null}
            </View>
            <View style={{ flex: 1, gap: 4, paddingBottom: ultimo ? 0 : espacio.l }}>
              <ChipColor texto={m.badge || m.tipo_nombre} color={m.color} />
              <Texto t={tamano.chico}>{m.descripcion}</Texto>
              <Texto t={tamano.mini} color={c.apagado}>
                {cuando(m.ocurrido_at)} · {m.quien}
              </Texto>
            </View>
          </View>
        );
      })}
    </Tarjeta>
  );
}
