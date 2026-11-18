/**
 * Cálculos de la negociación, los mismos del panel (`frontend-panel-preboletas/src/lib/calculos.ts`) y
 * los que valida la API y la base. Lógica pura: sirve para mostrar equivalencias, rangos y avisos al momento.
 * La API siempre vuelve a calcular y validar.
 */

/** Redondeo de mitades hacia arriba, igual que round() de PostgreSQL para positivos. */
export function redondear(valor: number): number {
  return Math.floor(valor + 0.5);
}

/** Cajas negociadas: en kilos, ROUND(kg / kg_por_caja); en cajas, la cantidad. */
export function cajasEquivalentes(tipo: "kilos" | "cajas", cantidad: number, kgPorCaja: number): number {
  if (!(cantidad > 0) || !(kgPorCaja > 0)) return 0;
  return tipo === "kilos" ? redondear(cantidad / kgPorCaja) : redondear(cantidad);
}

/** Kilos equivalentes a una cantidad de cajas. */
export function kilosEquivalentes(cajas: number, kgPorCaja: number): number {
  return cajas > 0 && kgPorCaja > 0 ? cajas * kgPorCaja : 0;
}

/** Rango permitido: mínimo y máximo de cajas con la tolerancia (%). */
export function rango(cajas: number, tolerancia: number): { minimo: number; maximo: number } {
  return {
    minimo: redondear(cajas * (1 - tolerancia / 100)),
    maximo: redondear(cajas * (1 + tolerancia / 100)),
  };
}

/** ¿El precio o el tipo capturado difieren del precio del día? Si sí, la API crea una propuesta. */
export function difiereDelDia(
  precio: number | null,
  tipo: number | null,
  dia: { precio_kg: number | null; tipo_pago_id: number | null } | null,
): boolean {
  if (!dia || dia.precio_kg === null) return precio !== null;
  return (precio !== null && precio !== dia.precio_kg) || (tipo !== null && tipo !== dia.tipo_pago_id);
}

/** Con Precio Pactado, el precio del día es el tope: avisar (no se bloquea) si se propone más. */
export function superaTope(precio: number | null, diaPrecio: number | null, diaTipoClave: string | null): boolean {
  return diaTipoClave === "pactado" && precio !== null && diaPrecio !== null && precio > diaPrecio;
}

/**
 * Convierte lo que se escribió con el teclado decimal a número: acepta coma o punto.
 * Regresa null si está vacío o no es un número.
 */
export function leerDecimal(texto: string): number | null {
  const limpio = texto.trim().replace(",", ".");
  if (!limpio) return null;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}

/** ¿El texto escrito tiene a lo más `max` decimales? (acepta punto o coma). */
export function decimalesValidos(texto: string, max: number): boolean {
  const partes = texto.trim().replace(",", ".").split(".");
  return partes.length < 2 || (partes[1] ?? "").length <= max;
}

/** Mensaje para compartir el QR por WhatsApp (solo enlace wa.me; WhatsApp nunca se integra). */
export function mensajeWhatsApp(folio: string, unidad: string, url: string): string {
  return `Hola, este es el QR de tu preboleta ${folio} para ${unidad}. Muéstralo en báscula: ${url}`;
}

/** Enlace wa.me SIN número: el comprador elige el contacto en su teléfono. */
export function enlaceWhatsApp(mensaje: string): string {
  return `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
}
