/**
 * Conciliación (`GET /conciliaciones`): boletas de D365 que no se ligaron solas a una preboleta.
 * - Pendientes: tocar una abre su pantalla para vincularla o marcarla como no relacionada.
 * - Resueltas: las últimas 50, con quién resolvió y a qué preboleta quedó ligada.
 * - Quién puede resolver lo dice la API (`puede_resolver`): el basculista de la unidad, un comprador
 *   (salvo cambio de proveedor) o un Admin.
 */
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";

import { useConciliaciones } from "@/api/consultas";
import type { ConciliacionPendiente, ConciliacionResuelta } from "@/api/tipos";
import { Encabezado } from "@/componentes/Encabezado";
import { Icono } from "@/componentes/Iconos";
import { EnlacePreboleta } from "@/componentes/Pendientes";
import { Cargando, MensajeError, Pildora, Tarjeta, Texto, Vacio, useEspacioAbajo } from "@/componentes/ui";
import { ESTADO_INCIDENCIA, MOTIVO_CONCILIACION, TIPO_INCIDENCIA, cuando, kg } from "@/formato";
import { useTema } from "@/tema/tema";
import { espacio, tamano } from "@/tema/tipografia";

function TarjetaPendiente({ b }: { b: ConciliacionPendiente }) {
  const { c } = useTema();
  const router = useRouter();
  return (
    <Tarjeta
      franja={b.puede_resolver ? c.estIncidencia : c.linea}
      onPress={() => router.push(`/conciliacion/${b.incidencia_id}`)}
      etiqueta={`Boleta ${b.folio}`}
      estilo={{ gap: espacio.s }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: espacio.s }}>
        <Texto peso="monoNegrita">{b.folio}</Texto>
        <Texto peso="negrita" t={tamano.chico} color={b.puede_resolver ? c.estIncidencia : c.apagado}>
          {b.puede_resolver ? "POR CONCILIAR" : "SIN PERMISO"}
        </Texto>
      </View>
      <Texto peso="seminegrita">{TIPO_INCIDENCIA[b.tipo] ?? b.tipo}</Texto>
      <Texto t={tamano.chico} color={c.apagado}>
        {MOTIVO_CONCILIACION[b.tipo] ?? ""}
      </Texto>
      <Texto t={tamano.chico}>
        {b.unidad} · {b.proveedor_nombre ?? "Sin proveedor"}
        {b.proveedor_cuenta ? ` (${b.proveedor_cuenta})` : ""}
      </Texto>
      <Texto t={tamano.chico} tabular>
        Bruto {kg(b.peso_bruto)} · neto {b.peso_neto > 0 ? kg(b.peso_neto) : "pendiente"}
      </Texto>
      {b.preboleta_sugerida_folio ? (
        <Texto t={tamano.chico} color={c.apagado}>
          Preboleta sugerida {b.preboleta_sugerida_folio}
          {b.proveedor_esperado ? ` · esperaba ${b.proveedor_esperado}` : ""}
        </Texto>
      ) : null}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Texto t={tamano.chico} color={c.apagado}>
          Desde {cuando(b.creado_at)}
        </Texto>
        <Icono nombre="adelante" color={c.apagado} />
      </View>
    </Tarjeta>
  );
}

function TarjetaResuelta({ b }: { b: ConciliacionResuelta }) {
  const { c } = useTema();
  return (
    <Tarjeta estilo={{ gap: 4 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: espacio.s }}>
        <Texto peso="monoNegrita">{b.folio}</Texto>
        <Texto peso="negrita" t={tamano.chico} color={c.apagado}>
          {(ESTADO_INCIDENCIA[b.estado] ?? b.estado).toUpperCase()}
        </Texto>
      </View>
      <Texto t={tamano.chico}>
        {b.unidad} · {b.proveedor_nombre ?? "Sin proveedor"} · {TIPO_INCIDENCIA[b.tipo] ?? b.tipo}
      </Texto>
      {b.conciliada_preboleta_id && b.conciliada_preboleta_folio ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.s }}>
          <Texto t={tamano.chico} color={c.apagado}>
            Ligada a
          </Texto>
          <EnlacePreboleta id={b.conciliada_preboleta_id} folio={b.conciliada_preboleta_folio} visible />
        </View>
      ) : null}
      <Texto t={tamano.chico} color={c.apagado}>
        {b.resuelto_por ?? "Sistema"} · {cuando(b.resuelto_at)}
        {b.comentario ? `: ${b.comentario}` : ""}
      </Texto>
    </Tarjeta>
  );
}

export default function Conciliacion() {
  const { c } = useTema();
  const espacioAbajo = useEspacioAbajo();
  const router = useRouter();
  const consulta = useConciliaciones();
  const [vista, setVista] = useState<"pendientes" | "resueltas">("pendientes");
  const pendientes = consulta.data?.pendientes ?? [];
  const resueltas = consulta.data?.resueltas ?? [];

  const comun = {
    contentContainerStyle: { padding: espacio.l, gap: espacio.m, paddingBottom: espacioAbajo },
    refreshControl: <RefreshControl refreshing={consulta.isRefetching} onRefresh={() => void consulta.refetch()} colors={[c.acento]} />,
    ListHeaderComponent: (
      <View style={{ gap: espacio.m }}>
        <Texto t={tamano.chico} color={c.apagado}>
          Boletas de D365 que no se ligaron solas. Toca una para vincularla a su preboleta o marcarla como no relacionada.
        </Texto>
        <View style={{ flexDirection: "row", gap: espacio.s }}>
          <Pildora texto="Pendientes" conteo={pendientes.length} activa={vista === "pendientes"} onPress={() => setVista("pendientes")} />
          <Pildora texto="Resueltas" activa={vista === "resueltas"} onPress={() => setVista("resueltas")} />
        </View>
        {consulta.error ? <MensajeError error={consulta.error} onReintentar={() => void consulta.refetch()} /> : null}
      </View>
    ),
  };
  const cargando = consulta.isPending ? <Cargando texto="Cargando conciliaciones…" /> : null;

  return (
    <View style={{ flex: 1, backgroundColor: c.fondo }}>
      <Encabezado onAtras={() => (router.canGoBack() ? router.back() : router.replace("/"))} etiqueta="Pendientes" titulo="Conciliación" />
      {vista === "pendientes" ? (
        <FlatList
          {...comun}
          data={pendientes}
          keyExtractor={(b) => String(b.incidencia_id)}
          renderItem={({ item }) => <TarjetaPendiente b={item} />}
          ListEmptyComponent={cargando ?? (consulta.error ? undefined : <Vacio texto="No hay boletas pendientes de conciliar." />)}
        />
      ) : (
        <FlatList
          {...comun}
          data={resueltas}
          keyExtractor={(b) => String(b.incidencia_id)}
          renderItem={({ item }) => <TarjetaResuelta b={item} />}
          ListEmptyComponent={cargando ?? (consulta.error ? undefined : <Vacio texto="Aún no hay conciliaciones resueltas." />)}
        />
      )}
    </View>
  );
}
