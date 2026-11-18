/**
 * Configuración (solo Admin), una sección por pantalla:
 * - Unidades: fecha de implementación o pausa.
 * - Colaboradores: canales de aviso y permisos por unidad.
 * - Historial de envíos: avisos de todos con su resultado por correo y push.
 * - Precio del día y tolerancias (la misma pantalla de menú → Consultas).
 * Las cajas por fruta se administran solo en el panel web.
 */
import { useRouter, type Href } from "expo-router";
import { ScrollView, View } from "react-native";

import { Encabezado } from "@/componentes/Encabezado";
import type { NombreIcono } from "@/componentes/Iconos";
import { Opcion } from "@/componentes/Opcion";
import { Mensaje, Texto, useEspacioAbajo } from "@/componentes/ui";
import { esAdmin } from "@/permisos";
import { useYo } from "@/sesion/Sesion";
import { useTema } from "@/tema/tema";
import { espacio, tamano } from "@/tema/tipografia";

const SECCIONES: { ruta: Href; icono: NombreIcono; titulo: string; detalle: string }[] = [
  { ruta: "/configuracion/unidades", icono: "inicio", titulo: "Unidades", detalle: "Fecha de implementación o pausa" },
  { ruta: "/configuracion/colaboradores", icono: "persona", titulo: "Colaboradores", detalle: "Canales de aviso y permisos por unidad" },
  { ruta: "/configuracion/envios", icono: "campana", titulo: "Historial de envíos", detalle: "Avisos por correo y push de todos" },
  { ruta: "/precios", icono: "precio", titulo: "Precio del día y tolerancias", detalle: "Por unidad y fruta" },
];

export default function Configuracion() {
  const { c } = useTema();
  const yo = useYo();
  const router = useRouter();
  const espacioAbajo = useEspacioAbajo();
  return (
    <View style={{ flex: 1, backgroundColor: c.fondo }}>
      <Encabezado onAtras={() => (router.canGoBack() ? router.back() : router.replace("/"))} etiqueta="Admin" titulo="Configuración" />
      <ScrollView contentContainerStyle={{ padding: espacio.l, gap: espacio.m, paddingBottom: espacioAbajo }}>
        {!esAdmin(yo) ? (
          <Mensaje tipo="info" texto="La configuración solo la cambia un Admin." />
        ) : (
          <>
            <Texto t={tamano.chico} color={c.apagado}>
              Cada cambio pide confirmación antes de guardarse. Las cajas por fruta se administran en el panel web.
            </Texto>
            {SECCIONES.map((s) => (
              <Opcion key={s.titulo} icono={s.icono} titulo={s.titulo} detalle={s.detalle} onPress={() => router.push(s.ruta)} />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}
