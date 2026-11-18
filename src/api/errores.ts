/**
 * Errores de la API de Preboletas y de conexión. La API siempre responde `{codigo, mensaje, id_solicitud}`:
 * los mensajes de negocio (báscula ocupada, unidad distinta…) ya vienen redactados y se muestran tal cual;
 * aquí solo se traducen los de sesión y conexión (igual que `mensajeError` del panel).
 */

export class ErrorApi extends Error {
  constructor(
    readonly estado: number,
    readonly codigo: string,
    mensaje: string,
    readonly idSolicitud: string | null = null,
  ) {
    super(mensaje);
    this.name = "ErrorApi";
  }
}

/** No hubo respuesta (sin señal, API apagada, tiempo agotado). Nunca se encola nada para después. */
export class ErrorSinConexion extends Error {
  constructor() {
    super("Sin conexión. Intenta de nuevo.");
    this.name = "ErrorSinConexion";
  }
}

const MENSAJES: Record<string, string> = {
  sin_vinculacion: "Tu cuenta no tiene acceso a Preboletas. Solicítalo a Sistemas.",
  rol_insuficiente: "Tu cuenta no tiene acceso a Preboletas. Solicítalo a Sistemas.",
  sesion_expirada: "Tu sesión expiró. Vuelve a iniciar sesión.",
  token_expirado: "Tu sesión expiró. Vuelve a iniciar sesión.",
  token_audiencia: "El inicio de sesión está mal configurado (el token no es de Preboletas). Avisa a Sistemas.",
  token_sin_permiso: "El inicio de sesión está mal configurado (falta el permiso de la API). Avisa a Sistemas.",
  bd_no_disponible: "La base de datos no responde. Inténtalo en un momento.",
  servicio_no_disponible: "Un servicio no responde. Inténtalo en un momento.",
  error_interno: "Ocurrió un error inesperado en la API.",
};

/** Códigos de 403 con los que la persona no puede usar la app: se cierra la sesión. */
export const CODIGOS_SIN_ACCESO = new Set(["sin_vinculacion", "rol_insuficiente"]);

export function esSinConexion(e: unknown): e is ErrorSinConexion {
  return e instanceof ErrorSinConexion;
}

/** Texto para mostrar de cualquier error. */
export function mensajeDeError(e: unknown): string {
  if (e instanceof ErrorSinConexion) return e.message;
  if (e instanceof ErrorApi) return MENSAJES[e.codigo] ?? (e.message || "Ocurrió un error inesperado.");
  return "Ocurrió un error inesperado.";
}

export function idSolicitudDe(e: unknown): string | null {
  return e instanceof ErrorApi ? e.idSolicitud : null;
}

export function codigoDe(e: unknown): string | null {
  return e instanceof ErrorApi ? e.codigo : null;
}
