/**
 * Conciliar una boleta (`GET /conciliaciones/{id}`), como en el panel:
 * - Datos de la boleta de D365 y por qué quedó por conciliar.
 * - "Vincular a una preboleta" (`POST /conciliaciones/{id}/vincular`): elegir la preboleta de la unidad
 *   (la sugerida va primero), y la carga sin boleta que corresponde o "Nueva carga" con sus cajas.
 *   Avisa si el proveedor es distinto o si la preboleta está cerrada (se reabre). Al terminar abre la preboleta.
 * - "No está relacionada" (`POST /conciliaciones/{id}/descartar`): observación obligatoria, en rojo.
 * - Sin `puede_resolver` solo se ve la información y quién puede conciliar.
 */
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, RefreshControl, ScrollView, View } from "react-native";

import { useConciliacion, useDescartarBoleta, useVincularBoleta } from "@/api/consultas";
import type { DetalleConciliacion } from "@/api/tipos";
import { Encabezado } from "@/componentes/Encabezado";
import { CampoTexto, Desplegable, ListaOpciones } from "@/componentes/formularios";
import { Boton, Cargando, Dato, Mensaje, MensajeError, Seccion, Tarjeta, useEspacioAbajo } from "@/componentes/ui";
import { ESTADO_INCIDENCIA, ESTADO_PB, MOTIVO_CONCILIACION, TIPO_INCIDENCIA, entero, fechaHora, fechaNegocio, hora, kg } from "@/formato";
import { useTema } from "@/tema/tema";
import { espacio } from "@/tema/tipografia";

/** "nueva" = el basculista no registró la carga: se crea con las cajas que se capturen. */
type Carga = number | "nueva";

function DatosBoleta({ d }: { d: DetalleConciliacion }) {
  const b = d.boleta;
  const i = d.incidencia;
  const filas: { etiqueta: string; valor: string; mono?: boolean }[] = [
    { etiqueta: "Motivo", valor: TIPO_INCIDENCIA[i.tipo] ?? i.tipo },
    { etiqueta: "Unidad", valor: b.unidad },
    { etiqueta: "Proveedor en D365", valor: `${b.proveedor_nombre ?? "—"}${b.proveedor_cuenta ? ` (${b.proveedor_cuenta})` : ""}` },
    {
      etiqueta: "Pesos",
      valor: b.peso_neto > 0 ? `bruto ${kg(b.peso_bruto)} · tara ${kg(b.tara)} · neto ${kg(b.peso_neto)}` : `bruto ${kg(b.peso_bruto)} · pendiente de 2da pesada`,
    },
    { etiqueta: "Estado en D365", valor: b.estado_d365 ?? b.estado },
  ];
  if (b.placas) filas.push({ etiqueta: "Placas", valor: b.placas, mono: true });
  if (b.chofer) filas.push({ etiqueta: "Chofer", valor: b.chofer });
  filas.push({ etiqueta: "1ra pesada", valor: fechaHora(b.primera_pesada_at) });
  if (i.preboleta_sugerida_folio) filas.push({ etiqueta: "Preboleta sugerida", valor: i.preboleta_sugerida_folio, mono: true });
  if (i.proveedor_esperado) filas.push({ etiqueta: "Se esperaba", valor: i.proveedor_esperado });
  return (
    <Tarjeta estilo={{ paddingVertical: espacio.xs }}>
      {filas.map((f, n) => (
        <Dato key={f.etiqueta} etiqueta={f.etiqueta} valor={f.valor} mono={f.mono} ultimo={n === filas.length - 1} />
      ))}
    </Tarjeta>
  );
}

