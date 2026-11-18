/**
 * Inicio: resumen en el encabezado, básculas (una tarjeta por unidad; tocar una filtra la lista) y debajo
 * las preboletas de HOY + ATRASADAS (`GET /preboletas` sin filtros). Píldoras por estado con su conteo
 * y búsqueda rápida sobre la lista ya cargada (folio, proveedor, fruta). Jalar hacia abajo recarga.
 * Junto al título, las toneladas que entraron hoy (`kg_recibidos_hoy` de `GET /resumen`, con lo que la persona ve).
 * Botón flotante: Comprador, nueva preboleta; Basculista, escanear QR; Admin, las dos opciones con texto.
 */
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, RefreshControl, ScrollView, TextInput, View } from "react-native";

import { useBasculas, usePreboletasHoy, useResumen } from "@/api/consultas";
import type { PreboletaResumen } from "@/api/tipos";
import { Encabezado } from "@/componentes/Encabezado";
import { Icono } from "@/componentes/Iconos";
import { ALTO_BOTON_FLOTANTE, BotonFlotante, type OpcionFlotante } from "@/componentes/BotonFlotante";
import { TarjetaBascula, TarjetaPreboleta } from "@/componentes/Tarjetas";
import { Cargando, MensajeError, Pildora, Texto, Vacio } from "@/componentes/ui";
import { hoyMexico, toneladas } from "@/formato";
import { alcancePreboletas, puedeCrearPreboleta, puedeLeerQr } from "@/permisos";
import { useYo } from "@/sesion/Sesion";
import { useTema } from "@/tema/tema";
import { TACTIL_MIN, espacio, fuente, radio, tamano } from "@/tema/tipografia";

type Filtro = "todas" | "pendiente" | "en_bascula" | "en_proceso" | "terminadas" | "atrasadas";

const FILTROS: { clave: Filtro; texto: string; cumple: (p: PreboletaResumen) => boolean }[] = [
  { clave: "todas", texto: "Todas", cumple: () => true },
  { clave: "pendiente", texto: "Pendientes", cumple: (p) => p.estado === "pendiente" },
  { clave: "en_bascula", texto: "En báscula", cumple: (p) => p.estado === "en_bascula" },
  { clave: "en_proceso", texto: "En proceso", cumple: (p) => p.estado === "en_proceso" },
  { clave: "terminadas", texto: "Terminadas", cumple: (p) => p.estado.startsWith("terminado") },
  { clave: "atrasadas", texto: "Atrasadas", cumple: (p) => p.atrasada },
];

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function Numero({ valor, texto }: { valor: number; texto: string }) {
  const { c } = useTema();
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Texto peso="extra" t={tamano.titulo} color={c.sobreEncabezado} tabular>
        {valor}
      </Texto>
      <Texto t={tamano.mini} color={c.sobreEncabezadoSuave}>
        {texto}
      </Texto>
    </View>
  );
}

