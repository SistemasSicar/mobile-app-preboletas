/**
 * Qué ve cada rol en la app (igual que `frontend-panel-preboletas/src/lib/permisos.ts`).
 * La API es la que decide de verdad (403/404): esto solo evita ofrecer botones que fallarían.
 * Los botones de una preboleta salen de sus `acciones`, no de aquí.
 */
import type { Yo } from "@/api/tipos";

export const esAdmin = (yo: Yo) => yo.roles.includes("Admin");
export const esComprador = (yo: Yo) => yo.roles.includes("Comprador");
export const esBasculista = (yo: Yo) => yo.roles.includes("Basculista");

/** La pestaña "Leer QR" solo es para quien opera la báscula. */
export const puedeLeerQr = (yo: Yo) => esAdmin(yo) || esBasculista(yo);

/** Incidencias de cantidad: las ve y las resuelve cualquier Comprador (de cualquier unidad) o un Admin. */
export const puedeVerIncidencias = (yo: Yo) => esAdmin(yo) || esComprador(yo);

/** Crear preboletas: Comprador o Admin. */
export const puedeCrearPreboleta = (yo: Yo) => esAdmin(yo) || esComprador(yo);

/** Unidades donde la persona tiene un permiso (el Admin los tiene todos sin filas: se trata aparte). */
export function unidadesConPermiso(yo: Yo, permiso: "precios_diarios" | "autorizar_precios"): number[] {
  return yo.permisos.filter((p) => p.permiso === permiso).map((p) => p.unidad_negocio_id);
}

/** Precio del día: el Admin o quien tiene `precios_diarios` en alguna unidad (la API responde 403 a los demás). */
export const puedeVerPrecios = (yo: Yo) => esAdmin(yo) || unidadesConPermiso(yo, "precios_diarios").length > 0;

/** Texto del alcance de la lista de preboletas. */
export function alcancePreboletas(yo: Yo): string {
  if (esAdmin(yo)) return "Todas las unidades";
  if (esComprador(yo) && esBasculista(yo)) return `Las tuyas y las de ${yo.unidad}`;
  if (esComprador(yo)) return "Tus preboletas";
  return `Báscula de ${yo.unidad}`;
}
