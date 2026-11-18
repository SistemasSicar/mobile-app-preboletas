/**
 * Menú: el resto de las secciones. Se abre con el botón de menú del encabezado (arriba a la izquierda,
 * junto a la marca) y entra deslizándose desde la izquierda. El título es el rol de quien usa la app.
 * - Consultas: historial y precio del día (Admin o permiso de precios diarios).
 * - Administración (solo Admin): configuración.
 * - Perfil.
 * Los pendientes (incidencias, conciliación y propuestas) están en la pestaña "Incidencias".
 */
import { useRouter, type Href } from "expo-router";
import { ScrollView, View } from "react-native";

import { Encabezado } from "@/componentes/Encabezado";
import { Opcion } from "@/componentes/Opcion";
import { Seccion, useEspacioAbajo } from "@/componentes/ui";
import { ROL } from "@/formato";
import { esAdmin, puedeVerPrecios } from "@/permisos";
import { useYo } from "@/sesion/Sesion";
import { useTema } from "@/tema/tema";
import { espacio } from "@/tema/tipografia";

export default function Menu() {
  const { c } = useTema();
  const yo = useYo();
  const router = useRouter();
  const espacioAbajo = useEspacioAbajo();
  const ir = (ruta: Href) => () => router.push(ruta);
  const rol = yo.roles.map((r) => ROL[r] ?? r).join(" · ") || "Sin rol";
  return (
    <View style={{ flex: 1, backgroundColor: c.fondo }}>
      <Encabezado onAtras={() => (router.canGoBack() ? router.back() : router.replace("/"))} etiqueta={yo.unidad} titulo={rol} />
      <ScrollView contentContainerStyle={{ padding: espacio.l, gap: espacio.xl, paddingBottom: espacioAbajo }}>
        <Seccion titulo="Consultas">
          <View style={{ gap: espacio.m }}>
            <Opcion icono="reloj" titulo="Historial" detalle="Bitácora de movimientos con filtros" onPress={ir("/historial")} />
            {puedeVerPrecios(yo) ? (
              <Opcion icono="precio" titulo="Precio del día" detalle="Tipo de pago, precio de hoy y tolerancia por fruta" onPress={ir("/precios")} />
            ) : null}
          </View>
        </Seccion>
        {esAdmin(yo) ? (
          <Seccion titulo="Administración">
            <Opcion icono="ajustes" titulo="Configuración" detalle="Unidades, colaboradores y envíos" onPress={ir("/configuracion")} />
          </Seccion>
        ) : null}
        <Seccion titulo="Cuenta">
          <Opcion icono="persona" titulo="Perfil" detalle={`${yo.nombre} · tema y cerrar sesión`} onPress={ir("/perfil")} />
        </Seccion>
      </ScrollView>
    </View>
  );
}
