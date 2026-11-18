# App móvil de Preboletas: contexto para Claude

App **Android** de **Preboletas** (SICAR / SiCar Farms). Su prioridad es **leer el QR en báscula**, pero al final tiene
**las mismas funciones que el panel web**, incluidas la configuración y el historial, para que basculistas, compradores
y Admin tengan Preboletas completa en el teléfono.

- **Lo único que la app tiene y el panel no:** **escanear el QR** con la cámara para preparar la recepción de la fruta del proveedor.
- **Todo lo demás:** las mismas reglas, datos y permisos que el panel. Usa la misma API, sin cambios en la arquitectura ni en la base de datos.

Responde siempre en **español**. Escribe en español los nombres de variables, componentes, pantallas y textos de la interfaz.

- **Antes de empezar:** lee el `CLAUDE.md` de la raíz (`02_Preboletas/CLAUDE.md`). Ahí están las reglas de negocio, la base de datos y la terminología.
- **Terminología:** el backend se llama siempre **"la API de Preboletas"**.
- **Secretos:** esta app **no tiene secretos** (ver §5). Nunca leas, pidas ni muestres `.env.local` de ninguna carpeta.

---

## 1. Lugar en el proyecto

| Carpeta (en `02_Preboletas/`) | Qué es |
|---|---|
| `backend-api-preboletas/` | **API de Preboletas** (7230). La única con la que habla esta app |
| `frontend-panel-preboletas/` | Panel web (7301). Referencia de pantallas, textos e identidad visual |
| **`mobile-app-preboletas/`** | **Esta app** |
| `mobile-app-preboletas/docs/mockup/` | Mockup de la app (5 imágenes). Referencia **visual**: ver §7 |
| `example/Preboletas MVP.html` | Prototipo: referencia de flujos y reglas. No se copia tal cual |

- **Comunicación:** app → API de Preboletas (REST + WebSocket). **Nunca** a PostgreSQL, Dataverse, CoreAPI ni MSDataServices.
- **Contrato de la API:** el código de `backend-api-preboletas/` y su `/openapi.json` (en desarrollo). **Eso manda**.
  - No inventes rutas ni campos. Si la app necesita algo que la API no tiene, **propón el cambio en la API**; no lo resuelvas en el teléfono.
  - Genera los tipos desde el OpenAPI con `openapi-typescript` en `src/api/esquema.ts`. No los escribas a mano.
- **Permisos:** la app solo muestra u oculta botones según `GET /yo` y las `acciones` de cada preboleta. La API siempre vuelve a validar.

---

## 2. Stack

- **Expo** (SDK estable más reciente al crear el proyecto; no fijes una versión de memoria) + **React Native** + **TypeScript** en modo `strict`.
- **Expo Router** para la navegación (carpeta `app/`).
- **Librerías principales:**

  | Librería | Para qué |
  |---|---|
  | `expo-camera` (`CameraView`, solo `qr`) | Leer el QR |
  | `expo-auth-session` + `expo-web-browser` | Inicio de sesión con Microsoft |
  | `expo-secure-store` | Guardar los tokens |
  | `expo-notifications` + `expo-device` | Notificaciones push |
  | `@tanstack/react-query` | Datos de la API: caché, recarga y estados de carga o error |
  | `react-native-svg` | Isologo, íconos y el dibujo del QR |
  | `qrcode` | Calcula la matriz del QR (la misma librería del panel; JavaScript puro, sin build nuevo) |
  | `@expo-google-fonts/figtree` | Tipografía |

- **Solo Android** por ahora. No agregues código o configuración de iOS salvo que se pida.
- **Expo Go no sirve** para esta app: el inicio de sesión con esquema propio y el push en Android necesitan un **development build** (EAS).
- **Código comentado:** cada archivo empieza con un comentario de para qué sirve. Comenta el *porqué* de la lógica no obvia.

---

## 3. Qué hace la app

### Roles (vienen de `GET /yo`)
- **Basculista:** opera la báscula de **su** unidad.
- **Comprador:** ve **sus** preboletas y comparte el QR. Autoriza o rechaza incidencias de cantidad de **cualquier** unidad.
- **Admin:** todo, en todas las unidades.

