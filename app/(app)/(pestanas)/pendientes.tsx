/**
 * Pestaña "Incidencias": lo que la persona tiene por resolver (`GET /resumen`).
 * - "Pendiente para ti": solo los contadores mayores a 0, cada uno abre su lista.
 * - Debajo, las tres listas siempre a la mano con su contador: incidencias de cantidad (Admin o Comprador),
 *   conciliación y propuestas de precio.
 * El número de la pestaña es la suma de los pendientes. Se actualiza solo por tiempo real.
 */
import { useRouter, type Href } from "expo-router";
import { RefreshControl, ScrollView, View } from "react-native";

import { useResumen } from "@/api/consultas";
import { Encabezado } from "@/componentes/Encabezado";
import { Opcion } from "@/componentes/Opcion";
import { TarjetaPendientes, totalPendientes } from "@/componentes/Pendientes";
import { MensajeError, Seccion, Tarjeta, Texto } from "@/componentes/ui";
import { alcancePreboletas, puedeVerIncidencias } from "@/permisos";
import { useYo } from "@/sesion/Sesion";
import { useTema } from "@/tema/tema";
import { espacio } from "@/tema/tipografia";

export default function Pendientes() {
  const { c } = useTema();
  const yo = useYo();
  const router = useRouter();
  const resumen = useResumen();
  const r = resumen.data;
  const ir = (ruta: Href) => () => router.push(ruta);

  return (
    <View style={{ flex: 1, backgroundColor: c.fondo }}>
      <Encabezado etiqueta={alcancePreboletas(yo)} titulo="Incidencias" />
      <ScrollView
        contentContainerStyle={{ padding: espacio.l, gap: espacio.xl, paddingBottom: espacio.xl }}
        refreshControl={<RefreshControl refreshing={resumen.isRefetching} onRefresh={() => void resumen.refetch()} colors={[c.acento]} />}
      >
        {resumen.error ? <MensajeError error={resumen.error} onReintentar={() => void resumen.refetch()} /> : null}

        {r && totalPendientes(r) > 0 ? (
          <TarjetaPendientes resumen={r} />
        ) : r ? (
          <Tarjeta>
            <Texto peso="negrita">Nada pendiente para ti</Texto>
            <Texto color={c.apagado}>No tienes incidencias, boletas por conciliar ni propuestas por autorizar.</Texto>
          </Tarjeta>
        ) : null}

        <Seccion titulo="Listas">
          <View style={{ gap: espacio.m }}>
            {puedeVerIncidencias(yo) ? (
              <Opcion
                icono="alerta"
                titulo="Incidencias de cantidad"
                detalle="Sobre-entregas y faltantes por autorizar"
                conteo={r?.incidencias}
                onPress={ir("/incidencias")}
              />
            ) : null}
            <Opcion
              icono="camion"
              titulo="Conciliación"
              detalle="Boletas de D365 que no se ligaron solas"
              conteo={r?.conciliaciones}
              onPress={ir("/conciliacion")}
            />
            <Opcion
              icono="check"
              titulo="Propuestas de precio"
              detalle="Precios y tipos de pago por autorizar"
              conteo={r?.propuestas}
              onPress={ir("/propuestas")}
            />
          </View>
        </Seccion>
      </ScrollView>
    </View>
  );
}
