/**
 * Precio de hoy de una unidad (`GET /unidades/{id}/precios`), como "Precio de hoy" del panel:
 * - Frutas con precio hoy: tipo de pago, precio (en Precio Pactado es el tope), tolerancia y quién lo definió.
 * - Definir o cambiar el precio de hoy (`PUT /unidades/{id}/precios/{fruta}`): fruta, tipo de pago y precio;
 *   el Admin también la tolerancia. Confirmación en la misma pantalla antes de guardar.
 * - Tolerancias (solo Admin, `PUT /unidades/{id}/tolerancias/{fruta}`): sin tolerancia no se pueden crear
 *   preboletas de esa fruta en la unidad. No cambia las ya creadas.
 * Lo que usa el precio del día se actualiza solo; las propuestas pendientes que queden iguales se resuelven solas.
 */
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, RefreshControl, ScrollView, View } from "react-native";

import { useGuardarPrecio, useGuardarTolerancia, usePreciosUnidad, useTiposPago } from "@/api/consultas";
import type { PrecioFruta, TipoPago } from "@/api/tipos";
import { decimalesValidos, leerDecimal } from "@/calculos";
import { Encabezado } from "@/componentes/Encabezado";
import { CampoTexto, ConfirmarCambio, Desplegable, Selector } from "@/componentes/formularios";
import { Boton, Cargando, Mensaje, MensajeError, Seccion, Tarjeta, Texto, useEspacioAbajo } from "@/componentes/ui";
import { fechaNegocio, hora, numero, precioTxt } from "@/formato";
import { useTema } from "@/tema/tema";
import { espacio, tamano } from "@/tema/tipografia";

/** Tolerancia que se propone cuando la fruta aún no tiene (la misma del panel). */
const TOLERANCIA_INICIAL = "10";

function errorPrecio(texto: string): string | null {
  const n = leerDecimal(texto);
  if (!texto.trim()) return "Captura el precio por kilo.";
  if (n === null || n <= 0) return "El precio debe ser mayor a 0.";
  if (!decimalesValidos(texto, 4)) return "Máximo 4 decimales.";
  return null;
}

function errorTolerancia(texto: string): string | null {
  const n = leerDecimal(texto);
  if (!texto.trim()) return "Captura la tolerancia.";
  if (n === null || n < 0 || n > 100) return "Debe estar entre 0 y 100.";
  if (!decimalesValidos(texto, 2)) return "Máximo 2 decimales.";
  return null;
}

function TarjetaFrutaPrecio({ f }: { f: PrecioFruta }) {
  const { c } = useTema();
  return (
    <Tarjeta estilo={{ gap: 4 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: espacio.s }}>
        <Texto peso="negrita" estilo={{ flexShrink: 1 }}>
          {f.producto_nombre}
        </Texto>
        <Texto peso="negrita" tabular>
          {precioTxt(f.precio_kg, f.tipo_pago_clave)}
        </Texto>
      </View>
      <Texto t={tamano.chico}>
        {f.tipo_pago ?? "—"} · tolerancia{" "}
        {f.tolerancia_pct !== null ? (
          `${numero(f.tolerancia_pct)}%`
        ) : (
          <Texto t={tamano.chico} peso="seminegrita" color={c.peligro}>
            no definida
          </Texto>
        )}
      </Texto>
      {f.actualizado_por ? (
        <Texto t={tamano.chico} color={c.apagado}>
          {f.actualizado_por} · {hora(f.actualizado_at)}
        </Texto>
      ) : null}
    </Tarjeta>
  );
}

