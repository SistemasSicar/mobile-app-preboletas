/**
 * Piezas de formulario de la app, con la identidad SiCar Farms y áreas táctiles de 48 dp:
 * - `Desplegable`: un botón que abre el formulario DENTRO de la tarjeta (como el panel), con "Cerrar".
 *   Es la confirmación en la misma pantalla que piden las acciones delicadas: nunca un `Alert` solo.
 * - `CampoTexto`: etiqueta, campo, ayuda y error debajo. Teclado numérico o decimal cuando se pide.
 * - `Selector`: opciones en píldoras que se acomodan en varias líneas (unidad, fruta, tipo de pago…).
 * - `Interruptor`: sí / no con su texto.
 * - `ListaOpciones`: elegir uno de una lista de textos largos (círculo de selección).
 * - `FormDecision`: comentario opcional + "Rechazar" / "Autorizar".
 * - `ConfirmarCambio`: resumen de lo que se va a guardar + "No" / "Sí, guardar".
 * - `useConEspera`: aplica un texto de búsqueda 400 ms después de dejar de escribir.
 */
import { useEffect, useState, type ReactNode } from "react";
import { Keyboard, Pressable, Switch, TextInput, View, type KeyboardTypeOptions } from "react-native";

import { useTema } from "@/tema/tema";
import { TACTIL_MIN, espacio, fuente, radio, tamano } from "@/tema/tipografia";
import type { NombreIcono } from "./Iconos";
import { Boton, Pildora, Texto } from "./ui";

/**
 * ¿Está abierto el teclado? Sirve para esconder la barra de acción fija de abajo mientras se escribe
 * en un formulario dentro de la pantalla: si no, la barra sube con el teclado y tapa el campo.
 */
export function useTecladoAbierto(): boolean {
  const [abierto, setAbierto] = useState(false);
  useEffect(() => {
    const mostrar = Keyboard.addListener("keyboardDidShow", () => setAbierto(true));
    const ocultar = Keyboard.addListener("keyboardDidHide", () => setAbierto(false));
    return () => {
      mostrar.remove();
      ocultar.remove();
    };
  }, []);
  return abierto;
}