### Pantallas

**Fase 1 (lo esencial):**

| Pantalla | Qué hace | API |
|---|---|---|
| Inicio de sesión | Botón "Iniciar sesión con Microsoft" | Entra ID + `GET /yo` |
| Inicio | Junto al título, **toneladas recibidas hoy** (`kg_recibidos_hoy`: peso neto de boletas completadas hoy, con lo que la persona ve). Básculas (una tarjeta por unidad, libre u ocupada). Debajo, preboletas de **hoy + atrasadas**. Búsqueda rápida sobre la lista cargada. Tocar una unidad filtra la lista. **Botón flotante:** Comprador → solo ícono "+" (nueva preboleta); Basculista → solo ícono QR (escanear); Admin (o Comprador y Basculista) → abre las dos opciones con texto, "Preboleta" y "Escanear" | `GET /basculas`, `GET /preboletas`, `GET /resumen` |
| **Leer QR** | Pantalla `/leer-qr` que abre el botón flotante (ya no es pestaña). Cámara → muestra la preboleta → captura cajas → registra la entrada. Botón grande, a una mano | `GET /preboletas/qr/{token}`, `GET /preboletas/{id}`, `POST /preboletas/{id}/recepciones` |
| Detalle de preboleta | Datos, avance de cajas, cargas con su boleta, incidencias. Botones según `acciones` (ej. **indicar peso sin QR** con `operar_bascula`). En cada carga con boleta, botón **Actualizar boleta** (relee la boleta de D365 si se perdió un cambio; ver §6 del `CLAUDE.md` de la raíz). En la carga que sigue en báscula, **Cancelar entrada** con motivo | `GET /preboletas/{id}`, `POST /recepciones/{id}/actualizar-boleta`, `POST /recepciones/{id}/cancelar` |
| Avisos (campana) | Lista de avisos, marcar leídos, abrir la pantalla relacionada | `GET /notificaciones`, `GET /notificaciones/sin-leer`, `POST /notificaciones/leidas` |
| Perfil | Nombre, unidad, roles, tema, cerrar sesión | `GET /yo`, `DELETE /dispositivos/{token}` |

**Fase 2 (portabilidad), hecha:**

| Pantalla | Qué hace | API |
|---|---|---|
| Detalle: QR | "Ver QR y compartir": QR en pantalla (codifica `qr_url`), mensaje editable, **Enviar por WhatsApp** (`wa.me` sin número) y **Compartir enlace** (hoja de Android) | `qr_url` de `GET /preboletas/{id}` |
| Detalle: acciones | Según `acciones`: proponer precio (`proponer_precio`), múltiples cargas, **cerrar a mano** (observación obligatoria), **cambiar comprador** (Admin). En cada carga: proponer precio (`proponer_precio_carga`) y **corregir cajas** (`operar_bascula`, motivo obligatorio) | `POST /preboletas/{id}/propuestas`, `POST /recepciones/{id}/propuestas`, `PATCH /preboletas/{id}/multiples-cargas`, `POST /preboletas/{id}/cierre-manual`, `PATCH /preboletas/{id}/comprador`, `POST /recepciones/{id}/corregir-cajas` |
| Pendientes | Pestaña **"Incidencias"** (`(pestanas)/pendientes.tsx`): tarjeta "Pendiente para ti" y las tres listas con su contador; el globo de la pestaña es la suma | `GET /resumen` |
| Incidencias | Solo Admin o Comprador. Autorizar o rechazar sobre-entregas y faltantes; los cierres a mano solo se muestran | `GET /incidencias`, `POST /incidencias/{id}/{autorizar\|rechazar}` |
| Propuestas | Propuesto vs. del día vs. vigente; resolver si `puede_resolver` | `GET /propuestas`, `POST /propuestas/{id}/{autorizar\|rechazar}` |
| Conciliación | Lista (pendientes y resueltas) y pantalla por boleta: vincular a una preboleta (carga sin boleta o nueva carga) o marcar como no relacionada | `GET /conciliaciones`, `GET /conciliaciones/{id}`, `POST …/vincular`, `POST …/descartar` |
| Nueva preboleta | Botón flotante "Nueva" en Inicio (Comprador o Admin). Proveedor y fruta de D365, caja permitida, kilos o cajas con rango, fecha (7 píldoras), comprador (Admin), precio del día y propuesta si se cambia | `GET /proveedores`, `GET /frutas`, `GET /unidades`, `GET /tipos-caja`, `GET /tipos-pago`, `GET /unidades/{u}/precio-dia/{fruta}`, `POST /preboletas` |

