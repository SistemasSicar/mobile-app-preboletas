/**
 * Formatos (es-MX, hora del centro de México) y etiquetas, iguales a los del panel
 * (`frontend-panel-preboletas/src/lib/formato.ts`). Fechas y horas SIEMPRE en America/Mexico_City,
 * nunca en la zona del teléfono.
 */

export const ZONA = "America/Mexico_City";

const fmtNumero = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 });
const fmtEntero = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });
const fmtDinero = new Intl.NumberFormat("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtFechaHora = new Intl.DateTimeFormat("es-MX", { dateStyle: "short", timeStyle: "short", timeZone: ZONA });
const fmtHora = new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit", timeZone: ZONA });
const fmtDia = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA });

export function numero(valor: number | null | undefined): string {
  return fmtNumero.format(Number(valor ?? 0));
}

export function entero(valor: number | null | undefined): string {
  return fmtEntero.format(Number(valor ?? 0));
}

export function kg(valor: number | null | undefined): string {
  return `${numero(valor)} kg`;
}

const fmtToneladas = new Intl.NumberFormat("es-MX", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Kilos → toneladas con un decimal: 12,450 kg → "12.5". */
export function toneladas(kg: number | null | undefined): string {
  return fmtToneladas.format(Number(kg ?? 0) / 1000);
}

/** Abreviatura del tipo de pago: Rendimiento "R", Pactado "P", Corrida "C" (otra: su primera letra). */
export function abreviaturaPago(clave: string | null | undefined, nombre?: string | null): string {
  const fijas: Record<string, string> = { rendimiento: "R", pactado: "P", corrida: "C" };
  return (clave && fijas[clave]) ?? (nombre ?? clave ?? "?").charAt(0).toUpperCase();
}

/** "$1,234.56" o "—". */
export function dinero(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return "—";
  return `$${fmtDinero.format(Number(valor))}`;
}

/** "tope $15.00/kg" en Precio Pactado (el precio del día es el tope), "$15.00/kg" o "sin asignar". */
export function precioTxt(precio: number | null | undefined, tipoClave?: string | null): string {
  if (precio === null || precio === undefined) return "sin asignar";
  return `${tipoClave === "pactado" ? "tope " : ""}${dinero(precio)}/kg`;
}

export function fechaHora(valor: string | null | undefined): string {
  return valor ? fmtFechaHora.format(new Date(valor)) : "—";
}

export function hora(valor: string | null | undefined): string {
  return valor ? fmtHora.format(new Date(valor)) : "—";
}

/** Hoy en México como YYYY-MM-DD. */
export function hoyMexico(ahora: Date = new Date()): string {
  return fmtDia.format(ahora);
}

const fmtDiaCorto = new Intl.DateTimeFormat("es-MX", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" });

/**
 * Los próximos `n` días de México (hoy incluido) para elegir la fecha de llegada: "Hoy", "Mañana",
 * "vie 20/11"… Se suma sobre la fecha de México a mediodía UTC para que el día no cambie por la zona.
 */
export function diasProximos(n = 7, ahora: Date = new Date()): { fecha: string; texto: string }[] {
  const [a, m, d] = hoyMexico(ahora).split("-").map(Number);
  return Array.from({ length: n }, (_, i) => {
    const dia = new Date(Date.UTC(a!, m! - 1, d! + i, 12));
    const fecha = dia.toISOString().slice(0, 10);
    const texto = i === 0 ? "Hoy" : i === 1 ? "Mañana" : fmtDiaCorto.format(dia).replace(",", "").replace(".", "");
    return { fecha, texto };
  });
}

/** Suma (o resta) días a una fecha YYYY-MM-DD, a mediodía UTC para que no cambie de día por la zona. */
export function sumarDias(fecha: string, dias: number): string {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(a!, m! - 1, d! + dias, 12)).toISOString().slice(0, 10);
}

/** Periodos del historial: "Hoy" y los últimos 7 o 30 días contados en días de México (hoy incluido). */
export type Periodo = "todo" | "hoy" | "7" | "30";

export function desdePeriodo(periodo: Periodo, ahora: Date = new Date()): string | undefined {
  const hoy = hoyMexico(ahora);
  if (periodo === "hoy") return hoy;
  if (periodo === "7") return sumarDias(hoy, -6);
  if (periodo === "30") return sumarDias(hoy, -29);
  return undefined;
}

/** Fecha de negocio (YYYY-MM-DD, ya es del día de México) → "Hoy", "Ayer" o "11/11/2026". */
export function fechaNegocio(valor: string | null | undefined, ahora: Date = new Date()): string {
  if (!valor) return "—";
  const dia = valor.slice(0, 10);
  const hoy = hoyMexico(ahora);
  if (dia === hoy) return "Hoy";
  if (dia === hoyMexico(new Date(ahora.getTime() - 86_400_000))) return "Ayer";
  const [a, m, d] = dia.split("-");
  return a && m && d ? `${d}/${m}/${a}` : valor;
}

/** "Hoy · 14:30" o "11/11/26 14:30" para instantes (avisos, movimientos). */
export function cuando(valor: string | null | undefined, ahora: Date = new Date()): string {
  if (!valor) return "—";
  const instante = new Date(valor);
  return hoyMexico(instante) === hoyMexico(ahora) ? `Hoy · ${hora(valor)}` : fechaHora(valor);
}

const fmtPartes = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: ZONA,
});