/** Valor que se aplica `ms` después del último cambio (para no pedir a la API en cada tecla). */
export function useConEspera<T>(valor: T, ms = 400): T {
  const [aplicado, setAplicado] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setAplicado(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return aplicado;
}

export function Desplegable({
  texto,
  icono,
  peligro = false,
  titulo,
  children,
}: {
  /** Texto del botón que abre el formulario. */
  texto: string;
  icono?: NombreIcono;
  /** Acción delicada (cerrar a mano…): botón y recuadro en rojo suave. */
  peligro?: boolean;
  /** Título dentro del recuadro abierto (si no, se repite `texto`). */
  titulo?: string;
  /** Recibe `cerrar` para cerrarse solo al terminar. */
  children: (cerrar: () => void) => ReactNode;
}) {
  const { c } = useTema();
  const [abierto, setAbierto] = useState(false);
  const cerrar = () => setAbierto(false);
  if (!abierto) {
    return <Boton texto={texto} icono={icono} variante="secundario" onPress={() => setAbierto(true)} />;
  }
  return (
    <View
      style={{
        gap: espacio.m,
        padding: espacio.l,
        borderRadius: radio.tarjeta,
        borderWidth: 1,
        borderColor: peligro ? c.peligro : c.linea,
        backgroundColor: peligro ? c.peligroSuave : c.superficie2,
      }}
    >
      <Texto peso="negrita" color={peligro ? c.peligro : c.texto}>
        {titulo ?? texto}
      </Texto>
      {children(cerrar)}
      <Boton texto="Cerrar" variante="secundario" onPress={cerrar} />
    </View>
  );
}

export function CampoTexto({
  etiqueta,
  valor,
  onCambio,
  placeholder,
  teclado = "default",
  multilinea = false,
  maximo,
  ayuda,
  error,
  autoFoco = false,
}: {
  etiqueta: string;
  valor: string;
  onCambio: (texto: string) => void;
  placeholder?: string;
  teclado?: KeyboardTypeOptions;
  multilinea?: boolean;
  maximo?: number;
  ayuda?: string;
  error?: string | null;
  autoFoco?: boolean;
}) {
  const { c } = useTema();
  return (
    <View style={{ gap: espacio.xs }}>
      <Texto peso="seminegrita" t={tamano.chico}>
        {etiqueta}
      </Texto>
      <TextInput
        value={valor}
        onChangeText={onCambio}
        placeholder={placeholder}
        placeholderTextColor={c.apagado}
        keyboardType={teclado}
        multiline={multilinea}
        maxLength={maximo}
        autoFocus={autoFoco}
        accessibilityLabel={etiqueta}
        style={{
          minHeight: multilinea ? 72 : TACTIL_MIN,
          borderRadius: radio.chico,
          borderWidth: 1,
          borderColor: error ? c.peligro : c.linea,
          backgroundColor: c.superficie,
          paddingHorizontal: espacio.m,
          paddingVertical: espacio.s,
          fontFamily: fuente.normal,
          fontSize: tamano.base,
          color: c.texto,
          textAlignVertical: multilinea ? "top" : "center",
          fontVariant: teclado === "default" ? undefined : ["tabular-nums"],
        }}
      />
      {error ? (
        <Texto t={tamano.chico} color={c.peligro}>
          {error}
        </Texto>
      ) : ayuda ? (
        <Texto t={tamano.chico} color={c.apagado}>
          {ayuda}
        </Texto>
      ) : null}
    </View>
  );
}

export function Selector<T extends string | number>({
  etiqueta,
  opciones,
  valor,
  onCambio,
  ayuda,
}: {
  etiqueta?: string;
  opciones: { valor: T; texto: string }[];
  valor: T | null;
  onCambio: (valor: T) => void;
  ayuda?: string;
}) {
  const { c } = useTema();
  return (
    <View style={{ gap: espacio.xs }}>
      {etiqueta ? (
        <Texto peso="seminegrita" t={tamano.chico}>
          {etiqueta}
        </Texto>
      ) : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: espacio.s }}>
        {opciones.map((o) => (
          <Pildora key={String(o.valor)} texto={o.texto} activa={o.valor === valor} onPress={() => onCambio(o.valor)} />
        ))}
      </View>
      {ayuda ? (
        <Texto t={tamano.chico} color={c.apagado}>
          {ayuda}
        </Texto>
      ) : null}
    </View>
  );
}

/**
 * Lista de opciones con círculo de selección, para textos largos que no caben en una píldora
 * (preboletas candidatas, cargas, compradores…). Cada renglón mide al menos 48 dp.
 */