- **Cancelar una propuesta no existe en la API:** una propuesta nueva para el mismo destino reemplaza a la pendiente.
- **Avisos y push** abren la conciliación, el detalle o las propuestas según lo que traigan (`rutaDeAviso` en `src/push/push.ts`).

**Fase 3 (lo mismo que el panel), hecha:**

| Pantalla | Qué hace | API |
|---|---|---|
| Historial | Movimientos con filtros: preboleta, boleta, colaborador (`0` = sistema), proveedor, tipos y fechas. Más nuevo primero, con "cargar más" | `GET /movimientos`, `GET /tipos-movimiento` |
| Historial de una preboleta | Desde su detalle (el detalle ya trae los últimos `movimientos`) | `GET /movimientos?preboleta_id=` |
| Precio del día | Por unidad y fecha. Captura solo quien tiene `precios_diarios` o Admin. En la lista, cada unidad muestra sus frutas con precio de hoy ("LIMON PERSA $12.70 (R)"; R, P, C = Rendimiento, Pactado, Corrida) o "Precio sin definir". La lista sale de `GET /precios-hoy` (solo la base, sin D365: rápida) y espera con una pantalla de carga con el logo | `GET /precios-hoy`, `GET /unidades/{id}/precios`, `PUT /unidades/{id}/precios/{producto_codigo}` |
| Configuración (**solo Admin**) | Menú → Administración. Las mismas secciones del panel, una pantalla cada una: | (abajo) |
| · Colaboradores | Canales (correo, push) y permisos por unidad. La API solo da `dispositivos_activos` (cuántos): **no** hay ruta para dar de baja el teléfono de otra persona | `GET /admin/colaboradores`, `PUT /colaboradores/{id}/canales`, `PUT` / `DELETE /colaboradores/{id}/permisos/{permiso}/{unidad}` |
| · Unidades | Fecha de implementación ("Desde ahora" o texto dd/mm/aaaa hh:mm, hora de México; se manda sin zona) o pausa | `GET /unidades`, `PUT /unidades/{id}/implementacion` |
| · Tolerancias | Por unidad y fruta, en la pantalla de Precio del día | `GET /unidades/{id}/precios` (trae `tolerancia_pct`), `PUT /unidades/{id}/tolerancias/{producto_codigo}` |
| · Cajas | **Solo en el panel web** (decisión del usuario): la app no las administra | — |
| · Envíos | Últimos 200 avisos de todos con su entrega por correo y push; filtro "Con fallas" | `GET /notificaciones/envios` |

- **Configuración en el teléfono:**
  - La opción solo aparece en el menú para Admin.
  - Formularios cortos, una sección por pantalla.
  - **Cajas por fruta no va en la app:** se administra solo en el panel web.
  - Cada cambio pide confirmación en la misma pantalla antes de guardar.
  - Lo que el panel valida, aquí también: números, rangos y campos obligatorios. La API vuelve a validar.
- **Listas largas** (historial, colaboradores, envíos): `FlatList` y nunca todo de una vez. `GET /movimientos` pagina con
  `limite` y `desplazamiento`; las demás solo aceptan `limite`.

### Flujo de báscula (el más importante)
1. **Leer QR:**
   - El código leído puede ser el token o la URL completa (`<URL_PUBLICA>/qr/<token>`). Como el token va **en la ruta**
     (`GET /preboletas/qr/{token}`), la app manda solo el **último segmento** del texto leído (la misma regla que `_token()`
     de la API). Responde `{preboleta_id, folio}`; después se pide `GET /preboletas/{id}`.
   - **No se elige unidad:** la API la toma de la preboleta. Si quien lee no puede operar esa báscula: `unidad_distinta`.
   - Al leer un código, **pausa el escáner** hasta que la persona actúe. Nunca leas dos veces el mismo QR por accidente.
   - Vibración corta al leer. Botón de **linterna**: hay básculas con poca luz.
