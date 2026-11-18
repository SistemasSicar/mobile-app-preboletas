/**
 * Detalle de una preboleta (`GET /preboletas/{id}`): folio grande en mono y estado en el encabezado,
 * avance de cajas, proveedor, fruta, términos, QR para el proveedor, acciones, cargas con su boleta,
 * propuestas de precio, incidencias y bitácora.
 *
 * - Los botones salen de `acciones` (la API vuelve a validar):
 *   - Báscula (`operar_bascula`): "Indicar peso sin QR" (acción principal fija abajo), cancelar entrada y
 *     corregir cajas en cada carga. "Actualizar boleta" en toda carga con boleta.
 *   - Negociación: proponer precio, múltiples cargas, cerrar a mano y cambiar comprador (ver `detalle/Negociacion.tsx`).
 * - Precios y montos solo si la API los manda (vienen `null` si no).
 * - La bitácora son los movimientos reales con su badge y color, no pasos fijos.
 */
import { useLocalSearchParams, useRouter } from "expo-router";
import { KeyboardAvoidingView, RefreshControl, ScrollView, View } from "react-native";

import { usePreboleta } from "@/api/consultas";
import { TarjetaCarga } from "@/componentes/Carga";
import { CompartirQr } from "@/componentes/detalle/CompartirQr";
import { AccionesPreboleta, Terminos } from "@/componentes/detalle/Negociacion";
import { ListaPropuestas } from "@/componentes/detalle/Propuestas";
import { Bitacora, Incidencia } from "@/componentes/detalle/Secciones";
import { Encabezado } from "@/componentes/Encabezado";
import { useTecladoAbierto } from "@/componentes/formularios";
import { AvanceCajas, TarjetaFruta, TarjetaProveedor } from "@/componentes/Preboleta";
import {

  BarraAccion,
  Boton,
  Cargando,
  ChipEstado,
  Mensaje,
  MensajeError,
  Seccion,
  Tarjeta,
  Texto,
  useEspacioAbajo,
} from "@/componentes/ui";
import { dinero } from "@/formato";
import { useTema } from "@/tema/tema";
import { espacio, tamano } from "@/tema/tipografia";

