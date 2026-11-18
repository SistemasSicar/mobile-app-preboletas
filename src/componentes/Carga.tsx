/**
 * Una carga (recepción) del detalle: cajas, vía, basculista, su boleta de D365 y pesos.
 *
 * - **Actualizar boleta** (`POST /recepciones/{id}/actualizar-boleta`): en cargas con boleta. Relee la boleta
 *   de D365 si se perdió un cambio (Power Automate, CoreAPI o la API estuvieron caídos). Muestra el `mensaje`.
 * - **Cancelar entrada** (`POST /recepciones/{id}/cancelar`): solo con el camión aún en báscula (antes de la
 *   1ra pesada) y con `operar_bascula`. Confirmación en la misma tarjeta con motivo obligatorio. Libera la báscula.
 * - **Corregir cajas** (`POST /recepciones/{id}/corregir-cajas`): con `operar_bascula`, mientras la boleta no
 *   esté cerrada en D365. Cajas distintas a las actuales y motivo obligatorio; la API guarda las originales.
 * - **Proponer precio** de la carga (`proponer_precio_carga`): no en cargas canceladas.
 */
import { useState } from "react";
import { TextInput, View } from "react-native";

import { useActualizarBoleta, useCancelarEntrada, useCorregirCajas } from "@/api/consultas";
import { idSolicitudDe, mensajeDeError } from "@/api/errores";
import type { PreboletaCompleta, Recepcion } from "@/api/tipos";
import { cuando, entero, kg, precioTxt } from "@/formato";
import { useTema } from "@/tema/tema";
import { espacio, fuente, radio, tamano } from "@/tema/tipografia";
import { FormPropuesta } from "./detalle/Propuestas";
import { CampoTexto, Desplegable } from "./formularios";
import { Boton, Mensaje, MensajeError, Tarjeta, Texto } from "./ui";

function FormCorregirCajas({ r, preboletaId, cerrar }: { r: Recepcion; preboletaId: number; cerrar: () => void }) {
  const corregir = useCorregirCajas(preboletaId);
  const [cajasTexto, setCajasTexto] = useState(String(r.cajas_declaradas));
  const [motivo, setMotivo] = useState("");
  const [intentado, setIntentado] = useState(false);
  const cajas = Number(cajasTexto.trim());
  const errorCajas = !/^\d+$/.test(cajasTexto.trim()) || cajas <= 0
    ? "Captura un número entero mayor a 0."
    : cajas === r.cajas_declaradas
      ? "Captura un número de cajas distinto al actual."
      : null;
  const enviar = () => {
    setIntentado(true);
    if (errorCajas || !motivo.trim()) return;
    corregir.mutate({ recepcionId: r.recepcion_id, cajas, motivo: motivo.trim() }, { onSuccess: cerrar });
  };
  return (
    <View style={{ gap: espacio.m }}>
      <CampoTexto
        etiqueta="Cajas de esta carga"
        valor={cajasTexto}
        onCambio={setCajasTexto}
        teclado="number-pad"
        error={intentado ? errorCajas : null}
        ayuda={`Hoy dice ${entero(r.cajas_declaradas)}. Se guardan las cajas originales.`}
      />
      <CampoTexto
        etiqueta="Motivo (obligatorio)"
        valor={motivo}
        onCambio={setMotivo}
        placeholder="Ej. el basculista contó mal las cajas"
        maximo={2000}
        multilinea
        error={intentado && !motivo.trim() ? "Escribe el motivo." : null}
      />
      {corregir.error ? <MensajeError error={corregir.error} /> : null}
      <Boton texto="Guardar corrección" cargando={corregir.isPending} onPress={enviar} />
    </View>
  );
}

function Linea({ etiqueta, valor, mono = false }: { etiqueta: string; valor: string; mono?: boolean }) {
  const { c } = useTema();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: espacio.m }}>
      <Texto t={tamano.chico} color={c.apagado}>
        {etiqueta}
      </Texto>
      <Texto t={tamano.chico} peso={mono ? "mono" : "seminegrita"} tabular estilo={{ flexShrink: 1, textAlign: "right" }}>
        {valor}
      </Texto>
    </View>
  );
}

