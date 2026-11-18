/**
 * Nueva preboleta (`POST /preboletas`), solo Comprador o Admin. Mismas reglas que el panel
 * (`frontend-panel-preboletas/src/components/FormNuevaPreboleta.tsx`); la API vuelve a validar todo.
 *
 * - Proveedor: búsqueda en D365 (mínimo 2 letras, espera de 300 ms). El nombre nunca lo escribe la persona.
 *   Al elegirlo se propone su sitio de compra como unidad.
 * - Fruta (se elige sola si hay una) → cajas permitidas para esa fruta.
 * - Kilos o cajas, con equivalencias y rango mín–máx con la tolerancia (`src/calculos.ts`).
 * - Fecha de llegada: hoy y los 6 días siguientes (hora de México).
 * - Precio: el del día de (unidad, fruta, fecha). Vacío = el del día. Si se cambia el precio o el tipo,
 *   la API crea una propuesta que alguien autoriza; mientras tanto aplica el del día. Sin tolerancia
 *   para esa fruta en la unidad no se puede crear.
 * - Admin puede asignar otro comprador.
 */
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, ScrollView, View } from "react-native";

import {
  useBuscarProveedores,
  useCompradores,
  useCrearPreboleta,
  useFrutas,
  usePrecioDia,
  useTiposCaja,
  useTiposPago,
  useUnidades,
} from "@/api/consultas";
import type { ProveedorD365 } from "@/api/tipos";
import { cajasEquivalentes, decimalesValidos, difiereDelDia, kilosEquivalentes, leerDecimal, rango, superaTope } from "@/calculos";
import { Encabezado } from "@/componentes/Encabezado";
import { CampoTexto, Interruptor, ListaOpciones, Selector, useTecladoAbierto } from "@/componentes/formularios";
import { BarraAccion, Boton, Cargando, Mensaje, MensajeError, Seccion, Tarjeta, Texto } from "@/componentes/ui";
import { diasProximos, entero, kg, numero, precioTxt } from "@/formato";
import { esAdmin, puedeCrearPreboleta } from "@/permisos";
import { useYo } from "@/sesion/Sesion";
import { useTema } from "@/tema/tema";
import { espacio, tamano } from "@/tema/tipografia";

type Negociacion = "kilos" | "cajas";

/** 0 en los selectores = "Yo" (comprador) o "Del día" (tipo de pago). */
const NINGUNO = 0;