export default function Inicio() {
  const { c } = useTema();
  const yo = useYo();
  const router = useRouter();
  const preboletas = usePreboletasHoy();
  const basculas = useBasculas();
  // `GET /resumen`: aquí solo se usan los kg recibidos hoy (los pendientes van en la pestaña "Incidencias").
  const totales = useResumen();
  const opciones: OpcionFlotante[] = [
    ...(puedeCrearPreboleta(yo)
      ? [{ icono: "agregar" as const, texto: "Preboleta", etiqueta: "Nueva preboleta", onPress: () => router.push("/preboleta/nueva") }]
      : []),
    ...(puedeLeerQr(yo) ? [{ icono: "qr" as const, texto: "Escanear", etiqueta: "Escanear QR", onPress: () => router.push("/leer-qr") }] : []),
  ];
  const [unidad, setUnidad] = useState<number | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [busqueda, setBusqueda] = useState("");

  const elementos = useMemo(() => preboletas.data?.elementos ?? [], [preboletas.data]);

  // Lo que pasa los filtros de unidad y búsqueda (las píldoras cuentan sobre esto).
  const base = useMemo(() => {
    const q = normalizar(busqueda.trim());
    return elementos.filter(
      (p) =>
        (unidad === null || p.unidad_negocio_id === unidad) &&
        (!q || normalizar(`${p.folio} ${p.proveedor_nombre} ${p.proveedor_cuenta} ${p.producto_nombre}`).includes(q)),
    );
  }, [elementos, unidad, busqueda]);

  const visibles = useMemo(() => base.filter(FILTROS.find((f) => f.clave === filtro)!.cumple), [base, filtro]);

  const resumen = useMemo(() => {
    const hoy = hoyMexico();
    return {
      hoy: elementos.filter((p) => p.fecha_llegada === hoy).length,
      atrasadas: preboletas.data?.atrasadas ?? 0,
      enBascula: (basculas.data ?? []).filter((b) => b.estatus === "OCUPADO").length,
      incidencias: elementos.reduce((s, p) => s + p.incidencias_pendientes, 0),
    };
  }, [elementos, preboletas.data, basculas.data]);

  const recargando = preboletas.isRefetching || basculas.isRefetching;
  const recargar = () => {
    void preboletas.refetch();
    void basculas.refetch();
    void totales.refetch();
  };

  const encabezadoLista = (
    <View style={{ gap: espacio.l, paddingBottom: espacio.m }}>
      {/* Básculas */}
      <View style={{ gap: espacio.s }}>
        <Texto peso="negrita" t={tamano.mini} color={c.apagado} estilo={{ letterSpacing: 1, paddingHorizontal: espacio.l }}>
          BÁSCULAS
        </Texto>
        {basculas.error ? (
          <View style={{ paddingHorizontal: espacio.l }}>
            <MensajeError error={basculas.error} onReintentar={() => void basculas.refetch()} />
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: espacio.m, paddingHorizontal: espacio.l }}>
            {(basculas.data ?? []).map((b) => (
              <TarjetaBascula
                key={b.unidad_negocio_id}
                b={b}
                seleccionada={unidad === b.unidad_negocio_id}
                onPress={() => setUnidad((u) => (u === b.unidad_negocio_id ? null : b.unidad_negocio_id))}
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* Búsqueda */}
      <View
        style={{
          marginHorizontal: espacio.l,
          minHeight: TACTIL_MIN,
          borderRadius: radio.pildora,
          borderWidth: 1,
          borderColor: c.linea,
          backgroundColor: c.superficie,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: espacio.l,
          gap: espacio.s,
        }}
      >
        <Icono nombre="buscar" color={c.apagado} tamano={20} />
        <TextInput
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Buscar folio, proveedor o fruta"
          placeholderTextColor={c.apagado}
          autoCorrect={false}
          returnKeyType="search"
          style={{ flex: 1, fontFamily: fuente.normal, fontSize: tamano.base, color: c.texto, paddingVertical: espacio.s }}
        />
      </View>

      {/* Filtros */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: espacio.s, paddingHorizontal: espacio.l }}>
        {FILTROS.map((f) => (
          <Pildora
            key={f.clave}
            texto={f.texto}
            conteo={base.filter(f.cumple).length}
            activa={filtro === f.clave}
            onPress={() => setFiltro(f.clave)}
          />
        ))}
      </ScrollView>

      {unidad !== null ? (
        <Texto t={tamano.chico} color={c.apagado} estilo={{ paddingHorizontal: espacio.l }}>
          Solo {basculas.data?.find((b) => b.unidad_negocio_id === unidad)?.unidad}. Toca la báscula otra vez para ver todas.
        </Texto>
      ) : null}

      {preboletas.error ? (
        <View style={{ paddingHorizontal: espacio.l }}>
          <MensajeError error={preboletas.error} onReintentar={() => void preboletas.refetch()} />
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.fondo }}>
      <Encabezado
        etiqueta={alcancePreboletas(yo)}
        titulo="Preboletas"
        tituloDerecha={
          <View style={{ alignItems: "flex-end", paddingBottom: 4 }} accessibilityLabel={`${toneladas(totales.data?.kg_recibidos_hoy)} toneladas recibidas hoy`}>
            <Texto peso="extra" t={tamano.titulo} color={c.sobreEncabezado} tabular>
              {totales.data ? `${toneladas(totales.data.kg_recibidos_hoy)} t` : "— t"}
            </Texto>
            <Texto t={tamano.mini} color={c.sobreEncabezadoSuave}>
              Recibidas hoy
            </Texto>
          </View>
        }
      >
        <View
          style={{
            flexDirection: "row",
            backgroundColor: c.translucido,
            borderRadius: radio.tarjeta,
            padding: espacio.l,
            gap: espacio.m,
          }}
        >
          <Numero valor={resumen.hoy} texto="De hoy" />
          <Numero valor={resumen.atrasadas} texto="Atrasadas" />
          <Numero valor={resumen.enBascula} texto="En báscula" />
          <Numero valor={resumen.incidencias} texto="Incidencias" />
        </View>
      </Encabezado>

      <FlatList
        data={visibles}
        keyExtractor={(p) => String(p.id)}
        ListHeaderComponent={encabezadoLista}
        ListHeaderComponentStyle={{ paddingTop: espacio.l }}
        ListEmptyComponent={
          preboletas.isPending ? (
            <Cargando texto="Cargando preboletas…" />
          ) : preboletas.error ? undefined : (
            <Vacio texto={busqueda || unidad !== null || filtro !== "todas" ? "Nada coincide con el filtro." : "No hay preboletas para hoy ni atrasadas."} />
          )
        }
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: espacio.l, paddingBottom: espacio.m }}>
            <TarjetaPreboleta p={item} onPress={() => router.push(`/preboleta/${item.id}`)} />
          </View>
        )}
        refreshControl={<RefreshControl refreshing={recargando} onRefresh={recargar} colors={[c.acento]} tintColor={c.acento} />}
        keyboardShouldPersistTaps="handled"
        // Con el botón flotante, la última tarjeta necesita lugar para no quedar debajo.
        contentContainerStyle={{ paddingBottom: opciones.length ? espacio.xl + ALTO_BOTON_FLOTANTE : espacio.xl }}
      />

      <BotonFlotante opciones={opciones} />
    </View>
  );
}
