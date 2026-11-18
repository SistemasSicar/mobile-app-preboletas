/**
 * Layout raíz: fuentes, tema, React Query, sesión y la navegación protegida.
 *
 * - Con sesión (`GET /yo` respondió) se entra a `(app)`; sin sesión, a `(auth)` (inicio de sesión).
 *   Cada grupo protegido dice a dónde ir si no le toca (`redirectTo`): "/" nunca queda sin pantalla.
 * - La pantalla de arranque (splash) sigue arriba mientras cargan las fuentes y la sesión.
 * - React Query: si una consulta recibe 401 o "sin acceso", la sesión decide si termina.
 */
import { useFonts } from "expo-font";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorApi, esSinConexion } from "@/api/errores";
import { configurarNotificaciones } from "@/push/push";
import { ProveedorSesion, useSesion } from "@/sesion/Sesion";
import { ProveedorTema, useTema } from "@/tema/tema";
import { fuentesACargar } from "@/tema/tipografia";

void SplashScreen.preventAutoHideAsync();
configurarNotificaciones();

/** Puente para que la caché de React Query avise a la sesión (que vive dentro del proveedor). */
const revisorDeErrores: { actual: (e: unknown) => void } = { actual: () => undefined };

function crearClienteConsultas() {
  return new QueryClient({
    queryCache: new QueryCache({ onError: (e) => revisorDeErrores.actual(e) }),
    mutationCache: new MutationCache({ onError: (e) => revisorDeErrores.actual(e) }),
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        // No insistir con errores de negocio (404, 409…): solo con fallas de red o del servidor.
        retry: (intentos, e: unknown) => intentos < 2 && (esSinConexion(e) || (e instanceof ErrorApi && e.estado >= 500)),
      },
      mutations: { retry: false }, // Nunca se repite una entrada de báscula sola.
    },
  });
}

function Navegacion() {
  const { estado, revisarError } = useSesion();
  const { c, esOscuro } = useTema();
  const conSesion = estado.tipo === "con_sesion";

  useEffect(() => {
    revisorDeErrores.actual = revisarError;
  }, [revisarError]);

  useEffect(() => {
    if (estado.tipo !== "cargando") void SplashScreen.hideAsync();
  }, [estado.tipo]);

  if (estado.tipo === "cargando") return null;

  return (
    <>
      {/* Todas las pantallas llevan el encabezado verde: íconos claros en la barra de estado. */}
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.fondo }, animation: esOscuro ? "fade" : "default" }}>
        {/* `redirectTo` es obligatorio aquí: sin él, Expo Router manda al grupo "/(auth)", que no tiene
            index, y "/" queda en "Unmatched Route". Cubre abrir sin sesión y cerrar sesión. */}
        <Stack.Protected guard={conSesion} redirectTo="/iniciar-sesion">
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        {/* Al terminar de iniciar sesión, la pantalla de inicio de sesión queda protegida y lleva a Inicio. */}
        <Stack.Protected guard={!conSesion} redirectTo="/">
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function LayoutRaiz() {
  const [fuentesListas, errorFuentes] = useFonts(fuentesACargar);
  const [clienteConsultas] = useState(crearClienteConsultas);

  // Sin fuentes no se dibuja nada (el splash sigue arriba). Si fallan, se sigue con la del sistema.
  if (!fuentesListas && !errorFuentes) return null;

  return (
    <SafeAreaProvider>
      <ProveedorTema>
        <QueryClientProvider client={clienteConsultas}>
          <ProveedorSesion>
            <Navegacion />
          </ProveedorSesion>
        </QueryClientProvider>
      </ProveedorTema>
    </SafeAreaProvider>
  );
}
