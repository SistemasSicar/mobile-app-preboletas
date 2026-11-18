/**
 * Incidencias de cantidad (`GET /incidencias`), solo Admin o Comprador, de todas las unidades.
 * - Sobre-entrega y faltante pendientes se autorizan o rechazan aquí (`POST /incidencias/{id}/{decision}`).
 * - "Cierre a mano" solo queda registrado: no lleva acciones.
 * - Nunca frenan la báscula: es una decisión administrativa.
 * - El folio abre el detalle solo si la persona puede ver esa preboleta (`preboleta_visible`).
 */
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";

import { useIncidencias, useResolverIncidencia } from "@/api/consultas";
import type { IncidenciaCantidad } from "@/api/tipos";
import { Encabezado } from "@/componentes/Encabezado";
import { Desplegable, FormDecision } from "@/componentes/formularios";
import { EnlacePreboleta } from "@/componentes/Pendientes";
import { Cargando, Mensaje, MensajeError, Pildora, Tarjeta, Texto, Vacio, useEspacioAbajo } from "@/componentes/ui";
import { ESTADO_INCIDENCIA, TIPO_INCIDENCIA, cuando, entero } from "@/formato";
import { puedeVerIncidencias } from "@/permisos";
import { useYo } from "@/sesion/Sesion";
import { useTema } from "@/tema/tema";
import { espacio, tamano } from "@/tema/tipografia";

function TarjetaIncidencia({ i }: { i: IncidenciaCantidad }) {
  const { c } = useTema();
  const resolver = useResolverIncidencia();
  const pendiente = i.estado === "pendiente";
  const conAcciones = pendiente && i.tipo !== "cierre_manual";
  const limite =
    i.cajas_limite !== null ? entero(i.cajas_limite) : `${entero(i.cajas_minimas)}–${entero(i.cajas_maximas)}`;
  return (
    <Tarjeta franja={pendiente ? c.estIncidencia : c.linea} estilo={{ gap: espacio.s }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: espacio.s }}>
        <Texto peso="negrita">{TIPO_INCIDENCIA[i.tipo] ?? i.tipo}</Texto>
        <Texto peso="negrita" t={tamano.chico} color={pendiente ? c.estIncidencia : c.apagado}>
          {(ESTADO_INCIDENCIA[i.estado] ?? i.estado).toUpperCase()}
        </Texto>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.s, flexWrap: "wrap" }}>
        <EnlacePreboleta id={i.preboleta_id} folio={i.folio} visible={i.preboleta_visible} />
        <Texto t={tamano.chico} color={c.apagado}>
          · {i.unidad}
        </Texto>
      </View>
      <Texto t={tamano.chico}>
        {i.proveedor_nombre} · comprador {i.comprador}
      </Texto>
      {i.cajas_acumuladas !== null ? (
        <Texto t={tamano.chico} tabular>
          Acumulado {entero(i.cajas_acumuladas)} cajas · límite {limite}
          {i.cajas_diferencia !== null ? ` (diferencia ${entero(i.cajas_diferencia)})` : ""}
        </Texto>
      ) : null}
      <Texto t={tamano.chico} color={c.apagado}>
        {cuando(i.creado_at)}
        {i.boleta_folio ? ` · boleta ${i.boleta_folio}` : ""}
      </Texto>

      {conAcciones ? (
        resolver.isSuccess ? (
          <Mensaje tipo="exito" texto={resolver.variables?.decision === "rechazar" ? "Incidencia rechazada." : "Incidencia autorizada."} />
        ) : (
          <Desplegable texto="Resolver" icono="check" titulo="Resolver incidencia">
            {() => (
              <FormDecision
                enviando={resolver.isPending}
                error={resolver.error ? <MensajeError error={resolver.error} /> : null}
                onDecidir={(decision, comentario) => resolver.mutate({ id: i.id, decision, comentario })}
              />
            )}
          </Desplegable>
        )
      ) : i.resuelto_at || i.comentario ? (
        <Texto t={tamano.chico} color={c.apagado}>
          {i.resuelto_por ?? "Sistema"}
          {i.comentario ? `: ${i.comentario}` : ""}
        </Texto>
      ) : null}
    </Tarjeta>
  );
}

export default function Incidencias() {
  const { c } = useTema();
  const espacioAbajo = useEspacioAbajo();
  const yo = useYo();
  const router = useRouter();
  const permitido = puedeVerIncidencias(yo);
  const [soloPendientes, setSoloPendientes] = useState(true);
  const consulta = useIncidencias(soloPendientes, permitido);

  return (
    <View style={{ flex: 1, backgroundColor: c.fondo }}>
      <Encabezado onAtras={() => (router.canGoBack() ? router.back() : router.replace("/"))} etiqueta="Pendientes" titulo="Incidencias" />
      {!permitido ? (
        <View style={{ padding: espacio.l }}>
          <Mensaje tipo="info" texto="Las incidencias de cantidad las ven y resuelven los compradores y los Admin." />
        </View>
      ) : (
        <FlatList
          data={consulta.data ?? []}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => <TarjetaIncidencia i={item} />}
          contentContainerStyle={{ padding: espacio.l, gap: espacio.m, paddingBottom: espacioAbajo }}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={consulta.isRefetching} onRefresh={() => void consulta.refetch()} colors={[c.acento]} />}
          ListHeaderComponent={
            <View style={{ gap: espacio.m }}>
              <Texto t={tamano.chico} color={c.apagado}>
                Las autoriza o rechaza cualquier comprador, de cualquier unidad. Nunca frenan la báscula. Los cierres a mano solo quedan registrados.
              </Texto>
              <View style={{ flexDirection: "row", gap: espacio.s }}>
                <Pildora texto="Pendientes" activa={soloPendientes} onPress={() => setSoloPendientes(true)} />
                <Pildora texto="Todas" activa={!soloPendientes} onPress={() => setSoloPendientes(false)} />
              </View>
              {consulta.error ? <MensajeError error={consulta.error} onReintentar={() => void consulta.refetch()} /> : null}
            </View>
          }
          ListEmptyComponent={
            consulta.isPending ? (
              <Cargando texto="Cargando incidencias…" />
            ) : consulta.error ? undefined : (
              <Vacio texto={soloPendientes ? "No hay incidencias pendientes." : "Sin incidencias de cantidad ni cierres a mano."} />
            )
          }
        />
      )}
    </View>
  );
}
