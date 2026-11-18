/**
 * Piezas básicas de la interfaz con la identidad SiCar Farms: texto, botones, tarjetas, secciones,
 * chips, píldoras, avisos de error y la barra de acción fija abajo. Solo usan tokens del tema.
 * Áreas táctiles de 48 dp o más: la app se usa en báscula, a una mano y a pleno sol.
 */
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { idSolicitudDe, mensajeDeError } from "@/api/errores";
import { colorEstado, type Colores } from "@/tema/colores";
import { useTema } from "@/tema/tema";
import { TACTIL_MIN, espacio, fuente, radio, tamano } from "@/tema/tipografia";
import { ESTADO_PB, iniciales } from "@/formato";
import { Icono, type NombreIcono } from "./Iconos";

// ----------------------------------------------------------------------
// Texto
// ----------------------------------------------------------------------

type Peso = keyof typeof fuente;

export function Texto({
  children,
  peso = "normal",
  t = tamano.base,
  color,
  tabular = false,
  centrado = false,
  lineas,
  estilo,
}: {
  children: ReactNode;
  peso?: Peso;
  t?: number;
  color?: string;
  tabular?: boolean;
  centrado?: boolean;
  lineas?: number;
  estilo?: StyleProp<TextStyle>;
}) {
  const { c } = useTema();
  return (
    <Text
      numberOfLines={lineas}
      style={[
        {
          fontFamily: fuente[peso],
          fontSize: t,
          lineHeight: Math.round(t * 1.3),
          color: color ?? c.texto,
          textAlign: centrado ? "center" : undefined,
          fontVariant: tabular ? ["tabular-nums"] : undefined,
        },
        estilo,
      ]}
    >
      {children}
    </Text>
  );
}

/** Título pequeño en mayúsculas de cada sección (PROVEEDOR, PRODUCTO, TÉRMINOS…). */
export function Seccion({ titulo, children, derecha }: { titulo: string; children: ReactNode; derecha?: ReactNode }) {
  const { c } = useTema();
  return (
    <View style={{ gap: espacio.s }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4 }}>
        <Texto peso="negrita" t={tamano.mini} color={c.apagado} estilo={{ letterSpacing: 1 }}>
          {titulo.toUpperCase()}
        </Texto>
        {derecha}
      </View>
      {children}
    </View>
  );
}

// ----------------------------------------------------------------------
// Contenedores
// ----------------------------------------------------------------------

export function Tarjeta({
  children,
  estilo,
  suave = false,
  franja,
  onPress,
  etiqueta,
}: {
  children: ReactNode;
  estilo?: StyleProp<ViewStyle>;
  /** Fondo verde suave (para el total, como en el mockup). */
  suave?: boolean;
  /** Color de la franja izquierda (estado de la preboleta). */
  franja?: string;
  onPress?: () => void;
  etiqueta?: string;
}) {
  const { c } = useTema();
  const base: ViewStyle = {
    backgroundColor: suave ? c.acentoSuave : c.superficie,
    borderRadius: radio.tarjeta,
    borderWidth: 1,
    borderColor: suave ? c.acentoSuave : c.linea,
    padding: espacio.l,
    overflow: "hidden",
    ...(franja ? { borderLeftWidth: 5, borderLeftColor: franja } : {}),
  };
  if (!onPress) return <View style={[base, estilo]}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      android_ripple={{ color: c.linea }}
      style={({ pressed }) => [base, { opacity: pressed ? 0.85 : 1 }, estilo]}
    >
      {children}
    </Pressable>
  );
}

/** Renglón etiqueta / valor dentro de una tarjeta (términos de la negociación). */
export function Dato({ etiqueta, valor, ultimo = false, mono = false }: { etiqueta: string; valor: ReactNode; ultimo?: boolean; mono?: boolean }) {
  const { c } = useTema();
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: espacio.m,
        paddingVertical: espacio.m,
        borderBottomWidth: ultimo ? 0 : 1,
        borderBottomColor: c.linea,
      }}
    >
      <Texto color={c.apagado} t={tamano.base}>
        {etiqueta}
      </Texto>
      {typeof valor === "string" || typeof valor === "number" ? (
        <Texto peso={mono ? "monoNegrita" : "negrita"} tabular estilo={{ flexShrink: 1, textAlign: "right" }}>
          {valor}
        </Texto>
      ) : (
        valor
      )}
    </View>
  );
}

