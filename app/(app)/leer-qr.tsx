/**
 * Leer QR (Basculista o Admin). Se abre con el botón flotante de Inicio. Cámara → `GET /preboletas/qr/{token}` → pantalla de entrada con `via: "qr"`.
 *
 * - Al leer un código el escáner se PAUSA hasta que la persona actúe: nunca se lee dos veces por accidente.
 * - Vibración corta al leer y botón de linterna (hay básculas con poca luz).
 * - No se elige unidad: la API la toma de la preboleta y responde `unidad_distinta` si no te toca.
 * - La cámara solo está prendida mientras esta pantalla está a la vista (al abrir la entrada se apaga).
 */
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Linking, View } from "react-native";

import { resolverQr } from "@/api/consultas";
import { codigoDe, esSinConexion, idSolicitudDe, mensajeDeError } from "@/api/errores";
import { Encabezado } from "@/componentes/Encabezado";
import { Boton, BotonIcono, Cargando, Mensaje, Texto, useEspacioAbajo } from "@/componentes/ui";
import { esAdmin } from "@/permisos";
import { useYo } from "@/sesion/Sesion";
import { useTema } from "@/tema/tema";
import { espacio, radio, tamano } from "@/tema/tipografia";

type Estado =
  | { tipo: "escaneando" }
  | { tipo: "resolviendo" }
  | { tipo: "error"; error: unknown; codigo: string };

export default function LeerQr() {
  const { c } = useTema();
  const yo = useYo();
  const router = useRouter();
  const [permiso, pedirPermiso] = useCameraPermissions();
  const espacioAbajo = useEspacioAbajo();
  const [enfocada, setEnfocada] = useState(false);
  const [linterna, setLinterna] = useState(false);
  const [estado, setEstado] = useState<Estado>({ tipo: "escaneando" });
  // Candado inmediato: el escáner dispara muchas lecturas por segundo y el estado de React tarda en aplicarse.
  const bloqueado = useRef(false);

  // Al volver a esta pantalla (por ejemplo, con "Leer otro QR" después de registrar una entrada) se lee de nuevo.
  useFocusEffect(
    useCallback(() => {
      setEnfocada(true);
      bloqueado.current = false;
      setEstado({ tipo: "escaneando" });
      return () => {
        setEnfocada(false);
        setLinterna(false);
      };
    }, []),
  );

  const resolver = async (codigo: string) => {
    setEstado({ tipo: "resolviendo" });
    try {
      const { preboleta_id } = await resolverQr(codigo);
      router.push({ pathname: "/preboleta/[id]/entrada", params: { id: String(preboleta_id), via: "qr" } });
    } catch (e) {
      setEstado({ tipo: "error", error: e, codigo });
    }
  };

  const alLeer = ({ data }: BarcodeScanningResult) => {
    if (bloqueado.current || !data) return;
    bloqueado.current = true;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    void resolver(data);
  };

  const leerOtro = () => {
    bloqueado.current = false;
    setEstado({ tipo: "escaneando" });
  };

  const etiqueta = esAdmin(yo) ? "Báscula · cualquier unidad" : `Báscula de ${yo.unidad}`;

  let contenido;
  if (!permiso) {
    contenido = <Cargando texto="Preparando la cámara…" />;
  } else if (!permiso.granted) {
    contenido = (
      <View style={{ padding: espacio.l }}>
        <Mensaje
          tipo="aviso"
          titulo="Falta el permiso de la cámara"
          texto="Para leer el QR de la preboleta, la app necesita usar la cámara."
          accion={
            permiso.canAskAgain ? (
              <Boton texto="Permitir cámara" onPress={() => void pedirPermiso()} />
            ) : (
              <Boton texto="Abrir ajustes" variante="secundario" onPress={() => void Linking.openSettings()} />
            )
          }
        />
      </View>
    );
  } else {
    const pausado = estado.tipo !== "escaneando";
    contenido = (
      <View style={{ flex: 1, padding: espacio.l, paddingBottom: espacioAbajo, gap: espacio.l }}>
        <View style={{ flex: 1, borderRadius: radio.tarjeta, overflow: "hidden", backgroundColor: c.fondoCamara }}>
          {enfocada ? (
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              enableTorch={linterna}
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={pausado ? undefined : alLeer}
            />
          ) : null}
          {/* Marco de apuntado */}
          <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
            <View
              style={{
                width: "68%",
                aspectRatio: 1,
                borderRadius: radio.tarjeta,
                borderWidth: 4,
                borderColor: pausado ? c.estBascula : c.marcaLima,
              }}
            />
          </View>
          <View style={{ position: "absolute", top: espacio.m, right: espacio.m }}>
            <BotonIcono
              icono="linterna"
              etiqueta={linterna ? "Apagar linterna" : "Prender linterna"}
              onPress={() => setLinterna((l) => !l)}
              sobreVerde
              activo={linterna}
            />
          </View>
        </View>

        {estado.tipo === "escaneando" ? (
          <Texto peso="seminegrita" t={tamano.grande} centrado>
            Apunta al QR de la preboleta
          </Texto>
        ) : estado.tipo === "resolviendo" ? (
          <Cargando texto="Buscando la preboleta…" />
        ) : (
          <Mensaje
            tipo={esSinConexion(estado.error) ? "aviso" : "peligro"}
            titulo={codigoDe(estado.error) === "unidad_distinta" ? "Ese QR no es de tu báscula" : undefined}
            texto={mensajeDeError(estado.error)}
            idSolicitud={idSolicitudDe(estado.error)}
            accion={
              <View style={{ gap: espacio.s }}>
                {esSinConexion(estado.error) ? (
                  <Boton texto="Reintentar" icono="refrescar" onPress={() => void resolver(estado.codigo)} />
                ) : null}
                <Boton texto="Leer otro QR" icono="qr" variante="secundario" onPress={leerOtro} />
              </View>
            }
          />
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.fondo }}>
      <Encabezado onAtras={() => (router.canGoBack() ? router.back() : router.replace("/"))} etiqueta={etiqueta} titulo="Leer QR" />
      {contenido}
    </View>
  );
}
