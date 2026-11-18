/**
 * Consultas y acciones de la API de Preboletas con React Query (caché, recarga y estados de carga/error).
 * Las rutas son las REALES de la API (ver `/openapi.json`); no se inventan rutas ni campos.
 * Las llaves (`claves`) también las usa el tiempo real para invalidar lo que cambió.
 */
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "./cliente";
import type {
  Aviso,
  Bascula,
  BoletaActualizada,
  ColaboradorAdmin,
  ColaboradorBreve,
  Creado,
  DetalleConciliacion,
  DetallePreboleta,
  FrutaD365,
  IncidenciaCantidad,
  ListaMovimientos,
  NuevaPreboleta,
  PreciosHoyUnidad,
  PreciosUnidad,
  TipoMovimiento,
  PreboletaCreada,
  PrecioDia,
  ProveedorD365,
  TipoCaja,
  Unidad,
  ListaConciliaciones,
  ListaPreboletas,
  PropuestaLista,
  Vincular,
  Vinculada,
  Marcados,
  NuevaEntrada,
  NuevaPropuesta,
  Ok,
  PreboletaPorQr,
  PropuestaCreada,
  Resumen,
  SinLeer,
  TipoPago,
} from "./tipos";

export const claves = {
  basculas: ["basculas"] as const,
  preboletas: ["preboletas"] as const,
  preboleta: (id: number) => ["preboleta", id] as const,
  todasLasPreboletas: ["preboleta"] as const,
  avisos: ["avisos"] as const,
  sinLeer: ["avisos", "sin-leer"] as const,
  // Pendientes (Fase 2): contadores de Inicio y listas. Las llaves cortas sirven de prefijo para invalidar todo.
  resumen: ["resumen"] as const,
  incidencias: ["incidencias"] as const,
  listaIncidencias: (soloPendientes: boolean) => ["incidencias", soloPendientes ? "pendientes" : "todas"] as const,
  propuestas: ["propuestas"] as const,
  listaPropuestas: (soloPendientes: boolean) => ["propuestas", soloPendientes ? "pendientes" : "todas"] as const,
  conciliaciones: ["conciliaciones"] as const,
  listaConciliaciones: ["conciliaciones", "lista"] as const,
  conciliacion: (id: number) => ["conciliaciones", "detalle", id] as const,
  // Catálogos: cambian poco.
  tiposPago: ["catalogo", "tipos-pago"] as const,
  compradores: ["catalogo", "compradores"] as const,
  unidades: ["catalogo", "unidades"] as const,
  frutas: ["catalogo", "frutas"] as const,
  tiposCaja: (productoCodigo: string) => ["catalogo", "tipos-caja", productoCodigo] as const,
  proveedores: (texto: string) => ["catalogo", "proveedores", texto] as const,
  precioDia: (unidad: number, fruta: string, fecha: string) => ["precio-dia", unidad, fruta, fecha] as const,
  // Fase 3
  movimientos: ["movimientos"] as const,
  historial: (filtros: FiltrosHistorial) => ["movimientos", filtros] as const,
  tiposMovimiento: ["catalogo", "tipos-movimiento"] as const,
  colaboradores: ["catalogo", "colaboradores"] as const,
  precios: ["precios"] as const,
  preciosUnidad: (unidad: number) => ["precios", unidad] as const,
  preciosHoy: ["precios", "hoy"] as const,
  // Configuración (solo Admin)
  colaboradoresAdmin: ["admin-colaboradores"] as const,
  listaColaboradoresAdmin: (buscar: string) => ["admin-colaboradores", buscar] as const,
  envios: ["avisos", "envios"] as const,
};

/** Filtros del historial (`GET /movimientos`). `colaboradorId: 0` = lo que hizo el sistema. */
export interface FiltrosHistorial {
  preboletaId?: number;
  colaboradorId?: number;
  proveedorCuenta?: string;
  tipos?: string[];
  desde?: string;
  hasta?: string;
}

/** Arma `?a=1&b=2` sin depender de `URLSearchParams` (incompleto en React Native). Repite las llaves de listas. */
function consulta(params: Record<string, string | number | string[] | undefined>): string {
  const partes: string[] = [];
  for (const [llave, valor] of Object.entries(params)) {
    if (valor === undefined || valor === "") continue;
    for (const v of Array.isArray(valor) ? valor : [valor]) partes.push(`${llave}=${encodeURIComponent(String(v))}`);
  }
  return partes.length ? `?${partes.join("&")}` : "";
}

