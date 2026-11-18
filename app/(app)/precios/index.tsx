/**
 * Precio del día: unidades donde la persona puede definirlo (todas para el Admin; si no, las de su
 * permiso `precios_diarios`). Tocar una abre el precio de hoy de sus frutas.
 * - Debajo del nombre, las frutas que ya tienen precio hoy: "LIMON PERSA $12.70 (R)" (R Rendimiento,
 *   P Pactado, C Corrida). Sin ninguna: "Precio sin definir".
 * - Los precios salen de `GET /precios-hoy`: una sola petición que solo lee la base (no consulta D365).
 * - Mientras carga, pantalla con el logo: la lista aparece completa de una vez. Al jalar hacia abajo se
 *   recarga con el indicador de arriba. Si fallan solo los precios, se muestra la lista sin subtítulos.
 * Si la unidad opera o no se ve en Configuración → Unidades.
 */
import { useRouter } from "expo-router";
import { FlatList, RefreshControl, View } from "react-native";

import { usePreciosHoy, useUnidades } from "@/api/consultas";
import type { PrecioHoy } from "@/api/tipos";
import { CargaConLogo } from "@/componentes/CargaConLogo";
import { Encabezado } from "@/componentes/Encabezado";
import { Icono } from "@/componentes/Iconos";
import { Boton, Mensaje, MensajeError, Tarjeta, Texto, Vacio, useEspacioAbajo } from "@/componentes/ui";
import { abreviaturaPago, dinero } from "@/formato";
import { esAdmin, puedeVerPrecios, unidadesConPermiso } from "@/permisos";
import { useYo } from "@/sesion/Sesion";
import { useTema } from "@/tema/tema";
import { espacio, tamano } from "@/tema/tipografia";

/** Renglones de las frutas con precio de hoy; `undefined` = no se pudo consultar (no se dibuja nada). */
function FrutasConPrecio({ frutas }: { frutas: PrecioHoy[] | undefined }) {
  const { c } = useTema();
  if (!frutas) return null;
  if (!frutas.length) {
    return (
      <Texto t={tamano.chico} peso="seminegrita" color={c.aviso}>
        Precio sin definir
      </Texto>
    );
  }
  return (
    <>
      {frutas.map((f) => (
        <Texto key={f.producto_codigo} t={tamano.chico} tabular>
          {f.producto_nombre}{" "}
          <Texto t={tamano.chico} peso="seminegrita" tabular>
            {dinero(f.precio_kg)} ({abreviaturaPago(f.tipo_pago_clave, f.tipo_pago)})
          </Texto>
        </Texto>
      ))}
    </>
  );
}

export default function Precios() {
  const { c } = useTema();
  const yo = useYo();
  const router = useRouter();
  const espacioAbajo = useEspacioAbajo();
  const admin = esAdmin(yo);
  const puede = puedeVerPrecios(yo);
  const permitidas = unidadesConPermiso(yo, "precios_diarios");
  const unidades = useUnidades();
  const precios = usePreciosHoy(puede);
  const lista = (unidades.data ?? []).filter((u) => admin || permitidas.includes(u.id));
  const frutasDe = new Map((precios.data ?? []).map((u) => [u.unidad_negocio_id, u.frutas]));
  // La lista espera a las unidades y a los precios (con éxito o con error) para aparecer completa.
  const cargando = unidades.isPending || (precios.isPending && precios.fetchStatus !== "idle");
  const recargar = () => {
    void unidades.refetch();
    void precios.refetch();
  };

  let contenido;
  if (!puede) {
    contenido = (
      <View style={{ padding: espacio.l }}>
        <Mensaje tipo="info" texto="El precio del día lo definen los Admin y quien tiene el permiso de precios diarios en la unidad." />
      </View>
    );
  } else if (cargando) {
    contenido = <CargaConLogo texto="Consultando los precios de hoy…" />;
  } else if (unidades.error) {
    contenido = (
      <View style={{ padding: espacio.l }}>
        <MensajeError error={unidades.error} onReintentar={recargar} />
      </View>
    );
  } else {
    contenido = (
      <FlatList
        data={lista}
        keyExtractor={(u) => String(u.id)}
        contentContainerStyle={{ padding: espacio.l, gap: espacio.m, paddingBottom: espacioAbajo }}
        refreshControl={
          <RefreshControl refreshing={unidades.isRefetching || precios.isRefetching} onRefresh={recargar} colors={[c.acento]} />
        }
        ListHeaderComponent={
          <View style={{ gap: espacio.m }}>
            <Texto t={tamano.chico} color={c.apagado}>
              {admin
                ? "Elige una unidad para definir el tipo de pago, el precio de hoy y la tolerancia de cada fruta."
                : "Tienes el permiso de precios diarios en estas unidades. Elige una para definir el tipo de pago y el precio de hoy de cada fruta."}
            </Texto>
            <Texto t={tamano.mini} color={c.apagado}>
              R = Rendimiento · P = Pactado (el precio es el tope) · C = Corrida
            </Texto>
            {precios.error ? (
              <Mensaje
                tipo="aviso"
                texto="No se pudo consultar el precio de hoy de las unidades. Puedes entrar a cada una para verlo."
                accion={<Boton texto="Reintentar" icono="refrescar" variante="secundario" onPress={() => void precios.refetch()} />}
              />
            ) : null}
          </View>
        }
        ListEmptyComponent={<Vacio texto="Sin unidades." />}
        renderItem={({ item: u }) => (
          <Tarjeta onPress={() => router.push(`/precios/${u.id}`)} etiqueta={`Precio de hoy en ${u.nombre}`}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.m }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Texto peso="negrita">{u.nombre}</Texto>
                <FrutasConPrecio frutas={precios.error ? undefined : frutasDe.get(u.id)} />
              </View>
              <Icono nombre="adelante" color={c.apagado} />
            </View>
          </Tarjeta>
        )}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.fondo }}>
      <Encabezado onAtras={() => (router.canGoBack() ? router.back() : router.replace("/"))} etiqueta="Precios" titulo="Precio del día" />
      {contenido}
    </View>
  );
}
