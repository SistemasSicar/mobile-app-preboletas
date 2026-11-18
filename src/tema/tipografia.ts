/**
 * Tipografía y medidas. Figtree (respaldo de Avenir, que es de licencia) para todo e IBM Plex Mono
 * para folios, cuentas y códigos, igual que el panel. Las cifras van tabulares para que no "bailen".
 */
// Se importa cada peso por separado: el índice del paquete metería TODAS las variantes al APK.
import { Figtree_400Regular } from "@expo-google-fonts/figtree/400Regular";
import { Figtree_500Medium } from "@expo-google-fonts/figtree/500Medium";
import { Figtree_600SemiBold } from "@expo-google-fonts/figtree/600SemiBold";
import { Figtree_700Bold } from "@expo-google-fonts/figtree/700Bold";
import { Figtree_800ExtraBold } from "@expo-google-fonts/figtree/800ExtraBold";
import { IBMPlexMono_500Medium } from "@expo-google-fonts/ibm-plex-mono/500Medium";
import { IBMPlexMono_600SemiBold } from "@expo-google-fonts/ibm-plex-mono/600SemiBold";

/** Se cargan una vez en el layout raíz con `useFonts`. */
export const fuentesACargar = {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  Figtree_800ExtraBold,
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
};

/** En Android cada peso es una familia distinta: no se usa `fontWeight` con fuentes propias. */
export const fuente = {
  normal: "Figtree_400Regular",
  media: "Figtree_500Medium",
  seminegrita: "Figtree_600SemiBold",
  negrita: "Figtree_700Bold",
  extra: "Figtree_800ExtraBold",
  mono: "IBMPlexMono_500Medium",
  monoNegrita: "IBMPlexMono_600SemiBold",
} as const;

/** Tamaños: los datos operativos van en 16 o más (se usa a pleno sol). */
export const tamano = {
  mini: 12,
  chico: 14,
  base: 16,
  grande: 18,
  titulo: 22,
  enorme: 30,
} as const;

export const espacio = {
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 24,
} as const;

/** Radio de tarjetas (el panel usa 10 px; el mockup del teléfono es más redondo). */
export const radio = {
  chico: 8,
  tarjeta: 16,
  pildora: 999,
} as const;

/** Área táctil mínima (dp). */
export const TACTIL_MIN = 48;