export function TarjetaCarga({
  r,
  numero,
  p,
  puedeOperarBascula,
  puedeProponer,
}: {
  r: Recepcion;
  numero: number;
  p: PreboletaCompleta;
  puedeOperarBascula: boolean;
  /** `acciones.proponer_precio_carga`. */
  puedeProponer: boolean;
}) {
  const preboletaId = p.id;
  const { c } = useTema();
  const actualizar = useActualizarBoleta(preboletaId);
  const cancelar = useCancelarEntrada(preboletaId);
  const [confirmando, setConfirmando] = useState(false);
  const [motivo, setMotivo] = useState("");

  const puedeCancelar = puedeOperarBascula && r.en_bascula && !r.cancelada;
  const estadoTexto = r.cancelada
    ? "Cancelada"
    : r.en_bascula
      ? "En báscula"
      : r.boleta_cerrada_d365
        ? "Boleta cerrada"
        : r.boleta_id
          ? "Con boleta"
          : "Sin boleta";
  const colorEstado = r.cancelada ? c.peligro : r.en_bascula ? c.aviso : r.boleta_id ? c.acento : c.apagado;

  return (
    <Tarjeta estilo={{ gap: espacio.s, opacity: r.cancelada ? 0.7 : 1 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Texto peso="negrita">
          Carga {numero} · {entero(r.cajas_declaradas)} cajas
        </Texto>
        <Texto peso="negrita" t={tamano.chico} color={colorEstado}>
          {estadoTexto.toUpperCase()}
        </Texto>
      </View>
      <Texto t={tamano.chico} color={c.apagado}>
        {cuando(r.ingreso_at)} · {r.via === "qr" ? "por QR" : "sin QR"} · {r.basculista}
      </Texto>

      {r.boleta_id ? (
        <View style={{ gap: 4, padding: espacio.m, borderRadius: radio.chico, backgroundColor: c.superficie2 }}>
          <Linea etiqueta="Boleta" valor={r.boleta_folio ?? "—"} mono />
          {r.placas ? <Linea etiqueta="Placas" valor={r.placas} mono /> : null}
          {r.estado_d365 ? <Linea etiqueta="Estado en D365" valor={r.estado_d365} /> : null}
          {r.peso_bruto !== null ? <Linea etiqueta="Peso bruto" valor={kg(r.peso_bruto)} /> : null}
          {r.tara !== null ? <Linea etiqueta="Tara" valor={kg(r.tara)} /> : null}
          {r.peso_neto !== null ? <Linea etiqueta="Peso neto" valor={kg(r.peso_neto)} /> : null}
          {r.cajas_reales !== null && r.cajas_reales !== r.cajas_declaradas ? (
            <Linea etiqueta="Cajas reales" valor={entero(r.cajas_reales)} />
          ) : null}
          {r.precio_kg_efectivo !== null ? <Linea etiqueta="Precio" valor={precioTxt(r.precio_kg_efectivo)} /> : null}
          {r.boleta_requiere_revision ? (
            <Texto t={tamano.chico} color={c.aviso} peso="seminegrita">
              La boleta requiere revisión.
            </Texto>
          ) : null}
        </View>
      ) : null}

      {r.cajas_corregidas && r.cajas_originales !== null ? (
        <Texto t={tamano.chico} color={c.apagado}>
          Cajas corregidas (antes {entero(r.cajas_originales)}).
        </Texto>
      ) : null}
      {r.por_conciliar || r.proveedor_distinto ? (
        <Texto t={tamano.chico} color={c.estIncidencia} peso="seminegrita">
          La boleta trae otro proveedor: está por conciliar.
        </Texto>
      ) : null}
      {r.propuesta_pendiente ? (
        <Texto t={tamano.chico} color={c.aviso} peso="seminegrita">
          Tiene una propuesta de precio esperando autorización.
        </Texto>
      ) : null}
      {r.precio_ajustado_kg !== null ? (
        <Texto t={tamano.chico} color={c.apagado}>
          Precio autorizado para esta carga: {precioTxt(r.precio_ajustado_kg)}.
        </Texto>
      ) : null}
      {r.cancelada && r.motivo_cancelacion ? (
        <Texto t={tamano.chico} color={c.apagado}>
          Motivo: {r.motivo_cancelacion}
        </Texto>
      ) : null}

      {/* Actualizar boleta */}
      {r.boleta_id && !r.cancelada ? (
        <Boton
          texto="Actualizar boleta"
          icono="refrescar"
          variante="secundario"
          cargando={actualizar.isPending}
          onPress={() => actualizar.mutate(r.recepcion_id)}
        />
      ) : null}
      {actualizar.data ? <Mensaje tipo="exito" texto={actualizar.data.mensaje} /> : null}
      {actualizar.error ? (
        <Mensaje tipo="peligro" texto={mensajeDeError(actualizar.error)} idSolicitud={idSolicitudDe(actualizar.error)} />
      ) : null}

      {puedeProponer && !r.cancelada ? (
        <Desplegable texto="Proponer precio" titulo="Proponer precio de esta carga">
          {() => <FormPropuesta p={p} recepcionId={r.recepcion_id} />}
        </Desplegable>
      ) : null}

      {puedeOperarBascula && !r.cancelada && !r.boleta_cerrada_d365 ? (
        <Desplegable texto="Corregir cajas" icono="editar">
          {(cerrar) => <FormCorregirCajas r={r} preboletaId={preboletaId} cerrar={cerrar} />}
        </Desplegable>
      ) : null}

      {/* Cancelar entrada: confirmación en la misma tarjeta, nunca solo un Alert. */}
      {puedeCancelar && !confirmando ? (
        <Boton texto="Cancelar entrada" icono="cerrar" variante="secundario" onPress={() => setConfirmando(true)} />
      ) : null}
      {puedeCancelar && confirmando ? (
        <View style={{ gap: espacio.s, padding: espacio.m, borderRadius: radio.chico, backgroundColor: c.peligroSuave }}>
          <Texto peso="negrita" color={c.peligro}>
            ¿Cancelar esta entrada?
          </Texto>
          <Texto t={tamano.chico}>
            El camión sale de la báscula sin pesarse y la báscula queda libre. Escribe el motivo.
          </Texto>
          <TextInput
            value={motivo}
            onChangeText={setMotivo}
            placeholder="Ej. se registró el camión equivocado"
            placeholderTextColor={c.apagado}
            maxLength={300}
            multiline
            style={{
              minHeight: 64,
              borderRadius: radio.chico,
              borderWidth: 1,
              borderColor: c.linea,
              backgroundColor: c.superficie,
              padding: espacio.m,
              fontFamily: fuente.normal,
              fontSize: tamano.base,
              color: c.texto,
              textAlignVertical: "top",
            }}
          />
          {cancelar.error ? (
            <Mensaje tipo="peligro" texto={mensajeDeError(cancelar.error)} idSolicitud={idSolicitudDe(cancelar.error)} />
          ) : null}
          <View style={{ flexDirection: "row", gap: espacio.s }}>
            <Boton
              texto="No"
              variante="secundario"
              estilo={{ flex: 1 }}
              onPress={() => {
                setConfirmando(false);
                setMotivo("");
                cancelar.reset();
              }}
            />
            <Boton
              texto="Sí, cancelar"
              variante="peligro"
              estilo={{ flex: 1 }}
              cargando={cancelar.isPending}
              deshabilitado={!motivo.trim()}
              onPress={() =>
                cancelar.mutate(
                  { recepcionId: r.recepcion_id, motivo: motivo.trim() },
                  { onSuccess: () => setConfirmando(false) },
                )
              }
            />
          </View>
        </View>
      ) : null}
    </Tarjeta>
  );
}
