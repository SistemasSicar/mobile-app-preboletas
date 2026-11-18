/**
 * Pestañas abajo: Inicio, Incidencias (con el número de pendientes para ti) y Avisos (con el número sin leer).
 * Leer QR ya no es pestaña: lo abre el botón flotante de Inicio (Basculista o Admin).
 * El resto (consultas, configuración y perfil) está en el menú del encabezado (`app/(app)/menu.tsx`).
 */
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useResumen, useSinLeer } from "@/api/consultas";
import { Icono } from "@/componentes/Iconos";
import { totalPendientes } from "@/componentes/Pendientes";
import { useTema } from "@/tema/tema";
import { fuente } from "@/tema/tipografia";

/** Número del globo rojo de una pestaña: nada con 0, "99+" con más de 99. */
function globo(n: number | undefined): number | string | undefined {
  if (!n) return undefined;
  return n > 99 ? "99+" : n;
}

export default function LayoutPestanas() {
  const { c } = useTema();
  const inset = useSafeAreaInsets();
  const { data: sinLeer } = useSinLeer();
  const { data: resumen } = useResumen();
  const estiloGlobo = { backgroundColor: c.peligro, color: c.peligroTexto, fontFamily: fuente.negrita };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.acento,
        tabBarInactiveTintColor: c.apagado,
        tabBarStyle: {
          backgroundColor: c.superficie,
          borderTopColor: c.linea,
          height: 64 + inset.bottom,
          paddingTop: 6,
          paddingBottom: inset.bottom + 6,
        },
        tabBarLabelStyle: { fontFamily: fuente.seminegrita, fontSize: 12 },
        sceneStyle: { backgroundColor: c.fondo },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Inicio", tabBarIcon: ({ color }) => <Icono nombre="inicio" color={color} /> }}
      />
      <Tabs.Screen
        name="pendientes"
        options={{
          title: "Incidencias",
          tabBarBadge: globo(totalPendientes(resumen)),
          tabBarBadgeStyle: estiloGlobo,
          tabBarIcon: ({ color }) => <Icono nombre="alerta" color={color} />,
        }}
      />
      <Tabs.Screen
        name="avisos"
        options={{
          title: "Avisos",
          tabBarBadge: globo(sinLeer?.total),
          tabBarBadgeStyle: estiloGlobo,
          tabBarIcon: ({ color }) => <Icono nombre="campana" color={color} />,
        }}
      />
    </Tabs>
  );
}
