/**
 * Tokens de Microsoft: guardados en `expo-secure-store` (el de acceso y el de renovación por separado),
 * con copia en memoria para no leer el almacén en cada petición. NUNCA en AsyncStorage, logs ni URLs.
 *
 * - `tokenVigente()` da un token de acceso válido; si vence en menos de 2 min lo renueva antes.
 * - `renovar()` comparte UNA sola promesa: si varias peticiones necesitan renovar a la vez, esperan la misma.
 * - Si Microsoft rechaza la renovación, se avisa a la sesión (`alTerminar`) para volver al inicio de sesión.
 *   Si lo que falla es la red, NO se cierra la sesión: se reporta "sin conexión".
 */
import * as SecureStore from "expo-secure-store";

import { ErrorApi, ErrorSinConexion } from "@/api/errores";
import { renovarTokens, type Tokens } from "./entra";

const LLAVE_ACCESO = "pb_token_acceso";
const LLAVE_RENOVACION = "pb_token_renovacion";
const LLAVE_VENCE = "pb_token_vence";
/** SecureStore puede fallar con valores grandes: los tokens se guardan en trozos. */
const TAMANO_TROZO = 1800;
const MARGEN_MS = 2 * 60 * 1000;

let enMemoria: Tokens | null = null;
let renovacionEnCurso: Promise<Tokens> | null = null;
const alTerminarSesion = new Set<() => void>();
const alRenovar = new Set<() => void>();

async function guardarLargo(llave: string, valor: string): Promise<void> {
  const trozos = Math.ceil(valor.length / TAMANO_TROZO);
  for (let i = 0; i < trozos; i++) {
    await SecureStore.setItemAsync(`${llave}_${i}`, valor.slice(i * TAMANO_TROZO, (i + 1) * TAMANO_TROZO));
  }
  await SecureStore.setItemAsync(`${llave}_n`, String(trozos));
}

async function leerLargo(llave: string): Promise<string | null> {
  const n = Number(await SecureStore.getItemAsync(`${llave}_n`));
  if (!n) return null;
  const partes: string[] = [];
  for (let i = 0; i < n; i++) {
    const parte = await SecureStore.getItemAsync(`${llave}_${i}`);
    if (parte === null) return null;
    partes.push(parte);
  }
  return partes.join("");
}

async function borrarLargo(llave: string): Promise<void> {
  const n = Number(await SecureStore.getItemAsync(`${llave}_n`)) || 0;
  for (let i = 0; i < n; i++) await SecureStore.deleteItemAsync(`${llave}_${i}`);
  await SecureStore.deleteItemAsync(`${llave}_n`);
}

export async function guardarTokens(t: Tokens): Promise<void> {
  enMemoria = t;
  await guardarLargo(LLAVE_ACCESO, t.acceso);
  await guardarLargo(LLAVE_RENOVACION, t.renovacion);
  await SecureStore.setItemAsync(LLAVE_VENCE, String(t.venceEn));
}

/** Lee los tokens guardados (al abrir la app). */
export async function cargarTokens(): Promise<Tokens | null> {
  try {
    const [acceso, renovacion, vence] = await Promise.all([
      leerLargo(LLAVE_ACCESO),
      leerLargo(LLAVE_RENOVACION),
      SecureStore.getItemAsync(LLAVE_VENCE),
    ]);
    enMemoria = acceso && renovacion ? { acceso, renovacion, venceEn: Number(vence) || 0 } : null;
  } catch {
    enMemoria = null;
  }
  return enMemoria;
}

export async function borrarTokens(): Promise<void> {
  enMemoria = null;
  renovacionEnCurso = null;
  await Promise.all([borrarLargo(LLAVE_ACCESO), borrarLargo(LLAVE_RENOVACION), SecureStore.deleteItemAsync(LLAVE_VENCE)]);
}

export function hayTokens(): boolean {
  return enMemoria !== null;
}

/** La sesión se suscribe para volver al inicio de sesión cuando Microsoft rechaza la renovación. */
export function suscribirFinDeSesion(fn: () => void): () => void {
  alTerminarSesion.add(fn);
  return () => alTerminarSesion.delete(fn);
}

/** La sesión se suscribe para volver a pedir `GET /yo` después de cada renovación. */
export function suscribirRenovacion(fn: () => void): () => void {
  alRenovar.add(fn);
  return () => alRenovar.delete(fn);
}

function esErrorDeRed(e: unknown): boolean {
  return e instanceof TypeError || (e instanceof Error && /network|timeout|internet/i.test(e.message));
}

/** Renueva el token de acceso (una sola renovación a la vez). */
export function renovar(): Promise<Tokens> {
  if (renovacionEnCurso) return renovacionEnCurso;
  const actual = enMemoria;
  if (!actual) return Promise.reject(new ErrorApi(401, "sesion_expirada", "Tu sesión expiró."));

  renovacionEnCurso = (async () => {
    try {
      const nuevos = await renovarTokens(actual.renovacion);
      await guardarTokens(nuevos);
      alRenovar.forEach((fn) => fn());
      return nuevos;
    } catch (e) {
      if (esErrorDeRed(e)) throw new ErrorSinConexion();
      // Microsoft rechazó la renovación (vencida, revocada, contraseña cambiada…): a iniciar sesión.
      await borrarTokens().catch(() => undefined);
      alTerminarSesion.forEach((fn) => fn());
      throw new ErrorApi(401, "sesion_expirada", "Tu sesión expiró.");
    } finally {
      renovacionEnCurso = null;
    }
  })();
  return renovacionEnCurso;
}

/** Token de acceso válido para mandar como Bearer. */
export async function tokenVigente(): Promise<string> {
  if (!enMemoria) throw new ErrorApi(401, "sesion_expirada", "Tu sesión expiró.");
  if (enMemoria.venceEn - Date.now() > MARGEN_MS) return enMemoria.acceso;
  return (await renovar()).acceso;
}
