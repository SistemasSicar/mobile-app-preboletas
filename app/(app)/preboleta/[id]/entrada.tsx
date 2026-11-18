/**
 * Entrada del camión a báscula ("indicar peso"). Mismo formulario para las dos vías:
 * - `via=qr`: se llegó leyendo el QR.
 * - `via=manual`: desde el detalle, sin QR (acción `operar_bascula`).
 *
 * `POST /preboletas/{id}/recepciones` con `{cajas, via, multiples_cargas}`. Reglas:
 * - Cajas: entero mayor a 0, teclado numérico.
 * - Una incidencia NUNCA frena la báscula: si la carga rebasa el máximo o queda corta, se avisa antes
 *   (informativo) y la entrada se registra igual. La API decide; la app informa.
 * - La respuesta solo trae `{id}`: después se recarga el detalle y se muestra la incidencia de esa carga.
 * - Sin conexión: "Sin conexión. Intenta de nuevo." y reintentar. NUNCA se guarda para después.
 */
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, TextInput, View } from "react-native";

import { usePreboleta, useRegistrarEntrada } from "@/api/consultas";
import { codigoDe, esSinConexion, idSolicitudDe, mensajeDeError } from "@/api/errores";
import { Encabezado } from "@/componentes/Encabezado";
import { Icono } from "@/componentes/Iconos";
import { AvanceCajas, TarjetaFruta, TarjetaProveedor } from "@/componentes/Preboleta";
import { BarraAccion, Boton, Cargando, ChipEstado, Mensaje, MensajeError, Seccion, Texto, useEspacioAbajo } from "@/componentes/ui";
import { TIPO_INCIDENCIA, entero } from "@/formato";
import { useTema } from "@/tema/tema";
import { TACTIL_MIN, espacio, fuente, radio, tamano } from "@/tema/tipografia";

