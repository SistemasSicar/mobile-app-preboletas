# Íconos de la app móvil de Preboletas

Ícono propio de Preboletas: un registro (QR mínimo y renglones) en blanco sobre verde SiCar `#00833E`,
con las hojas del isologo de SiCar Farms detrás como marca de agua al 20 % (el mínimo que permite el Brand Book).
Las hojas salen de `frontend-panel-preboletas/src/components/Logo.tsx`, sin redibujar.

| Archivo | Tamaño | Uso |
|---|---|---|
| `icon.png` | 1024×1024 | Ícono general (`icon`), con su fondo verde |
| `adaptive-icon.png` | 1024×1024, transparente | `android.adaptiveIcon.foregroundImage`, con `backgroundColor: "#00833E"`. Todo cabe en la zona visible del ícono adaptativo |
| `monochrome-icon.png` | 1024×1024, transparente | `android.adaptiveIcon.monochromeImage` (íconos temáticos de Android 13+). Solo el registro, sin marca de agua |
| `notification-icon.png` | 96×96, blanco sobre transparente | Ícono pequeño de las notificaciones (plugin `expo-notifications`, `icon`), con `color: "#00833E"` |
| `splash-icon.png` | 1200×213, transparente | Pantalla de arranque en modo claro (isologo completo de SiCar Farms), fondo `#FFFFFF` |
| `splash-icon-dark.png` | 1200×213, transparente | Pantalla de arranque en modo oscuro (variante negativa), fondo `#0d1310` |
| `icono-preboletas.svg` | vector | Fuente del ícono, por si hay que regenerar los PNG |
