/**
 * Nombres cortos para los tipos de la API de Preboletas. Salen de `esquema.ts`, que se GENERA desde
 * `/openapi.json` con `npm run tipos-api` (no se escribe a mano). Si la API cambia, se regenera.
 */
import type { components } from "./esquema";

type S = components["schemas"];

export type Yo = S["Yo"];
export type Bascula = S["Bascula"];
export type ListaPreboletas = S["ListaPreboletas"];
export type PreboletaResumen = S["PreboletaResumen"];
export type PreboletaCompleta = S["PreboletaCompleta"];
export type DetallePreboleta = S["DetallePreboleta"];
export type Recepcion = S["Recepcion"];
export type IncidenciaPreboleta = S["IncidenciaPreboleta"];
export type Movimiento = S["Movimiento"];
export type Acciones = S["Acciones"];
export type Aviso = S["Aviso"];
export type PreboletaPorQr = S["PreboletaPorQr"];
export type Creado = S["Creado"];
export type NuevaEntrada = S["NuevaEntrada"];
export type BoletaActualizada = S["BoletaActualizada"];
export type Ok = S["Ok"];
export type TicketWs = S["TicketWs"];
export type SinLeer = S["SinLeer"];
export type Resumen = S["Resumen"];
export type Marcados = S["Marcados"];
export type MarcarLeidos = S["MarcarLeidos"];
export type NuevoDispositivo = S["NuevoDispositivo"];
export type Motivo = S["Motivo"];
export type RespuestaError = S["RespuestaError"];

// Fase 2: acciones del detalle, propuestas, incidencias, conciliación y crear preboleta.
export type Propuesta = S["Propuesta"];
export type PropuestaLista = S["PropuestaLista"];
export type NuevaPropuesta = S["NuevaPropuesta"];
export type PropuestaCreada = S["PropuestaCreada"];
export type CorreccionCajas = S["CorreccionCajas"];
export type CierreManual = S["CierreManual"];
export type CambioComprador = S["CambioComprador"];
export type CambioMultiples = S["CambioMultiples"];
export type Resolucion = S["Resolucion"];
export type ColaboradorBreve = S["ColaboradorBreve"];
export type TipoPago = S["TipoPago"];
export type TipoCaja = S["TipoCaja"];
export type Unidad = S["Unidad"];
export type ProveedorD365 = S["ProveedorD365"];
export type FrutaD365 = S["FrutaD365"];
export type PrecioDia = S["PrecioDia"];
export type NuevaPreboleta = S["NuevaPreboleta"];
export type PreboletaCreada = S["PreboletaCreada"];
export type IncidenciaCantidad = S["IncidenciaCantidad"];
export type ListaConciliaciones = S["ListaConciliaciones"];
export type ConciliacionPendiente = S["ConciliacionPendiente"];
export type ConciliacionResuelta = S["ConciliacionResuelta"];
export type DetalleConciliacion = S["DetalleConciliacion"];
export type CandidataConciliacion = S["CandidataConciliacion"];
export type CargaSinBoleta = S["CargaSinBoleta"];
export type Vincular = S["Vincular"];
export type Vinculada = S["Vinculada"];
export type Descartar = S["Descartar"];

// Fase 3: historial, precio del día y configuración.
export type MovimientoLista = S["MovimientoLista"];
export type ListaMovimientos = S["ListaMovimientos"];
export type TipoMovimiento = S["TipoMovimiento"];
export type PreciosUnidad = S["PreciosUnidad"];
export type PrecioFruta = S["PrecioFruta"];
export type PreciosHoyUnidad = S["PreciosHoyUnidad"];
export type PrecioHoy = S["PrecioHoy"];
export type GuardarPrecio = S["GuardarPrecio"];
export type ColaboradorAdmin = S["ColaboradorAdmin"];
export type PermisoUnidad = S["PermisoUnidad"];
export type Entrega = S["Entrega"];

export type EstadoPreboleta = PreboletaResumen["estado"];