function FormVincular({ d }: { d: DetalleConciliacion }) {
  const router = useRouter();
  const vincular = useVincularBoleta(d.incidencia.id);
  const [preboletaId, setPreboletaId] = useState<number | null>(d.incidencia.preboleta_sugerida_id);
  const [carga, setCarga] = useState<Carga>(d.incidencia.recepcion_sugerida_id ?? "nueva");
  const [cajasTexto, setCajasTexto] = useState("");
  const [comentario, setComentario] = useState("");
  const [intentado, setIntentado] = useState(false);

  const elegida = d.preboletas.find((p) => p.id === preboletaId) ?? null;
  const cargas = d.cargas_sin_boleta.filter((r) => r.preboleta_id === preboletaId);
  const cajas = Number(cajasTexto.trim());
  const errorCajas = carga === "nueva" && (!/^\d+$/.test(cajasTexto.trim()) || cajas <= 0) ? "Captura las cajas de la nueva carga (entero mayor a 0)." : null;

  const elegirPreboleta = (id: number) => {
    setPreboletaId(id);
    setCarga("nueva"); // Las cargas son de cada preboleta: al cambiarla se vuelve a elegir.
  };

  const enviar = () => {
    setIntentado(true);
    if (preboletaId === null || errorCajas) return;
    vincular.mutate(
      {
        preboleta_id: preboletaId,
        recepcion_id: carga === "nueva" ? null : carga,
        cajas_nueva_carga: carga === "nueva" ? cajas : null,
        comentario: comentario.trim() || null,
      },
      { onSuccess: () => router.replace(`/preboleta/${preboletaId}`) },
    );
  };

  if (d.preboletas.length === 0) {
    return <Mensaje tipo="info" texto="No hay preboletas en esta unidad para vincular. Si no corresponde a ninguna, márcala como no relacionada." />;
  }

  return (
    <View style={{ gap: espacio.m }}>
      <ListaOpciones
        etiqueta="Preboleta de la unidad"
        valor={preboletaId}
        onCambio={elegirPreboleta}
        opciones={d.preboletas.map((p) => ({
          valor: p.id,
          texto: `${p.folio} · ${p.proveedor_nombre}${p.mismo_proveedor ? " (mismo proveedor)" : ""}`,
          detalle: `${ESTADO_PB[p.estado] ?? p.estado} · ${entero(p.cajas_acumuladas)}/${entero(p.cajas_negociadas)} cajas · ${p.producto_nombre} · llega ${fechaNegocio(p.fecha_llegada)}`,
        }))}
      />
      {elegida && !elegida.mismo_proveedor ? (
        <Mensaje tipo="aviso" texto="El proveedor de la preboleta es distinto al de la boleta. Si concilias, quedará documentado." />
      ) : null}
      {elegida?.cerrada ? <Mensaje tipo="aviso" texto="La preboleta está cerrada: se reabrirá y se volverá a evaluar su cierre." /> : null}

      {elegida ? (
        <ListaOpciones<Carga>
          etiqueta="¿A qué carga corresponde?"
          valor={carga}
          onCambio={setCarga}
          opciones={[
            ...cargas.map((r) => ({
              valor: r.id as Carga,
              texto: `Carga #${r.id} · ${entero(r.cajas_declaradas)} cajas`,
              detalle: `Entró ${hora(r.ingreso_at)}${r.en_bascula ? " · sigue en báscula" : ""}`,
            })),
            { valor: "nueva" as Carga, texto: "Nueva carga", detalle: "El basculista no la registró." },
          ]}
        />
      ) : null}
      {elegida && carga === "nueva" ? (
        <CampoTexto
          etiqueta="Cajas de la nueva carga"
          valor={cajasTexto}
          onCambio={setCajasTexto}
          teclado="number-pad"
          error={intentado ? errorCajas : null}
        />
      ) : null}

      <CampoTexto
        etiqueta="Observaciones (opcional)"
        valor={comentario}
        onCambio={setComentario}
        placeholder="Ej. el basculista registró tarde la entrada"
        maximo={2000}
        multilinea
      />
      {vincular.error ? <MensajeError error={vincular.error} /> : null}
      <Boton
        texto={elegida ? `Vincular a ${elegida.folio}` : "Elige la preboleta"}
        icono="check"
        cargando={vincular.isPending}
        deshabilitado={!elegida}
        onPress={enviar}
      />
    </View>
  );
}

function FormDescartar({ d }: { d: DetalleConciliacion }) {
  const router = useRouter();
  const descartar = useDescartarBoleta(d.incidencia.id);
  const [comentario, setComentario] = useState("");
  return (
    <View style={{ gap: espacio.m }}>
      <CampoTexto
        etiqueta="Observaciones: qué pasa con esta boleta"
        valor={comentario}
        onCambio={setComentario}
        placeholder="Ej. fruta de compra directa sin negociación previa"
        maximo={2000}
        multilinea
      />
      {descartar.error ? <MensajeError error={descartar.error} /> : null}
      <Boton
        texto="Marcar como no relacionada"
        variante="peligro"
        cargando={descartar.isPending}
        deshabilitado={!comentario.trim()}
        onPress={() =>
          descartar.mutate(comentario.trim(), {
            onSuccess: () => (router.canGoBack() ? router.back() : router.replace("/conciliacion")),
          })
        }
      />
    </View>
  );
}

export default function ConciliarBoleta() {
  const { c } = useTema();
  const espacioAbajo = useEspacioAbajo();
  const router = useRouter();
  const { id: idTexto } = useLocalSearchParams<{ id: string }>();
  const id = Number(idTexto);
  const consulta = useConciliacion(id);
  const d = consulta.data;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.fondo }} behavior="padding">
      <Encabezado
        onAtras={() => (router.canGoBack() ? router.back() : router.replace("/conciliacion"))}
        etiqueta="Conciliar boleta"
        titulo={d?.boleta.folio ?? "…"}
        tituloMono
      />
      {!d ? (
        <View style={{ padding: espacio.l }}>
          {consulta.error ? <MensajeError error={consulta.error} onReintentar={() => void consulta.refetch()} /> : <Cargando />}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: espacio.l, gap: espacio.xl, paddingBottom: espacioAbajo }}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={consulta.isRefetching} onRefresh={() => void consulta.refetch()} colors={[c.acento]} />}
        >
          <Mensaje tipo="info" titulo={TIPO_INCIDENCIA[d.incidencia.tipo] ?? d.incidencia.tipo} texto={MOTIVO_CONCILIACION[d.incidencia.tipo] ?? ""} />

          <Seccion titulo="Boleta de D365">
            <DatosBoleta d={d} />
          </Seccion>

          {d.puede_resolver ? (
            <>
              <Seccion titulo="Vincular a una preboleta">
                <Tarjeta>
                  <FormVincular d={d} />
                </Tarjeta>
              </Seccion>
              <Seccion titulo="No está relacionada a ninguna preboleta">
                <Desplegable texto="Marcar como no relacionada" icono="cerrar" peligro titulo="¿No está relacionada a ninguna preboleta?">
                  {() => <FormDescartar d={d} />}
                </Desplegable>
              </Seccion>
            </>
          ) : (
            <Mensaje
              tipo="info"
              texto={
                d.incidencia.estado !== "pendiente"
                  ? `Esta boleta ya se resolvió (${ESTADO_INCIDENCIA[d.incidencia.estado] ?? d.incidencia.estado}).${d.incidencia.comentario ? ` ${d.incidencia.comentario}` : ""}`
                  : d.incidencia.tipo === "cambio_proveedor"
                    ? "El cambio de proveedor solo lo concilia el basculista de la unidad o un Admin."
                    : "Concilia el basculista de la unidad, un comprador o un Admin."
              }
            />
          )}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}