/** Los catálogos casi no cambian: se reusan 10 minutos sin volver a pedirlos. */
const CATALOGO = 10 * 60_000;

// ----------------------------------------------------------------------
// Lecturas
// ----------------------------------------------------------------------

export function useBasculas() {
  return useQuery({ queryKey: claves.basculas, queryFn: () => api.get<Bascula[]>("/basculas") });
}

/** Sin filtros: las programadas para hoy más las atrasadas (lo decide la API). */
export function usePreboletasHoy() {
  return useQuery({ queryKey: claves.preboletas, queryFn: () => api.get<ListaPreboletas>("/preboletas") });
}

export function usePreboleta(id: number) {
  return useQuery({
    queryKey: claves.preboleta(id),
    queryFn: () => api.get<DetallePreboleta>(`/preboletas/${id}`),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useAvisos() {
  return useQuery({ queryKey: claves.avisos, queryFn: () => api.get<Aviso[]>("/notificaciones?limite=100") });
}

export function useSinLeer() {
  return useQuery({ queryKey: claves.sinLeer, queryFn: () => api.get<SinLeer>("/notificaciones/sin-leer") });
}

export function useResumen() {
  return useQuery({ queryKey: claves.resumen, queryFn: () => api.get<Resumen>("/resumen") });
}

export function useTiposPago() {
  return useQuery({ queryKey: claves.tiposPago, queryFn: () => api.get<TipoPago[]>("/tipos-pago"), staleTime: CATALOGO });
}

/** Quien puede ser comprador de una preboleta: los Compradores y los Admin (la API acepta ambos). */
export function useCompradores(activo = true) {
  return useQuery({
    queryKey: claves.compradores,
    queryFn: async () => {
      const [compradores, admins] = await Promise.all([
        api.get<ColaboradorBreve[]>("/colaboradores?rol=Comprador"),
        api.get<ColaboradorBreve[]>("/colaboradores?rol=Admin"),
      ]);
      const porId = new Map<number, ColaboradorBreve>();
      for (const c of [...compradores, ...admins]) porId.set(c.id, c);
      return [...porId.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    },
    staleTime: CATALOGO,
    enabled: activo,
  });
}

/**
 * El QR trae el token solo o el enlace completo (`<URL_PUBLICA>/qr/<token>`). Como el token va EN LA RUTA,
 * se manda solo el último segmento: la misma regla que `_token()` de la API.
 */
export function tokenDeQr(texto: string): string {
  return texto.trim().replace(/\/+$/, "").split("/").pop() ?? "";
}

export function resolverQr(texto: string): Promise<PreboletaPorQr> {
  return api.get<PreboletaPorQr>(`/preboletas/qr/${encodeURIComponent(tokenDeQr(texto))}`);
}

// ----------------------------------------------------------------------
// Acciones
// ----------------------------------------------------------------------

/** Después de cualquier cambio de báscula se recargan el detalle, la lista y las básculas. */
function useRecargarBascula() {
  const qc = useQueryClient();
  return (preboletaId: number) =>
    Promise.all([
      qc.invalidateQueries({ queryKey: claves.preboleta(preboletaId) }),
      qc.invalidateQueries({ queryKey: claves.preboletas }),
      qc.invalidateQueries({ queryKey: claves.basculas }),
    ]);
}

/** Indicar peso en báscula (entrada del camión): `via: "qr"` al leer el QR, `"manual"` desde el detalle. */
export function useRegistrarEntrada(preboletaId: number) {
  const recargar = useRecargarBascula();
  return useMutation({
    mutationFn: (datos: NuevaEntrada) => api.post<Creado>(`/preboletas/${preboletaId}/recepciones`, datos),
    onSuccess: () => recargar(preboletaId),
  });
}

export function useCancelarEntrada(preboletaId: number) {
  const recargar = useRecargarBascula();
  return useMutation({
    mutationFn: ({ recepcionId, motivo }: { recepcionId: number; motivo: string }) =>
      api.post<Ok>(`/recepciones/${recepcionId}/cancelar`, { motivo }),
    onSuccess: () => recargar(preboletaId),
  });
}

/** Relee la boleta de la carga en D365 (por CoreAPI) y la pasa por el motor al momento. */
export function useActualizarBoleta(preboletaId: number) {
  const recargar = useRecargarBascula();
  return useMutation({
    mutationFn: (recepcionId: number) => api.post<BoletaActualizada>(`/recepciones/${recepcionId}/actualizar-boleta`),
    onSuccess: () => recargar(preboletaId),
  });
}

// ----------------------------------------------------------------------
// Acciones de la negociación (Fase 2). Todas recargan el detalle, la lista y los pendientes.
// ----------------------------------------------------------------------

function useRecargarPreboleta() {
  const qc = useQueryClient();
  return (preboletaId: number) =>
    Promise.all([
      qc.invalidateQueries({ queryKey: claves.preboleta(preboletaId) }),
      qc.invalidateQueries({ queryKey: claves.preboletas }),
      qc.invalidateQueries({ queryKey: claves.basculas }),
      qc.invalidateQueries({ queryKey: claves.resumen }),
      qc.invalidateQueries({ queryKey: claves.propuestas }),
      qc.invalidateQueries({ queryKey: claves.incidencias }),
    ]);
}

/**
 * Propone precio o tipo de pago para toda la preboleta (sin `recepcionId`) o para una carga.
 * `propuesta_id: null` = quedó igual al precio del día y se aplicó sin autorización.
 */
export function useProponerPrecio(preboletaId: number) {
  const recargar = useRecargarPreboleta();
  return useMutation({
    mutationFn: ({ recepcionId, datos }: { recepcionId?: number; datos: NuevaPropuesta }) =>
      api.post<PropuestaCreada>(
        recepcionId ? `/recepciones/${recepcionId}/propuestas` : `/preboletas/${preboletaId}/propuestas`,
        datos,
      ),
    onSuccess: () => recargar(preboletaId),
  });
}

export function useMultiplesCargas(preboletaId: number) {
  const recargar = useRecargarPreboleta();
  return useMutation({
    mutationFn: (activar: boolean) => api.patch<Ok>(`/preboletas/${preboletaId}/multiples-cargas`, { activar }),
    onSuccess: () => recargar(preboletaId),
  });
}

export function useCerrarAMano(preboletaId: number) {
  const recargar = useRecargarPreboleta();
  return useMutation({
    mutationFn: (observacion: string) => api.post<Ok>(`/preboletas/${preboletaId}/cierre-manual`, { observacion }),
    onSuccess: () => recargar(preboletaId),
  });
}

export function useCambiarComprador(preboletaId: number) {
  const recargar = useRecargarPreboleta();
  return useMutation({
    mutationFn: (compradorId: number) => api.patch<Ok>(`/preboletas/${preboletaId}/comprador`, { comprador_id: compradorId }),
    onSuccess: () => recargar(preboletaId),
  });
}

/** Corrige las cajas declaradas de una carga mientras su boleta no esté cerrada en D365. */
export function useCorregirCajas(preboletaId: number) {
  const recargar = useRecargarPreboleta();
  return useMutation({
    mutationFn: ({ recepcionId, cajas, motivo }: { recepcionId: number; cajas: number; motivo: string }) =>
      api.post<Ok>(`/recepciones/${recepcionId}/corregir-cajas`, { cajas, motivo }),
    onSuccess: () => recargar(preboletaId),
  });
}

// ----------------------------------------------------------------------
// Pendientes (Fase 2): incidencias de cantidad, propuestas por autorizar y conciliación.
// ----------------------------------------------------------------------

/** Solo Admin o Comprador (la API responde 403 a los demás). Todas las unidades, pendientes primero. */
export function useIncidencias(soloPendientes: boolean, activo = true) {
  return useQuery({
    queryKey: claves.listaIncidencias(soloPendientes),
    queryFn: () => api.get<IncidenciaCantidad[]>(soloPendientes ? "/incidencias?estado=pendiente" : "/incidencias"),
    enabled: activo,
  });
}

export function usePropuestas(soloPendientes: boolean) {
  return useQuery({
    queryKey: claves.listaPropuestas(soloPendientes),
    queryFn: () => api.get<PropuestaLista[]>(soloPendientes ? "/propuestas?estado=pendiente" : "/propuestas"),
  });
}

export function useConciliaciones() {
  return useQuery({ queryKey: claves.listaConciliaciones, queryFn: () => api.get<ListaConciliaciones>("/conciliaciones") });
}

export function useConciliacion(id: number) {
  return useQuery({
    queryKey: claves.conciliacion(id),
    queryFn: () => api.get<DetalleConciliacion>(`/conciliaciones/${id}`),
    enabled: Number.isFinite(id) && id > 0,
  });
}

/** Tras resolver un pendiente cambian los contadores, las listas y las preboletas afectadas. */
function useRecargarPendientes() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: claves.resumen }),
      qc.invalidateQueries({ queryKey: claves.incidencias }),
      qc.invalidateQueries({ queryKey: claves.propuestas }),
      qc.invalidateQueries({ queryKey: claves.conciliaciones }),
      qc.invalidateQueries({ queryKey: claves.preboletas }),
      qc.invalidateQueries({ queryKey: claves.todasLasPreboletas }),
      qc.invalidateQueries({ queryKey: claves.basculas }),
    ]);
}

