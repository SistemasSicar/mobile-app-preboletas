/**
 * Unidades (solo Admin): desde cuándo opera cada una (`PUT /unidades/{id}/implementacion`).
 * - "Desde ahora" llena el campo con la hora actual de México; también se escribe a mano (dd/mm/aaaa hh:mm).
 * - Se manda sin zona horaria: la API lo toma en hora de México, nunca en la del teléfono.
 * - "Pausar unidad" la deja sin fecha: sus boletas no se ligan ni generan incidencias.
 * Cada cambio pide confirmación en la misma pantalla.
 */
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, KeyboardAvoidingView, RefreshControl, View } from "react-native";

import { useGuardarImplementacion, useUnidades } from "@/api/consultas";
import type { Unidad } from "@/api/tipos";
import { Encabezado } from "@/componentes/Encabezado";
import { CampoTexto, ConfirmarCambio, Desplegable } from "@/componentes/formularios";
import { Boton, Cargando, Mensaje, MensajeError, Tarjeta, Texto, Vacio, useEspacioAbajo } from "@/componentes/ui";
import { fechaHoraCampo, leerFechaHoraCampo } from "@/formato";
import { esAdmin } from "@/permisos";
import { useYo } from "@/sesion/Sesion";
import { useTema } from "@/tema/tema";
import { espacio, tamano } from "@/tema/tipografia";

type Cambio = { inicio: string | null; resumen: string };

function FormImplementacion({ u, cerrar }: { u: Unidad; cerrar: () => void }) {
  const guardar = useGuardarImplementacion();
  const [texto, setTexto] = useState(fechaHoraCampo(u.inicio_operacion_at));
  const [intentado, setIntentado] = useState(false);
  const [cambio, setCambio] = useState<Cambio | null>(null);
  const inicio = leerFechaHoraCampo(texto);
  const error = !texto.trim() ? "Escribe la fecha y hora, o toca \"Desde ahora\"." : inicio ? null : "Usa dd/mm/aaaa hh:mm, por ejemplo 17/11/2026 06:00.";

  if (guardar.isSuccess) {
    return (
      <View style={{ gap: espacio.m }}>
        <Mensaje tipo="exito" texto={guardar.variables?.inicio ? "Fecha guardada." : "Unidad pausada."} />
        <Boton texto="Listo" variante="secundario" onPress={cerrar} />
      </View>
    );
  }

  return (
    <View style={{ gap: espacio.m }}>
      <CampoTexto
        etiqueta="Opera desde (hora de México)"
        valor={texto}
        onCambio={(t) => {
          setTexto(t);
          setCambio(null);
        }}
        teclado="numbers-and-punctuation"
        placeholder="dd/mm/aaaa hh:mm"
        maximo={16}
        ayuda="Las boletas con 1ra pesada anterior a esta hora se ignoran."
        error={intentado ? error : null}
      />
      <Boton
        texto="Desde ahora"
        icono="reloj"
        variante="secundario"
        onPress={() => {
          setTexto(fechaHoraCampo(new Date()));
          setCambio(null);
        }}
      />
      {guardar.error ? <MensajeError error={guardar.error} /> : null}
      {cambio ? (
        <ConfirmarCambio
          resumen={cambio.resumen}
          peligro={cambio.inicio === null}
          textoSi={cambio.inicio === null ? "Sí, pausar" : "Sí, guardar"}
          enviando={guardar.isPending}
          onNo={() => setCambio(null)}
          onSi={() => guardar.mutate({ unidad: u.id, inicio: cambio.inicio }, { onSettled: () => setCambio(null) })}
        />
      ) : (
        <>
          <Boton
            texto="Guardar fecha"
            icono="check"
            onPress={() => {
              setIntentado(true);
              guardar.reset();
              if (inicio) setCambio({ inicio, resumen: `${u.nombre} operará desde el ${texto.trim()} (hora de México). ¿Guardar?` });
            }}
          />
          {u.opera ? (
            <Boton
              texto="Pausar unidad"
              variante="peligro"
              onPress={() => {
                guardar.reset();
                setCambio({
                  inicio: null,
                  resumen: `${u.nombre} dejará de operar: sus boletas no se ligarán ni generarán incidencias. ¿Pausar?`,
                });
              }}
            />
          ) : null}
        </>
      )}
    </View>
  );
}

function TarjetaUnidad({ u }: { u: Unidad }) {
  const { c } = useTema();
  return (
    <Tarjeta estilo={{ gap: espacio.m }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: espacio.s }}>
        <View style={{ flexShrink: 1, gap: 2 }}>
          <Texto peso="negrita">{u.nombre}</Texto>
          <Texto t={tamano.chico} color={c.apagado} tabular>
            {u.inicio_operacion_at ? `Opera desde ${fechaHoraCampo(u.inicio_operacion_at)}` : "Sin fecha de implementación"}
          </Texto>
        </View>
        <Texto t={tamano.chico} peso="seminegrita" color={u.opera ? c.acento : c.apagado}>
          {u.opera ? "Opera" : "Sin operar"}
        </Texto>
      </View>
      <Desplegable texto={u.opera ? "Cambiar fecha o pausar" : "Definir fecha"} icono="editar" titulo={`Implementación de ${u.nombre}`}>
        {(cerrar) => <FormImplementacion u={u} cerrar={cerrar} />}
      </Desplegable>
    </Tarjeta>
  );
}

export default function Unidades() {
  const { c } = useTema();
  const yo = useYo();
  const router = useRouter();
  const espacioAbajo = useEspacioAbajo();
  const unidades = useUnidades();

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.fondo }} behavior="padding">
      <Encabezado onAtras={() => (router.canGoBack() ? router.back() : router.replace("/configuracion"))} etiqueta="Configuración" titulo="Unidades" />
      {!esAdmin(yo) ? (
        <View style={{ padding: espacio.l }}>
          <Mensaje tipo="info" texto="La fecha de implementación solo la define un Admin." />
        </View>
      ) : (
        <FlatList
          data={unidades.data ?? []}
          keyExtractor={(u) => String(u.id)}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: espacio.l, gap: espacio.m, paddingBottom: espacioAbajo }}
          refreshControl={<RefreshControl refreshing={unidades.isRefetching} onRefresh={() => void unidades.refetch()} colors={[c.acento]} />}
          ListHeaderComponent={
            <View style={{ gap: espacio.m }}>
              <Texto t={tamano.chico} color={c.apagado}>
                Sin fecha de implementación, la unidad no opera: sus boletas no se ligan ni generan incidencias.
              </Texto>
              {unidades.error ? <MensajeError error={unidades.error} onReintentar={() => void unidades.refetch()} /> : null}
            </View>
          }
          ListEmptyComponent={unidades.isPending ? <Cargando texto="Cargando unidades…" /> : unidades.error ? undefined : <Vacio texto="Sin unidades." />}
          renderItem={({ item }) => <TarjetaUnidad u={item} />}
        />
      )}
    </KeyboardAvoidingView>
  );
}
