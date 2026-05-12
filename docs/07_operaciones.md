# COUNCILia · Operaciones

> Costos por sesión, modelo de negocio, política de contenido sensible y métricas de validación. Todo lo que necesita estar en su sitio antes del lanzamiento aunque no sea visible en la UI. Documento 7 de la serie del MVP v1.1.

> **Documentos legales correlativos:** Términos (10), Privacidad (12), Cookies (13). Este documento resume decisiones operativas; la redacción jurídica detallada va en esos tres.

---

## 1. Costo por sesión

### 1.1 Estimación realista

Una sesión típica del MVP implica:

- **3 llamadas paralelas** (postura inicial, ~250 tokens out cada una).
- **1 llamada de réplica** (~250 tokens out).
- **1 llamada de síntesis** (~400 tokens out).
- **Input acumulado** que crece con el contexto: ~3–8k tokens en total.

Total realista por sesión completa con Claude Sonnet:

- **Tokens:** 15–25k (input + output combinados).
- **Costo:** ~**$0.10–0.20 USD** por sesión.

Esto es **2–3× más alto** que el estimado del MVP original. Es importante modelarlo correctamente desde el inicio para no caer en el error clásico de subestimar el costo unitario.

### 1.2 Qué hacer si el costo sube

Tres palancas, en este orden de preferencia:

1. **Reducir el output** de cada postura inicial (de 250 a 180 tokens). Impacto: ~20% menos costo, riesgo bajo si los prompts están bien apretados.
2. **Quitar la réplica cuando el Tension Detector tiene confianza baja.** Impacto: ~15% menos costo en sesiones donde no agrega valor.
3. **Cambiar a un modelo más barato para postura inicial**, manteniendo Sonnet para la síntesis. Impacto: hasta 40% menos costo, requiere validar calidad.

---

## 2. Modelo de negocio

El modelo es freemium con dos tiers en el MVP y un tercero post-validación:

- **Tier gratuito:** **5 sesiones / mes**. Suficiente para que el usuario sienta el producto, no suficiente para reemplazar el hábito sin pagar.
- **Tier pro:** sesiones ilimitadas, councils guardables, exportación de síntesis a PDF y markdown. Precio objetivo $9–15 USD / mes.
- **Tier equipo (v1.3+):** councils compartidos, comentarios sobre síntesis, integración Slack / Notion.

> Regla operativa: el límite del freemium es **por sesiones, no por mensajes**. Cada sesión es la unidad de valor del producto. Limitar por mensajes empuja al usuario a alargar sesiones artificialmente y rompe la dinámica.

### 2.1 Cuándo se cobra

El usuario llega al paywall cuando intenta abrir su **sexta sesión del mes natural**. No al final de la quinta. Eso evita el efecto "el producto se cortó cuando estaba en el mejor momento", que es la peor experiencia de paywall.

Una sesión se considera *consumida* solo cuando el usuario envía el primer mensaje al council. Abrir y no escribir no cuenta. Esto se documenta también en los Términos para alinear expectativa.

Se envían avisos por correo al alcanzar la **cuarta** y **quinta** sesión del mes para que el usuario no se sorprenda con el paywall.

### 2.2 Reembolsos y prueba

- **Periodo de prueba de 14 días naturales** desde la primera contratación del tier pro: reembolso total a petición, sin justificación.
- Después de los 14 días: no se reembolsa el periodo en curso salvo obligación legal local.
- **SLA de disponibilidad:** si el Servicio queda inoperativo por más de **72 horas seguidas** por causa atribuible a nosotros, se reembolsa prorrateado el periodo afectado.

### 2.3 Lo que NO se mete al freemium

- **Sin anuncios.** La promesa del producto es íntima; los ads la rompen.
- **Sin venta de datos.** Se dice explícitamente en la página de pricing.
- **Sin "freemium con feature gating molesto"** (tipo: usa, pero la síntesis sale truncada). Es mejor un límite duro y limpio que un producto degradado.

---

## 3. Política de contenido sensible

El producto invita a hablar de decisiones reales y a veces dolorosas: relaciones, salud financiera, salud mental. **No tener una política aquí no es una opción** — es responsabilidad básica.

### 3.1 Reglas para los agentes

- Ningún agente da consejo médico, legal o financiero específico ("compra X", "deja a Y", "toma este medicamento"). Hablan en marco general y devuelven el poder al usuario.
- Los agentes **nunca** sugieren al usuario que "se quede" o "se vaya" de una situación de violencia, ni minimizan abuso.
- Si los agentes detectan ambigüedad sobre violencia o abuso en el relato del usuario, **no asumen**: piden clarificación en una pregunta empática y única, sin moralizar.

### 3.2 Modo Soporte

