/**
 * Cliente HTTP de la API de Preboletas (la ÚNICA con la que habla la app).
 *
 * - Manda el token de Microsoft como `Authorization: Bearer`.
 * - Con `401 token_expirado` renueva en silencio y reintenta UNA vez. Si la renovación falla, la sesión
 *   termina (ver `sesion/tokens.ts`).
 * - Los errores salen como `ErrorApi {estado, codigo, mensaje, idSolicitud}` o `ErrorSinConexion`.
 * - Nada se guarda para reintentar después: si no hay conexión, la persona decide reintentar.
 */
import { configuracion } from "@/config";
import { renovar, tokenVigente } from "@/sesion/tokens";
import { ErrorApi, ErrorSinConexion } from "./errores";

const TIEMPO_LIMITE_MS = 20_000;

type Metodo = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

async function llamar(metodo: Metodo, ruta: string, cuerpo: unknown, token: string): Promise<Response> {
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), TIEMPO_LIMITE_MS);
  try {
    return await fetch(`${configuracion.apiUrl}${ruta}`, {
      method: metodo,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(cuerpo !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
      signal: control.signal,
    });
  } catch {
    // fetch solo lanza si no hubo respuesta (red, DNS, tiempo agotado).
    throw new ErrorSinConexion();
  } finally {
    clearTimeout(reloj);
  }
}

async function aError(r: Response): Promise<ErrorApi> {
  try {
    const datos = (await r.json()) as { codigo?: string; mensaje?: string; id_solicitud?: string | null };
    return new ErrorApi(
      r.status,
      datos.codigo ?? "error_interno",
      datos.mensaje ?? "Ocurrió un error inesperado.",
      datos.id_solicitud ?? null,
    );
  } catch {
    const codigo = r.status >= 500 ? "error_interno" : "respuesta_invalida";
    return new ErrorApi(r.status, codigo, `La API respondió ${r.status}.`);
  }
}

export async function peticion<T>(metodo: Metodo, ruta: string, cuerpo?: unknown): Promise<T> {
  let respuesta = await llamar(metodo, ruta, cuerpo, await tokenVigente());

  if (respuesta.status === 401) {
    const error = await aError(respuesta);
    if (error.codigo !== "token_expirado") throw error;
    // El reloj del teléfono pudo adelantarse al del servidor: renovar y reintentar una sola vez.
    respuesta = await llamar(metodo, ruta, cuerpo, (await renovar()).acceso);
  }
  if (!respuesta.ok) throw await aError(respuesta);
  if (respuesta.status === 204) return undefined as T;
  return (await respuesta.json()) as T;
}

/** Arma `?a=1&b=x` ignorando vacíos (las listas se repiten: `estados=a&estados=b`). */
export function consulta(parametros: Record<string, string | number | boolean | string[] | null | undefined>): string {
  const partes: string[] = [];
  for (const [llave, valor] of Object.entries(parametros)) {
    if (valor === null || valor === undefined || valor === "") continue;
    const valores = Array.isArray(valor) ? valor : [valor];
    for (const v of valores) partes.push(`${encodeURIComponent(llave)}=${encodeURIComponent(String(v))}`);
  }
  return partes.length ? `?${partes.join("&")}` : "";
}

export const api = {
  get: <T>(ruta: string) => peticion<T>("GET", ruta),
  post: <T>(ruta: string, cuerpo?: unknown) => peticion<T>("POST", ruta, cuerpo ?? {}),
  put: <T>(ruta: string, cuerpo?: unknown) => peticion<T>("PUT", ruta, cuerpo ?? {}),
  patch: <T>(ruta: string, cuerpo?: unknown) => peticion<T>("PATCH", ruta, cuerpo ?? {}),
  del: <T>(ruta: string) => peticion<T>("DELETE", ruta),
};