export type Decision = "autorizar" | "rechazar";

/** Autorizar o rechazar una sobre-entrega o un faltante (cualquier comprador, de cualquier unidad, o Admin). */
export function useResolverIncidencia() {
  const recargar = useRecargarPendientes();
  return useMutation({
    mutationFn: ({ id, decision, comentario }: { id: number; decision: Decision; comentario: string }) =>
      api.post<Ok>(`/incidencias/${id}/${decision}`, { comentario: comentario || null }),
    onSuccess: () => recargar(),
  });
}

/** Autorizar o rechazar una propuesta de precio (permiso `autorizar_precios` en la unidad, o Admin). */
export function useResolverPropuesta() {
  const recargar = useRecargarPendientes();
  return useMutation({
    mutationFn: ({ id, decision, comentario }: { id: number; decision: Decision; comentario: string }) =>
      api.post<Ok>(`/propuestas/${id}/${decision}`, { comentario: comentario || null }),
    onSuccess: () => recargar(),
  });
}

/** Liga la boleta de D365 a una preboleta: a una carga sin boleta o a una carga nueva con sus cajas. */
export function useVincularBoleta(incidenciaId: number) {
  const recargar = useRecargarPendientes();
  return useMutation({
    mutationFn: (datos: Vincular) => api.post<Vinculada>(`/conciliaciones/${incidenciaId}/vincular`, datos),
    onSuccess: () => recargar(),
  });
}

