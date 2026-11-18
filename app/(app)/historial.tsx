/**
 * Historial (`GET /movimientos`): la bitácora de todo, más nuevo primero, de 30 en 30 con "Cargar más".
 * - Filtros: preboleta (folio), periodo (píldoras: todo, hoy, 7 o 30 días), quién (persona o "Sistema"),
 *   cuenta del proveedor y tipos de movimiento. Los textos se aplican 400 ms después de dejar de escribir.
 * - Desde el detalle de una preboleta llega con `folio` ya filtrado.
 * - Lo que ve cada quien lo decide la API: Admin todo; Basculista su unidad; Comprador sus preboletas y lo que hizo.
 */
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, View } from "react-native";

import { useColaboradores, useHistorial, useTiposMovimiento, type FiltrosHistorial } from "@/api/consultas";
import type { MovimientoLista } from "@/api/tipos";
import { Encabezado } from "@/componentes/Encabezado";
import { CampoTexto, Desplegable, ListaOpciones, useConEspera } from "@/componentes/formularios";
import { EnlacePreboleta } from "@/componentes/Pendientes";
import { Boton, Cargando, ChipColor, MensajeError, Pildora, Tarjeta, Texto, Vacio, useEspacioAbajo } from "@/componentes/ui";
import { cuando, desdePeriodo, entero, type Periodo } from "@/formato";
import { useTema } from "@/tema/tema";
import { espacio, tamano } from "@/tema/tipografia";

const PERIODOS: { valor: Periodo; texto: string }[] = [
  { valor: "todo", texto: "Todo" },
  { valor: "hoy", texto: "Hoy" },
  { valor: "7", texto: "7 días" },
  { valor: "30", texto: "30 días" },
];

/** "Todos" en el filtro de quién (0 ya significa "Sistema" en la API). */
const TODOS = -1;

/** "PB-0012", "pb-12" o "12" → 12. */
function idDeFolio(texto: string): number | undefined {
  const limpio = texto.trim().toUpperCase().replace(/^PB-?/, "");
  return /^\d+$/.test(limpio) && Number(limpio) > 0 ? Number(limpio) : undefined;
}

function TarjetaMovimiento({ m }: { m: MovimientoLista }) {
  const { c } = useTema();
  return (
    <Tarjeta franja={m.color} estilo={{ gap: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: espacio.s }}>
        <ChipColor texto={m.badge || m.tipo_nombre} color={m.color} />
        <Texto t={tamano.mini} color={c.apagado}>
          {cuando(m.ocurrido_at)}
        </Texto>
      </View>
      <Texto t={tamano.chico}>{m.descripcion}</Texto>
      <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: espacio.s }}>
        <Texto t={tamano.chico} color={c.apagado}>
          {m.quien}
        </Texto>
        {m.preboleta_id && m.preboleta_folio ? <EnlacePreboleta id={m.preboleta_id} folio={m.preboleta_folio} visible /> : null}
        {m.boleta_folio ? (
          <Texto t={tamano.chico} peso="mono" color={c.apagado}>
            boleta {m.boleta_folio}
          </Texto>
        ) : null}
      </View>
    </Tarjeta>
  );
}

