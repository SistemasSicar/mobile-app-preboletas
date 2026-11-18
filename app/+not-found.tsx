/**
 * Ruta que no existe (por ejemplo, un enlace o un push con una dirección vieja). Reemplaza la pantalla en
 * inglés de Expo Router. No redirige sola para no formar un ciclo: la persona toca "Ir al inicio" y "/"
 * la lleva a Inicio o al inicio de sesión, según tenga sesión.
 * Vive fuera de los grupos, así que no usa el `Encabezado` (necesita el tiempo real, que solo hay con sesión).
 */
import { useRouter } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Boton, Mensaje } from "@/componentes/ui";
import { useTema } from "@/tema/tema";
import { espacio } from "@/tema/tipografia";

export default function NoEncontrada() {
  const { c } = useTema();
  const router = useRouter();
  const inset = useSafeAreaInsets();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: c.fondo,
        justifyContent: "center",
        padding: espacio.l,
        paddingTop: inset.top + espacio.l,
        paddingBottom: inset.bottom + espacio.l,
      }}
    >
      <Mensaje
        tipo="info"
        titulo="No encontramos esa pantalla"
        texto="El enlace ya no existe o está incompleto."
        accion={<Boton texto="Ir al inicio" onPress={() => router.replace("/")} />}
      />
    </View>
  );
}
