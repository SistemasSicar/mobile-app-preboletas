/**
 * Iconos de línea (24×24) dibujados con react-native-svg, en el mismo estilo que los del panel
 * (`frontend-panel-preboletas/src/components/Iconos.tsx`). Son decorativos: el botón que los lleva
 * tiene su propio texto o `accessibilityLabel`.
 */
import type { ColorValue } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

export type NombreIcono =
  | "inicio"
  | "qr"
  | "campana"
  | "mas"
  | "atras"
  | "adelante"
  | "linterna"
  | "fruta"
  | "camion"
  | "caja"
  | "refrescar"
  | "check"
  | "alerta"
  | "cerrar"
  | "buscar"
  | "persona"
  | "salir"
  | "whatsapp"
  | "compartir"
  | "editar"
  | "agregar"
  | "reloj"
  | "precio"
  | "ajustes";

export function Icono({ nombre, color, tamano = 24 }: { nombre: NombreIcono; color: ColorValue; tamano?: number }) {
  const trazo = { stroke: color, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  return (
    <Svg width={tamano} height={tamano} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
      {dibujo(nombre, trazo, color)}
    </Svg>
  );
}

type Trazo = { stroke: ColorValue; strokeWidth: number; strokeLinecap: "round"; strokeLinejoin: "round"; fill: string };

function dibujo(nombre: NombreIcono, t: Trazo, color: ColorValue) {
  switch (nombre) {
    case "inicio":
      return (
        <>
          <Path {...t} d="M3 10.5 12 3l9 7.5" />
          <Path {...t} d="M5 9.5V21h14V9.5" />
          <Path {...t} d="M10 21v-6h4v6" />
        </>
      );
    case "qr":
      return (
        <>
          <Rect {...t} x={3} y={3} width={7} height={7} rx={1} />
          <Rect {...t} x={14} y={3} width={7} height={7} rx={1} />
          <Rect {...t} x={3} y={14} width={7} height={7} rx={1} />
          <Path {...t} d="M14 14h3v3h-3zM21 14v.01M14 21h.01M17.5 17.5H21V21h-3.5z" />
        </>
      );
    case "campana":
      return (
        <>
          <Path {...t} d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <Path {...t} d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </>
      );
    case "mas":
      return <Path {...t} d="M4 6h16M4 12h16M4 18h16" />;
    case "atras":
      return <Path {...t} d="M15 18l-6-6 6-6" />;
    case "adelante":
      return <Path {...t} d="M9 18l6-6-6-6" />;
    case "linterna":
      return (
        <>
          <Path {...t} d="M18 6c0 2-2 2-2 4v10a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V10c0-2-2-2-2-4V2h12z" />
          <Path {...t} d="M6 6h12M12 12v2" />
        </>
      );
    case "fruta":
      return (
        <>
          <Circle {...t} cx={12} cy={13} r={8} />
          <Path {...t} d="M12 5v16M5.1 9 18.9 17M18.9 9 5.1 17" />
          <Path {...t} d="M12 5c0-1.7 1.3-3 3.5-3" />
        </>
      );
    case "camion":
      return (
        <>
          <Path {...t} d="M2 6h12v10H2z" />
          <Path {...t} d="M14 9h4l3 3v4h-7" />
          <Circle {...t} cx={6.5} cy={18} r={2} fill={color} />
          <Circle {...t} cx={17.5} cy={18} r={2} fill={color} />
        </>
      );
    case "caja":
      return (
        <>
          <Path {...t} d="M3 7l9-4 9 4v10l-9 4-9-4z" />
          <Path {...t} d="M3 7l9 4 9-4M12 11v10" />
        </>
      );
    case "refrescar":
      return (
        <>
          <Path {...t} d="M21 12a9 9 0 1 1-3-6.7L21 8" />
          <Path {...t} d="M21 3v5h-5" />
        </>
      );
    case "check":
      return <Path {...t} d="M20 6 9 17l-5-5" />;
    case "alerta":
      return (
        <>
          <Path {...t} d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
          <Path {...t} d="M12 9v4M12 17h.01" />
        </>
      );
    case "cerrar":
      return <Path {...t} d="M18 6 6 18M6 6l12 12" />;
    case "buscar":
      return (
        <>
          <Circle {...t} cx={11} cy={11} r={7} />
          <Path {...t} d="m20 20-3.5-3.5" />
        </>
      );
    case "persona":
      return (
        <>
          <Circle {...t} cx={12} cy={8} r={4} />
          <Path {...t} d="M4 21a8 8 0 0 1 16 0" />
        </>
      );
    case "salir":
      return (
        <>
          <Path {...t} d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <Path {...t} d="M16 17l5-5-5-5M21 12H9" />
        </>
      );
    case "whatsapp":
      // Globo de mensaje con auricular, en línea (el botón va en verde SiCar, no en el verde de WhatsApp).
      return (
        <>
          <Path {...t} d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
          <Path {...t} strokeWidth={1.6} d="M8.5 8.5c0 3.5 3 6.5 6.5 6.5l1.2-1.6-2.2-1.1-1 1c-1.2-.6-2.2-1.6-2.8-2.8l1-1-1.1-2.2z" />
        </>
      );
    case "compartir":
      return (
        <>
          <Circle {...t} cx={18} cy={5} r={3} />
          <Circle {...t} cx={6} cy={12} r={3} />
          <Circle {...t} cx={18} cy={19} r={3} />
          <Path {...t} d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
        </>
      );
    case "precio":
      // Etiqueta de precio.
      return (
        <>
          <Path {...t} d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" />
          <Circle {...t} cx={7.5} cy={7.5} r={1.5} />
        </>
      );
    case "ajustes":
      // Controles deslizantes.
      return (
        <>
          <Path {...t} d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" />
          <Circle {...t} cx={15} cy={6} r={2} />
          <Circle {...t} cx={9} cy={12} r={2} />
          <Circle {...t} cx={17} cy={18} r={2} />
        </>
      );
    case "reloj":
      return (
        <>
          <Circle {...t} cx={12} cy={12} r={9} />
          <Path {...t} d="M12 7v5l3 2" />
        </>
      );
    case "agregar":
      return <Path {...t} d="M12 5v14M5 12h14" />;
    case "editar":
      return (
        <>
          <Path {...t} d="M12 20h9" />
          <Path {...t} d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
        </>
      );
  }
}
