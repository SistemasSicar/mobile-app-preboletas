/**
 * Historial de envíos (solo Admin): los 200 avisos más nuevos de todas las personas con el resultado de
 * cada canal extra (correo, push): enviado, pendiente o falló con su error (`GET /notificaciones/envios`).
 * Sirve para saber por qué a alguien no le llegó un aviso. Los que solo van a la campana dicen "solo en la app".
 * Se recarga solo con cada aviso nuevo (tiempo real) y al jalar hacia abajo.
 */
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";

import { useEnvios } from "@/api/consultas";
import type { Aviso, Entrega } from "@/api/tipos";
import { Encabezado } from "@/componentes/Encabezado";
import { EnlacePreboleta } from "@/componentes/Pendientes";
import { Cargando, Mensaje, MensajeError, Pildora, Tarjeta, Texto, Vacio, useEspacioAbajo } from "@/componentes/ui";
import { ESTADO_ENTREGA, cuando } from "@/formato";
import { esAdmin } from "@/permisos";
import { useYo } from "@/sesion/Sesion";
import { useTema } from "@/tema/tema";
import { espacio, radio, tamano } from "@/tema/tipografia";

type Filtro = "todos" | "fallidos";

const fallo = (a: Aviso) => a.entregas.some((e) => e.estado === "fallida");

function ChipEntrega({ e }: { e: Entrega }) {
  const { c } = useTema();
  const col =
    e.estado === "enviada"
      ? { fondo: c.acentoSuave, texto: c.acento }
      : e.estado === "fallida"
        ? { fondo: c.peligroSuave, texto: c.peligro }
        : { fondo: c.avisoSuave, texto: c.aviso };
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: radio.pildora, backgroundColor: col.fondo, alignSelf: "flex-start" }}>
      <Texto peso="negrita" t={tamano.mini} color={col.texto}>
        {e.canal} {ESTADO_ENTREGA[e.estado] ?? e.estado}
      </Texto>
    </View>
  );
}

function TarjetaEnvio({ a }: { a: Aviso }) {
  const { c } = useTema();
  const errores = a.entregas.filter((e) => e.error);
  return (
    <Tarjeta franja={fallo(a) ? c.peligro : undefined} estilo={{ gap: 4 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: espacio.s }}>
        <Texto peso="negrita" estilo={{ flexShrink: 1 }}>
          {a.destinatario}
        </Texto>
        <Texto t={tamano.chico} color={c.apagado} tabular>
          {cuando(a.creado_at)}
        </Texto>
      </View>
      <Texto t={tamano.chico}>{a.mensaje}</Texto>
      {a.preboleta_id && a.folio ? <EnlacePreboleta id={a.preboleta_id} folio={a.folio} visible /> : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: espacio.xs, marginTop: 2 }}>
        {a.entregas.length ? (
          a.entregas.map((e) => <ChipEntrega key={e.canal} e={e} />)
        ) : (
          <Texto t={tamano.chico} color={c.apagado}>
            Solo en la app
          </Texto>
        )}
      </View>
      {errores.map((e) => (
        <Texto key={e.canal} t={tamano.chico} color={c.peligro} peso="mono">
          {e.canal}: {e.error}
        </Texto>
      ))}
    </Tarjeta>
  );
}

export default function Envios() {
  const { c } = useTema();
  const yo = useYo();
  const router = useRouter();
  const espacioAbajo = useEspacioAbajo();
  const envios = useEnvios();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const todos = envios.data ?? [];
  const fallidos = todos.filter(fallo);
  const lista = filtro === "fallidos" ? fallidos : todos;

  return (
    <View style={{ flex: 1, backgroundColor: c.fondo }}>
      <Encabezado onAtras={() => (router.canGoBack() ? router.back() : router.replace("/configuracion"))} etiqueta="Configuración" titulo="Historial de envíos" />
      {!esAdmin(yo) ? (
        <View style={{ padding: espacio.l }}>
          <Mensaje tipo="info" texto="El historial de envíos solo lo ve un Admin." />
        </View>
      ) : (
        <FlatList
          data={lista}
          keyExtractor={(a) => String(a.id)}
          contentContainerStyle={{ padding: espacio.l, gap: espacio.m, paddingBottom: espacioAbajo }}
          refreshControl={<RefreshControl refreshing={envios.isRefetching} onRefresh={() => void envios.refetch()} colors={[c.acento]} />}
          ListHeaderComponent={
            <View style={{ gap: espacio.m }}>
              <Texto t={tamano.chico} color={c.apagado}>
                Los 200 avisos más nuevos de todas las personas. Para recibir push hace falta el canal push y un teléfono registrado.
              </Texto>
              <View style={{ flexDirection: "row", gap: espacio.s }}>
                <Pildora texto="Todos" conteo={todos.length} activa={filtro === "todos"} onPress={() => setFiltro("todos")} />
                <Pildora texto="Con fallas" conteo={fallidos.length} activa={filtro === "fallidos"} onPress={() => setFiltro("fallidos")} />
              </View>
              {envios.error ? <MensajeError error={envios.error} onReintentar={() => void envios.refetch()} /> : null}
            </View>
          }
          ListEmptyComponent={
            envios.isPending ? (
              <Cargando texto="Cargando envíos…" />
            ) : envios.error ? undefined : (
              <Vacio texto={filtro === "fallidos" ? "Ningún envío falló." : "No hay avisos."} />
            )
          }
          renderItem={({ item }) => <TarjetaEnvio a={item} />}
        />
      )}
    </View>
  );
}