export default function DetallePreboletaPantalla() {
  const { c } = useTema();
  const router = useRouter();
  // `creada` y `propuesta` llegan solo al venir de "Nueva preboleta".
  const { id: idTexto, creada, propuesta } = useLocalSearchParams<{ id: string; creada?: string; propuesta?: string }>();
  const id = Number(idTexto);
  const consulta = usePreboleta(id);
  const tecladoAbierto = useTecladoAbierto();
  const espacioConBarra = useEspacioAbajo(true);
  const espacioSinBarra = useEspacioAbajo();
  const d = consulta.data;
  const p = d?.preboleta;

  const encabezado = (
    <Encabezado
      onAtras={() => (router.canGoBack() ? router.back() : router.replace("/"))}
      etiqueta="Folio"
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
          {consulta.error ? <MensajeError error={consulta.error} onReintentar={() => void consulta.refetch()} /> : <Cargando />}
        </View>
      </View>
    );
  }

  const operar = d.acciones.operar_bascula;
  const otraEnBascula = d.bascula.ocupada && !d.bascula.es_esta_preboleta;
  // Con el teclado abierto (formularios del detalle) la barra de abajo se esconde para no tapar el campo.
  const conBarra = operar && !tecladoAbierto;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.fondo }} behavior="padding">
      {encabezado}
      <ScrollView
        contentContainerStyle={{ padding: espacio.l, gap: espacio.xl, paddingBottom: conBarra ? espacioConBarra : espacioSinBarra }}
        refreshControl={<RefreshControl refreshing={consulta.isRefetching} onRefresh={() => void consulta.refetch()} colors={[c.acento]} />}
        keyboardShouldPersistTaps="handled"
      >
        {consulta.error ? <MensajeError error={consulta.error} onReintentar={() => void consulta.refetch()} /> : null}

        {creada ? (
          <Mensaje
            tipo="exito"
            texto={`${creada} creada.${
              propuesta === "1"
                ? " La propuesta de precio quedó en espera de autorización; mientras tanto aplica el precio del día."
                : ""
            }`}
          />
        ) : null}

        {d.bascula.es_esta_preboleta ? (
          <Mensaje tipo="aviso" titulo="Camión en báscula" texto={`Esta preboleta está en la báscula de ${p.unidad}. Se libera con la 1ra pesada en D365.`} />
        ) : null}
        {otraEnBascula && operar ? (
          <Mensaje
            tipo="info"
            texto={`La báscula de ${p.unidad} está ocupada${d.bascula.folio ? ` por ${d.bascula.folio}` : ""}. Espera a su 1ra pesada para indicar peso.`}
          />
        ) : null}

        <AvanceCajas p={p} />

        {p.total_estimado !== null || p.total_recibido > 0 ? (
          <View style={{ flexDirection: "row", gap: espacio.m }}>
            {p.total_estimado !== null ? (
              <Tarjeta suave estilo={{ flex: 1 }}>
                <Texto t={tamano.mini} peso="negrita" color={c.acento}>
                  TOTAL ESTIMADO
                </Texto>
                <Texto peso="extra" t={tamano.titulo} tabular>
                  {dinero(p.total_estimado)}
                </Texto>
              </Tarjeta>
            ) : null}
            {p.total_recibido > 0 ? (
              <Tarjeta estilo={{ flex: 1 }}>
                <Texto t={tamano.mini} peso="negrita" color={c.apagado}>
                  RECIBIDO
                </Texto>
                <Texto peso="extra" t={tamano.titulo} tabular>
                  {dinero(p.total_recibido)}
                </Texto>
              </Tarjeta>
            ) : null}
          </View>
        ) : null}

        <Seccion titulo="Proveedor">
          <TarjetaProveedor p={p} />
        </Seccion>

        <Seccion titulo="Producto">
          <TarjetaFruta p={p} />
        </Seccion>

        <Seccion titulo="Términos">
          <Terminos d={d} />
        </Seccion>

        <Seccion titulo="QR para el proveedor">
          <CompartirQr p={p} />
        </Seccion>

        {d.acciones.proponer_precio || d.acciones.multiples_cargas || d.acciones.cerrar_a_mano || d.acciones.cambiar_comprador ? (
          <Seccion titulo="Acciones">
            <AccionesPreboleta d={d} />
          </Seccion>
        ) : null}

        <Seccion titulo={`Cargas (${d.recepciones.length})`}>
          {d.recepciones.length === 0 ? (
            <Tarjeta>
              <Texto color={c.apagado}>Aún no llega ningún camión.</Texto>
            </Tarjeta>
          ) : (
            d.recepciones.map((r, i) => (
              <TarjetaCarga
                key={r.recepcion_id}
                r={r}
                numero={i + 1}
                p={p}
                puedeOperarBascula={operar}
                puedeProponer={d.acciones.proponer_precio_carga}
              />
            ))
          )}
        </Seccion>

        {d.propuestas.length > 0 ? (
          <Seccion titulo={`Propuestas de precio (${d.propuestas.length})`}>
            <ListaPropuestas propuestas={d.propuestas} />
          </Seccion>
        ) : null}

        {d.incidencias.length > 0 ? (
          <Seccion titulo={`Incidencias (${d.incidencias.length})`}>
            {d.incidencias.map((i) => (
              <Incidencia key={i.id} i={i} />
            ))}
          </Seccion>
        ) : null}

        {d.movimientos.length > 0 ? (
          <Seccion titulo="Bitácora">
            <Bitacora movimientos={d.movimientos} />
            {/* El detalle trae los últimos 30; el historial tiene todos, con filtros. */}
            <Boton
              texto="Ver todo el historial"
              icono="reloj"
              variante="secundario"
              onPress={() => router.push({ pathname: "/historial", params: { folio: p.folio } })}
            />
          </Seccion>
        ) : null}
      </ScrollView>

      {conBarra ? (
        <BarraAccion>
          <Boton
            texto="Indicar peso sin QR"
            icono="camion"
            grande
            estilo={{ flex: 1 }}
            deshabilitado={d.bascula.es_esta_preboleta}
            onPress={() => router.push({ pathname: "/preboleta/[id]/entrada", params: { id: String(id), via: "manual" } })}
          />
        </BarraAccion>
      ) : null}
    </KeyboardAvoidingView>
  );
}
