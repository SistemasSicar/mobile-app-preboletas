/**
 * Enlaces que abren la app desde fuera. El regreso del inicio de sesión de Microsoft
 * (`preboletas://auth?code=…`) lo atiende `expo-auth-session`, pero Android también se lo entrega a
 * Expo Router: sin esto mostraría "ruta no encontrada". Se manda a la pantalla de inicio de sesión
 * (donde ya está la persona); el código lo procesa la sesión. Si para entonces ya hay sesión, el grupo
 * `(auth)` está protegido y su `redirectTo` lleva a Inicio ("/").
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    if (/^preboletas:\/\/auth\b/i.test(path) || /^\/?auth(\?|$)/i.test(path)) return "/iniciar-sesion";
    return path;
  } catch {
    return "/";
  }
}