export function ListaOpciones<T extends string | number>({
  etiqueta,
  opciones,
  valor,
  onCambio,
}: {
  etiqueta?: string;
  opciones: { valor: T; texto: string; detalle?: string }[];
  valor: T | null;
  onCambio: (valor: T) => void;
}) {
  const { c } = useTema();
  return (
    <View style={{ gap: espacio.xs }}>
      {etiqueta ? (
        <Texto peso="seminegrita" t={tamano.chico}>
          {etiqueta}
        </Texto>
      ) : null}
      <View style={{ borderRadius: radio.chico, borderWidth: 1, borderColor: c.linea, backgroundColor: c.superficie, overflow: "hidden" }}>
        {opciones.map((o, i) => {
          const activa = o.valor === valor;
          return (
            <Pressable
              key={String(o.valor)}
              onPress={() => onCambio(o.valor)}
              accessibilityRole="radio"
              accessibilityState={{ checked: activa }}
              android_ripple={{ color: c.linea }}
              style={{
                minHeight: TACTIL_MIN,
                flexDirection: "row",
                alignItems: "center",
                gap: espacio.m,
                paddingHorizontal: espacio.m,
                paddingVertical: espacio.s,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: c.linea,
                backgroundColor: activa ? c.acentoSuave : undefined,
              }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  borderWidth: 2,
                  borderColor: activa ? c.acento : c.apagado,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {activa ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.acento }} /> : null}
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Texto peso={activa ? "seminegrita" : "normal"}>{o.texto}</Texto>
                {o.detalle ? (
                  <Texto t={tamano.chico} color={c.apagado}>
                    {o.detalle}
                  </Texto>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/**
 * Autorizar o rechazar (incidencias de cantidad y propuestas), como `FormDecision` del panel:
 * comentario opcional y los dos botones. Va dentro de un `Desplegable` "Resolver" para que un toque
 * accidental en una lista larga no resuelva nada.
 */
export function FormDecision({
  enviando,
  error,
  onDecidir,
}: {
  enviando: boolean;
  error?: ReactNode;
  onDecidir: (decision: "autorizar" | "rechazar", comentario: string) => void;
}) {
  const [comentario, setComentario] = useState("");
  return (
    <View style={{ gap: espacio.m }}>
      <CampoTexto etiqueta="Comentario (opcional)" valor={comentario} onCambio={setComentario} maximo={2000} multilinea />
      {error}
      <View style={{ flexDirection: "row", gap: espacio.s }}>
        <Boton
          texto="Rechazar"
          variante="peligro"
          estilo={{ flex: 1 }}
          deshabilitado={enviando}
          onPress={() => onDecidir("rechazar", comentario.trim())}
        />
        <Boton
          texto="Autorizar"
          estilo={{ flex: 1 }}
          cargando={enviando}
          onPress={() => onDecidir("autorizar", comentario.trim())}
        />
      </View>
    </View>
  );
}

/**
 * Confirmación en la misma pantalla antes de guardar un cambio de configuración (precio del día,
 * tolerancia, permisos…): resume lo que se va a guardar y pide "Sí, guardar". Nunca un `Alert` solo.
 */
export function ConfirmarCambio({
  resumen,
  enviando,
  onSi,
  onNo,
  peligro = false,
  textoSi = "Sí, guardar",
}: {
  resumen: string;
  enviando: boolean;
  onSi: () => void;
  onNo: () => void;
  peligro?: boolean;
  textoSi?: string;
}) {
  const { c } = useTema();
  return (
    <View
      style={{
        gap: espacio.m,
        padding: espacio.m,
        borderRadius: radio.chico,
        backgroundColor: peligro ? c.peligroSuave : c.acentoSuave,
      }}
    >
      <Texto peso="seminegrita">{resumen}</Texto>
      <View style={{ flexDirection: "row", gap: espacio.s }}>
        <Boton texto="No" variante="secundario" estilo={{ flex: 1 }} deshabilitado={enviando} onPress={onNo} />
        <Boton texto={textoSi} variante={peligro ? "peligro" : "principal"} estilo={{ flex: 1 }} cargando={enviando} onPress={onSi} />
      </View>
    </View>
  );
}

export function Interruptor({
  texto,
  valor,
  onCambio,
  ayuda,
}: {
  texto: string;
  valor: boolean;
  onCambio: (valor: boolean) => void;
  ayuda?: string;
}) {
  const { c } = useTema();
  return (
    <Pressable
      onPress={() => onCambio(!valor)}
      accessibilityRole="switch"
      accessibilityState={{ checked: valor }}
      style={{ minHeight: TACTIL_MIN, flexDirection: "row", alignItems: "center", gap: espacio.m }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Texto peso="seminegrita">{texto}</Texto>
        {ayuda ? (
          <Texto t={tamano.chico} color={c.apagado}>
            {ayuda}
          </Texto>
        ) : null}
      </View>
      <Switch
        value={valor}
        onValueChange={onCambio}
        trackColor={{ true: c.acento, false: c.linea }}
        thumbColor={c.superficie}
      />
    </Pressable>
  );
}
