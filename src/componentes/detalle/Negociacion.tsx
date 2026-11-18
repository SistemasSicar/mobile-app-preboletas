/**
 * Negociación en el detalle:
 * - `Terminos`: cantidad, caja, tolerancia, mínimo y máximo, comprador, y el precio vigente (o "sin precio")
 *   con la propuesta pendiente de la preboleta, si la hay. Precios solo si la API los manda.
 * - `AccionesPreboleta`: lo que permite `acciones` (la API vuelve a validar):
 *   proponer precio (`proponer_precio`), múltiples cargas (`multiples_cargas`), cerrar a mano
 *   (`cerrar_a_mano`, con observación obligatoria y confirmación en la misma tarjeta) y cambiar
 *   comprador (`cambiar_comprador`, solo Admin).
 */
import { useState } from "react";
import { View } from "react-native";

import { useCambiarComprador, useCerrarAMano, useCompradores, useMultiplesCargas } from "@/api/consultas";
import type { DetallePreboleta, PreboletaCompleta } from "@/api/tipos";
import { entero, kg, numero, precioTxt } from "@/formato";
import { useTema } from "@/tema/tema";
import { espacio, tamano } from "@/tema/tipografia";
import { CampoTexto, Desplegable, Selector } from "../formularios";
import { Boton, Cargando, Dato, Mensaje, MensajeError, Tarjeta, Texto } from "../ui";
import { FormPropuesta } from "./Propuestas";

export function Terminos({ d }: { d: DetallePreboleta }) {
  const { c } = useTema();
  const p = d.preboleta;
  const cantidad =
    p.tipo_negociacion === "kilos" && p.kg_negociados !== null
      ? `${kg(p.kg_negociados)} (${entero(p.cajas_negociadas)} cajas)`
      : `${entero(p.cajas_negociadas)} cajas`;
  const filas: { etiqueta: string; valor: string }[] = [
    { etiqueta: "Cantidad", valor: cantidad },
    { etiqueta: "Caja", valor: `${p.tipo_caja} · ${numero(p.kg_por_caja)} kg` },
    { etiqueta: "Tolerancia", valor: `${numero(p.tolerancia_pct)}%` },
    { etiqueta: "Mínimo / máximo", valor: `${entero(p.cajas_minimas)} / ${entero(p.cajas_maximas)} cajas` },
    { etiqueta: "Múltiples cargas", valor: p.multiples_cargas ? "Sí" : "No" },
    { etiqueta: "Comprador", valor: p.comprador },
  ];
  if (p.tipo_pago_efectivo) filas.push({ etiqueta: "Tipo de pago", valor: p.tipo_pago_efectivo });

  // Propuesta pendiente para toda la preboleta (las de una carga se ven en su carga).
  const pendiente = d.propuestas.find((pr) => pr.estado === "pendiente" && pr.recepcion_id === null);

  return (
    <Tarjeta estilo={{ paddingVertical: espacio.xs }}>
      {filas.map((f) => (
        <Dato key={f.etiqueta} etiqueta={f.etiqueta} valor={f.valor} />
      ))}
      <View style={{ paddingVertical: espacio.m, gap: 4, borderBottomWidth: pendiente ? 1 : 0, borderBottomColor: c.linea }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: espacio.m }}>
          <Texto color={c.apagado}>Precio vigente</Texto>
          <Texto peso="negrita" tabular estilo={{ flexShrink: 1, textAlign: "right" }}>
            {p.precio_kg_efectivo !== null ? precioTxt(p.precio_kg_efectivo, p.tipo_pago_clave) : "Sin precio"}
          </Texto>
        </View>
        <Texto t={tamano.chico} color={c.apagado}>
          {p.precio_kg_efectivo === null
            ? "Tomará el del día cuando se defina."
            : p.precio_personalizado || p.tipo_pago_personalizado
              ? "Autorizado para esta preboleta."
              : "Del día."}
        </Texto>
      </View>
      {pendiente ? (
        <View style={{ paddingVertical: espacio.m, gap: 4 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: espacio.m }}>
            <Texto color={c.apagado}>Precio propuesto</Texto>
            <Texto peso="negrita" tabular estilo={{ flexShrink: 1, textAlign: "right" }}>
              {[pendiente.precio_propuesto_kg !== null ? precioTxt(pendiente.precio_propuesto_kg) : null, pendiente.tipo_pago_propuesto]
                .filter(Boolean)
                .join(" · ")}
            </Texto>
          </View>
          <Texto t={tamano.chico} color={c.aviso} peso="seminegrita">
            Esperando autorización{pendiente.supera_tope ? " · supera el tope" : ""}
          </Texto>
        </View>
      ) : null}
    </Tarjeta>
  );
}