/** Campos de una fruta. Se monta de nuevo al cambiar de fruta (`key`), así parte de sus valores actuales. */
function CamposPrecio({
  unidad,
  f,
  tipos,
  puedeTolerancia,
}: {
  unidad: number;
  f: PrecioFruta;
  tipos: TipoPago[];
  puedeTolerancia: boolean;
}) {
  const { c } = useTema();
  const guardar = useGuardarPrecio(unidad);
  const [tipo, setTipo] = useState<number>(f.tipo_pago_id ?? f.tipo_pago_sugerido_id);
  const [precioTexto, setPrecioTexto] = useState(f.precio_kg !== null ? String(f.precio_kg) : "");
  const toleranciaAntes = f.tolerancia_pct !== null ? String(f.tolerancia_pct) : "";
  const [toleranciaTexto, setToleranciaTexto] = useState(toleranciaAntes || TOLERANCIA_INICIAL);
  const [intentado, setIntentado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  const ePrecio = errorPrecio(precioTexto);
  const eTolerancia = puedeTolerancia ? errorTolerancia(toleranciaTexto) : null;
  const cambiaTolerancia = puedeTolerancia && leerDecimal(toleranciaTexto) !== leerDecimal(toleranciaAntes || "x");
  const tipoElegido = tipos.find((t) => t.id === tipo);
  const precioNormal = precioTexto.trim().replace(",", ".");

  const revisar = () => {
    setIntentado(true);
    guardar.reset();
    if (!ePrecio && !eTolerancia && tipoElegido) setConfirmando(true);
  };

  const resumen = `${f.producto_nombre}: ${tipoElegido?.nombre ?? "—"} · ${precioTxt(leerDecimal(precioNormal), tipoElegido?.clave)}${
    cambiaTolerancia ? ` · tolerancia ${numero(leerDecimal(toleranciaTexto))}%` : ""
  }. ¿Guardar el precio de hoy?`;

  return (
    <View style={{ gap: espacio.m }}>
      <Selector
        etiqueta="Tipo de pago"
        opciones={tipos.filter((t) => t.activo).map((t) => ({ valor: t.id, texto: t.nombre }))}
        valor={tipo}
        onCambio={(v) => {
          setTipo(v);
          setConfirmando(false);
        }}
        ayuda={f.tipo_pago_id === null ? "Sugerido: el último usado en la unidad." : undefined}
      />
      <CampoTexto
        etiqueta="Precio $/kg (en Pactado, el tope)"
        valor={precioTexto}
        onCambio={(t) => {
          setPrecioTexto(t);
          setConfirmando(false);
        }}
        teclado="decimal-pad"
        placeholder="0.00"
        error={intentado ? ePrecio : null}
      />
      {puedeTolerancia ? (
        <CampoTexto
          etiqueta="Tolerancia %"
          valor={toleranciaTexto}
          onCambio={(t) => {
            setToleranciaTexto(t);
            setConfirmando(false);
          }}
          teclado="decimal-pad"
          error={intentado ? eTolerancia : null}
        />
      ) : (
        <Texto t={tamano.chico} color={c.apagado}>
          Tolerancia: {f.tolerancia_pct !== null ? `${numero(f.tolerancia_pct)}% (la define el Admin)` : "no definida (la define el Admin)"}
        </Texto>
      )}
      <Texto t={tamano.chico} color={c.apagado}>
        Lo que use el precio del día se actualiza solo. La tolerancia solo aplica a preboletas nuevas; las propuestas pendientes que queden iguales se resuelven solas.
      </Texto>

      {guardar.isSuccess ? <Mensaje tipo="exito" texto="Precio de hoy guardado." /> : null}
      {guardar.error ? <MensajeError error={guardar.error} /> : null}
      {confirmando && !guardar.isSuccess ? (
        <ConfirmarCambio
          resumen={resumen}
          enviando={guardar.isPending}
          onNo={() => setConfirmando(false)}
          onSi={() =>
            guardar.mutate(
              {
                productoCodigo: f.producto_codigo,
                precioKg: precioNormal,
                tipoPagoId: tipo,
                tolerancia: cambiaTolerancia ? toleranciaTexto.trim().replace(",", ".") : undefined,
              },
              { onSettled: () => setConfirmando(false) },
            )
          }
        />
      ) : (
        <Boton texto="Guardar precio de hoy" icono="check" onPress={revisar} />
      )}
    </View>
  );
}

function FormTolerancia({ unidad, f }: { unidad: number; f: PrecioFruta }) {
  const guardar = useGuardarTolerancia(unidad);
  const [texto, setTexto] = useState(f.tolerancia_pct !== null ? String(f.tolerancia_pct) : TOLERANCIA_INICIAL);
  const [intentado, setIntentado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const error = errorTolerancia(texto);
  if (guardar.isSuccess) return <Mensaje tipo="exito" texto="Tolerancia guardada." />;
  return (
    <View style={{ gap: espacio.m }}>
      <CampoTexto
        etiqueta="Tolerancia %"
        valor={texto}
        onCambio={(t) => {
          setTexto(t);
          setConfirmando(false);
        }}
        teclado="decimal-pad"
        error={intentado ? error : null}
      />
      {guardar.error ? <MensajeError error={guardar.error} /> : null}
      {confirmando ? (
        <ConfirmarCambio
          resumen={`${f.producto_nombre}: tolerancia ${numero(leerDecimal(texto))}%. Aplica a preboletas nuevas. ¿Guardar?`}
          enviando={guardar.isPending}
          onNo={() => setConfirmando(false)}
          onSi={() => guardar.mutate({ productoCodigo: f.producto_codigo, tolerancia: texto.trim().replace(",", ".") })}
        />
      ) : (
        <Boton
          texto="Guardar tolerancia"
          onPress={() => {
            setIntentado(true);
            if (!error) setConfirmando(true);
          }}
        />
      )}
    </View>
  );
}

export default function PrecioUnidad() {
  const { c } = useTema();
  const router = useRouter();
  const espacioAbajo = useEspacioAbajo();
  const { unidad: unidadTexto } = useLocalSearchParams<{ unidad: string }>();
  const unidad = Number(unidadTexto);
  const consulta = usePreciosUnidad(unidad);
  const tipos = useTiposPago();
  const [codigo, setCodigo] = useState<string | null>(null);
  const d = consulta.data;
  const conPrecio = (d?.frutas ?? []).filter((f) => f.precio_kg !== null);
  const fruta = d?.frutas.find((f) => f.producto_codigo === codigo);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.fondo }} behavior="padding">
      <Encabezado
        onAtras={() => (router.canGoBack() ? router.back() : router.replace("/precios"))}
        etiqueta={d ? `${d.unidad} · ${fechaNegocio(d.fecha)}` : "Precio del día"}
        titulo="Precio de hoy"
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
          <Texto t={tamano.chico} color={c.apagado}>
            Cada fruta tiene un tipo de pago al día y se puede cambiar cuando haga falta. En Precio Pactado, el precio es el tope por kilo que pueden negociar los compradores.
          </Texto>
          {!d.dataverse_disponible ? (
            <Mensaje tipo="aviso" texto="D365 no respondió: solo se muestran las frutas que ya tienen precio o tolerancia en la unidad." />
          ) : null}

          <Seccion titulo="Frutas con precio hoy">
            {conPrecio.length ? (
              conPrecio.map((f) => <TarjetaFrutaPrecio key={f.producto_codigo} f={f} />)
            ) : (
              <Tarjeta>
                <Texto color={c.apagado}>
                  Ninguna fruta tiene tipo de pago ni precio para hoy. Mientras tanto, las preboletas nacen como Precio Pactado y piden autorización.
                </Texto>
              </Tarjeta>
            )}
          </Seccion>

          <Seccion titulo="Definir o cambiar el precio de hoy">
            <Tarjeta estilo={{ gap: espacio.l }}>
              {d.frutas.length === 0 ? (
                <Texto color={c.apagado}>No hay frutas para esta unidad.</Texto>
              ) : (
                <Selector
                  etiqueta="Fruta"
                  opciones={d.frutas.map((f) => ({ valor: f.producto_codigo, texto: f.producto_nombre }))}
                  valor={codigo}
                  onCambio={setCodigo}
                />
              )}
              {tipos.error ? <MensajeError error={tipos.error} onReintentar={() => void tipos.refetch()} /> : null}
              {fruta && tipos.data ? (
                <CamposPrecio key={fruta.producto_codigo} unidad={unidad} f={fruta} tipos={tipos.data} puedeTolerancia={d.puede_tolerancia} />
              ) : null}
            </Tarjeta>
          </Seccion>

          {d.puede_tolerancia ? (
            <Seccion titulo="Tolerancias">
              <Texto t={tamano.chico} color={c.apagado}>
                Sin tolerancia no se pueden crear preboletas de esa fruta en la unidad. No cambia las ya creadas.
              </Texto>
              {d.frutas.map((f) => (
                <Tarjeta key={f.producto_codigo} estilo={{ gap: espacio.m }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: espacio.s }}>
                    <View style={{ flexShrink: 1 }}>
                      <Texto peso="negrita">{f.producto_nombre}</Texto>
                      <Texto peso="mono" t={tamano.chico} color={c.apagado}>
                        {f.producto_codigo}
                      </Texto>
                    </View>
                    <Texto peso="negrita" tabular color={f.tolerancia_pct === null ? c.peligro : c.texto}>
                      {f.tolerancia_pct !== null ? `${numero(f.tolerancia_pct)}%` : "no definida"}
                    </Texto>
                  </View>
                  <Desplegable texto="Cambiar tolerancia" icono="editar" titulo={`Tolerancia de ${f.producto_nombre}`}>
                    {() => <FormTolerancia unidad={unidad} f={f} />}
                  </Desplegable>
                </Tarjeta>
              ))}
            </Seccion>
          ) : null}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}
