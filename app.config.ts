/**
 * Configuración de Expo de la app de Preboletas (solo Android).
 *
 * - `APP_VARIANT` lo pone cada perfil de `eas.json`. Solo en `development` se permite `http://` sin cifrar,
 *   porque en desarrollo la API corre en la PC (http://<IP>:7230). Nunca en preview ni en producción.
 * - `GOOGLE_SERVICES_JSON` es el archivo de Firebase subido a EAS como variable de tipo archivo
 *   (no va en Git). Sin él, el build sale sin push.
 * - Aquí no van secretos: todo lo que entra al APK se puede extraer.
 */
import type { ConfigContext, ExpoConfig } from "expo/config";

/** Id. del proyecto en EAS. `eas init` lo muestra: pégalo aquí (no es secreto). */
const ID_PROYECTO_EAS = "d27b2ef3-636e-4199-a32f-31a1e6646e7f";

const esDesarrollo = process.env.APP_VARIANT === "development";

const archivoFirebase = process.env.GOOGLE_SERVICES_JSON;

/** Carpeta de los íconos de SiCar Farms (generados desde el isologo oficial). */
const ICONOS = "./assets/iconos-sicar-farms";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: esDesarrollo ? "Preboletas (dev)" : "Preboletas",
  slug: "preboletas",
  version: "1.0.0",
  orientation: "portrait",
  // Ícono propio de Preboletas (ver assets/iconos-sicar-farms/LEEME.md): registro en blanco sobre verde SiCar,
  // con las hojas del isologo como marca de agua. La fuente vectorial es icono-preboletas.svg.
  icon: `${ICONOS}/icon.png`,
  // Esquema propio para el regreso del inicio de sesión de Microsoft: preboletas://auth
  scheme: "preboletas",
  userInterfaceStyle: "automatic",
  platforms: ["android"],
  android: {
    package: "mx.com.sicar.preboletas",
    // Ícono adaptativo: el registro de Preboletas en blanco (con las hojas de marca de agua) sobre verde SiCar;
    // monocromo (solo el registro) para los íconos temáticos de Android 13+.
    adaptiveIcon: {
      backgroundColor: "#00833E",
      foregroundImage: `${ICONOS}/adaptive-icon.png`,
      monochromeImage: `${ICONOS}/monochrome-icon.png`,
    },
    googleServicesFile: archivoFirebase,
    // Solo los permisos que la app usa (la cámara la agrega su plugin; sin micrófono).
    blockedPermissions: ["android.permission.RECORD_AUDIO"],
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-web-browser",
    [
      // Arranque con el isologo completo (no se separa), claro y oscuro con los fondos del tema.
      // 180 dp de ancho: el logo es horizontal y Android 12+ recorta la imagen a un círculo de 192 dp.
      "expo-splash-screen",
      {
        backgroundColor: "#FFFFFF",
        image: `${ICONOS}/splash-icon.png`,
        imageWidth: 180,
        dark: {
          backgroundColor: "#0D1310",
          image: `${ICONOS}/splash-icon-dark.png`,
        },
      },
    ],
    ["expo-camera", { recordAudioAndroid: false }],
    [
      "expo-notifications",
      {
        // Ícono chico de la barra de notificaciones: hojas en blanco sobre transparente, teñidas de verde SiCar.
        icon: `${ICONOS}/notification-icon.png`,
        color: "#00833E",
        defaultChannel: "avisos",
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          usesCleartextTraffic: esDesarrollo,
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: ID_PROYECTO_EAS ? { projectId: ID_PROYECTO_EAS } : undefined,
  },
});