2. **Muestra la preboleta:** folio, proveedor, fruta, cajas negociadas, acumuladas, mínimo y máximo.
   Si `bascula.ocupada` (y no es esta preboleta), avísalo antes de capturar.
3. **Captura las cajas:** teclado **numérico**, entero mayor a 0. Opción "múltiples cargas" si la preboleta no la tiene.
4. **Registra:** `POST /preboletas/{id}/recepciones` con `{cajas, via: "qr", multiples_cargas}`.
   - La respuesta solo trae `{id}` (sin `mensaje` ni incidencia). Antes de registrar, avisa si la carga rebasa el máximo
     o (sin múltiples cargas) queda bajo el mínimo. Después vuelve a pedir el detalle y muestra la incidencia de esa carga, si la hay.
   - Si hay incidencia, el aviso es **informativo**: la carga **entra igual**. La báscula nunca se detiene.
5. **Sin QR:** desde el detalle de la preboleta (acción `operar_bascula`), el mismo formulario con `via: "manual"`.

- **Errores esperados**, con su `mensaje`: `bascula_ocupada`, `unidad_distinta`, `fuera_de_unidad`, `no_encontrado`.
  - Con `bascula_ocupada`, ofrece ver qué camión está en la báscula.
- **Sin conexión:** la entrada **no se guarda para después**. El estado de la báscula cambia en el servidor y una cola local podría registrar un camión que ya salió. Muestra "Sin conexión. Intenta de nuevo." con botón de reintentar.

---

## 4. Inicio de sesión (Entra ID, cliente público)

Una app instalada **no puede guardar secretos**. Por eso obtiene el token directo de Microsoft con **Authorization Code + PKCE, sin `client_secret`**.

| Parámetro | Valor |
|---|---|
| Autoridad | `https://login.microsoftonline.com/<ENTRA_TENANT_ID>/v2.0` |
| Client ID | El del registro **"Preboletas"** (el mismo que valida la API) |
| Scopes | `api://<CLIENT_ID>/access_as_user`, `offline_access`, `openid`, `profile` |
| Redirect URI | `preboletas://auth` (`scheme: "preboletas"` en `app.config.ts`). Registrada en Azure en la plataforma **Aplicaciones móviles y de escritorio** |
| Extra | `prompt: "select_account"` (teléfonos compartidos entre turnos) |

- **Tokens:** se guardan en `expo-secure-store`, el de acceso y el de renovación por separado. **Nunca** en AsyncStorage, ni en logs, ni en la URL.
- **`GET /yo`:** se llama al iniciar sesión, al abrir la app y después de cada renovación.
  - Con `403 sin_vinculacion` o `rol_insuficiente`: cerrar sesión y mostrar "Tu cuenta no tiene acceso a Preboletas. Solicítalo a Sistemas."
- **`401 token_expirado`:** renovar en silencio (`refreshAsync`) y reintentar **una vez**. Si falla, volver al inicio de sesión.
- **Una sola renovación a la vez:** si varias peticiones reciben 401 juntas, comparten la misma promesa de renovación.
- **Cerrar sesión:**
  1. `DELETE /dispositivos/{token}` con el token de push (codificado con `encodeURIComponent`: lleva corchetes).
  2. Borrar los tokens de SecureStore.
  3. Limpiar la caché de React Query.
  4. Volver al inicio de sesión.

---

## 5. Configuración por entorno (sin secretos)

**Todo lo que va dentro de la app es público**: cualquiera puede extraerlo del APK. Por eso:
- **Nunca** pongas en la app un `client_secret`, llaves de servicio (`CORE_API_KEY`, `LLAVE_POWERAUTOMATE`…), contraseñas ni cadenas de conexión.
- Las únicas variables son públicas, con prefijo `EXPO_PUBLIC_`. Se definen por perfil en `eas.json`:

