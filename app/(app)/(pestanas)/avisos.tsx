/**
 * Avisos (la campana): `GET /notificaciones`. Tocar un aviso lo marca como leído y abre su preboleta;
 * "Marcar todos" usa `POST /notificaciones/leidas` sin ids. Incidencias y propuestas tienen pantalla
 * propia hasta la Fase 2: por ahora se abre la preboleta relacionada.
 */
import { useRouter, type Href } from "expo-router";
import { FlatList, Pressable, RefreshControl, View } from "react-native";

import { useAvisos, useMarcarLeidos } from "@/api/consultas";
import type { Aviso } from "@/api/tipos";
import { Encabezado } from "@/componentes/Encabezado";
import { Cargando, Mensaje, MensajeError, Texto, Vacio } from "@/componentes/ui";
import { TIPO_INCIDENCIA, cuando } from "@/formato";
import { rutaDeAviso } from "@/push/push";
import { useTema } from "@/tema/tema";
import { TACTIL_MIN, espacio, radio, tamano } from "@/tema/tipografia";

function FilaAviso({ a, onPress }: { a: Aviso; onPress: () => void }) {
  const { c } = useTema();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${a.leida ? "" : "Sin leer. "}${a.mensaje}`}
      android_ripple={{ color: c.linea }}
      style={{
        flexDirection: "row",
        gap: espacio.m,
        padding: espacio.l,
        borderRadius: radio.tarjeta,
        borderWidth: 1,
        borderColor: a.leida ? c.linea : c.acento,
        backgroundColor: a.leida ? c.superficie : c.acentoSuave,
        minHeight: TACTIL_MIN,
      }}
    >
      <View style={{ width: 10, paddingTop: 6 }}>
        {!a.leida ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.acento }} /> : null}
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Texto peso={a.leida ? "normal" : "seminegrita"}>{a.mensaje}</Texto>
        <Texto t={tamano.chico} color={c.apagado}>
          {cuando(a.creado_at)}
          {a.folio ? ` · ${a.folio}` : ""}
          {a.incidencia_tipo ? ` · ${TIPO_INCIDENCIA[a.incidencia_tipo] ?? a.incidencia_tipo}` : ""}
        </Texto>
      </View>
    </Pressable>
  );
}

export default function Avisos() {
  const { c } = useTema();
  const router = useRouter();
  const avisos = useAvisos();
  const marcar = useMarcarLeidos();
  const sinLeer = (avisos.data ?? []).filter((a) => !a.leida).length;

  const abrir = (a: Aviso) => {
    if (!a.leida) marcar.mutate([a.id]);
    // Misma regla que al tocar un push: conciliación, detalle de la preboleta o propuestas.
    const ruta = rutaDeAviso(a);
    if (ruta !== "/avisos") router.push(ruta as Href);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.fondo }}>
      <Encabezado etiqueta={sinLeer > 0 ? `${sinLeer} sin leer` : "Todo leído"} titulo="Avisos" />
      <FlatList
        data={avisos.data ?? []}
        keyExtractor={(a) => String(a.id)}
        contentContainerStyle={{ padding: espacio.l, gap: espacio.m }}
        ListHeaderComponent={
          <View style={{ gap: espacio.m }}>
            {avisos.error ? <MensajeError error={avisos.error} onReintentar={() => void avisos.refetch()} /> : null}
            {marcar.error ? <MensajeError error={marcar.error} /> : null}
            {sinLeer > 0 ? (
              <Pressable
                onPress={() => marcar.mutate(undefined)}
                disabled={marcar.isPending}
                accessibilityRole="button"
                style={{ alignSelf: "flex-end", minHeight: TACTIL_MIN, justifyContent: "center", paddingHorizontal: espacio.s }}
              >
                <Texto peso="negrita" color={c.acento}>
                  {marcar.isPending ? "Marcando…" : "Marcar todos como leídos"}
                </Texto>
              </Pressable>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          avisos.isPending ? (
            <Cargando texto="Cargando avisos…" />
          ) : avisos.error ? undefined : (
            <Vacio texto="No tienes avisos." />
          )
        }
        ListFooterComponent={
          (avisos.data?.length ?? 0) > 0 ? (
            <Mensaje tipo="info" texto="Las incidencias y propuestas se resuelven por ahora en el panel; aquí abres su preboleta." />
          ) : undefined
        }
        renderItem={({ item }) => <FilaAviso a={item} onPress={() => abrir(item)} />}
        refreshControl={<RefreshControl refreshing={avisos.isRefetching} onRefresh={() => void avisos.refetch()} colors={[c.acento]} />}
      />
    </View>
  );
}