/** Marca la boleta como no relacionada con ninguna preboleta (observación obligatoria). */
export function useDescartarBoleta(incidenciaId: number) {
  const recargar = useRecargarPendientes();
  return useMutation({
    mutationFn: (comentario: string) => api.post<Ok>(`/conciliaciones/${incidenciaId}/descartar`, { comentario }),
    onSuccess: () => recargar(),
  });
}

// ----------------------------------------------------------------------
// Crear preboleta (Fase 2). Proveedores y frutas salen de Dataverse a través de la API.
// ----------------------------------------------------------------------

export function useUnidades() {
  return useQuery({ queryKey: claves.unidades, queryFn: () => api.get<Unidad[]>("/unidades"), staleTime: CATALOGO });
}

/** Frutas admitidas (conjunto de producción MP en D365). */
export function useFrutas() {
  return useQuery({ queryKey: claves.frutas, queryFn: () => api.get<FrutaD365[]>("/frutas?limite=50"), staleTime: CATALOGO });
}

/** Cajas activas permitidas para la fruta elegida. */
export function useTiposCaja(productoCodigo: string | null) {
  return useQuery({
    queryKey: claves.tiposCaja(productoCodigo ?? ""),
    queryFn: () => api.get<TipoCaja[]>(`/tipos-caja?producto_codigo=${encodeURIComponent(productoCodigo ?? "")}`),
    enabled: !!productoCodigo,
    staleTime: CATALOGO,
  });
}

/** Búsqueda de proveedores en D365 (nombre o cuenta). Solo con 2 letras o más. */
export function useBuscarProveedores(texto: string) {
  const t = texto.trim();
  return useQuery({
    queryKey: claves.proveedores(t),
    queryFn: () => api.get<ProveedorD365[]>(`/proveedores?buscar=${encodeURIComponent(t)}&limite=10`),
    enabled: t.length >= 2,
    staleTime: 60_000,
  });
}

