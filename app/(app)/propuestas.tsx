/**
 * Propuestas de precio y tipo de pago (`GET /propuestas`), de todas las unidades.
 * - Autoriza quien tiene el permiso de autorizar precios en la unidad, o un Admin; nadie autoriza la suya,
 *   salvo un Admin. Lo decide la API con `puede_resolver`; la app solo muestra u oculta el botón.
 * - Se ve lo propuesto contra el precio del día y lo que tiene hoy, y si pasa el tope del Precio Pactado.
 */
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";

import { usePropuestas, useResolverPropuesta } from "@/api/consultas";
import type { PropuestaLista } from "@/api/tipos";
import { Encabezado } from "@/componentes/Encabezado";
import { Desplegable, FormDecision } from "@/componentes/formularios";
import { EnlacePreboleta } from "@/componentes/Pendientes";
import { Cargando, Mensaje, MensajeError, Pildora, Tarjeta, Texto, Vacio, useEspacioAbajo } from "@/componentes/ui";
import { ESTADO_INCIDENCIA, cuando, precioTxt } from "@/formato";
import { useTema } from "@/tema/tema";
import { espacio, tamano } from "@/tema/tipografia";

/** "$15.00/kg · Pactado" o "—". */
function precioYTipo(precio: number | null, tipo: string | null, clave?: string | null): string {
  return [precio !== null ? precioTxt(precio, clave) : null, tipo].filter(Boolean).join(" · ") || "—";
}

function Linea({ etiqueta, valor, fuerte = false }: { etiqueta: string; valor: string; fuerte?: boolean }) {
  const { c } = useTema();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: espacio.m }}>
      <Texto t={tamano.chico} color={c.apagado}>
        {etiqueta}
      </Texto>
      <Texto t={tamano.chico} peso={fuerte ? "negrita" : "seminegrita"} tabular estilo={{ flexShrink: 1, textAlign: "right" }}>
        {valor}
      </Texto>
    </View>
  );
}

function TarjetaPropuesta({ pr }: { pr: PropuestaLista }) {
  const { c } = useTema();
  const resolver = useResolverPropuesta();
  const pendiente = pr.estado === "pendiente";
  return (
    <Tarjeta franja={pendiente ? c.aviso : c.linea} estilo={{ gap: espacio.s }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: espacio.s }}>
        <Texto peso="negrita" estilo={{ flexShrink: 1 }}>
          {pr.recepcion_id ? `Carga${pr.boleta_folio ? ` · boleta ${pr.boleta_folio}` : ""}` : "Toda la preboleta"}
        </Texto>
        <Texto peso="negrita" t={tamano.chico} color={pendiente ? c.aviso : c.apagado}>
          {(ESTADO_INCIDENCIA[pr.estado] ?? pr.estado).toUpperCase()}
        </Texto>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.s, flexWrap: "wrap" }}>
        <EnlacePreboleta id={pr.preboleta_id} folio={pr.folio} visible={pr.preboleta_visible} />
        <Texto t={tamano.chico} color={c.apagado}>
          · {pr.unidad} · {pr.proveedor_nombre}
        </Texto>
      </View>

      <View style={{ gap: 4 }}>
        <Linea etiqueta="Propuesto" valor={precioYTipo(pr.precio_propuesto_kg, pr.tipo_pago_propuesto)} fuerte />
        <Linea etiqueta="Del día" valor={precioYTipo(pr.precio_dia_kg, pr.tipo_pago_dia, pr.tipo_pago_dia_clave)} />
        <Linea etiqueta="Tiene hoy" valor={precioYTipo(pr.precio_vigente, pr.tipo_vigente)} />
      </View>
      {pr.supera_tope ? (
        <Texto t={tamano.chico} peso="seminegrita" color={c.aviso}>
          Supera el tope del Precio Pactado.
        </Texto>
      ) : null}
      <Texto t={tamano.chico} color={c.apagado}>
        Propuso {pr.propuesto_por} · {cuando(pr.propuesto_at)}
        {pr.motivo ? ` · ${pr.motivo}` : ""}
      </Texto>

      {pr.puede_resolver ? (
        resolver.isSuccess ? (
          <Mensaje tipo="exito" texto={resolver.variables?.decision === "rechazar" ? "Propuesta rechazada." : "Propuesta autorizada."} />
        ) : (
          <Desplegable texto="Resolver" icono="check" titulo="Resolver propuesta">
            {() => (
              <FormDecision
                enviando={resolver.isPending}
                error={resolver.error ? <MensajeError error={resolver.error} /> : null}
                onDecidir={(decision, comentario) => resolver.mutate({ id: pr.id, decision, comentario })}
              />
            )}
          </Desplegable>
        )
      ) : pendiente ? (
        <Texto t={tamano.chico} color={c.apagado}>
          {pr.es_propia ? "Es tuya: la autoriza otra persona." : "Sin permiso para autorizar en esta unidad."}
        </Texto>
      ) : pr.resuelto_por ? (
        <Texto t={tamano.chico} color={c.apagado}>
          {ESTADO_INCIDENCIA[pr.estado] ?? pr.estado} por {pr.resuelto_por}
          {pr.comentario ? `: ${pr.comentario}` : ""}
        </Texto>
      ) : null}
    </Tarjeta>
  );
}

export default function Propuestas() {
  const { c } = useTema();
  const espacioAbajo = useEspacioAbajo();
  const router = useRouter();
  const [soloPendientes, setSoloPendientes] = useState(true);
  const consulta = usePropuestas(soloPendientes);

  return (
    <View style={{ flex: 1, backgroundColor: c.fondo }}>
      <Encabezado onAtras={() => (router.canGoBack() ? router.back() : router.replace("/"))} etiqueta="Pendientes" titulo="Propuestas de precio" />
      <FlatList
        data={consulta.data ?? []}
        keyExtractor={(pr) => String(pr.id)}
        renderItem={({ item }) => <TarjetaPropuesta pr={item} />}
        contentContainerStyle={{ padding: espacio.l, gap: espacio.m, paddingBottom: espacioAbajo }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={consulta.isRefetching} onRefresh={() => void consulta.refetch()} colors={[c.acento]} />}
        ListHeaderComponent={
          <View style={{ gap: espacio.m }}>
            <Texto t={tamano.chico} color={c.apagado}>
              Autoriza quien tiene permiso de autorizar precios en la unidad, o un Admin. Nadie autoriza la suya, salvo un Admin.
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
            <Cargando texto="Cargando propuestas…" />
          ) : consulta.error ? undefined : (
            <Vacio texto={soloPendientes ? "No hay propuestas pendientes." : "Aún no hay propuestas de precio."} />
          )
        }
      />
    </View>
  );
}