| Variable | Desarrollo | Producción |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | Túnel https o `http://<IP de tu PC>:7230` | `https://api-preboletas.sicar.com.mx:7201` |
| `EXPO_PUBLIC_WS_URL` | Igual, con `wss://` o `ws://` + `/ws` | `wss://api-preboletas.sicar.com.mx:7201/ws` |
| `EXPO_PUBLIC_ENTRA_TENANT_ID` | Inquilino CITROJUGO | El mismo |
| `EXPO_PUBLIC_ENTRA_CLIENT_ID` | Registro "Preboletas" | El mismo |

- **Lectura:** las variables se leen en **un solo archivo**, `src/config.ts`. Si falta alguna, ese archivo truena con un mensaje claro.
- **Dónde se ponen:**
  - **Desarrollo (`npx expo start --dev-client`):** Metro lee **`.env`** de esta carpeta, no `eas.json`. Se crea copiando
    `.env.example`; va fuera de Git. Lleva los dos ids de Entra y la IP de tu PC.
  - **Builds en EAS (preview y production):** `eas.json` → `build.<perfil>.env` (los ids de Entra van en `build.base.env`).
- **Reparto:** la app es de uso interno: **no** va a la Play Store. Se reparte el APK del perfil `preview`.
- **Desarrollo:** el teléfono **no** ve `localhost` de tu PC. Usa la IP de la red local o un túnel https (cloudflared).
  - Android bloquea `http://` por defecto. Si hace falta, permite tráfico sin cifrar **solo en el perfil `development`** (`expo-build-properties`). **Nunca** en producción.
- **Credenciales de push (Firebase / FCM):**
  - La cuenta de servicio de FCM es secreta. Se sube a **EAS** (`eas credentials`), **nunca** al repositorio.
  - `google-services.json` va fuera de Git y se pasa como archivo de EAS.

---

## 6. Push y tiempo real

### Notificaciones push (Expo)
- **Al iniciar sesión:**
  1. Pide permiso de notificaciones (Android 13+).
  2. Obtén el token con `getExpoPushTokenAsync({ projectId })`.
  3. Regístralo con `POST /dispositivos` (`plataforma: "android"`, `nombre_dispositivo` = modelo del teléfono).
- **Si niega el permiso:** la app sigue funcionando. Los avisos llegan igual a la campana.
- **Recibir push:** hacen falta dos cosas: el teléfono registrado y el canal `push` que da el Admin en el panel.
- **Al tocar un push:** `data` trae `preboleta_id`, `incidencia_id` o `propuesta_id`. Abre esa pantalla.
- **Canal de Android:** `avisos`, importancia alta (`defaultChannel` en `app.config.ts`). La API manda cada push con
  `channelId: "avisos"` y `priority: "high"` (`CANAL_ANDROID` en `app/integraciones/expo_push.py`). Si se cambia el nombre, cámbialo en los dos lados.
- **Contenido:** el push no trae precios ni montos. No los agregues.

### Tiempo real (WebSocket `/ws`)
1. Pide un ticket con `POST /ws/ticket` (Bearer normal) → `{ticket, vence_en_segundos}`. Sirve **una sola vez** y vence en 60 s.
2. Conecta a `EXPO_PUBLIC_WS_URL` y, en menos de 10 s, manda `{"ticket":"<ticket>"}` como **primer mensaje**.
   Ni el ticket ni el token van en la URL. La API responde `{"evento":"conectado","colaborador_id":…}`: ahí la app está "En línea".
3. **Ya conectado no se vuelve a autenticar:** la conexión sigue aunque el token venza. Manda `"ping"` cada ~25 s (responde `"pong"`).
4. **Eventos** (`{"evento": "...", ...ids}`): cada uno **invalida** su consulta de React Query (ej. `slot.actualizado` → básculas;
   `preboleta.actualizada` → esa preboleta). La app vuelve a pedir el detalle por REST. Eventos que existen:
   `slot.actualizado`, `preboleta.actualizada`, `boleta.vinculada|completada|desvinculada`, `incidencia.creada|resuelta`,
   `propuesta.creada|resuelta`, `notificacion.nueva`, `precio_diario.actualizado`, `unidad.actualizada`, `colaborador.actualizado`.