Si el mensaje del usuario contiene señales de **crisis emocional aguda, ideación suicida o autolesión**, el orquestador **interrumpe el flujo deliberativo** y entra en modo Soporte:

1. Una sola respuesta empática del **sistema** (no de los agentes), redactada y validada por humanos, no generada en tiempo real.
2. Recursos profesionales según país detectado por idioma o configuración del usuario (líneas de crisis verificadas).
3. El usuario puede continuar la conversación deliberativa **solo si confirma explícitamente** que quiere hacerlo.

La detección es por una combinación de **keywords + clasificador ligero**, ejecutada **antes** del Intent Calibrator. Si el clasificador tiene dudas, manda al modo Soporte: el costo del falso positivo (una pantalla extra) es muchísimo menor que el del falso negativo.

### 3.3 Edad mínima y cuentas

- **Edad mínima:** 16 años cumplidos. Entre 16 y 18 (o mayoría de edad local) se requiere consentimiento de tutor.
- **No se recopilan a sabiendas** datos de menores de 16 años. Si se detecta una cuenta de menor, se cierra y borra en máximo 7 días naturales.
- **Una persona, una cuenta.** No se permite compartir cuentas.

### 3.4 Datos personales y retención

- La encuesta de onboarding y el contenido de la conversación se guardan **cifrados en reposo** mediante Supabase row-level security.
- El usuario puede **borrar una conversación individual o todo su historial** desde ajustes (DSAR autoservicio).
- **No se entrenan modelos** con conversaciones de usuarios. Esto se promete explícitamente en términos y en pricing.
- Las conversaciones eliminadas se borran de la base de datos en un máximo de **7 días naturales** (incluyendo backups).

Plazos de retención por tipo de dato:

| Tipo de dato | Retención |
|---|---|
| Cuenta activa | Mientras esté activa |
| Conversación no borrada | Mientras la cuenta esté activa |
| Conversación borrada por el usuario | ≤ 7 días naturales (incluye backups) |
| Cuenta cerrada por el usuario | Borrado total en ≤ 7 días naturales |
| Cuenta cerrada por inactividad (> 24 meses sin login) | Aviso previo por correo + cierre y borrado en 30 días |
| Logs de seguridad y auditoría | 12 meses, anonimizados después |
| IP completa | ≤ 30 días salvo obligación legal |
| Información de facturación | Plazo mínimo de la ley fiscal aplicable |

### 3.5 Proveedores que tocan los datos

Para mantener consistencia con los Términos (documento 10), la lista de subprocesadores autorizados en el MVP es:

| Proveedor | Para qué |
|---|---|
| Anthropic (Claude API) | Generación de respuestas de los agentes. Acuerdo comercial garantiza que los datos no se usan para entrenar sus modelos. |
| Supabase | Base de datos y autenticación. |
| Vercel | Hosting de la aplicación. |
| Stripe (u otro procesador) | Procesamiento de pagos del tier pro (no se almacenan números completos de tarjeta). |
| Resend (o equivalente) | Correos transaccionales (recuperación, paywall warnings, avisos). |

Cualquier subprocesador adicional necesita actualización notificada en los Términos al menos **30 días antes** de su entrada en operación.

---

## 4. Métricas de validación

No medimos si la IA "sabe más". Medimos si la experiencia se siente **cognitivamente diferente**.

### 4.1 Métricas cualitativas (encuesta post-sesión, opt-in)

- ¿El usuario siente que pensó desde ángulos que no habría considerado solo?
- Claridad percibida después de la conversación (escala 1–5).
- Confianza en la decisión después de consultar al council (escala 1–5).
- ¿Recomendaría el council a alguien con una decisión parecida?

### 4.2 Métricas cuantitativas (instrumentadas)

- **Tasa de finalización:** % de sesiones donde el usuario llega a pedir síntesis.
- **Retorno a 7 días:** % de usuarios que abren una segunda sesión dentro de la semana.
- **Profundidad por sesión:** mensajes de usuario por sesión (proxy de engagement).
- **Tasa de "esto me cambió la perspectiva":** opt-in en el cierre, una pregunta sí/no.
- **Tiempo a primera postura:** latencia desde envío del mensaje hasta primer token visible (proxy de UX).

### 4.3 Hipótesis de validación

> Si **tasa de finalización ≥ 60%** y **retorno a 7 días ≥ 25%**, el producto funciona y procedemos a v1.2.

> Si está por debajo, el problema es del flujo o de los agentes, no del marketing. Iteramos el MVP otra vuelta antes de añadir features.

Este umbral se fija **antes** de empezar las pruebas con usuarios. Mover el umbral después de ver los datos es la forma estándar de auto-engañarse.