/** Círculo con las iniciales del proveedor. */
export function Avatar({ nombre, tam = 48 }: { nombre: string; tam?: number }) {
  const { c } = useTema();
  return (
    <View
      style={{
        width: tam,
        height: tam,
        borderRadius: radio.chico + 4,
        backgroundColor: c.acentoSuave,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Texto peso="negrita" t={tamano.base} color={c.acento}>
        {iniciales(nombre)}
      </Texto>
    </View>
  );
}

// ----------------------------------------------------------------------
// Botones
// ----------------------------------------------------------------------

type VarianteBoton = "principal" | "secundario" | "peligro" | "claro";

function coloresBoton(c: Colores, v: VarianteBoton) {
  switch (v) {
    case "principal":
      return { fondo: c.acento, texto: c.acentoTexto, borde: c.acento };
    case "peligro":
      return { fondo: c.peligro, texto: c.peligroTexto, borde: c.peligro };
    case "claro":
      // Botón blanco sobre el verde del inicio de sesión.
      return { fondo: c.botonClaroFondo, texto: c.botonClaroTexto, borde: c.botonClaroFondo };
    default:
      return { fondo: c.superficie, texto: c.texto, borde: c.linea };
  }
}

export function Boton({
  texto,
  onPress,
  variante = "principal",
  icono,
  adorno,
  cargando = false,
  deshabilitado = false,
  grande = false,
  estilo,
}: {
  texto: string;
  onPress: () => void;
  variante?: VarianteBoton;
  icono?: NombreIcono;
  /** Dibujo propio a la izquierda del texto (ej. la marca de Microsoft). */
  adorno?: ReactNode;
  cargando?: boolean;
  deshabilitado?: boolean;
  /** Acción principal de báscula: más alta y con texto más grande. */
  grande?: boolean;
  estilo?: StyleProp<ViewStyle>;
}) {
  const { c } = useTema();
  const col = coloresBoton(c, variante);
  const inactivo = deshabilitado || cargando;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactivo}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactivo, busy: cargando }}
      android_ripple={{ color: c.onda }}
      style={({ pressed }) => [
        {
          minHeight: grande ? 60 : TACTIL_MIN + 4,
          borderRadius: radio.pildora,
          backgroundColor: col.fondo,
          borderWidth: 1.5,
          borderColor: col.borde,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: espacio.s,
          paddingHorizontal: espacio.xl,
          opacity: inactivo ? 0.55 : pressed ? 0.85 : 1,
        },
        estilo,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={col.texto} />
      ) : icono ? (
        <Icono nombre={icono} color={col.texto} tamano={grande ? 24 : 20} />
      ) : (
        adorno ?? null
      )}
      <Texto peso="negrita" t={grande ? tamano.grande : tamano.base} color={col.texto}>
        {texto}
      </Texto>
    </Pressable>
  );
}

/** Botón redondo solo con icono (regresar, linterna…). */
export function BotonIcono({
  icono,
  etiqueta,
  onPress,
  sobreVerde = false,
  activo = false,
}: {
  icono: NombreIcono;
  etiqueta: string;
  onPress: () => void;
  sobreVerde?: boolean;
  activo?: boolean;
}) {
  const { c } = useTema();
  const fondo = activo ? c.marcaLima : sobreVerde ? c.translucido : c.superficie2;
  const color = activo ? c.sobreLima : sobreVerde ? c.sobreEncabezado : c.texto;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      hitSlop={4}
      style={({ pressed }) => ({
        width: TACTIL_MIN,
        height: TACTIL_MIN,
        borderRadius: TACTIL_MIN / 2,
        backgroundColor: fondo,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Icono nombre={icono} color={color} tamano={22} />
    </Pressable>
  );
}

/**
 * Barra abajo con la acción principal (o dos lado a lado), sobre el área segura.
 * `enFlujo`: va al final del layout en vez de flotar (pantallas con teclado, para que suba con él).
 */
export function BarraAccion({ children, enFlujo = false }: { children: ReactNode; enFlujo?: boolean }) {
  const { c } = useTema();
  const inset = useSafeAreaInsets();
  return (
    <View
      style={{
        ...(enFlujo ? {} : { position: "absolute" as const, left: 0, right: 0, bottom: 0 }),
        paddingHorizontal: espacio.l,
        paddingTop: espacio.m,
        paddingBottom: Math.max(inset.bottom, espacio.m) + espacio.xs,
        backgroundColor: c.fondo,
        borderTopWidth: 1,
        borderTopColor: c.linea,
        flexDirection: "row",
        gap: espacio.m,
      }}
    >
      {children}
    </View>
  );
}

/** Espacio para que la barra de acción no tape el final del contenido. */
export const ALTO_BARRA_ACCION = 110;

/**
 * Relleno de abajo para el contenido que se desplaza en pantallas SIN pestañas. Android dibuja de borde a
 * borde: sin esto, lo último (un botón) queda detrás de los botones del sistema (◁ ○ ▢) o de la barra de gestos.
 * `conBarra`: además deja lugar para la `BarraAccion` fija de abajo.
 */
export function useEspacioAbajo(conBarra = false): number {
  const inset = useSafeAreaInsets();
  return inset.bottom + espacio.xl + (conBarra ? ALTO_BARRA_ACCION : 0);
}

// ----------------------------------------------------------------------
// Chips y píldoras
// ----------------------------------------------------------------------

export function ChipEstado({ estado, sobreVerde = false }: { estado: string; sobreVerde?: boolean }) {
  const { c } = useTema();
  const color = colorEstado(c, estado);
  const esBascula = estado === "en_bascula";
  const pendiente = estado === "pendiente";
  // "Pendiente" va solo con borde (como en el panel); los demás, con fondo de su color.
  const fondo = pendiente ? (sobreVerde ? c.translucido : "transparent") : color;
  const texto = pendiente ? (sobreVerde ? c.sobreEncabezado : c.texto) : esBascula ? c.estBasculaTexto : c.sobreColor;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: radio.pildora,
        backgroundColor: fondo,
        borderWidth: pendiente ? 1 : 0,
        borderColor: sobreVerde ? c.sobreEncabezadoSuave : color,
        alignSelf: "flex-start",
      }}
    >
      <Texto peso="negrita" t={tamano.mini} color={texto}>
        {ESTADO_PB[estado] ?? estado}
      </Texto>
    </View>
  );
}

