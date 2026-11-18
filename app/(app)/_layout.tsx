/**
 * Grupo con sesión. Aquí viven:
 * - el tiempo real (WebSocket) mientras haya sesión,
 * - el registro del teléfono para push y la apertura de la pantalla al tocar un aviso
 *   (también cuando el push abrió la app desde cerrada).
 */
import * as Notifications from "expo-notifications";
import { Stack, useRouter, type Href } from "expo-router";
import { useEffect } from "react";

import { registrarDispositivo, rutaDeAviso } from "@/push/push";
import { ProveedorTiempoReal } from "@/tiempo-real/TiempoReal";
import { useTema } from "@/tema/tema";

export const unstable_settings = {
  // Al abrir un detalle desde un push, "regresar" lleva a las pestañas.
  anchor: "(pestanas)",
};

export default function LayoutConSesion() {
  const { c } = useTema();
  const router = useRouter();

  useEffect(() => {
    void registrarDispositivo();

    const abrir = (r: Notifications.NotificationResponse) => {
      const datos = r.notification.request.content.data as Record<string, unknown> | undefined;
      router.push(rutaDeAviso(datos) as Href);
      // Que el mismo aviso no vuelva a abrir la pantalla en el siguiente arranque.
      Notifications.clearLastNotificationResponse();
    };

    const ultima = Notifications.getLastNotificationResponse();
    if (ultima) abrir(ultima);
    const suscripcion = Notifications.addNotificationResponseReceivedListener(abrir);
    return () => suscripcion.remove();
  }, [router]);

  return (
    <ProveedorTiempoReal>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.fondo } }}>
        <Stack.Screen name="(pestanas)" />
        <Stack.Screen name="leer-qr" />
        <Stack.Screen name="preboleta/nueva" />
        <Stack.Screen name="preboleta/[id]/index" />
        <Stack.Screen name="preboleta/[id]/entrada" />
        {/* El menú entra desde la izquierda, como el botón que lo abre. */}
        <Stack.Screen name="menu" options={{ animation: "slide_from_left" }} />
        <Stack.Screen name="perfil" />
        {/* Pendientes (Fase 2) */}
        <Stack.Screen name="incidencias" />
        <Stack.Screen name="propuestas" />
        <Stack.Screen name="conciliacion/index" />
        <Stack.Screen name="conciliacion/[id]" />
        {/* Fase 3 */}
        <Stack.Screen name="historial" />
        <Stack.Screen name="precios/index" />
        <Stack.Screen name="precios/[unidad]" />
        {/* Configuración (solo Admin) */}
        <Stack.Screen name="configuracion/index" />
        <Stack.Screen name="configuracion/unidades" />
        <Stack.Screen name="configuracion/colaboradores" />
        <Stack.Screen name="configuracion/envios" />
      </Stack>
    </ProveedorTiempoReal>
  );
}
