/**
 * Colaboradores (solo Admin): el rol viene de Azure; aquí se definen sus canales de aviso (correo, push)
 * y sus permisos por unidad (precios diarios, autorizar precios), como "Colaboradores" del panel.
 * - Búsqueda por nombre o correo (`GET /admin/colaboradores?buscar=`), 400 ms después de dejar de escribir.
 * - Cada interruptor pide confirmación justo debajo de él antes de guardar.
 * - Un Admin tiene todos los permisos sin filas: se muestra "Todas (Admin)".
 * - Solo se sabe cuántos teléfonos tiene activos: la API no tiene ruta para dar de baja el de otra persona.
 */
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, KeyboardAvoidingView, RefreshControl, View } from "react-native";

import { useCambiarCanales, useCambiarPermiso, useColaboradoresAdmin, useUnidades, type PermisoColaborador } from "@/api/consultas";
import type { ColaboradorAdmin, Unidad } from "@/api/tipos";
import { Encabezado } from "@/componentes/Encabezado";
import { CampoTexto, ConfirmarCambio, Desplegable, Interruptor, useConEspera } from "@/componentes/formularios";
import { Cargando, Mensaje, MensajeError, Tarjeta, Texto, Vacio, useEspacioAbajo } from "@/componentes/ui";
import { PERMISO, ROL } from "@/formato";
import { esAdmin } from "@/permisos";
import { useYo } from "@/sesion/Sesion";
import { useTema } from "@/tema/tema";
import { espacio, tamano } from "@/tema/tipografia";

const PERMISOS: PermisoColaborador[] = ["autorizar_precios", "precios_diarios"];

/** Cambio por confirmar: `clave` dice bajo qué interruptor se muestra la confirmación. */
type Pendiente = { clave: string; resumen: string; quitar: boolean; guardar: () => void };

function FormColaborador({ co, unidades }: { co: ColaboradorAdmin; unidades: Unidad[] }) {
  const { c } = useTema();
  const canales = useCambiarCanales();
  const permisos = useCambiarPermiso();
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);
  const correo = co.canales.includes("correo");
  const push = co.canales.includes("push");
  const admin = co.roles.includes("Admin");
  const enviando = canales.isPending || permisos.isPending;
  const error = canales.error ?? permisos.error;

  const proponer = (p: Pendiente) => {
    canales.reset();
    permisos.reset();
    setHecho(null);
    setPendiente(p);
  };
  const terminar = (texto: string) => ({
    onSuccess: () => setHecho(texto),
    onSettled: () => setPendiente(null),
  });

  const confirmacion = (clave: string) =>
    pendiente?.clave === clave ? (
      <ConfirmarCambio
        resumen={pendiente.resumen}
        peligro={pendiente.quitar}
        textoSi={pendiente.quitar ? "Sí, quitar" : "Sí, guardar"}
        enviando={enviando}
        onNo={() => setPendiente(null)}
        onSi={pendiente.guardar}
      />
    ) : null;

  const canal = (cual: "correo" | "push", activo: boolean) => {
    const nombre = cual === "correo" ? "Correo" : "Push";
    proponer({
      clave: cual,
      quitar: !activo,
      resumen: `${activo ? "Activar" : "Quitar"} avisos por ${nombre.toLowerCase()} a ${co.nombre}. ¿Guardar?`,
      guardar: () =>
        canales.mutate(
          { colaborador: co.id, correo: cual === "correo" ? activo : correo, push: cual === "push" ? activo : push },
          terminar(`${nombre} ${activo ? "activado" : "quitado"}.`),
        ),
    });
  };

  return (
    <View style={{ gap: espacio.m }}>
      <Texto peso="seminegrita" t={tamano.chico}>
        Canales de aviso (la campana de la app la tienen todos)
      </Texto>
      <Interruptor texto="Correo" valor={correo} onCambio={(v) => canal("correo", v)} ayuda={co.correo} />
      {confirmacion("correo")}
      <Interruptor
        texto="Push"
        valor={push}
        onCambio={(v) => canal("push", v)}
        ayuda={
          co.dispositivos_activos > 0
            ? `${co.dispositivos_activos} ${co.dispositivos_activos === 1 ? "teléfono activo" : "teléfonos activos"}`
            : "Sin teléfono registrado: le llegará cuando inicie sesión en la app."
        }
      />
      {confirmacion("push")}

      {PERMISOS.map((permiso) => (
        <View key={permiso} style={{ gap: espacio.xs }}>
          <Texto peso="seminegrita" t={tamano.chico}>
            {PERMISO[permiso]}
          </Texto>
          {admin ? (
            <Texto t={tamano.chico} color={c.apagado}>
              Todas (Admin)
            </Texto>
          ) : (
            unidades.map((u) => {
              const clave = `${permiso}-${u.id}`;
              const tiene = co.permisos.some((p) => p.permiso === permiso && p.unidad_negocio_id === u.id);
              return (
                <View key={clave} style={{ gap: espacio.xs }}>
                  <Interruptor
                    texto={u.nombre}
                    valor={tiene}
                    onCambio={(otorgar) =>
                      proponer({
                        clave,
                        quitar: !otorgar,
                        resumen: `${otorgar ? "Dar" : "Quitar"} "${PERMISO[permiso]}" en ${u.nombre} ${otorgar ? "a" : "de"} ${co.nombre}. ¿Guardar?`,
                        guardar: () =>
                          permisos.mutate(
                            { colaborador: co.id, permiso, unidad: u.id, otorgar },
                            terminar(otorgar ? "Permiso dado." : "Permiso quitado."),
                          ),
                      })
                    }
                  />
                  {confirmacion(clave)}
                </View>
              );
            })
          )}
        </View>
      ))}
      {error ? <MensajeError error={error} /> : null}
      {hecho ? <Mensaje tipo="exito" texto={hecho} /> : null}
    </View>
  );
}