/** Chip de un tipo de movimiento, con el color de su catálogo (`tipos_movimiento.color`). */
export function ChipColor({ texto, color }: { texto: string; color: string }) {
  const { c } = useTema();
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: radio.pildora, backgroundColor: color, alignSelf: "flex-start" }}>
      <Texto peso="negrita" t={tamano.mini} color={c.sobreColor}>
        {texto}
      </Texto>
    </View>
  );
}

export function Pildora({
  texto,
  conteo,
  activa,
  onPress,
}: {
  texto: string;
  conteo?: number;
  activa: boolean;
  onPress: () => void;
}) {
  const { c } = useTema();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: activa }}
      style={{
        minHeight: TACTIL_MIN - 4,
        paddingHorizontal: espacio.l,
        borderRadius: radio.pildora,
        borderWidth: 1,
        borderColor: activa ? c.acento : c.linea,
        backgroundColor: activa ? c.acento : c.superficie,
        flexDirection: "row",
        alignItems: "center",
        gap: espacio.s,
      }}
    >
      <Texto peso="seminegrita" color={activa ? c.acentoTexto : c.texto}>
        {texto}
      </Texto>
      {conteo !== undefined ? (
        <View
          style={{
            minWidth: 24,
            paddingHorizontal: 6,
            borderRadius: radio.pildora,
            backgroundColor: activa ? c.translucidoFuerte : c.acentoSuave,
            alignItems: "center",
          }}
        >
          <Texto peso="negrita" t={tamano.mini} tabular color={activa ? c.acentoTexto : c.acento}>
            {conteo}
          </Texto>
        </View>
      ) : null}
    </Pressable>
  );
}

// ----------------------------------------------------------------------
// Mensajes
// ----------------------------------------------------------------------

type TipoMensaje = "peligro" | "aviso" | "info" | "exito";

/** Recuadro de mensaje. Los errores dicen qué pasó y qué hacer; el id. de solicitud va pequeño (soporte). */
export function Mensaje({
  tipo,
  titulo,
  texto,
  idSolicitud,
  accion,
}: {
  tipo: TipoMensaje;
  titulo?: string;
  texto: string;
  idSolicitud?: string | null;
  accion?: ReactNode;
}) {
  const { c } = useTema();
  const col = {
    peligro: { fondo: c.peligroSuave, texto: c.peligro, icono: "alerta" as const },
    aviso: { fondo: c.avisoSuave, texto: c.aviso, icono: "alerta" as const },
    info: { fondo: c.infoSuave, texto: c.info, icono: "alerta" as const },
    exito: { fondo: c.acentoSuave, texto: c.acento, icono: "check" as const },
  }[tipo];
  return (
    <View style={{ backgroundColor: col.fondo, borderRadius: radio.tarjeta, padding: espacio.l, gap: espacio.s }}>
      <View style={{ flexDirection: "row", gap: espacio.m, alignItems: "flex-start" }}>
        <Icono nombre={col.icono} color={col.texto} />
        <View style={{ flex: 1, gap: 2 }}>
          {titulo ? (
            <Texto peso="negrita" color={col.texto}>
              {titulo}
            </Texto>
          ) : null}
          <Texto color={c.texto}>{texto}</Texto>
          {idSolicitud ? (
            <Texto t={tamano.mini} color={c.apagado} peso="mono">
              Id. de solicitud: {idSolicitud}
            </Texto>
          ) : null}
        </View>
      </View>
      {accion}
    </View>
  );
}

/** Error de la API o de conexión, con botón de reintentar. */
export function MensajeError({ error, onReintentar }: { error: unknown; onReintentar?: () => void }) {
  return (
    <Mensaje
      tipo="peligro"
      texto={mensajeDeError(error)}
      idSolicitud={idSolicitudDe(error)}
      accion={onReintentar ? <Boton texto="Reintentar" icono="refrescar" variante="secundario" onPress={onReintentar} /> : undefined}
    />
  );
}

export function Cargando({ texto = "Cargando…" }: { texto?: string }) {
  const { c } = useTema();
  return (
    <View style={{ padding: espacio.xl, alignItems: "center", gap: espacio.m }}>
      <ActivityIndicator color={c.acento} size="large" />
      <Texto color={c.apagado}>{texto}</Texto>
    </View>
  );
}

export function Vacio({ texto }: { texto: string }) {
  const { c } = useTema();
  return (
    <View style={{ padding: espacio.xl, alignItems: "center" }}>
      <Texto color={c.apagado} centrado>
        {texto}
      </Texto>
    </View>
  );
}