export default function NuevaPreboletaPantalla() {
  const { c } = useTema();
  const yo = useYo();
  const router = useRouter();
  const admin = esAdmin(yo);
  const tecladoAbierto = useTecladoAbierto();

  const unidades = useUnidades();
  const frutas = useFrutas();
  const tiposPago = useTiposPago();
  const compradores = useCompradores(admin);
  const crear = useCrearPreboleta();

  // Proveedor: la búsqueda se manda 300 ms después de dejar de escribir.
  const [busqueda, setBusqueda] = useState("");
  const [busquedaEnviada, setBusquedaEnviada] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setBusquedaEnviada(busqueda), 300);
    return () => clearTimeout(t);
  }, [busqueda]);
  const proveedores = useBuscarProveedores(busquedaEnviada);
  const [proveedor, setProveedor] = useState<ProveedorD365 | null>(null);

  const [unidad, setUnidad] = useState<number | null>(null);
  const [fruta, setFruta] = useState<string | null>(null);
  const [caja, setCaja] = useState<number | null>(null);
  const [negociacion, setNegociacion] = useState<Negociacion>("kilos");
  const [cantidadTexto, setCantidadTexto] = useState("");
  const dias = useMemo(() => diasProximos(7), []);
  const [fecha, setFecha] = useState(dias[0]!.fecha);
  const [comprador, setComprador] = useState<number>(NINGUNO);
  const [tipoPago, setTipoPago] = useState<number>(NINGUNO);
  const [precioTexto, setPrecioTexto] = useState("");
  const [motivo, setMotivo] = useState("");
  const [multiples, setMultiples] = useState(false);
  const [intentado, setIntentado] = useState(false);

  // Si solo hay una fruta admitida, se elige sola (sin guardar estado: se deriva).
  const frutaElegida = fruta ?? (frutas.data?.length === 1 ? frutas.data[0]!.codigo : null);
  const tiposCaja = useTiposCaja(frutaElegida);
  const cajasPermitidas = (tiposCaja.data ?? []).filter((t) => t.activo);
  const cajaElegida = cajasPermitidas.find((t) => t.id === caja) ?? (cajasPermitidas.length === 1 ? cajasPermitidas[0] : undefined);

  const precioDia = usePrecioDia(unidad, frutaElegida, fecha);
  const dia = precioDia.data;
  const sinTolerancia = dia !== undefined && dia.tolerancia_pct === null;
  const sinPrecioDia = dia !== undefined && dia.precio_kg === null;

  // Cantidad y rango
  const cantidad = leerDecimal(cantidadTexto);
  const kgPorCaja = cajaElegida?.kg_por_caja ?? 0;
  const cajas = cajasEquivalentes(negociacion, cantidad ?? 0, kgPorCaja);
  const rangoCajas = dia?.tolerancia_pct != null && cajas > 0 ? rango(cajas, dia.tolerancia_pct) : null;

  // Precio
  const precio = leerDecimal(precioTexto);
  const tipoElegido = tipoPago === NINGUNO ? null : tipoPago;
  const pactadoId = tiposPago.data?.find((t) => t.clave === "pactado")?.id ?? null;
  // Sin precio del día, un precio capturado siempre es Precio Pactado y requiere autorización (regla de la API).
  const tipoAEnviar = sinPrecioDia ? (precio !== null ? pactadoId : null) : tipoElegido;
  const habraPropuesta = dia ? (sinPrecioDia ? precio !== null : difiereDelDia(precio, tipoElegido, dia)) : false;
  const tope = dia ? superaTope(precio, dia.precio_kg, dia.tipo_pago_clave) : false;

  // Validación (los mismos mensajes del panel cuando aplica)
  const errorCantidad = !cantidadTexto.trim()
    ? "Captura la cantidad."
    : cantidad === null || cantidad <= 0
      ? "Debe ser mayor a 0."
      : negociacion === "cajas" && !Number.isInteger(cantidad)
        ? "En cajas, captura un número entero."
        : !decimalesValidos(cantidadTexto, 2)
          ? "Máximo 2 decimales."
          : cajaElegida && cajas <= 0
            ? "La cantidad no alcanza para una caja."
            : null;
  const errorPrecio = precioTexto.trim() && (precio === null || precio <= 0) ? "El precio debe ser mayor a 0." : null;
  const faltantes = [
    !proveedor && "el proveedor",
    unidad === null && "la unidad",
    !frutaElegida && "la fruta",
    !cajaElegida && "la caja",
    errorCantidad && "la cantidad",
  ].filter(Boolean) as string[];
  const puedeEnviar = faltantes.length === 0 && !errorPrecio && !sinTolerancia;

  const elegirProveedor = (cuenta: string) => {
    const p = proveedores.data?.find((x) => x.cuenta === cuenta);
    if (!p) return;
    setProveedor(p);
    // Se propone la unidad del sitio de compra en D365, si existe.
    if (p.sitio !== null && unidades.data?.some((u) => u.id === p.sitio)) setUnidad(p.sitio);
  };

  const elegirFruta = (codigo: string) => {
    setFruta(codigo);
    setCaja(null); // Las cajas permitidas cambian con la fruta.
  };

  const enviar = () => {
    setIntentado(true);
    if (!puedeEnviar || !proveedor || unidad === null || !frutaElegida || !cajaElegida) return;
    crear.mutate(
      {
        proveedor_cuenta: proveedor.cuenta,
        producto_codigo: frutaElegida,
        unidad_negocio_id: unidad,
        tipo_caja_id: cajaElegida.id,
        tipo_negociacion: negociacion,
        cantidad: cantidadTexto.trim().replace(",", "."),
        fecha_llegada: fecha,
        comprador_id: admin && comprador !== NINGUNO ? comprador : null,
        multiples_cargas: multiples,
        precio_kg: precio !== null ? precioTexto.trim().replace(",", ".") : null,
        tipo_pago_id: tipoAEnviar,
        motivo: habraPropuesta && motivo.trim() ? motivo.trim() : null,
      },
      {
        onSuccess: (r) =>
          router.replace({
            pathname: "/preboleta/[id]",
            params: { id: String(r.id), creada: r.folio, propuesta: r.propuesta_id ? "1" : "0" },
          }),
      },
    );
  };

  const encabezado = <Encabezado onAtras={() => (router.canGoBack() ? router.back() : router.replace("/"))} etiqueta="Nueva" titulo="Preboleta" />;

  if (!puedeCrearPreboleta(yo)) {
    return (
      <View style={{ flex: 1, backgroundColor: c.fondo }}>
        {encabezado}
        <View style={{ padding: espacio.l }}>
          <Mensaje tipo="info" texto="Las preboletas las crean los compradores y los Admin." />
        </View>
      </View>
    );
  }

  const unidadNombre = unidades.data?.find((u) => u.id === unidad)?.nombre;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.fondo }} behavior="padding">
      {encabezado}
      <ScrollView contentContainerStyle={{ padding: espacio.l, gap: espacio.xl }} keyboardShouldPersistTaps="handled">
        {/* 1. Proveedor */}
        <Seccion titulo="Proveedor">
          <Tarjeta estilo={{ gap: espacio.m }}>
            {proveedor ? (
              <>
                <View style={{ gap: 2 }}>
                  <Texto peso="negrita">{proveedor.nombre}</Texto>
                  <Texto peso="mono" t={tamano.chico} color={c.apagado}>
                    {proveedor.cuenta}
                  </Texto>
                  <Texto t={tamano.chico} color={c.apagado}>
                    {proveedor.sitio !== null
                      ? `Sitio en D365: ${unidades.data?.find((u) => u.id === proveedor.sitio)?.nombre ?? proveedor.sitio}`
                      : "Sin sitio en D365: elige la unidad."}
                  </Texto>
                </View>
                <Boton texto="Cambiar proveedor" variante="secundario" onPress={() => setProveedor(null)} />
              </>
            ) : (
              <>
                <CampoTexto
                  etiqueta="Proveedor (búsqueda en D365)"
                  valor={busqueda}
                  onCambio={setBusqueda}
                  placeholder="Nombre o cuenta (mínimo 2 letras)"
                  error={intentado && !proveedor ? "Elige el proveedor." : null}
                />
                {busquedaEnviada.trim().length < 2 ? null : proveedores.isFetching ? (
                  <Texto t={tamano.chico} color={c.apagado}>
                    Buscando en D365…
                  </Texto>
                ) : proveedores.error ? (
                  <MensajeError error={proveedores.error} onReintentar={() => void proveedores.refetch()} />
                ) : (proveedores.data ?? []).length === 0 ? (
                  <Texto t={tamano.chico} color={c.apagado}>
                    Sin coincidencias.
                  </Texto>
                ) : (
                  <ListaOpciones
                    valor={null}
                    onCambio={elegirProveedor}
                    opciones={(proveedores.data ?? []).map((p) => ({ valor: p.cuenta, texto: p.nombre, detalle: p.cuenta }))}
                  />
                )}
              </>
            )}
          </Tarjeta>
        </Seccion>

        {/* 2. Unidad y fruta */}
        <Seccion titulo="Unidad y fruta">
          <Tarjeta estilo={{ gap: espacio.l }}>
            {unidades.error ? (
              <MensajeError error={unidades.error} onReintentar={() => void unidades.refetch()} />
            ) : unidades.isPending ? (
              <Cargando texto="Cargando unidades…" />
            ) : (
              <Selector
                etiqueta="Unidad destino"
                opciones={(unidades.data ?? []).map((u) => ({ valor: u.id, texto: u.nombre }))}
                valor={unidad}
                onCambio={setUnidad}
                ayuda={
                  proveedor?.sitio != null && unidad !== null && unidad !== proveedor.sitio
                    ? "Distinta al sitio del proveedor: quedará registrado."
                    : intentado && unidad === null
                      ? "Elige la unidad."
                      : undefined
                }
              />
            )}

            {frutas.error ? (
              <MensajeError error={frutas.error} onReintentar={() => void frutas.refetch()} />
            ) : frutas.isPending ? (
              <Cargando texto="Consultando las frutas en D365…" />
            ) : (
              <Selector
                etiqueta="Fruta"
                opciones={(frutas.data ?? []).map((f) => ({ valor: f.codigo, texto: f.nombre }))}
                valor={frutaElegida}
                onCambio={elegirFruta}
                ayuda={intentado && !frutaElegida ? "Elige la fruta." : undefined}
              />
            )}

            {frutaElegida ? (
              tiposCaja.error ? (
                <MensajeError error={tiposCaja.error} onReintentar={() => void tiposCaja.refetch()} />
              ) : tiposCaja.isPending ? (
                <Cargando texto="Cargando cajas…" />
              ) : cajasPermitidas.length === 0 ? (
                <Mensaje tipo="aviso" texto="Ninguna caja permitida para esta fruta: pídela al Admin." />
              ) : (
                <Selector
                  etiqueta="Caja"
                  opciones={cajasPermitidas.map((t) => ({ valor: t.id, texto: `${t.nombre} (${numero(t.kg_por_caja)} kg)` }))}
                  valor={cajaElegida?.id ?? null}
                  onCambio={setCaja}
                  ayuda={intentado && !cajaElegida ? "Elige la caja." : undefined}
                />
              )
            ) : null}
          </Tarjeta>
        </Seccion>

        {/* 3. Cantidad y fecha */}
        <Seccion titulo="Cantidad y llegada">
          <Tarjeta estilo={{ gap: espacio.l }}>
            <Selector<Negociacion>
              etiqueta="Negociación"
              opciones={[
                { valor: "kilos", texto: "En kilos" },
                { valor: "cajas", texto: "En cajas" },
              ]}
              valor={negociacion}
              onCambio={setNegociacion}
            />
            <CampoTexto
              etiqueta={negociacion === "kilos" ? "Kilos" : "Cajas"}
              valor={cantidadTexto}
              onCambio={setCantidadTexto}
              teclado={negociacion === "kilos" ? "decimal-pad" : "number-pad"}
              placeholder="0"
              error={intentado ? errorCantidad : null}
              ayuda={
                cajaElegida && cajas > 0
                  ? `${negociacion === "kilos" ? `Equivale a ${entero(cajas)} cajas` : `Equivale a ${kg(kilosEquivalentes(cajas, kgPorCaja))}`}${
                      rangoCajas ? ` · rango ${entero(rangoCajas.minimo)}–${entero(rangoCajas.maximo)} cajas` : ""
                    }.`
                  : cajaElegida
                    ? undefined
                    : "Elige la caja para ver las equivalencias."
              }
            />
            <Selector etiqueta="Fecha de llegada" opciones={dias.map((d) => ({ valor: d.fecha, texto: d.texto }))} valor={fecha} onCambio={setFecha} />
            <Interruptor texto="Múltiples cargas" ayuda="Llegará en varios camiones." valor={multiples} onCambio={setMultiples} />
          </Tarjeta>
        </Seccion>

        {/* 4. Comprador (solo Admin) */}
        {admin ? (
          <Seccion titulo="Comprador">
            <Tarjeta>
              {compradores.error ? (
                <MensajeError error={compradores.error} onReintentar={() => void compradores.refetch()} />
              ) : compradores.isPending ? (
                <Cargando texto="Cargando compradores…" />
              ) : (
                <ListaOpciones
                  valor={comprador}
                  onCambio={setComprador}
                  opciones={[
                    { valor: NINGUNO, texto: "Yo", detalle: yo.nombre },
                    ...(compradores.data ?? [])
                      .filter((col) => col.id !== yo.colaborador_id)
                      .map((col) => ({ valor: col.id, texto: col.nombre, detalle: col.unidad })),
                  ]}
                />
              )}
            </Tarjeta>
          </Seccion>
        ) : null}

        {/* 5. Precio */}
        <Seccion titulo="Precio">
          <Tarjeta estilo={{ gap: espacio.m }}>
            {unidad === null || !frutaElegida ? (
              <Texto t={tamano.chico} color={c.apagado}>
                Elige la unidad y la fruta para ver el precio del día y la tolerancia.
              </Texto>
            ) : precioDia.isPending ? (
              <Cargando texto="Consultando el precio del día…" />
            ) : precioDia.error || !dia ? (
              <Mensaje tipo="aviso" texto="No se pudo consultar el precio del día. Puedes capturar; la API lo vuelve a validar." />
            ) : (
              <View style={{ gap: 4 }}>
                <Texto t={tamano.chico}>
                  Precio del día:{" "}
                  <Texto t={tamano.chico} peso="negrita">
                    {dia.precio_kg !== null ? `${dia.tipo_pago ?? ""} · ${precioTxt(dia.precio_kg, dia.tipo_pago_clave)}` : "sin asignar"}
                  </Texto>
                </Texto>
                <Texto t={tamano.chico} color={sinTolerancia ? c.peligro : c.texto}>
                  Tolerancia:{" "}
                  <Texto t={tamano.chico} peso="negrita" color={sinTolerancia ? c.peligro : c.texto}>
                    {dia.tolerancia_pct !== null ? `${numero(dia.tolerancia_pct)}%` : "no definida (pídela al Admin)"}
                  </Texto>
                </Texto>
              </View>
            )}

            {sinTolerancia ? (
              <Mensaje
                tipo="peligro"
                texto={`Sin tolerancia para esta fruta en ${unidadNombre ?? "la unidad"}: no se pueden crear preboletas. Pídela al Admin.`}
              />
            ) : null}

            {sinPrecioDia ? (
              <Mensaje
                tipo="info"
                titulo="Sin precio del día"
                texto={
                  precio !== null
                    ? "Será Precio Pactado con el precio que capturaste y requiere autorización."
                    : "Puedes dejar el precio vacío: la preboleta tomará el tipo de pago y el precio en cuanto se definan."
                }
              />
            ) : (
              <Selector
                etiqueta="Tipo de pago"
                opciones={[
                  { valor: NINGUNO, texto: "Del día" },
                  ...(tiposPago.data ?? []).filter((t) => t.activo).map((t) => ({ valor: t.id, texto: t.nombre })),
                ]}
                valor={tipoPago}
                onCambio={setTipoPago}
              />
            )}

            <CampoTexto
              etiqueta="Precio $/kg (opcional)"
              valor={precioTexto}
              onCambio={setPrecioTexto}
              teclado="decimal-pad"
              placeholder={dia?.precio_kg != null ? `Vacío: el del día (${precioTxt(dia.precio_kg)})` : "Vacío: esperar el precio del día"}
              error={errorPrecio}
            />

            {habraPropuesta && !sinPrecioDia ? (
              <Mensaje
                tipo="aviso"
                titulo="Se creará una propuesta"
                texto="Cambiaste el precio o el tipo del día. Mientras no se autorice, aplica el del día."
              />
            ) : null}
            {tope ? (
              <Texto t={tamano.chico} peso="seminegrita" color={c.aviso}>
                Supera el tope del Precio Pactado.
              </Texto>
            ) : null}
            {habraPropuesta ? (
              <CampoTexto etiqueta="Motivo del precio (opcional)" valor={motivo} onCambio={setMotivo} maximo={500} multilinea />
            ) : null}
          </Tarjeta>
        </Seccion>

        {intentado && faltantes.length > 0 ? <Mensaje tipo="peligro" texto={`Falta ${faltantes.join(", ")}.`} /> : null}
        {crear.error ? <MensajeError error={crear.error} /> : null}
      </ScrollView>

      {/* Con el teclado abierto la barra se esconde para dejar ver el campo; se crea al cerrarlo. */}
      {!tecladoAbierto ? (
        <BarraAccion enFlujo>
          <Boton
            texto="Crear preboleta"
            icono="agregar"
            grande
            estilo={{ flex: 1 }}
            cargando={crear.isPending}
            deshabilitado={sinTolerancia}
            onPress={enviar}
          />
        </BarraAccion>
      ) : null}
    </KeyboardAvoidingView>
  );
}