/** Precio del día, tipo de pago y tolerancia de (unidad, fruta, fecha). `tolerancia_pct: null` = no se puede crear. */
export function usePrecioDia(unidad: number | null, fruta: string | null, fecha: string) {
  return useQuery({
    queryKey: claves.precioDia(unidad ?? 0, fruta ?? "", fecha),
    queryFn: () =>
      api.get<PrecioDia>(`/unidades/${unidad}/precio-dia/${encodeURIComponent(fruta ?? "")}?fecha=${encodeURIComponent(fecha)}`),
    enabled: unidad !== null && !!fruta,
  });
}

export function useCrearPreboleta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (datos: NuevaPreboleta) => api.post<PreboletaCreada>("/preboletas", datos),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: claves.preboletas }),
        qc.invalidateQueries({ queryKey: claves.resumen }),
        qc.invalidateQueries({ queryKey: claves.propuestas }),
      ]),
  });
}

// ----------------------------------------------------------------------
// Historial (Fase 3)
// ----------------------------------------------------------------------

const POR_PAGINA = 30;

/**
 * Movimientos de la bitácora, más nuevos primero, de 30 en 30 ("Cargar más"). La API decide qué ve cada
 * quien: Admin todo; Basculista su unidad; Comprador sus preboletas y lo que él hizo.
 */
export function useHistorial(filtros: FiltrosHistorial) {
  return useInfiniteQuery({
    queryKey: claves.historial(filtros),
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      api.get<ListaMovimientos>(
        `/movimientos${consulta({
          preboleta_id: filtros.preboletaId,
          colaborador_id: filtros.colaboradorId,
          proveedor_cuenta: filtros.proveedorCuenta,
          tipos: filtros.tipos,
          desde: filtros.desde,
          hasta: filtros.hasta,
          limite: POR_PAGINA,
          desplazamiento: pageParam,
        })}`,
      ),
    getNextPageParam: (ultima, todas) => {
      const cargados = todas.reduce((n, p) => n + p.elementos.length, 0);
      return cargados < ultima.total && ultima.elementos.length > 0 ? cargados : undefined;
    },
  });
}

export function useTiposMovimiento() {
  return useQuery({
    queryKey: claves.tiposMovimiento,
    queryFn: () => api.get<TipoMovimiento[]>("/tipos-movimiento"),
    staleTime: CATALOGO,
  });
}

/** Todas las personas (para filtrar el historial por quién). */
export function useColaboradores() {
  return useQuery({
    queryKey: claves.colaboradores,
    queryFn: async () => (await api.get<ColaboradorBreve[]>("/colaboradores")).sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    staleTime: CATALOGO,
  });
}

// ----------------------------------------------------------------------
// Precio del día (Fase 3): Admin o permiso `precios_diarios` en la unidad. Tolerancias: solo Admin.
// ----------------------------------------------------------------------

/** Frutas de la unidad con su precio, tipo de pago y tolerancia de HOY (la API usa el día de México). */
export function usePreciosUnidad(unidad: number) {
  return useQuery({
    queryKey: claves.preciosUnidad(unidad),
    queryFn: () => api.get<PreciosUnidad>(`/unidades/${unidad}/precios`),
    enabled: Number.isFinite(unidad) && unidad > 0,
  });
}

/**
 * Resumen del precio de HOY de cada unidad donde la persona puede definirlo (`GET /precios-hoy`): solo las
 * frutas que ya tienen precio. Una sola petición que solo lee la base (no consulta D365): es rápida.
 */
export function usePreciosHoy(activo = true) {
  return useQuery({ queryKey: claves.preciosHoy, queryFn: () => api.get<PreciosHoyUnidad[]>("/precios-hoy"), enabled: activo });
}

/** Un precio del día cambia el precio vigente de preboletas, sus totales y puede resolver propuestas solas. */
function useRecargarPrecios() {
  const qc = useQueryClient();
  return (unidad: number) =>
    Promise.all([
      qc.invalidateQueries({ queryKey: claves.preciosUnidad(unidad) }),
      qc.invalidateQueries({ queryKey: claves.preciosHoy }),
      qc.invalidateQueries({ queryKey: ["precio-dia"] }),
      qc.invalidateQueries({ queryKey: claves.preboletas }),
      qc.invalidateQueries({ queryKey: claves.todasLasPreboletas }),
      qc.invalidateQueries({ queryKey: claves.propuestas }),
      qc.invalidateQueries({ queryKey: claves.resumen }),
    ]);
}

