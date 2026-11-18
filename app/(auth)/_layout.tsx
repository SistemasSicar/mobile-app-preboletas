/** Grupo sin sesión: solo la pantalla de inicio de sesión (`/iniciar-sesion`, a donde redirige el layout raíz). */
import { Stack } from "expo-router";

export default function LayoutSinSesion() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="iniciar-sesion" />
    </Stack>
  );
}