5. **Segundo plano:** cierra el socket. Al volver al frente, reconecta y recarga lo que está en pantalla. No se reenvían eventos perdidos.
6. **Reconexión:** con espera creciente (1, 2, 5, 10, 30 s) y un **ticket nuevo** en cada intento.
   - Cierre `4401` (falta el ticket, inválido o vencido): pide otro ticket y reintenta. Si `POST /ws/ticket` da 401, se renueva el token como en cualquier petición.

---

## 7. Identidad SiCar Farms

Las reglas completas del Brand Book están en `frontend-panel-preboletas/CLAUDE.md` §1. **Mandan sobre cualquier gusto de diseño.**

- **Colores:**
  - Verde SiCar `#00833E` (348 C): color principal en modo claro.
  - Verde lima `#70D44B` (7488 C): acento y color principal en modo oscuro. **Nunca como texto sobre fondo claro** (contraste 1.9:1).
- **Tokens:** usa los mismos del panel (`globals.css`), en `src/tema/colores.ts`, con versión clara y oscura:
  - Superficies y texto: `fondo`, `superficie`, `linea`, `texto`, `apagado`.
  - Acción: `acento`, `acentoTexto`, `acentoSuave`.
  - Mensajes: `peligro`, `aviso`, `info`.
  - Estados de preboleta: `estPendiente`, `estBascula`, `estProceso`, `estTerminado`, `estIncidencia`.
  - **Nunca** uses colores sueltos en los componentes.
- **Isologo:** porta `frontend-panel-preboletas/src/components/Logo.tsx` a `react-native-svg` **con los mismos trazos**. No lo redibujes, deformes ni le pongas efectos. Área segura de 3x.
- **Tipografía:** Figtree (respaldo de Avenir, que es de licencia). Números y folios con cifras tabulares (`fontVariant: ["tabular-nums"]`).
- **Tema:** sigue al sistema (`useColorScheme`), con opción en Perfil guardada en el teléfono.
- **Textos:**
  - Español de México, cortos, en el tono de la marca.
  - Los errores dicen qué pasó y qué hacer, sin culpar al usuario.
  - Muestra el `mensaje` de la API cuando venga.
  - Errores de la API: `{codigo, mensaje, id_solicitud}`. El `id_solicitud` va pequeño, para soporte.

### Mockup de referencia (`docs/mockup/`)

Es un mockup anterior, hecho para iPhone. **Se toma el estilo, no el contenido.** No tiene que verse idéntico.

| Imagen | Qué muestra |
|---|---|
| `01-inicio-sesion.png` | Pantalla de bienvenida e inicio de sesión con Microsoft |
| `02-lista-preboletas.png` | Inicio: encabezado con resumen, filtros en píldoras, tarjetas de preboleta, botón flotante "Nueva" |
| `03-detalle-qr.png` | Detalle: folio grande, QR, montos y proveedor |
| `04-detalle-terminos-bitacora.png` | Detalle: producto, términos y bitácora en línea de tiempo |
| `05-detalle-enviada.png` | Detalle con botones de acción abajo (Cancelar / Editar) |

**Sí se toma del mockup:**
- **Encabezado verde oscuro con degradado:** verde 7734 C `#266041` hacia 348 C `#00833E`, texto blanco y la marca arriba. El resto de la pantalla va sobre fondo claro.
- **Inicio de sesión:** fondo verde, un mensaje corto de la app y el botón blanco "Iniciar sesión con Microsoft" abajo.
- **Resumen en el encabezado:** una tarjeta translúcida con 3 o 4 números.
- **Filtros:** píldoras con su conteo (ej. "Todas 7").
- **Tarjetas de preboleta:**
  - Avatar con las iniciales del proveedor, folio en mono, nombre en negritas y chip de estado a la derecha.
  - Debajo, fruta, fecha y cantidad.
  - Una franja de color a la izquierda según el estado.
