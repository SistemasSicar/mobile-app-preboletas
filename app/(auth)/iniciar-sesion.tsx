/**
 * Inicio de sesión: fondo verde, un mensaje corto de lo que hace la app y el botón blanco
 * "Iniciar sesión con Microsoft" abajo (estilo del mockup `docs/mockup/01-inicio-sesion.png`).
 * Aquí también se muestra por qué se cerró la sesión (sin acceso, sesión vencida) o si la API no responde.
 */
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { View } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Logo } from "@/componentes/Logo";
import { Boton, Mensaje, Texto } from "@/componentes/ui";
import { useSesion } from "@/sesion/Sesion";
import { useTema } from "@/tema/tema";
import { espacio, tamano } from "@/tema/tipografia";

/** Cuadros de Microsoft para el botón (sus colores oficiales; no son de la paleta de la app). */
function MarcaMicrosoft() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" accessibilityElementsHidden>
      <Rect x={0} y={0} width={9.5} height={9.5} fill="#F25022" />
      <Rect x={10.5} y={0} width={9.5} height={9.5} fill="#7FBA00" />
      <Rect x={0} y={10.5} width={9.5} height={9.5} fill="#00A4EF" />
      <Rect x={10.5} y={10.5} width={9.5} height={9.5} fill="#FFB900" />
    </Svg>
  );
}

export default function IniciarSesion() {
  const { c } = useTema();
  const inset = useSafeAreaInsets();
  const { estado, iniciarSesion, reintentar } = useSesion();
  const [entrando, setEntrando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mensajeSesion = estado.tipo === "sin_sesion" ? estado.mensaje : undefined;
  const sinConexion = estado.tipo === "error";

  const entrar = async () => {
    setError(null);
    setEntrando(true);
    const problema = await iniciarSesion();
    setEntrando(false);
    if (problema) setError(problema);
  };

  return (
    <LinearGradient
      colors={[c.encabezadoInicio, c.encabezadoFin]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.4, y: 1 }}
      style={{
        flex: 1,
        paddingTop: inset.top + espacio.xl,
        paddingBottom: inset.bottom + espacio.xl,
        paddingHorizontal: espacio.xl,
        justifyContent: "space-between",
      }}
    >
      <Logo alto={30} sobreVerde />

      <View style={{ gap: espacio.m }}>
        <Texto peso="negrita" t={tamano.chico} color={c.marcaLima} estilo={{ letterSpacing: 1.5 }}>
          PREBOLETAS
        </Texto>
        <Texto peso="extra" t={38} color={c.sobreEncabezado} estilo={{ lineHeight: 44 }}>
          Recibe la fruta con la preboleta en la mano.
        </Texto>
        <Texto t={tamano.grande} color={c.sobreEncabezadoSuave}>
          Lee el QR en báscula, registra la entrada del camión y sigue cada preboleta y sus boletas al momento.
        </Texto>
      </View>

      <View style={{ gap: espacio.m }}>
        {sinConexion ? (
          <Mensaje
            tipo="aviso"
            titulo="No se pudo abrir tu sesión"
            texto={estado.mensaje}
            accion={<Boton texto="Reintentar" icono="refrescar" variante="secundario" onPress={reintentar} />}
          />
        ) : null}
        {mensajeSesion && !error ? <Mensaje tipo="info" texto={mensajeSesion} /> : null}
        {error ? <Mensaje tipo="peligro" texto={error} /> : null}

        {!sinConexion ? (
          <Boton
            texto={entrando ? "Abriendo Microsoft…" : "Iniciar sesión con Microsoft"}
            variante="claro"
            grande
            cargando={entrando}
            adorno={<MarcaMicrosoft />}
            onPress={entrar}
          />
        ) : null}
        <Texto t={tamano.chico} color={c.sobreEncabezadoSuave} centrado>
          Solo cuentas corporativas de SICAR
        </Texto>
      </View>
    </LinearGradient>
  );
}