export default function Historial() {
  const { c } = useTema();
  const router = useRouter();
  const espacioAbajo = useEspacioAbajo();
  const params = useLocalSearchParams<{ folio?: string }>();

  const [folioTexto, setFolioTexto] = useState(params.folio ?? "");
  const [periodo, setPeriodo] = useState<Periodo>("todo");
  const [quien, setQuien] = useState<number>(TODOS);
  const [proveedorTexto, setProveedorTexto] = useState("");
  const [tipos, setTipos] = useState<string[]>([]);

  const folio = useConEspera(folioTexto);
  const proveedor = useConEspera(proveedorTexto);

  const filtros = useMemo<FiltrosHistorial>(
    () => ({
      // El número del folio es el id de la preboleta (PB-0012 → 12), igual que en el panel.
      preboletaId: idDeFolio(folio),
      colaboradorId: quien === TODOS ? undefined : quien,
      proveedorCuenta: proveedor.trim() || undefined,
      tipos: tipos.length ? tipos : undefined,
      desde: desdePeriodo(periodo),
    }),
    [folio, proveedor, quien, tipos, periodo],
  );

  const historial = useHistorial(filtros);
  const tiposMov = useTiposMovimiento();
  const personas = useColaboradores();
  const movimientos = useMemo(() => historial.data?.pages.flatMap((p) => p.elementos) ?? [], [historial.data]);
  const total = historial.data?.pages[0]?.total;
  const filtrosExtra = (quien !== TODOS ? 1 : 0) + (proveedorTexto.trim() ? 1 : 0) + (tipos.length ? 1 : 0);

  const alternarTipo = (clave: string) => setTipos((t) => (t.includes(clave) ? t.filter((x) => x !== clave) : [...t, clave]));
  const limpiar = () => {
    setFolioTexto("");
    setPeriodo("todo");
    setQuien(TODOS);
    setProveedorTexto("");
    setTipos([]);
  };

  const encabezadoLista = (
    <View style={{ gap: espacio.m, paddingBottom: espacio.s }}>
      <CampoTexto etiqueta="Preboleta" valor={folioTexto} onCambio={setFolioTexto} placeholder="PB-0012" />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: espacio.s }}>
        {PERIODOS.map((p) => (
          <Pildora key={p.valor} texto={p.texto} activa={periodo === p.valor} onPress={() => setPeriodo(p.valor)} />
        ))}
      </View>
      <Desplegable texto={filtrosExtra ? `Más filtros (${filtrosExtra})` : "Más filtros"} titulo="Más filtros">
        {() => (
          <View style={{ gap: espacio.l }}>
            {personas.error ? (
              <MensajeError error={personas.error} onReintentar={() => void personas.refetch()} />
            ) : (
              <ListaOpciones
                etiqueta="Quién"
                valor={quien}
                onCambio={setQuien}
                opciones={[
                  { valor: TODOS, texto: "Todos" },
                  { valor: 0, texto: "Sistema", detalle: "Lo que hizo la API sola (motor de boletas, avisos…)" },
                  ...(personas.data ?? []).map((p) => ({ valor: p.id, texto: p.nombre, detalle: p.unidad })),
                ]}
              />
            )}
            <CampoTexto etiqueta="Proveedor (cuenta)" valor={proveedorTexto} onCambio={setProveedorTexto} placeholder="MP2520" />
            <View style={{ gap: espacio.xs }}>
              <Texto peso="seminegrita" t={tamano.chico}>
                Movimiento {tipos.length ? `(${tipos.length})` : "(todos)"}
              </Texto>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: espacio.s }}>
                {[...(tiposMov.data ?? [])]
                  .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
                  .map((t) => (
                    <Pildora key={t.clave} texto={t.nombre} activa={tipos.includes(t.clave)} onPress={() => alternarTipo(t.clave)} />
                  ))}
              </View>
            </View>
            <Boton texto="Limpiar filtros" icono="cerrar" variante="secundario" onPress={limpiar} />
          </View>
        )}
      </Desplegable>
      {total !== undefined ? (
        <Texto t={tamano.chico} color={c.apagado}>
          {entero(total)} movimientos
        </Texto>
      ) : null}
      {historial.error ? <MensajeError error={historial.error} onReintentar={() => void historial.refetch()} /> : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.fondo }}>
      <Encabezado onAtras={() => (router.canGoBack() ? router.back() : router.replace("/"))} etiqueta="Bitácora" titulo="Historial" />
      <FlatList
        data={movimientos}
        keyExtractor={(m) => String(m.id)}
        renderItem={({ item }) => <TarjetaMovimiento m={item} />}
        ListHeaderComponent={encabezadoLista}
        contentContainerStyle={{ padding: espacio.l, gap: espacio.m, paddingBottom: espacioAbajo }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={historial.isRefetching && !historial.isFetchingNextPage} onRefresh={() => void historial.refetch()} colors={[c.acento]} />}
        ListEmptyComponent={
          historial.isPending ? <Cargando texto="Cargando historial…" /> : historial.error ? undefined : <Vacio texto="Sin movimientos con estos filtros." />
        }
        ListFooterComponent={
          historial.isFetchingNextPage ? (
            <ActivityIndicator color={c.acento} style={{ padding: espacio.l }} />
          ) : historial.hasNextPage ? (
            <Boton texto="Cargar más" variante="secundario" onPress={() => void historial.fetchNextPage()} />
          ) : undefined
        }
      />
    </View>
  );
}
