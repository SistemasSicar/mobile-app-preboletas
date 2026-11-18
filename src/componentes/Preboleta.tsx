/**
 * Piezas del detalle de una preboleta que también usa la pantalla de entrada a báscula:
 * avance de cajas (negociadas, acumuladas, mínimo y máximo), proveedor y fruta.
 */
import { View } from "react-native";

import type { PreboletaCompleta } from "@/api/tipos";
import { entero, fechaNegocio } from "@/formato";
import { useTema } from "@/tema/tema";
import { espacio, radio, tamano } from "@/tema/tipografia";
import { IconoFruta } from "./Tarjetas";
import { Avatar, Tarjeta, Texto } from "./ui";

function Cifra({ etiqueta, valor, resaltar = false }: { etiqueta: string; valor: number; resaltar?: boolean }) {
  const { c } = useTema();
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Texto t={tamano.mini} peso="negrita" color={c.apagado} estilo={{ letterSpacing: 0.6 }}>
        {etiqueta.toUpperCase()}
      </Texto>
      <Texto peso="extra" t={tamano.titulo} tabular color={resaltar ? c.acento : c.texto}>
        {entero(valor)}
      </Texto>
    </View>
  );
}

/** Avance de cajas con barra: la zona entre mínimo y máximo es la tolerancia. */
export function AvanceCajas({ p }: { p: PreboletaCompleta }) {
  const { c } = useTema();
  const tope = Math.max(p.cajas_maximas, p.cajas_acumuladas, 1);
  const pct = (n: number) => `${Math.min(100, (n / tope) * 100)}%` as const;
  const fuera = p.cajas_acumuladas > p.cajas_maximas;
  return (
    <Tarjeta>
      <View style={{ flexDirection: "row", gap: espacio.s }}>
        <Cifra etiqueta="Negociadas" valor={p.cajas_negociadas} />
        <Cifra etiqueta="Acumuladas" valor={p.cajas_acumuladas} resaltar />
        <Cifra etiqueta="Mínimo" valor={p.cajas_minimas} />
        <Cifra etiqueta="Máximo" valor={p.cajas_maximas} />
      </View>
      <View style={{ marginTop: espacio.m, height: 10, borderRadius: radio.pildora, backgroundColor: c.superficie2, overflow: "hidden" }}>
        {/* Zona de tolerancia */}
        <View
          style={{
            position: "absolute",
            left: pct(p.cajas_minimas),
            width: `${Math.max(0, ((p.cajas_maximas - p.cajas_minimas) / tope) * 100)}%`,
            top: 0,
            bottom: 0,
            backgroundColor: c.acentoSuave,
          }}
        />
        <View style={{ width: pct(p.cajas_acumuladas), height: "100%", backgroundColor: fuera ? c.estIncidencia : c.acento }} />
      </View>
      <Texto t={tamano.chico} color={c.apagado} estilo={{ marginTop: espacio.s }} tabular>
        {p.cargas === 1 ? "1 carga" : `${p.cargas} cargas`} · tolerancia {entero(p.tolerancia_pct)}%
        {p.multiples_cargas ? " · múltiples cargas" : ""}
      </Texto>
    </Tarjeta>
  );
}

export function TarjetaProveedor({ p }: { p: PreboletaCompleta }) {
  const { c } = useTema();
  return (
    <Tarjeta>
      <View style={{ flexDirection: "row", gap: espacio.m, alignItems: "center" }}>
        <Avatar nombre={p.proveedor_nombre} />
        <View style={{ flex: 1 }}>
          <Texto peso="negrita" t={tamano.grande}>
            {p.proveedor_nombre}
          </Texto>
          <Texto peso="mono" t={tamano.chico} color={c.apagado}>
            {p.proveedor_cuenta}
          </Texto>
        </View>
      </View>
    </Tarjeta>
  );
}

export function TarjetaFruta({ p }: { p: PreboletaCompleta }) {
  const { c } = useTema();
  return (
    <Tarjeta>
      <View style={{ flexDirection: "row", gap: espacio.m, alignItems: "center" }}>
        <IconoFruta tam={48} />
        <View style={{ flex: 1 }}>
          <Texto peso="negrita" t={tamano.grande}>
            {p.producto_nombre}
          </Texto>
          <Texto t={tamano.chico} color={p.atrasada ? c.aviso : c.apagado}>
            {p.unidad} · llegada {fechaNegocio(p.fecha_llegada).toLowerCase()}
            {p.atrasada ? " (atrasada)" : ""}
          </Texto>
        </View>
      </View>
    </Tarjeta>
  );
}
