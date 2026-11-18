/**
 * Único lugar donde se leen las variables `EXPO_PUBLIC_*` (públicas: van dentro del APK).
 * Si falta alguna, la app truena al arrancar con un mensaje claro en lugar de fallar más adelante.
 *
 * Ojo: Expo reemplaza `process.env.EXPO_PUBLIC_X` al empaquetar, así que cada variable se lee
 * escrita completa (no sirve `process.env[nombre]`).
 */

function requerida(nombre: string, valor: string | undefined): string {
  const limpio = (valor ?? "").trim();
  if (!limpio) {
    throw new Error(
      `Falta ${nombre}. En desarrollo va en mobile-app-preboletas/.env (ver .env.example); en los builds, en eas.json.`,
    );
  }
  return limpio.replace(/\/+$/, "");
}

export const configuracion = {
  apiUrl: requerida("EXPO_PUBLIC_API_URL", process.env.EXPO_PUBLIC_API_URL),
  wsUrl: requerida("EXPO_PUBLIC_WS_URL", process.env.EXPO_PUBLIC_WS_URL),
  entraTenantId: requerida("EXPO_PUBLIC_ENTRA_TENANT_ID", process.env.EXPO_PUBLIC_ENTRA_TENANT_ID),
  entraClientId: requerida("EXPO_PUBLIC_ENTRA_CLIENT_ID", process.env.EXPO_PUBLIC_ENTRA_CLIENT_ID),
} as const;