- **Detalle:**
  - Folio grande en mono, estado como chip en el encabezado y botón de regresar.
  - Secciones con título pequeño en mayúsculas (PROVEEDOR, PRODUCTO, TÉRMINOS…) y tarjetas blancas redondeadas.
  - El total en una tarjeta con verde suave.
- **Bitácora:** línea de tiempo con círculos marcados.
- **Acción principal:** un botón grande flotante, abajo y a todo lo ancho. Si hay dos acciones, van lado a lado.
- **Indicador "En línea":** usa el estado del WebSocket.

**No se toma, o se adapta a lo que ya existe:**
- **Nada del mockup justifica cambios en la API ni en la base de datos.** Si algo del mockup no existe en la API, no se dibuja.
- **Estados:** los del mockup no existen (Borrador, Enviada, En tránsito). Se usan los reales: `pendiente`, `en_bascula`, `en_proceso`, `terminado` y `terminado_con_incidencias`, con sus colores de estado.
- **Resumen y conteos:** se calculan de lo que regresa la API. Ejemplos: de hoy, atrasadas, en báscula, incidencias pendientes. Nada de toneladas ni datos que la API no da.
- **Fruta:** solo las de Dataverse (hoy Limón Mexicano y Limón Persa). Ícono genérico de fruta, sin dibujos por producto.
- **Términos:**
  - "Calidad esperada" no existe: no va.
  - "Modelo de pago" = **tipo de pago**.
  - Cantidad, caja, tolerancia, mínimo y máximo sí van.
- **Bitácora:** sale de los `movimientos` del detalle y de `GET /movimientos?preboleta_id=` (movimientos reales con su badge y color), **no** de pasos fijos. "WhatsApp enviado" y "Camión en tránsito" no existen.
- **WhatsApp:**
  - "Compartir QR" arma un enlace `https://wa.me/?text=…` **sin número**, con el `qr_url` del detalle, igual que el panel
    (`frontend-panel-preboletas/src/lib/calculos.ts`). La API no manda un `whatsapp_url`. El comprador elige el contacto.
  - No hay botón de WhatsApp junto al proveedor: no tenemos su teléfono.
  - El botón va en **verde SiCar** con el ícono de WhatsApp, **no** en el verde de WhatsApp.
- **Botones del detalle** (Cancelar, Editar…): solo los que permite `acciones` de la preboleta.
- **Precios y montos:** solo si la API los manda para ese usuario.
- **Texto del inicio de sesión:**
  - Pon "Solo cuentas corporativas de SICAR", sin escribir un dominio de correo.
  - El mensaje no habla de "sin papeles" ni de "comprobante": describe lo que la app sí hace (preboletas, QR y báscula).
- **iOS → Android:**
  - Sin muesca ni barra de iPhone dibujadas.
  - Respeta las áreas seguras (`react-native-safe-area-context`) y el botón o gesto de regresar de Android.
  - **Navegación:** pestañas abajo para lo de todos los días: Inicio, Incidencias (pendientes para ti) y Avisos.
    Leer QR se abre con el botón flotante de Inicio. El resto (historial, precios, configuración y perfil) va en el **menú**:
    botón arriba a la izquierda, junto a la marca, en las pantallas de pestaña. Abre `/menu`, que entra desde la izquierda
    y lleva como título el rol de la persona.
- **Tipografía:** Figtree, no la del mockup.

### Uso en báscula (manda la claridad)
- **Táctil:** áreas táctiles de **48 dp** como mínimo. Las acciones de báscula al alcance del pulgar.
- **Exteriores:** se usa a pleno sol. Alto contraste y texto de 16 o más en datos operativos.
- **Una acción principal por pantalla.**
- **Acciones delicadas** (cancelar una carga, cerrar una preboleta): confirmación en la misma pantalla. Nunca `Alert` como único freno.
- **Fechas y horas:** en `America/Mexico_City`, con `Intl.DateTimeFormat("es-MX", { timeZone: "America/Mexico_City" })`. Nunca la zona del teléfono.

---

## 8. Estructura

