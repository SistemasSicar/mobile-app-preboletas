/**
 * Inicio de sesión con Microsoft Entra ID como CLIENTE PÚBLICO: Authorization Code + PKCE, sin client_secret
 * (una app instalada no puede guardar secretos). Registro "Preboletas", el mismo que valida la API.
 *
 * El documento de descubrimiento se arma fijo (no se descarga) porque los endpoints de v2.0 del inquilino
 * no cambian; así el botón de inicio de sesión está listo sin esperar a la red.
 */
import * as AuthSession from "expo-auth-session";

import { configuracion } from "@/config";

const autoridad = `https://login.microsoftonline.com/${configuracion.entraTenantId}`;

export const descubrimiento: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: `${autoridad}/oauth2/v2.0/authorize`,
  tokenEndpoint: `${autoridad}/oauth2/v2.0/token`,
  endSessionEndpoint: `${autoridad}/oauth2/v2.0/logout`,
};

/** preboletas://auth (registrada en Azure en "Aplicaciones móviles y de escritorio"). */
export const uriRedireccion = AuthSession.makeRedirectUri({ scheme: "preboletas", path: "auth" });

export const ALCANCES = [
  `api://${configuracion.entraClientId}/access_as_user`,
  "offline_access",
  "openid",
  "profile",
];

export interface Tokens {
  acceso: string;
  renovacion: string;
  /** Instante (ms) en que vence el token de acceso. */
  venceEn: number;
}

function aTokens(r: AuthSession.TokenResponse, renovacionAnterior?: string): Tokens {
  const renovacion = r.refreshToken ?? renovacionAnterior;
  if (!renovacion) throw new Error("Microsoft no devolvió token de renovación (falta offline_access).");
  // issuedAt viene en segundos; expiresIn también. Si no viene, se asume 1 h (lo normal en Entra).
  const venceEn = (r.issuedAt + (r.expiresIn ?? 3600)) * 1000;
  return { acceso: r.accessToken, renovacion, venceEn };
}

export type ResultadoInicio = { tipo: "ok"; tokens: Tokens } | { tipo: "cancelado" } | { tipo: "error"; mensaje: string };

/**
 * Abre la página de Microsoft y cambia el código por tokens. Se hace de forma imperativa (no con
 * `useAuthRequest`) para que el resultado no dependa de que la pantalla de inicio siga montada:
 * el regreso `preboletas://auth` también le llega a Expo Router (ver `app/+native-intent.tsx`).
 */
export async function pedirInicioDeSesion(): Promise<ResultadoInicio> {
  const solicitud = new AuthSession.AuthRequest({
    clientId: configuracion.entraClientId,
    scopes: ALCANCES,
    redirectUri: uriRedireccion,
    usePKCE: true,
    // Teléfonos compartidos entre turnos: siempre deja elegir la cuenta.
    prompt: AuthSession.Prompt.SelectAccount,
  });
  const r = await solicitud.promptAsync(descubrimiento);
  if (r.type === "success") {
    const codigo = r.params.code;
    if (!codigo || !solicitud.codeVerifier) return { tipo: "error", mensaje: "Microsoft no devolvió el código de acceso." };
    return { tipo: "ok", tokens: await intercambiarCodigo(codigo, solicitud.codeVerifier) };
  }
  if (r.type === "error") {
    const detalle = r.params.error_description ?? r.error?.message ?? "";
    return { tipo: "error", mensaje: `Microsoft rechazó el inicio de sesión. ${detalle}`.trim() };
  }
  return { tipo: "cancelado" };
}

/** Cambia el código de autorización por tokens (con el code_verifier del PKCE). */
async function intercambiarCodigo(codigo: string, verificador: string): Promise<Tokens> {
  const r = await AuthSession.exchangeCodeAsync(
    {
      clientId: configuracion.entraClientId,
      code: codigo,
      redirectUri: uriRedireccion,
      scopes: ALCANCES,
      extraParams: { code_verifier: verificador },
    },
    descubrimiento,
  );
  return aTokens(r);
}

/** Renueva el token de acceso. Entra puede rotar el de renovación: se guarda el nuevo si viene. */
export async function renovarTokens(renovacion: string): Promise<Tokens> {
  const r = await AuthSession.refreshAsync(
    { clientId: configuracion.entraClientId, refreshToken: renovacion, scopes: ALCANCES },
    descubrimiento,
  );
  return aTokens(r, renovacion);
}
