/**
 * Propuestas de precio del detalle, iguales al panel:
 * - `FormPropuesta`: proponer precio y/o tipo de pago para la preboleta (`proponer_precio`) o para una
 *   carga (`proponer_precio_carga`). Se compara contra el precio del día: si queda igual, la API lo aplica
 *   sin autorización (`propuesta_id: null`). Con Precio Pactado, pasar el tope solo se avisa: no se bloquea.
 * - `ListaPropuestas`: las propuestas de la preboleta con su estado, quién propuso y la resolución.
 * Cancelar una propuesta no existe en la API: una nueva para el mismo destino reemplaza a la pendiente.
 */
import { useState } from "react";
import { View } from "react-native";

import { useProponerPrecio, useTiposPago } from "@/api/consultas";
import type { PreboletaCompleta, Propuesta } from "@/api/tipos";
import { leerDecimal, superaTope } from "@/calculos";
import { ESTADO_INCIDENCIA, cuando, precioTxt } from "@/formato";
import { useTema } from "@/tema/tema";
import { espacio, tamano } from "@/tema/tipografia";
import { CampoTexto, Selector } from "../formularios";
import { Boton, Mensaje, MensajeError, Tarjeta, Texto } from "../ui";

/** 0 = "Sin cambio" (no se manda tipo de pago). */
const SIN_CAMBIO = 0;

export function FormPropuesta({
  p,
  recepcionId,
}: {
  p: PreboletaCompleta;
  /** Sin esto, la propuesta es para toda la preboleta. */
  recepcionId?: number;
}) {
  const { c } = useTema();
  const tipos = useTiposPago();
  const proponer = useProponerPrecio(p.id);
  // Para la preboleta se parte del tipo vigente (como el panel); para una carga, "Sin cambio".
  const [tipo, setTipo] = useState<number>(recepcionId ? SIN_CAMBIO : (p.tipo_pago_id_efectivo ?? SIN_CAMBIO));
  const [precioTexto, setPrecioTexto] = useState("");
  const [motivo, setMotivo] = useState("");
  const [intentado, setIntentado] = useState(false);

  const precio = leerDecimal(precioTexto);
  const errorPrecio = !precioTexto.trim()
    ? "Captura el precio por kilo."
    : precio === null || precio <= 0
      ? "El precio debe ser mayor a 0."
      : null;
  const claveDia = tipos.data?.find((t) => t.id === p.tipo_pago_dia_id)?.clave ?? null;
  const tope = superaTope(precio, p.precio_dia_kg, claveDia);

  if (proponer.data) {
    const conPropuesta = proponer.data.propuesta_id !== null;
    return (
      <Mensaje
        tipo="exito"
        texto={
          conPropuesta
            ? recepcionId
              ? "Propuesta enviada a autorización."
              : "Propuesta enviada a autorización. Mientras tanto aplica el precio vigente."
            : recepcionId
              ? "Quedó igual al precio del día."
              : "Quedó igual al precio del día: se aplicó sin autorización."
        }
      />
    );
  }

  const enviar = () => {
    setIntentado(true);
    if (errorPrecio) return;
    proponer.mutate({
      recepcionId,
      datos: {
        precio_kg: precioTexto.trim().replace(",", "."),
        tipo_pago_id: tipo === SIN_CAMBIO ? null : tipo,
        motivo: motivo.trim() || null,
      },
    });
  };

  const opcionesTipo = [
    { valor: SIN_CAMBIO, texto: "Sin cambio" },
    ...(tipos.data ?? []).filter((t) => t.activo).map((t) => ({ valor: t.id, texto: t.nombre })),
  ];

  return (
    <View style={{ gap: espacio.m }}>
      <Selector etiqueta="Tipo de pago" opciones={opcionesTipo} valor={tipo} onCambio={setTipo} />
      <CampoTexto
        etiqueta="Precio $/kg"
        valor={precioTexto}
        onCambio={setPrecioTexto}
        teclado="decimal-pad"
        placeholder="0.00"
        error={intentado ? errorPrecio : null}
        ayuda={`Se compara contra el precio del día (${
          p.precio_dia_kg !== null ? `${p.tipo_pago_dia ?? ""} ${precioTxt(p.precio_dia_kg)}`.trim() : "sin asignar"
        }). Igual al del día: se aplica sin autorización.`}
      />
      {tope ? (
        <Texto t={tamano.chico} peso="seminegrita" color={c.aviso}>
          Supera el tope del Precio Pactado. Se puede proponer; quien autoriza lo verá marcado.
        </Texto>
      ) : null}
      <CampoTexto etiqueta="Motivo (opcional)" valor={motivo} onCambio={setMotivo} placeholder="Por qué este precio" maximo={500} multilinea />
      {proponer.error ? <MensajeError error={proponer.error} /> : null}
      <Boton texto={recepcionId ? "Enviar" : "Enviar propuesta"} cargando={proponer.isPending} onPress={enviar} />
    </View>
  );
}

function LineaPropuesta({ pr }: { pr: Propuesta }) {
  const { c } = useTema();
  const pendiente = pr.estado === "pendiente";
  const propuesto = [
    pr.precio_propuesto_kg !== null ? precioTxt(pr.precio_propuesto_kg) : null,
    pr.tipo_pago_propuesto,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <Tarjeta franja={pendiente ? c.aviso : c.linea} estilo={{ gap: 4 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: espacio.s }}>
        <Texto peso="negrita" estilo={{ flexShrink: 1 }}>
          {pr.recepcion_id ? `Carga${pr.boleta_folio ? ` (${pr.boleta_folio})` : ""}` : "Preboleta"}: {propuesto || "—"}
        </Texto>
        <Texto peso="negrita" t={tamano.chico} color={pendiente ? c.aviso : c.apagado}>
          {(ESTADO_INCIDENCIA[pr.estado] ?? pr.estado).toUpperCase()}
        </Texto>
      </View>
      {pr.supera_tope ? (
        <Texto t={tamano.chico} peso="seminegrita" color={c.aviso}>
          Supera el tope
        </Texto>
      ) : null}
      <Texto t={tamano.chico} color={c.apagado}>
        Propuso {pr.propuesto_por} · {cuando(pr.propuesto_at)}
        {pr.motivo ? ` · ${pr.motivo}` : ""}
      </Texto>
      {pr.resuelto_por ? (
        <Texto t={tamano.chico} color={c.apagado}>
          {ESTADO_INCIDENCIA[pr.estado] ?? pr.estado} por {pr.resuelto_por}
          {pr.comentario ? `: ${pr.comentario}` : ""}
        </Texto>
      ) : null}
    </Tarjeta>
  );
}

export function ListaPropuestas({ propuestas }: { propuestas: Propuesta[] }) {
  return (
    <View style={{ gap: espacio.s }}>
      {propuestas.map((pr) => (
        <LineaPropuesta key={pr.id} pr={pr} />
      ))}
    </View>
  );
}