```
mobile-app-preboletas/
├── app/                    pantallas (Expo Router)
│   ├── _layout.tsx             fuentes, tema, React Query, sesión; grupos protegidos
│   ├── +native-intent.tsx      el regreso preboletas://auth va a /iniciar-sesion
│   ├── +not-found.tsx          ruta que no existe → botón "Ir al inicio"
│   ├── (auth)/iniciar-sesion.tsx
│   ├── (app)/_layout.tsx       tiempo real, registro push y apertura de avisos
│   ├── (app)/(pestanas)/       _layout (pestañas), index (Inicio), pendientes (pestaña "Incidencias"), avisos
│   ├── (app)/leer-qr.tsx       escáner (lo abre el botón flotante de Inicio)
│   ├── (app)/menu.tsx          menú del encabezado: consultas, administración y perfil (título = rol)
│   ├── (app)/preboleta/nueva.tsx  crear preboleta (Comprador o Admin)
│   ├── (app)/preboleta/[id]/   index (detalle), entrada (cajas, via qr o manual)
│   ├── (app)/incidencias.tsx   incidencias de cantidad (Admin o Comprador)
│   ├── (app)/propuestas.tsx    propuestas de precio
│   ├── (app)/conciliacion/     index (lista), [id] (vincular o descartar una boleta)
│   ├── (app)/perfil.tsx
│   ├── (app)/historial.tsx     bitácora con filtros y "cargar más"
│   ├── (app)/precios/         index (unidades), [unidad] (precio de hoy y tolerancias)
│   └── (app)/configuracion/   solo Admin: index, unidades, colaboradores, envios (cajas: solo panel)
├── src/
│   ├── api/                cliente HTTP (Bearer + renovación), esquema.ts (generado), consultas por recurso
│   ├── sesion/             login, tokens en SecureStore, GET /yo
│   ├── tiempo-real/        WebSocket
│   ├── push/               registro y manejo de notificaciones
│   ├── componentes/        Logo, ui (Boton, Tarjeta, ChipEstado…), formularios, detalle/, Pendientes, CodigoQr
│   ├── tema/               colores, tipografía, espaciado
│   ├── formato.ts          fechas, números y folios
│   ├── calculos.ts         equivalencias kilos/cajas, rango, precio del día, enlace wa.me (igual al panel)
│   ├── permisos.ts         qué ve cada rol (la API decide de verdad)
│   └── config.ts           variables EXPO_PUBLIC_ (único lugar donde se leen)
├── app.config.ts
└── eas.json                perfiles development, preview (APK interno), production
```

- **Protección de rutas:** `app/_layout.tsx` usa `Stack.Protected` con **`redirectTo`** en los dos grupos
  (`(app)` → `/iniciar-sesion`, `(auth)` → `/`). Sin `redirectTo`, Expo Router manda al grupo `/(auth)`, que no tiene
  `index`, y "/" queda en "Unmatched Route". Si agregas un grupo protegido, dale su `redirectTo`.

---

## 9. Reglas al hacer cambios

1. **API:** solo la API de Preboletas, y sus rutas reales (§1). Nada de Dataverse, CoreAPI, MSDataServices ni la base.
2. **Secretos:** ninguno en la app ni en Git (§5).
3. **WhatsApp:** **nunca** se integra. Para compartir el QR solo el enlace `wa.me` sin número armado con el `qr_url` del detalle (como el panel), con `Linking` o la hoja de compartir de Android.
4. **Báscula:** nunca se bloquea una entrada por una incidencia. La API decide; la app informa.
5. **Colores:** solo tokens. Revisa cada cambio en claro **y** oscuro, en un teléfono real.
6. **Antes de entregar:**
   - `npx tsc --noEmit` y `npx expo-doctor` sin errores.
   - Prueba en un teléfono Android con el development build.
7. **Comandos:**

   | Para qué | Comando |
   |---|---|
   | Desarrollo | `npx expo start --dev-client` |
   | Build de desarrollo | `eas build --profile development --platform android` |
   | APK de prueba | `eas build --profile preview --platform android` |
   | Producción | `eas build --profile production --platform android` |
