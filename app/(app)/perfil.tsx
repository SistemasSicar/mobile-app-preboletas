/**
 * Perfil: nombre, correo, unidad y roles (de `GET /yo`), canales de aviso, tema (sistema / claro / oscuro,
 * guardado en el teléfono) y cerrar sesión, con confirmación en la misma pantalla.
 * Cerrar sesión: baja del push → borrar tokens → limpiar la caché → inicio de sesión.
 */
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";

import { Encabezado } from "@/componentes/Encabezado";
import { Avatar, Boton, Dato, Pildora, Seccion, Tarjeta, Texto, useEspacioAbajo } from "@/componentes/ui";
import { ROL } from "@/formato";
import { useSesion, useYo } from "@/sesion/Sesion";
import { useTema, type PreferenciaTema } from "@/tema/tema";
import { espacio, tamano } from "@/tema/tipografia";

const TEMAS: { clave: PreferenciaTema; texto: string }[] = [
  { clave: "sistema", texto: "Sistema" },
  { clave: "claro", texto: "Claro" },
  { clave: "oscuro", texto: "Oscuro" },
];

const CANAL: Record<string, string> = { app: "Campana", correo: "Correo", push: "Push" };

export default function Perfil() {
  const { c, preferencia, cambiarPreferencia } = useTema();
  const yo = useYo();
  const { cerrarSesion } = useSesion();
  const router = useRouter();
  const espacioAbajo = useEspacioAbajo();
  const [confirmando, setConfirmando] = useState(false);
  const [saliendo, setSaliendo] = useState(false);

  const salir = async () => {
    setSaliendo(true);
    await cerrarSesion();
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.fondo }}>
      <Encabezado onAtras={() => router.back()} etiqueta="Perfil" titulo={yo.nombre} />
      <ScrollView contentContainerStyle={{ padding: espacio.l, gap: espacio.xl, paddingBottom: espacioAbajo }}>
        <Tarjeta>
          <View style={{ flexDirection: "row", gap: espacio.m, alignItems: "center" }}>
            <Avatar nombre={yo.nombre} tam={56} />
            <View style={{ flex: 1 }}>
              <Texto peso="negrita" t={tamano.grande}>
                {yo.nombre}
              </Texto>
              <Texto t={tamano.chico} color={c.apagado}>
                {yo.correo}
              </Texto>
            </View>
          </View>
        </Tarjeta>

        <Seccion titulo="Acceso">
          <Tarjeta estilo={{ paddingVertical: espacio.xs }}>
            <Dato etiqueta="Unidad" valor={yo.unidad} />
            <Dato etiqueta="Roles" valor={yo.roles.map((r) => ROL[r] ?? r).join(", ") || "—"} />
            <Dato etiqueta="Avisos por" valor={yo.canales.map((k) => CANAL[k] ?? k).join(", ")} ultimo />
          </Tarjeta>
        </Seccion>

        <Seccion titulo="Tema">
          <View style={{ flexDirection: "row", gap: espacio.s, flexWrap: "wrap" }}>
            {TEMAS.map((t) => (
              <Pildora key={t.clave} texto={t.texto} activa={preferencia === t.clave} onPress={() => cambiarPreferencia(t.clave)} />
            ))}
          </View>
        </Seccion>

        <Seccion titulo="Sesión">
          {!confirmando ? (
            <Boton texto="Cerrar sesión" icono="salir" variante="secundario" onPress={() => setConfirmando(true)} />
          ) : (
            <Tarjeta estilo={{ gap: espacio.m, backgroundColor: c.peligroSuave, borderColor: c.peligroSuave }}>
              <Texto peso="negrita" color={c.peligro}>
                ¿Cerrar sesión en este teléfono?
              </Texto>
              <Texto t={tamano.chico}>Dejarás de recibir avisos push aquí hasta que vuelvas a entrar.</Texto>
              <View style={{ flexDirection: "row", gap: espacio.s }}>
                <Boton texto="No" variante="secundario" estilo={{ flex: 1 }} onPress={() => setConfirmando(false)} />
                <Boton texto="Sí, salir" variante="peligro" estilo={{ flex: 1 }} cargando={saliendo} onPress={() => void salir()} />
              </View>
            </Tarjeta>
          )}
        </Seccion>

        <Texto t={tamano.mini} color={c.apagado} centrado>
          Preboletas {Constants.expoConfig?.version ?? ""} · SiCar Farms
        </Texto>
      </ScrollView>
    </View>
  );
}