/** Instante → "17/11/2026 14:30" en hora de México (el formato del campo de fecha y hora). */
export function fechaHoraCampo(valor: string | Date | null | undefined): string {
  if (!valor) return "";
  const partes = Object.fromEntries(fmtPartes.formatToParts(new Date(valor)).map((p) => [p.type, p.value]));
  const horas = partes.hour === "24" ? "00" : partes.hour;
  return `${partes.day}/${partes.month}/${partes.year} ${horas}:${partes.minute}`;
}

/**
 * "17/11/2026 14:30" (también "7/1/2026 9:05") → "2026-11-17T14:30:00", sin zona: la API lo toma en
 * hora de México. `null` si no es una fecha y hora reales.
 */
export function leerFechaHoraCampo(texto: string): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/.exec(texto.trim());
  if (!m) return null;
  const [d, mes, a, h, min] = m.slice(1).map(Number) as [number, number, number, number, number];
  if (h > 23 || min > 59) return null;
  const dia = new Date(Date.UTC(a, mes - 1, d));
  if (dia.getUTCFullYear() !== a || dia.getUTCMonth() !== mes - 1 || dia.getUTCDate() !== d) return null;
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${a}-${dos(mes)}-${dos(d)}T${dos(h)}:${dos(min)}:00`;
}

/** Iniciales del proveedor para el avatar: "Rancho Los Mezquites" → "RL". */
export function iniciales(nombre: string): string {
  const palabras = nombre
    .replace(/[^A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ\s]/g, " ")
    .split(/\s+/)
    .filter((p) => p.length > 0);
  const letras = palabras.slice(0, 2).map((p) => p[0]!.toUpperCase());
  return letras.join("") || "?";
}

export const ESTADO_PB: Record<string, string> = {
  pendiente: "Pendiente",
  en_bascula: "En báscula",
  en_proceso: "En proceso",
  terminado: "Terminado",
  terminado_con_incidencias: "Con incidencias",
};

export const TIPO_INCIDENCIA: Record<string, string> = {
  cierre_manual: "Cierre a mano",
  sobre_entrega: "Sobre-entrega",
  faltante: "Faltante",
  proveedor_distinto: "Proveedor distinto",
  sin_preboleta: "Sin preboleta",
  cambio_proveedor: "Cambio de proveedor",
};

export const ESTADO_INCIDENCIA: Record<string, string> = {
  pendiente: "Pendiente",
  autorizada: "Autorizada",
  rechazada: "Rechazada",
  conciliada: "Conciliada",
  descartada: "Descartada",
  cancelada: "Cancelada",
  registrada: "Registrada",
  resuelta_sola: "Resuelta sola",
};

/** Por qué una boleta quedó por conciliar (mismos textos del panel). */
export const MOTIVO_CONCILIACION: Record<string, string> = {
  sin_preboleta: "Llegó la 1ra pesada y la báscula estaba libre.",
  proveedor_distinto: "El proveedor de la boleta no es el de la preboleta que estaba en báscula.",
  cambio_proveedor: "La boleta ya estaba ligada y D365 le cambió el proveedor.",
};

/** Permisos por unidad (`permisos_colaborador`), con los textos del panel. */
export const PERMISO: Record<"autorizar_precios" | "precios_diarios", string> = {
  autorizar_precios: "Autorizar precios",
  precios_diarios: "Precios diarios",
};

/** Estado de la entrega de un aviso por correo o push. */
export const ESTADO_ENTREGA: Record<string, string> = {
  pendiente: "pendiente",
  enviada: "enviado",
  fallida: "falló",
};

export const ROL: Record<string, string> = {
  Admin: "Admin",
  Comprador: "Comprador",
  Basculista: "Basculista",
};
