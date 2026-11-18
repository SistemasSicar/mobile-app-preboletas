/**
 * Botón flotante de Inicio (abajo a la derecha, al alcance del pulgar).
 * - Con UNA opción (Comprador: nueva preboleta; Basculista: escanear QR) es un círculo solo con el ícono.
 * - Con DOS (Admin, o quien sea Comprador y Basculista) el círculo abre las dos opciones, con ícono y texto,
 *   sobre un velo oscuro. Tocar el velo, el botón (ahora "cerrar") o "regresar" de Android las cierra.
 * Sin texto en el círculo, el `accessibilityLabel` dice qué hace.
 */
import { useEffect, useState } from "react";
import { BackHandler, Pressable, StyleSheet, View } from "react-native";

import { useTema } from "@/tema/tema";
import { espacio, radio } from "@/tema/tipografia";
import { Icono, type NombreIcono } from "./Iconos";
import { Texto } from "./ui";

export interface OpcionFlotante {
  icono: NombreIcono;
  /** Texto junto al ícono cuando hay varias opciones. */
  texto: string;
  /** Lo que lee el lector de pantalla. */
  etiqueta: string;
  onPress: () => void;
}

/** Alto del círculo + margen: lo que la lista de abajo debe dejar libre para que la última tarjeta no quede tapada. */
export const ALTO_BOTON_FLOTANTE = 56 + espacio.l;

function Circulo({ icono, etiqueta, onPress, expandido }: { icono: NombreIcono; etiqueta: string; onPress: () => void; expandido?: boolean }) {
  const { c } = useTema();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={expandido === undefined ? undefined : { expanded: expandido }}
      android_ripple={{ color: c.onda, borderless: true }}
      style={({ pressed }) => ({
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: c.acento,
        alignItems: "center",
        justifyContent: "center",
        elevation: 4,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Icono nombre={icono} color={c.acentoTexto} tamano={28} />
    </Pressable>
  );
}

export function BotonFlotante({ opciones }: { opciones: OpcionFlotante[] }) {
  const { c } = useTema();
  const [abierto, setAbierto] = useState(false);

  // "Regresar" de Android cierra las opciones antes de salir de la pantalla.
  useEffect(() => {
    if (!abierto) return;
    const s = BackHandler.addEventListener("hardwareBackPress", () => {
      setAbierto(false);
      return true;
    });
    return () => s.remove();
  }, [abierto]);

  if (opciones.length === 0) return null;
  const posicion = { position: "absolute" as const, right: espacio.l, bottom: espacio.l };

  if (opciones.length === 1) {
    const o = opciones[0]!;
    return (
      <View style={posicion}>
        <Circulo icono={o.icono} etiqueta={o.etiqueta} onPress={o.onPress} />
      </View>
    );
  }

  return (
    <>
      {abierto ? (
        <Pressable
          onPress={() => setAbierto(false)}
          accessibilityRole="button"
          accessibilityLabel="Cerrar opciones"
          style={[StyleSheet.absoluteFill, { backgroundColor: c.velo }]}
        />
      ) : null}
      <View style={[posicion, { alignItems: "flex-end", gap: espacio.m }]}>
        {abierto
          ? opciones.map((o) => (
              <Pressable
                key={o.texto}
                onPress={() => {
                  setAbierto(false);
                  o.onPress();
                }}
                accessibilityRole="button"
                accessibilityLabel={o.etiqueta}
                android_ripple={{ color: c.onda }}
                style={({ pressed }) => ({
                  minHeight: 48,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: espacio.s,
                  paddingHorizontal: espacio.l,
                  borderRadius: radio.pildora,
                  backgroundColor: c.superficie,
                  elevation: 3,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Icono nombre={o.icono} color={c.acento} />
                <Texto peso="negrita">{o.texto}</Texto>
              </Pressable>
            ))
          : null}
        <Circulo
          icono={abierto ? "cerrar" : "agregar"}
          etiqueta={abierto ? "Cerrar opciones" : "Abrir opciones: nueva preboleta o escanear QR"}
          expandido={abierto}
          onPress={() => setAbierto((a) => !a)}
        />
      </View>
    </>
  );
}
