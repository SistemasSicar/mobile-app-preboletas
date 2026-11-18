/**
 * QR de la preboleta para el proveedor, como "Compartir QR" del panel (`CompartirQR.tsx`):
 * - El QR se ve grande en pantalla (el proveedor lo puede escanear directo del teléfono) y codifica `qr_url`,
 *   la página pública que sirve el panel (sin inicio de sesión, sin cajas, kilos, precios ni comprador).
 * - "Enviar por WhatsApp" abre un enlace `wa.me` SIN número: el comprador elige el contacto. WhatsApp nunca
 *   se integra; el botón va en verde SiCar, no en el verde de WhatsApp.
 * - "Compartir enlace" abre la hoja de compartir de Android (sirve también para copiar el texto).
 */
import { useState } from "react";
import { Linking, Share, View } from "react-native";

import type { PreboletaCompleta } from "@/api/tipos";
import { enlaceWhatsApp, mensajeWhatsApp } from "@/calculos";
import { useTema } from "@/tema/tema";
import { espacio, tamano } from "@/tema/tipografia";
import { CodigoQr } from "../CodigoQr";
import { CampoTexto, Desplegable } from "../formularios";
import { Boton, Mensaje, Texto } from "../ui";

function Contenido({ p }: { p: PreboletaCompleta }) {
  const { c } = useTema();
  const [mensaje, setMensaje] = useState(() => mensajeWhatsApp(p.folio, p.unidad, p.qr_url));
  const [error, setError] = useState<string | null>(null);

  const abrirWhatsApp = async () => {
    setError(null);
    try {
      await Linking.openURL(enlaceWhatsApp(mensaje));
    } catch {
      setError("No se pudo abrir WhatsApp. Usa «Compartir enlace» y elige la app.");
    }
  };

  const compartir = async () => {
    setError(null);
    try {
      await Share.share({ message: mensaje });
    } catch {
      setError("No se pudo abrir la hoja de compartir. Intenta de nuevo.");
    }
  };

  return (
    <View style={{ gap: espacio.m }}>
      <CodigoQr valor={p.qr_url} />
      {p.cerrada_at ? (
        <Texto t={tamano.chico} peso="seminegrita" color={c.aviso} centrado>
          Preboleta cerrada
        </Texto>
      ) : null}
      <Texto t={tamano.chico} color={c.apagado} centrado>
        El proveedor lo muestra al llegar a la báscula. Su página no trae cajas, kilos, precios ni comprador.
      </Texto>
      <CampoTexto etiqueta="Mensaje para WhatsApp" valor={mensaje} onCambio={setMensaje} multilinea maximo={1000} />
      {error ? <Mensaje tipo="peligro" texto={error} /> : null}
      <Boton texto="Enviar por WhatsApp" icono="whatsapp" onPress={() => void abrirWhatsApp()} deshabilitado={!mensaje.trim()} />
      <Boton texto="Compartir enlace" icono="compartir" variante="secundario" onPress={() => void compartir()} deshabilitado={!mensaje.trim()} />
      <Texto t={tamano.chico} color={c.apagado}>
        El comprador elige el contacto en su teléfono. El sistema no guarda el teléfono del proveedor.
      </Texto>
    </View>
  );
}

export function CompartirQr({ p }: { p: PreboletaCompleta }) {
  return (
    <Desplegable texto="Ver QR y compartir" icono="qr" titulo="QR de la preboleta">
      {() => <Contenido p={p} />}
    </Desplegable>
  );
}