function TarjetaColaborador({ co, unidades }: { co: ColaboradorAdmin; unidades: Unidad[] }) {
  const { c } = useTema();
  const extras = co.canales.filter((x) => x !== "app");
  return (
    <Tarjeta estilo={{ gap: espacio.m }}>
      <View style={{ gap: 2 }}>
        <Texto peso="negrita">{co.nombre}</Texto>
        <Texto t={tamano.chico} color={c.apagado}>
          {co.correo}
        </Texto>
        <Texto t={tamano.chico}>
          {co.roles.map((r) => ROL[r] ?? r).join(", ") || "Sin rol"} · {co.unidad}
        </Texto>
        <Texto t={tamano.chico} color={c.apagado}>
          Avisos: app{extras.length ? `, ${extras.join(", ")}` : ""} · {co.dispositivos_activos}{" "}
          {co.dispositivos_activos === 1 ? "teléfono" : "teléfonos"}
        </Texto>
      </View>
      <Desplegable texto="Canales y permisos" icono="editar" titulo={`Canales y permisos de ${co.nombre}`}>
        {() => <FormColaborador co={co} unidades={unidades} />}
      </Desplegable>
    </Tarjeta>
  );
}

export default function Colaboradores() {
  const { c } = useTema();
  const yo = useYo();
  const router = useRouter();
  const espacioAbajo = useEspacioAbajo();
  const [texto, setTexto] = useState("");
  const buscar = useConEspera(texto);
  const lista = useColaboradoresAdmin(buscar);
  const unidades = useUnidades();
  const error = lista.error ?? unidades.error;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.fondo }} behavior="padding">
      <Encabezado onAtras={() => (router.canGoBack() ? router.back() : router.replace("/configuracion"))} etiqueta="Configuración" titulo="Colaboradores" />
      {!esAdmin(yo) ? (
        <View style={{ padding: espacio.l }}>
          <Mensaje tipo="info" texto="Los canales y permisos solo los define un Admin." />
        </View>
      ) : (
        <FlatList
          data={unidades.data ? (lista.data ?? []) : []}
          keyExtractor={(co) => String(co.id)}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: espacio.l, gap: espacio.m, paddingBottom: espacioAbajo }}
          refreshControl={<RefreshControl refreshing={lista.isRefetching} onRefresh={() => void lista.refetch()} colors={[c.acento]} />}
          ListHeaderComponent={
            <View style={{ gap: espacio.m }}>
              <Texto t={tamano.chico} color={c.apagado}>
                El rol viene de Azure. Aquí defines sus canales de aviso y sus permisos por unidad.
              </Texto>
              <CampoTexto etiqueta="Buscar" valor={texto} onCambio={setTexto} placeholder="Nombre o correo" maximo={100} />
              {error ? (
                <MensajeError
                  error={error}
                  onReintentar={() => {
                    void lista.refetch();
                    void unidades.refetch();
                  }}
                />
              ) : null}
            </View>
          }
          ListEmptyComponent={
            lista.isPending || unidades.isPending ? (
              <Cargando texto="Cargando colaboradores…" />
            ) : error ? undefined : (
              <Vacio texto={buscar.trim() ? "Nadie coincide con esa búsqueda." : "No hay colaboradores."} />
            )
          }
          renderItem={({ item }) => <TarjetaColaborador co={item} unidades={unidades.data ?? []} />}
        />
      )}
    </KeyboardAvoidingView>
  );
}
