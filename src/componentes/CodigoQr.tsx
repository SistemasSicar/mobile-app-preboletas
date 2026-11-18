/**
 * Dibuja un código QR con `react-native-svg`. La matriz la calcula `qrcode` (la misma librería del panel,
 * en JavaScript puro: no necesita build nuevo). Siempre negro sobre blanco, también en modo oscuro,
 * para que cualquier lector (la báscula, otro teléfono) lo lea. Codifica el enlace completo (`qr_url`).
 */
import QRCode from "qrcode";
import { useMemo } from "react";
import { View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";

import { useTema } from "@/tema/tema";
import { radio } from "@/tema/tipografia";

/** Margen en módulos alrededor del código (el estándar pide 4; con 2 sigue leyéndose bien en pantalla). */
const MARGEN = 2;

export function CodigoQr({ valor, tamano = 220 }: { valor: string; tamano?: number }) {
  const { c } = useTema();
  // Un solo trazo con un cuadrito por módulo oscuro: mucho más ligero que un <Rect> por módulo.
  const { ruta, lado } = useMemo(() => {
    const qr = QRCode.create(valor, { errorCorrectionLevel: "M" });
    const n = qr.modules.size;
    const datos = qr.modules.data;
    let d = "";
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (datos[y * n + x]) d += `M${x + MARGEN} ${y + MARGEN}h1v1h-1z`;
      }
    }
    return { ruta: d, lado: n + MARGEN * 2 };
  }, [valor]);

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="Código QR de la preboleta"
      style={{ padding: 8, borderRadius: radio.chico, backgroundColor: c.qrFondo, alignSelf: "center" }}
    >
      <Svg width={tamano} height={tamano} viewBox={`0 0 ${lado} ${lado}`}>
        <Rect x={0} y={0} width={lado} height={lado} fill={c.qrFondo} />
        <Path d={ruta} fill={c.qrModulo} />
      </Svg>
    </View>
  );
}