/**
 * Guarda el precio de hoy de una fruta y, si es Admin y la cambió, su tolerancia (como el panel:
 * primero el precio y después la tolerancia).
 */
export function useGuardarPrecio(unidad: number) {
  const recargar = useRecargarPrecios();
  return useMutation({
    mutationFn: async (d: { productoCodigo: string; precioKg: string; tipoPagoId: number; tolerancia?: string }) => {
      const fruta = encodeURIComponent(d.productoCodigo);
      await api.put<Ok>(`/unidades/${unidad}/precios/${fruta}`, { precio_kg: d.precioKg, tipo_pago_id: d.tipoPagoId });
      if (d.tolerancia !== undefined) await api.put<Ok>(`/unidades/${unidad}/tolerancias/${fruta}`, { tolerancia_pct: d.tolerancia });
    },
    onSettled: () => recargar(unidad),
  });
}

/** Solo la tolerancia (Admin): también para frutas que aún no tienen precio de hoy. */
export function useGuardarTolerancia(unidad: number) {
  const recargar = useRecargarPrecios();
  return useMutation({
    mutationFn: ({ productoCodigo, tolerancia }: { productoCodigo: string; tolerancia: string }) =>
      api.put<Ok>(`/unidades/${unidad}/tolerancias/${encodeURIComponent(productoCodigo)}`, { tolerancia_pct: tolerancia }),
    onSuccess: () => recargar(unidad),
  });
}

// ----------------------------------------------------------------------
// Configuración (Fase 3, solo Admin). La API vuelve a validar que sea Admin en cada ruta.
// ----------------------------------------------------------------------

/**
 * Fecha y hora de implementación de una unidad. `inicio`: "AAAA-MM-DDTHH:MM:00" sin zona (la API lo toma
 * en hora de México) o `null` = pausar (sus boletas dejan de ligarse y de generar incidencias).
 */
export function useGuardarImplementacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ unidad, inicio }: { unidad: number; inicio: string | null }) =>
      api.put<Ok>(`/unidades/${unidad}/implementacion`, { inicio_operacion_at: inicio }),
    onSettled: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: claves.unidades }),
        qc.invalidateQueries({ queryKey: claves.basculas }),
      ]),
  });
}

/** Colaboradores con su rol (de Azure), canales, teléfonos activos y permisos por unidad. */
export function useColaboradoresAdmin(buscar: string) {
  const t = buscar.trim();
  return useQuery({
    queryKey: claves.listaColaboradoresAdmin(t),
    queryFn: () => api.get<ColaboradorAdmin[]>(`/admin/colaboradores${consulta({ buscar: t || undefined })}`),
    // Mientras llega la búsqueda nueva se queda la lista anterior (sin parpadeo de "Cargando").
    placeholderData: (previa) => previa,
  });
}

/** Canales extra de aviso. La API pide los dos valores juntos. */
export function useCambiarCanales() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ colaborador, correo, push }: { colaborador: number; correo: boolean; push: boolean }) =>
      api.put<Ok>(`/colaboradores/${colaborador}/canales`, { correo, push }),
    onSettled: () => qc.invalidateQueries({ queryKey: claves.colaboradoresAdmin }),
  });
}

export type PermisoColaborador = "precios_diarios" | "autorizar_precios";

/** Dar (`PUT`) o quitar (`DELETE`) un permiso en una unidad. */
export function useCambiarPermiso() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ colaborador, permiso, unidad, otorgar }: { colaborador: number; permiso: PermisoColaborador; unidad: number; otorgar: boolean }) => {
      const ruta = `/colaboradores/${colaborador}/permisos/${permiso}/${unidad}`;
      return otorgar ? api.put<Ok>(ruta) : api.del<Ok>(ruta);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: claves.colaboradoresAdmin }),
  });
}

/** Historial de envíos: los avisos de todas las personas con el resultado por correo y push (200 más nuevos). */
export function useEnvios() {
  return useQuery({ queryKey: claves.envios, queryFn: () => api.get<Aviso[]>("/notificaciones/envios?limite=200") });
}

/** Marca avisos como leídos. Sin ids = todos los míos. */
export function useMarcarLeidos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids?: number[]) => api.post<Marcados>("/notificaciones/leidas", ids ? { ids } : {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: claves.avisos }),
  });
}
