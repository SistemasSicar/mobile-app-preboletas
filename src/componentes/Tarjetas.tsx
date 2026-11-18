/**
 * Tarjetas de Inicio: la de cada preboleta (avatar con iniciales, folio en mono, nombre en negritas,
 * chip de estado y franja de color a la izquierda, como en el mockup) y la de cada báscula
 * (LIBRE en verde; OCUPADO con franja amarilla arriba, como en el panel).
 */
import { View } from "react-native";

import type { Bascula, PreboletaResumen } from "@/api/tipos";
import { entero, fechaNegocio, hora, kg } from "@/formato";
import { colorEstado } from "@/tema/colores";
import { useTema } from "@/tema/tema";
import { espacio, radio, tamano } from "@/tema/tipografia";
import { Icono } from "./Iconos";
import { Avatar, ChipEstado, Tarjeta, Texto } from "./ui";

export function IconoFruta({ tam = 40 }: { tam?: number }) {
  const { c } = useTema();
  return (
    <View
      style={{
        width: tam,
        height: tam,
        borderRadius: radio.chico + 2,
        backgroundColor: c.acentoSuave,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icono nombre="fruta" color={c.acento} tamano={tam * 0.55} />
    </View>
  );
}

export function TarjetaPreboleta({ p, onPress }: { p: PreboletaResumen; onPress: () => void }) {
  const { c } = useTema();
  const cantidad =
    p.tipo_negociacion === "kilos" && p.kg_negociados !== null ? `${kg(p.kg_negociados)} · ` : "";
  return (
    <Tarjeta franja={colorEstado(c, p.estado)} onPress={onPress} etiqueta={`Preboleta ${p.folio}, ${p.proveedor_nombre}`}>
      <View style={{ flexDirection: "row", gap: espacio.m, alignItems: "flex-start" }}>
        <Avatar nombre={p.proveedor_nombre} />
        <View style={{ flex: 1, gap: 2 }}>
          <Texto peso="mono" t={tamano.chico} color={c.apagado}>
            {p.folio}
          </Texto>
          <Texto peso="negrita" t={tamano.grande} lineas={2}>
            {p.proveedor_nombre}
          </Texto>
          <Texto t={tamano.chico} color={c.apagado} lineas={1}>
            {p.unidad} · {p.comprador}
          </Texto>
        </View>
        <ChipEstado estado={p.estado} />
      </View>

      <View style={{ height: 1, backgroundColor: c.linea, marginVertical: espacio.m }} />

      <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.m }}>
        <IconoFruta />
        <View style={{ flex: 1 }}>
          <Texto peso="seminegrita">{p.producto_nombre}</Texto>
          <Texto t={tamano.chico} color={p.atrasada ? c.aviso : c.apagado} peso={p.atrasada ? "negrita" : "normal"}>
            {p.atrasada ? "Atrasada · " : ""}
            {fechaNegocio(p.fecha_llegada)}
          </Texto>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Texto peso="extra" t={tamano.grande} tabular>
            {entero(p.cajas_acumuladas)} / {entero(p.cajas_negociadas)}
          </Texto>
          <Texto t={tamano.mini} color={c.apagado} tabular>
            {cantidad}cajas
          </Texto>
        </View>
      </View>

      {p.incidencias_pendientes > 0 ? (
        <View style={{ marginTop: espacio.m, flexDirection: "row", alignItems: "center", gap: espacio.s }}>
          <Icono nombre="alerta" color={c.estIncidencia} tamano={18} />
          <Texto t={tamano.chico} peso="seminegrita" color={c.estIncidencia}>
            {p.incidencias_pendientes === 1 ? "1 incidencia pendiente" : `${p.incidencias_pendientes} incidencias pendientes`}
          </Texto>
        </View>
      ) : null}
    </Tarjeta>
  );
}

export function TarjetaBascula({
  b,
  seleccionada,
  onPress,
}: {
  b: Bascula;
  seleccionada: boolean;
  onPress: () => void;
}) {
  const { c } = useTema();
  const ocupada = b.estatus === "OCUPADO";
  return (
    <Tarjeta
      onPress={onPress}
      etiqueta={`Báscula de ${b.unidad}: ${ocupada ? "ocupada" : "libre"}. Toca para filtrar la lista.`}
      estilo={{
        width: 230,
        padding: 0,
        borderWidth: seleccionada ? 2 : 1,
        borderColor: seleccionada ? c.acento : c.linea,
      }}
    >
      <View style={{ height: 6, backgroundColor: ocupada ? c.estBascula : b.opera ? c.acento : c.linea }} />
      <View style={{ padding: espacio.m, gap: 4 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Texto peso="negrita" lineas={1} estilo={{ flex: 1 }}>
            {b.unidad}
          </Texto>
          <Texto peso="extra" t={tamano.chico} color={ocupada ? c.texto : b.opera ? c.acento : c.apagado}>
            {!b.opera ? "SIN OPERAR" : ocupada ? "OCUPADO" : "LIBRE"}
          </Texto>
        </View>
        {ocupada && b.detalle_visible ? (
          <>
            <Texto peso="mono" t={tamano.chico} color={c.apagado}>
              {b.folio} · desde {hora(b.ocupado_at)}
            </Texto>
            <Texto t={tamano.chico} lineas={1}>
              {b.proveedor_nombre}
            </Texto>
            <Texto t={tamano.chico} color={c.apagado} tabular>
              {entero(b.cajas_declaradas)} cajas declaradas
            </Texto>
          </>
        ) : ocupada ? (
          <Texto t={tamano.chico} color={c.apagado}>
            Hay un camión en báscula desde {hora(b.ocupado_at)}.
          </Texto>
        ) : (
          <Texto t={tamano.chico} color={c.apagado}>
            {b.opera ? "Lista para el siguiente camión." : "La unidad aún no tiene fecha de implementación."}
          </Texto>
        )}
      </View>
    </Tarjeta>
  );
}
