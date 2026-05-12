# COUNCILia · Política de Cookies y Tecnologías Similares

> Explica qué cookies y tecnologías similares usamos, para qué sirven, cuánto duran y cómo puedes gestionarlas. Complementa la Política de Privacidad (documento 12). Documento 13 de la serie del MVP v1.1.

> **Aviso importante:** documento **operativo para revisión legal** antes del lanzamiento, especialmente para cumplimiento de la normativa de cookies y consentimiento en la UE/REINO UNIDO (ePrivacy / PECR) y transparencia en otras jurisdicciones.

---

## 1. Qué son las cookies y tecnologías similares

Las **cookies** son pequeños archivos de texto que el sitio web guarda en tu navegador o dispositivo cuando visitas una página. Permiten recordar preferencias, mantener tu sesión iniciada o entender de forma agregada cómo se usa el Servicio.

También usamos tecnologías equivalentes cuando tenga sentido en la práctica técnica:

- **Almacenamiento local del navegador** (`localStorage`, `sessionStorage`) para recordar preferencias o estado temporal de la UI.
- **Píxeles o SDKs de analítica** (solo si los activamos y, donde proceda, con tu consentimiento previo).

En conjunto, las llamamos *"cookies y tecnologías similares"*.

---

## 2. Quién es responsable

El responsable del uso de estas tecnologías en el sitio de COUNCILia es el mismo indicado en la Política de Privacidad (**documento 12**, sección “Responsable del tratamiento”).

---

## 3. Cómo pedimos consentimiento (cuando aplica)

### 3.1 Estrictamente necesarias

Las cookies **estrictamente necesarias** permiten funciones sin las cuales el Servicio no puede funcionar de forma segura (p. ej. mantener tu sesión autenticada, equilibrio de carga, seguridad básica). **No requieren consentimiento** en muchas jurisdicciones, aunque sí **información transparente** (este documento).

### 3.2 No esenciales (funcionales, analíticas, de rendimiento, marketing)

Cualquier cookie o script que **no sea estrictamente necesaria** para prestar el Servicio solicitado explícitamente se activará solo **después** de que:

- Hayas aceptado mediante el **banner o el centro de preferencias** de cookies (donde la ley lo exija), o
- Hayas configurado tu navegador de forma compatible (algunas jurisdicciones permiten señales globales como GPC; ver sección 7).

**En el MVP v1.1** nuestro objetivo es **minimizar** cookies no esenciales. La tabla de la sección 5 refleja el diseño previsto; si una fila indica “requiere consentimiento”, el código **no debe cargar** el script correspondiente hasta obtener ese consentimiento.

---

## 4. Tipos de cookies que utilizamos (clasificación)

| Tipo | Propósito típico en COUNCILia | ¿Requiere consentimiento? (marco UE típico) |
|---|---|---|
| **Estrictamente necesarias** | Sesión, autenticación, seguridad (CSRF/token si aplica), preferencias de cookies guardadas | No |
| **Funcionales** | Recordar preferencias de UI no críticas (tema, densidad) | Sí |
| **Rendimiento / analítica agregada** | Medir carga, errores, embudos de producto de forma agregada o pseudonimizada | Sí, si usa identificadores persistentes o cruza con otros datos |
| **Marketing / publicidad** | En el MVP **no utilizamos** cookies de publicidad de terceros | N/A |

---

## 5. Tabla de cookies y almacenamiento previstos

Los nombres exactos pueden variar ligeramente según la implementación (framework y versión). Esta tabla es la **fuente de verdad** de intención; cualquier cookie no listada que no sea estrictamente necesaria debe añadirse aquí **antes** de desplegar a producción.

### 5.1 Cookies / storage del propio sitio (first-party)

| Nombre / clave (previsto) | Tipo | Duración | Finalidad | ¿Estrictamente necesaria? |
|---|---|---|---|---|
| `sb-access-token` / `sb-refresh-token` *(nombres típicos de Supabase en cliente)* | Cookie o storage de sesión | Sesión o según config Supabase | Mantener tu sesión autenticada de forma segura | **Sí** |
| `csrf_token` *(si se implementa doble cookie CSRF)* | Cookie | Sesión | Mitigar ataques cross-site | **Sí** |
| `cookie_consent` | Cookie o `localStorage` | 12 meses | Guardar tu elección en el banner de cookies (categorías aceptadas) | **Sí** (para cumplir prueba de consentimiento) |
| `survey_draft` *(opcional)* | `sessionStorage` | Hasta cerrar pestaña | Recuperar respuestas parciales de la encuesta si refrescas | Preferiblemente **Sí** si el producto lo considera necesario para completar el onboarding sin pérdida de datos; si no, reclasificar como funcional con consentimiento |
| `ui_prefs` *(opcional: tema, idioma)* | `localStorage` | 12 meses | Mejorar la experiencia sin relevancia para el contrato | **No** → funcional, consentimiento |

