/**
 * Colores de SiCar Farms, los mismos tokens del panel (`frontend-panel-preboletas/src/app/globals.css`),
 * en versión clara y oscura. Los componentes NUNCA usan colores sueltos: siempre `useTema().c.<token>`.
 *
 * Verde lima (#70D44B) nunca va como texto sobre fondo claro (contraste 1.9:1): en claro el acento es #00833E.
 */

export interface Colores {
  // Superficies y texto
  fondo: string;
  superficie: string;
  superficie2: string;
  linea: string;
  texto: string;
  apagado: string;
  // Acción
  acento: string;
  acentoTexto: string;
  acentoSuave: string;
  // Mensajes
  peligro: string;
  peligroTexto: string;
  peligroSuave: string;
  aviso: string;
  avisoSuave: string;
  info: string;
  infoSuave: string;
  // Estados de preboleta
  estPendiente: string;
  estBascula: string;
  estProceso: string;
  estTerminado: string;
  estIncidencia: string;
  /** Texto sobre el chip amarillo de "En báscula" (el blanco no se lee). */
  estBasculaTexto: string;
  // Logo (en oscuro la parte A va en blanco, como en el panel)
  logoA: string;
  logoB: string;
  // Encabezado verde con degradado (igual en claro y oscuro) y lo que va encima
  encabezadoInicio: string;
  encabezadoFin: string;
  sobreEncabezado: string;
  sobreEncabezadoSuave: string;
  translucido: string;
  translucidoFuerte: string;
  marcaLima: string;
  /** Texto sobre verde lima (botón de linterna prendida). */
  sobreLima: string;
  /** Texto blanco sobre chips de color (estados, tipos de movimiento). */
  sobreColor: string;
  /** Botón blanco del inicio de sesión. */
  botonClaroFondo: string;
  botonClaroTexto: string;
  /** Onda al tocar un botón con fondo de color. */
  onda: string;
  /** Fondo detrás de la cámara. */
  fondoCamara: string;
  /** Punto del indicador de conexión. */
  conectando: string;
  desconectado: string;
  /** Código QR: siempre negro sobre blanco (también en oscuro) para que cualquier lector lo lea. */
  qrFondo: string;
  qrModulo: string;
  /** Velo detrás de un menú abierto (opciones del botón flotante). */
  velo: string;
}

const marca = {
  encabezadoInicio: "#266041", // Pantone 7734 C
  encabezadoFin: "#00833E", // Pantone 348 C
  sobreEncabezado: "#FFFFFF",
  sobreEncabezadoSuave: "rgba(255,255,255,0.78)",
  translucido: "rgba(255,255,255,0.14)",
  translucidoFuerte: "rgba(255,255,255,0.25)",
  marcaLima: "#70D44B", // Pantone 7488 C: solo sobre el verde oscuro del encabezado
  sobreLima: "#0B1A0E",
  sobreColor: "#FFFFFF",
  botonClaroFondo: "#FFFFFF",
  botonClaroTexto: "#1D1D1B",
  onda: "rgba(0,0,0,0.12)",
  fondoCamara: "#000000",
  conectando: "#FFC200",
  desconectado: "#FF7D73",
  estBasculaTexto: "#3A2C00",
  qrFondo: "#FFFFFF",
  qrModulo: "#000000",
  velo: "rgba(0,0,0,0.45)",
};

export const claro: Colores = {
  ...marca,
  fondo: "#F3F6F2",
  superficie: "#FFFFFF",
  superficie2: "#EBF1E9",
  linea: "#D5DDD2",
  texto: "#1D1D1B",
  apagado: "#5A6159",
  acento: "#00833E",
  acentoTexto: "#FFFFFF",
  acentoSuave: "#E0F3E5",
  peligro: "#B2292E",
  peligroTexto: "#FFFFFF",
  peligroSuave: "#FBE7E7",
  aviso: "#8A5D00",
  avisoSuave: "#FFF4CC",
  info: "#0033A1",
  infoSuave: "#E3E9F7",
  estPendiente: "#676767",
  estBascula: "#FFC200",
  estProceso: "#2689D5",
  estTerminado: "#16A34A",
  estIncidencia: "#8B0AAA",
  logoA: "#00833E",
  logoB: "#70D44B",
};

export const oscuro: Colores = {
  ...marca,
  fondo: "#0D1310",
  superficie: "#141C17",
  superficie2: "#1C2620",
  linea: "#2B382F",
  texto: "#E8EEE9",
  apagado: "#9BA79E",
  acento: "#70D44B",
  acentoTexto: "#0B1A0E",
  acentoSuave: "#1B3522",
  peligro: "#FF7D73",
  peligroTexto: "#2A0905",
  peligroSuave: "#3B1715",
  aviso: "#FFC600",
  avisoSuave: "#3A2E08",
  info: "#94B3FF",
  infoSuave: "#172446",
  estPendiente: "#A3A3A3",
  estBascula: "#FFC200",
  estProceso: "#5AA9EC",
  estTerminado: "#4ADE80",
  estIncidencia: "#C86EE6",
  logoA: "#FFFFFF",
  logoB: "#70D44B",
};

/** Color de cada estado calculado de la preboleta (`v_preboletas`). */
export function colorEstado(c: Colores, estado: string): string {
  switch (estado) {
    case "en_bascula":
      return c.estBascula;
    case "en_proceso":
      return c.estProceso;
    case "terminado":
      return c.estTerminado;
    case "terminado_con_incidencias":
      return c.estIncidencia;
    default:
      return c.estPendiente;
  }
}
