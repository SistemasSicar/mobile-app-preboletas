/**
 * Notificaciones push (Expo → FCM). Al iniciar sesión se registra el teléfono en la API de Preboletas
 * (`POST /dispositivos`); al cerrar sesión se da de baja (`DELETE /dispositivos/{token}`).
 *
 * - Si la persona niega el permiso, la app sigue igual: los avisos llegan a la campana.
 * - Para recibir push hacen falta el teléfono registrado Y el canal `push` que da el Admin en el panel.
 * - Canal de Android `avisos` con importancia alta. (Hoy la API no manda `channelId`; ver CLAUDE.md §6.)
 * - El push nunca trae precios ni montos.
 */
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { api } from "@/api/cliente";
import type { Ok } from "@/api/tipos";

const LLAVE_TOKEN_PUSH = "pb_push_token";
export const CANAL_AVISOS = "avisos";

/** Se llama una vez al arrancar: cómo se muestran los avisos con la app abierta. */
export function configurarNotificaciones(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function crearCanal(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CANAL_AVISOS, {
    name: "Avisos de Preboletas",
    importance: AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 150, 250],
  });
}

function idProyecto(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/**
 * Pide permiso (Android 13+), obtiene el token de Expo y lo registra en la API.
 * Nunca lanza: si algo falla, la app sigue sin push.
 */
export async function registrarDispositivo(): Promise<void> {
  try {
    if (!Device.isDevice) return; // El emulador no recibe push.
    // El canal debe existir ANTES de pedir el token para que Android 13+ muestre el permiso.
    await crearCanal();
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") ({ status } = await Notifications.requestPermissionsAsync());
    if (status !== "granted") return;

    const projectId = idProyecto();
    if (!projectId) {
      console.warn("Push: falta el id. del proyecto de EAS en app.config.ts (ID_PROYECTO_EAS).");
      return;
    }
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await api.post<Ok>("/dispositivos", {
      token,
      plataforma: "android",
      nombre_dispositivo: (Device.modelName ?? "Android").slice(0, 100),
    });
    await SecureStore.setItemAsync(LLAVE_TOKEN_PUSH, token);
  } catch (e) {
    console.warn("Push: no se pudo registrar el teléfono.", e instanceof Error ? e.message : e);
  }
}

/** Al cerrar sesión: el teléfono deja de recibir los avisos de esta persona. Nunca lanza. */
export async function darDeBajaDispositivo(): Promise<void> {
  try {
    const token = await SecureStore.getItemAsync(LLAVE_TOKEN_PUSH);
    if (token) await api.del<Ok>(`/dispositivos/${encodeURIComponent(token)}`);
  } catch {
    // Sin red o sesión vencida: la API dará de baja el token cuando Expo lo reporte inválido.
  } finally {
    await SecureStore.deleteItemAsync(LLAVE_TOKEN_PUSH).catch(() => undefined);
  }
}

const TIPOS_CONCILIACION = new Set(["proveedor_distinto", "sin_preboleta", "cambio_proveedor"]);

function idValido(valor: unknown): number | null {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Pantalla que abre un aviso (push o campana) al tocarlo. El push trae `preboleta_id`, `incidencia_id`
 * o `propuesta_id`; la campana además trae `incidencia_tipo`.
 * - Incidencia de conciliación (por su tipo, o sin preboleta: "sin preboleta" siempre es de conciliación) → conciliarla.
 * - Con preboleta → su detalle (ahí se ven sus incidencias, propuestas y cargas por conciliar).
 * - Propuesta sin preboleta → lista de propuestas. Si no, la campana.
 */
export function rutaDeAviso(datos: Record<string, unknown> | undefined): string {
  const preboletaId = idValido(datos?.preboleta_id);
  const incidenciaId = idValido(datos?.incidencia_id);
  const tipo = typeof datos?.incidencia_tipo === "string" ? datos.incidencia_tipo : null;
  if (incidenciaId && (TIPOS_CONCILIACION.has(tipo ?? "") || !preboletaId)) return `/conciliacion/${incidenciaId}`;
  if (preboletaId) return `/preboleta/${preboletaId}`;
  if (idValido(datos?.propuesta_id)) return "/propuestas";
  return "/avisos";
}