### 5.2 Cookies / identificadores de terceros (third-party)

| Proveedor | Nombre / clave (ejemplo) | Duración | Finalidad | Base legal / consentimiento |
|---|---|---|---|---|
| **Stripe** (Checkout / Elements) | Cookies propias de Stripe al abrir checkout | Según Stripe | Procesar el pago de forma segura, prevención de fraude | Necesarias para la transacción que solicitas; Stripe publica su lista actualizada |
| **Vercel Analytics** *(solo si se activa)* | `_va`, `_vercel_session` *(ejemplos ilustrativos)* | Según producto | Métricas de rendimiento y uso agregado | **Consentimiento** previo si no es estrictamente necesario |
| **Proveedor de analítica** *(solo si se activa: p. ej. Plausible auto-hospedado, Posthog con modo consentido, etc.)* | Según proveedor | Según proveedor | Entender uso del producto | **Consentimiento** previo salvo configuración “privacy-first” sin identificadores persistentes validada por legal |
| **Intercom / Crisp / otros chat** *(no previsto en MVP)* | — | — | — | No desplegar sin actualizar esta política |

**Compromiso del MVP:** mientras no haya **analítica de terceros** activada, la fila correspondiente permanece vacía en producción. Si activamos analítica, publicamos la lista exacta **antes** del despliegue.

---

## 6. Finalidades detalladas por categoría

### 6.1 Autenticación y seguridad

- Mantener tu sesión tras el login.
- Asociar tus peticiones API a tu identidad sin exponer credenciales en cada solicitud de forma insegura.
- Facilitar el **cierre de sesión** y la **revocación** de tokens cuando cambias contraseña o detectamos riesgo.

### 6.2 Preferencias y experiencia

- Recordar si aceptaste o rechazaste categorías de cookies y cuándo.
- Recordar preferencias de interfaz **no esenciales** solo si diste consentimiento funcional.

### 6.3 Analítica y mejora del producto (si está activa)

- Medir embudos (p. ej. % de usuarios que completan encuesta → primera sesión → síntesis) de forma **agregada**.
- Detectar errores de cliente y tiempos de carga.

Cuando usemos analítica **con identificadores persistentes**, te lo diremos claramente en el banner y aquí, y te permitiremos retirar el consentimiento en cualquier momento desde **Ajustes → Privacidad → Cookies**.

---

## 7. Cómo controlar o eliminar cookies desde tu navegador

Puedes bloquear o borrar cookies desde la configuración de tu navegador. Ten en cuenta que **bloquear cookies estrictamente necesarias** puede impedir el login o romper características del Servicio.

Enlaces de ayuda (actualizados por los fabricantes):

- [Chrome](https://support.google.com/chrome/answer/95647)
- [Firefox](https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web-rastrear-preferencias)
- [Safari](https://support.apple.com/es-es/guide/safari/sfri11471/mac)
- [Edge](https://support.microsoft.com/es-es/microsoft-edge/eliminar-las-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09)

Algunas leyes reconocen **señales de preferencia global** (p. ej. **Global Privacy Control** en navegadores compatibles). Si operamos en jurisdicciones donde GPC tenga efecto legal sobre “venta/compartición”, configuraremos el Servicio para honrar esa señal de forma documentada.

---

## 8. Conservación

- **Cookies de sesión:** se eliminan al cerrar el navegador (salvo que el navegador restaure sesión).
- **`cookie_consent`:** hasta **12 meses** o hasta que cambies preferencias y se renueve el registro.
- **Cookies de terceros:** según la política de cada proveedor (consulta enlaces en sus sitios).

La **Política de Privacidad** (documento 12) describe los plazos de conservación de **datos personales** en el servidor, que son independientes (aunque relacionados) de la vida de una cookie en tu dispositivo.

---

## 9. Actualizaciones

Si añadimos nuevas cookies no esenciales o nuevos terceros que accedan a información almacenada o generada en tu dispositivo:

1. Actualizaremos este documento **antes** del despliegue.
2. Si el cambio es material para usuarios existentes, solicitaremos **nuevo consentimiento** donde proceda o mostraremos el banner de nuevo.
3. Registraremos la versión en el historial (sección 10).

---

## 10. Historial de versiones

| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 (MVP) | Por definir | Primera publicación. Lista inicial de cookies previstas. |

---

## 11. Contacto

Para preguntas sobre cookies o para actualizar tu consentimiento:

- **`privacy@councilia.app`** *(sustituir antes de producción)*
- Centro de preferencias de cookies en el Servicio: **`/cookies/settings`** *(ruta prevista; implementar con el banner)*
