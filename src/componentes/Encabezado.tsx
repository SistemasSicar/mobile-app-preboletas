/**
 * Encabezado verde oscuro con degradado (7734 C #266041 → 348 C #00833E), texto blanco y la marca arriba,
 * como en el mockup. Respeta el área segura de arriba (Android dibuja de borde a borde).
 * Lleva el indicador "En línea" con el estado REAL del WebSocket.
 * Arriba a la izquierda: "Regresar" si la pantalla lo pide; si no, el botón de menú (abre `/menu`) junto a la marca.
 * A la derecha del título puede ir un dato corto (`tituloDerecha`), como las toneladas de hoy en Inicio.
 */
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useConexion } from "@/tiempo-real/TiempoReal";
import { useTema } from "@/tema/tema";
import { espacio, tamano } from "@/tema/tipografia";
import { Logo } from "./Logo";
import { BotonIcono, Texto } from "./ui";

export function IndicadorConexion() {
  const { c } = useTema();
  const estado = useConexion();
  const texto = estado === "en_linea" ? "En línea" : estado === "conectando" ? "Conectando…" : "Sin conexión";
  const punto = estado === "en_linea" ? c.marcaLima : estado === "conectando" ? c.conectando : c.desconectado;
  return (
    <View
      accessibilityLabel={`Tiempo real: ${texto}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: c.translucido,
      }}
    >
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: punto }} />
      <Texto peso="seminegrita" t={tamano.mini} color={c.sobreEncabezado}>
        {texto}
      </Texto>
    </View>
  );
}

export function Encabezado({
  etiqueta,
  titulo,
  tituloMono = false,
  onAtras,
  derecha,
  tituloDerecha,
  children,
}: {
  /** Texto pequeño en verde lima arriba del título (ej. "FOLIO", "RECEPCIÓN · BÁSCULA"). */
  etiqueta?: string;
  titulo?: string;
  /** Folios en mono, grandes. */
  tituloMono?: boolean;
  onAtras?: () => void;
  /** Lo de la derecha de la primera fila (chip de estado). Sin esto va el indicador "En línea". */
  derecha?: ReactNode;
  /** Dato corto alineado a la derecha del título (ej. toneladas de hoy). */
  tituloDerecha?: ReactNode;
  children?: ReactNode;
}) {
  const { c } = useTema();
  const inset = useSafeAreaInsets();
  const router = useRouter();
  return (
    <LinearGradient
      colors={[c.encabezadoInicio, c.encabezadoFin]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        paddingTop: inset.top + espacio.s,
        paddingHorizontal: espacio.l,
        paddingBottom: espacio.l,
        gap: espacio.m,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 48 }}>
        {onAtras ? (
          <BotonIcono icono="atras" etiqueta="Regresar" onPress={onAtras} sobreVerde />
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.m }}>
            <BotonIcono icono="mas" etiqueta="Abrir menú" onPress={() => router.push("/menu")} sobreVerde />
            <Logo alto={24} sobreVerde />
          </View>
        )}
        {derecha ?? <IndicadorConexion />}
      </View>
      {etiqueta || titulo ? (
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: espacio.m }}>
          <View style={{ flex: 1, gap: 2 }}>
            {etiqueta ? (
              <Texto peso="negrita" t={tamano.mini} color={c.marcaLima} estilo={{ letterSpacing: 1.2 }}>
                {etiqueta.toUpperCase()}
              </Texto>
            ) : null}
            {titulo ? (
              <Texto
                peso={tituloMono ? "monoNegrita" : "extra"}
                t={tituloMono ? tamano.enorme : tamano.enorme}
                color={c.sobreEncabezado}
                tabular
                lineas={2}
              >
                {titulo}
              </Texto>
            ) : null}
          </View>
          {tituloDerecha}
        </View>
      ) : null}
      {children}
    </LinearGradient>
  );
}
