/**
 * Pantalla de carga con el isologo de SiCar Farms al centro, un indicador y un texto corto.
 * Para listas que deben aparecer completas de una vez (sin renglones a medio llenar).
 */
import { ActivityIndicator, View } from "react-native";

import { useTema } from "@/tema/tema";
import { espacio } from "@/tema/tipografia";
import { Logo } from "./Logo";
import { Texto } from "./ui";

export function CargaConLogo({ texto }: { texto: string }) {
  const { c } = useTema();
  return (
    <View
      style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: espacio.xl, gap: espacio.l }}
      accessibilityRole="progressbar"
      accessibilityLabel={texto}
    >
      <Logo alto={40} />
      <ActivityIndicator color={c.acento} size="large" />
      <Texto color={c.apagado} centrado>
        {texto}
      </Texto>
    </View>
  );
}