function BotonMultiples({ p }: { p: PreboletaCompleta }) {
  const cambiar = useMultiplesCargas(p.id);
  return (
    <View style={{ gap: espacio.s }}>
      <Boton
        texto={p.multiples_cargas ? "Quitar múltiples cargas" : "Activar múltiples cargas"}
        icono="camion"
        variante="secundario"
        cargando={cambiar.isPending}
        onPress={() => cambiar.mutate(!p.multiples_cargas)}
      />
      {cambiar.isSuccess ? (
        <Mensaje tipo="exito" texto={p.multiples_cargas ? "Múltiples cargas activadas." : "Múltiples cargas desactivadas."} />
      ) : null}
      {cambiar.error ? <MensajeError error={cambiar.error} /> : null}
    </View>
  );
}

function FormCerrarAMano({ p, cerrar }: { p: PreboletaCompleta; cerrar: () => void }) {
  const cerrarAMano = useCerrarAMano(p.id);
  const [observacion, setObservacion] = useState("");
  const abajo = p.cajas_acumuladas < p.cajas_minimas;
  return (
    <View style={{ gap: espacio.m }}>
      <Texto t={tamano.chico}>
        Lleva {entero(p.cajas_acumuladas)} de {entero(p.cajas_negociadas)} cajas ({entero(p.cajas_minimas)}–
        {entero(p.cajas_maximas)}). Quedará registrada como incidencia «Cierre a mano»
        {abajo ? " y, por estar abajo del mínimo, también como faltante" : ""}, y se avisa al comprador y a los Admin.
      </Texto>
      <CampoTexto
        etiqueta="Observación (obligatoria)"
        valor={observacion}
        onCambio={setObservacion}
        placeholder="Ej. el proveedor ya no entregará el resto"
        maximo={2000}
        multilinea
      />
      {cerrarAMano.error ? <MensajeError error={cerrarAMano.error} /> : null}
      <Boton
        texto="Cerrar preboleta"
        variante="peligro"
        cargando={cerrarAMano.isPending}
        deshabilitado={!observacion.trim()}
        onPress={() => cerrarAMano.mutate(observacion.trim(), { onSuccess: cerrar })}
      />
    </View>
  );
}

function FormCambiarComprador({ p }: { p: PreboletaCompleta }) {
  const compradores = useCompradores();
  const cambiar = useCambiarComprador(p.id);
  const [elegido, setElegido] = useState<number | null>(null);
  if (cambiar.isSuccess) return <Mensaje tipo="exito" texto="Comprador actualizado." />;
  if (compradores.isPending) return <Cargando texto="Cargando compradores…" />;
  if (compradores.error) return <MensajeError error={compradores.error} onReintentar={() => void compradores.refetch()} />;
  const opciones = (compradores.data ?? [])
    .filter((col) => col.id !== p.comprador_id)
    .map((col) => ({ valor: col.id, texto: `${col.nombre} · ${col.unidad}` }));
  return (
    <View style={{ gap: espacio.m }}>
      <Selector etiqueta="Nuevo comprador" opciones={opciones} valor={elegido} onCambio={setElegido} />
      {cambiar.error ? <MensajeError error={cambiar.error} /> : null}
      <Boton
        texto="Cambiar"
        cargando={cambiar.isPending}
        deshabilitado={elegido === null}
        onPress={() => elegido !== null && cambiar.mutate(elegido)}
      />
    </View>
  );
}

/** Regresa null si la persona no tiene ninguna acción sobre la negociación. */
export function AccionesPreboleta({ d }: { d: DetallePreboleta }) {
  const a = d.acciones;
  const p = d.preboleta;
  if (!a.proponer_precio && !a.multiples_cargas && !a.cerrar_a_mano && !a.cambiar_comprador) return null;
  return (
    <View style={{ gap: espacio.m }}>
      {a.proponer_precio ? (
        <Desplegable texto="Proponer precio / tipo" titulo="Proponer precio o tipo de pago">
          {() => <FormPropuesta p={p} />}
        </Desplegable>
      ) : null}
      {a.multiples_cargas ? <BotonMultiples p={p} /> : null}
      {a.cambiar_comprador ? (
        <Desplegable texto="Cambiar comprador" icono="persona">
          {() => <FormCambiarComprador p={p} />}
        </Desplegable>
      ) : null}
      {a.cerrar_a_mano ? (
        <Desplegable texto="Cerrar a mano" icono="cerrar" peligro titulo="¿Cerrar la preboleta a mano?">
          {(cerrar) => <FormCerrarAMano p={p} cerrar={cerrar} />}
        </Desplegable>
      ) : null}
    </View>
  );
}
