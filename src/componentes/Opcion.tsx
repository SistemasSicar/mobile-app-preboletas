/**
 * Renglón de navegación en tarjeta: ícono, título, detalle, contador rojo opcional y flecha.
 * Lo usan el menú, la pestaña "Incidencias" y Configuración.
 */
import { View } from "react-native";

import { useTema } from "@/tema/tema";
import { espacio, radio, tamano } from "@/tema/tipografia";
import { Icono, type NombreIcono } from "./Iconos";
import { Tarjeta, Texto } from "./ui";

export function Opcion({
  icono,
  titulo,
  detalle,
  conteo = 0,
  onPress,
}: {
  icono: NombreIcono;
  titulo: string;
  detalle: string;
  /** Pendientes que la persona puede resolver; con 0 no se muestra. */
  conteo?: number;
  onPress: () => void;
}) {
  const { c } = useTema();
  return (
    <Tarjeta onPress={onPress} etiqueta={conteo > 0 ? `${titulo}: ${conteo} pendientes` : titulo}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.m }}>
        <Icono nombre={icono} color={c.acento} />
        <View style={{ flex: 1 }}>
          <Texto peso="negrita">{titulo}</Texto>
          <Texto t={tamano.chico} color={c.apagado}>
            {detalle}
          </Texto>
        </View>
        {conteo > 0 ? (
          <View style={{ minWidth: 28, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radio.pildora, backgroundColor: c.peligro, alignItems: "center" }}>
            <Texto peso="negrita" t={tamano.chico} color={c.peligroTexto} tabular>
              {conteo}
            </Texto>
          </View>
        ) : null}
        <Icono nombre="adelante" color={c.apagado} />
      </View>
    </Tarjeta>
  );
}