export default function Entrada() {
  const { c } = useTema();
  const espacioAbajo = useEspacioAbajo();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; via?: string }>();
  const id = Number(params.id);
  const via: "qr" | "manual" = params.via === "qr" ? "qr" : "manual";

  const detalle = usePreboleta(id);
  const registrar = useRegistrarEntrada(id);
  const [texto, setTexto] = useState("");
  const [multiples, setMultiples] = useState(false);
  const [registrada, setRegistrada] = useState<{ recepcionId: number; cajas: number } | null>(null);

  const cajas = /^\d+$/.test(texto) ? Number(texto) : 0;
  const d = detalle.data;
  const p = d?.preboleta;

  // Aviso informativo ANTES de registrar (la carga entra igual).
  const aviso = useMemo(() => {
    if (!p || cajas <= 0) return null;
    const total = p.cajas_acumuladas + cajas;
    if (total > p.cajas_maximas) {
      return `Con esta carga son ${entero(total)} cajas: rebasa el máximo (${entero(p.cajas_maximas)}). Entra igual y queda una incidencia de sobre-entrega.`;
    }
    if (!p.multiples_cargas && !multiples && total < p.cajas_minimas) {
      return `Con esta carga son ${entero(total)} cajas: queda bajo el mínimo (${entero(p.cajas_minimas)}). Entra igual y queda una incidencia de faltante.`;
    }
    return null;
  }, [p, cajas, multiples]);

  const enviar = () => {
    if (cajas <= 0 || registrar.isPending) return;
    registrar.mutate(
      { cajas, via, multiples_cargas: multiples },
      { onSuccess: (r) => setRegistrada({ recepcionId: r.id, cajas }) },
    );
  };

  const volverALeer = () => router.navigate("/leer-qr");

  // ------------------------------------------------------------------
  // Encabezado y estados de carga
  // ------------------------------------------------------------------
  const encabezado = (
    <Encabezado
      onAtras={() => router.back()}
      etiqueta={via === "qr" ? "Entrada por QR" : "Indicar peso sin QR"}
      titulo={p?.folio ?? "…"}
      tituloMono
      derecha={p ? <ChipEstado estado={p.estado} sobreVerde /> : undefined}
    />
  );

  if (!d || !p) {
    return (
      <View style={{ flex: 1, backgroundColor: c.fondo }}>
        {encabezado}
        <View style={{ padding: espacio.l }}>
          {detalle.error ? <MensajeError error={detalle.error} onReintentar={() => void detalle.refetch()} /> : <Cargando />}
        </View>
      </View>
    );
  }

  // ------------------------------------------------------------------
  // Ya registrada
  // ------------------------------------------------------------------
  if (registrada) {
    const incidencia = d.incidencias.find((i) => i.recepcion_id === registrada.recepcionId);
    return (
      <View style={{ flex: 1, backgroundColor: c.fondo }}>
        {encabezado}
        <ScrollView contentContainerStyle={{ padding: espacio.l, gap: espacio.l, paddingBottom: espacioAbajo }}>
          <Mensaje
            tipo="exito"
            titulo="Entrada registrada"
            texto={`${p.folio}: entran ${entero(registrada.cajas)} cajas de ${p.proveedor_nombre}. La báscula de ${p.unidad} queda ocupada hasta la 1ra pesada en D365.`}
          />
          {incidencia ? (
            <Mensaje
              tipo="aviso"
              titulo={`Incidencia: ${TIPO_INCIDENCIA[incidencia.tipo] ?? incidencia.tipo}`}
              texto="La carga entró igual. El comprador la autoriza o la rechaza; la báscula sigue trabajando."
            />
          ) : null}
          <AvanceCajas p={p} />
        </ScrollView>
        <BarraAccion>
          <Boton texto="Ver preboleta" variante="secundario" estilo={{ flex: 1 }} onPress={() => router.replace(`/preboleta/${id}`)} />
          {via === "qr" ? <Boton texto="Leer otro QR" icono="qr" estilo={{ flex: 1 }} onPress={volverALeer} /> : null}
        </BarraAccion>
      </View>
    );
  }

  // ------------------------------------------------------------------
  // Formulario
  // ------------------------------------------------------------------
  const otraEnBascula = d.bascula.ocupada && !d.bascula.es_esta_preboleta;
  const errorEnvio = registrar.error;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.fondo }} behavior="padding">
      {encabezado}
      <ScrollView contentContainerStyle={{ padding: espacio.l, gap: espacio.l }} keyboardShouldPersistTaps="handled">
        {!d.acciones.operar_bascula ? (
          <Mensaje tipo="aviso" texto={`Solo el basculista de ${p.unidad} o un Admin registra entradas de esta preboleta.`} />
        ) : null}
        {otraEnBascula ? (
          <Mensaje
            tipo="aviso"
            titulo={`La báscula de ${p.unidad} está ocupada`}
            texto={d.bascula.folio ? `Está el camión de ${d.bascula.folio}. Espera a su 1ra pesada en D365.` : "Hay otro camión en báscula. Espera a su 1ra pesada en D365."}
            accion={
              d.bascula.preboleta_id ? (
                <Boton texto="Ver camión en báscula" icono="camion" variante="secundario" onPress={() => router.push(`/preboleta/${d.bascula.preboleta_id}`)} />
              ) : undefined
            }
          />
        ) : null}
        {d.bascula.es_esta_preboleta ? (
          <Mensaje tipo="info" texto="Esta preboleta ya tiene un camión en báscula. Registra otra entrada solo cuando ese salga." />
        ) : null}

        <TarjetaProveedor p={p} />
        <TarjetaFruta p={p} />
        <AvanceCajas p={p} />

        <Seccion titulo="Cajas que declara el chofer">
          <TextInput
            value={texto}
            onChangeText={(t) => setTexto(t.replace(/\D/g, "").slice(0, 6))}
            keyboardType="number-pad"
            inputMode="numeric"
            placeholder="0"
            placeholderTextColor={c.apagado}
            maxLength={6}
            accessibilityLabel="Cajas que declara el chofer"
            style={{
              minHeight: 72,
              borderRadius: radio.tarjeta,
              borderWidth: 2,
              borderColor: cajas > 0 ? c.acento : c.linea,
              backgroundColor: c.superficie,
              paddingHorizontal: espacio.l,
              fontFamily: fuente.extra,
              fontSize: 36,
              color: c.texto,
              textAlign: "center",
              fontVariant: ["tabular-nums"],
            }}
          />
          {!p.multiples_cargas ? (
            <Pressable
              onPress={() => setMultiples((m) => !m)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: multiples }}
              style={{ minHeight: TACTIL_MIN, flexDirection: "row", alignItems: "center", gap: espacio.m }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: multiples ? c.acento : c.apagado,
                  backgroundColor: multiples ? c.acento : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {multiples ? <Icono nombre="check" color={c.acentoTexto} tamano={18} /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Texto peso="seminegrita">Múltiples cargas</Texto>
                <Texto t={tamano.chico} color={c.apagado}>
                  Marca si esta preboleta llegará en varios camiones.
                </Texto>
              </View>
            </Pressable>
          ) : null}
        </Seccion>

        {aviso ? <Mensaje tipo="aviso" titulo="Aviso (no frena la entrada)" texto={aviso} /> : null}

        {errorEnvio ? (
          <Mensaje
            tipo={esSinConexion(errorEnvio) ? "aviso" : "peligro"}
            texto={mensajeDeError(errorEnvio)}
            idSolicitud={idSolicitudDe(errorEnvio)}
            accion={
              codigoDe(errorEnvio) === "bascula_ocupada" ? (
                <Boton
                  texto="Ver qué camión está en báscula"
                  icono="camion"
                  variante="secundario"
                  onPress={() => {
                    void detalle.refetch().then((r) => {
                      const otra = r.data?.bascula.preboleta_id;
                      if (otra && otra !== id) router.push(`/preboleta/${otra}`);
                    });
                  }}
                />
              ) : undefined
            }
          />
        ) : null}
      </ScrollView>

      <BarraAccion enFlujo>
        <Boton
          texto={esSinConexion(errorEnvio) ? "Reintentar" : "Registrar entrada"}
          icono={esSinConexion(errorEnvio) ? "refrescar" : "camion"}
          grande
          estilo={{ flex: 1 }}
          cargando={registrar.isPending}
          deshabilitado={cajas <= 0 || !d.acciones.operar_bascula}
          onPress={enviar}
        />
      </BarraAccion>
    </KeyboardAvoidingView>
  );
}
