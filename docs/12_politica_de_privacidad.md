# COUNCILia · Política de Privacidad

> Describe qué datos personales tratamos, con qué finalidades, en qué base legal, durante cuánto tiempo, con quién los compartimos y qué derechos tienes. Complementa a los Términos y Condiciones (documento 10). Documento 12 de la serie del MVP v1.1.

> **Aviso importante:** versión **operativa para revisión legal** antes del lanzamiento público. Debe ser validada por un abogado conforme a la legislación aplicable (UE GDPR, Reino Unido UK GDPR, México LFPDPPP y Reglamento, California CCPA/CPRA, según mercados objetivo).

---

## 1. Responsable del tratamiento (controlador)

El responsable del tratamiento de tus datos personales es:

**[Nombre legal de la sociedad]**, con domicilio en **[dirección completa]**, correo de contacto para privacidad: **`privacy@councilia.app`** *(sustituir antes de producción)*.

En adelante, *"COUNCILia"*, *"nosotros"* o *"el Responsable"*.

Si designamos un delegado de protección de datos (DPO), su contacto se publicará en esta misma sección.

---

## 2. Ámbito de esta política

Esta Política de Privacidad aplica a:

- El sitio web y la aplicación web de COUNCILia (en adelante, *"el Servicio"*).
- Los formularios de registro, la encuesta de onboarding, las sesiones con el council y las comunicaciones que enviamos relacionadas con la cuenta (correos transaccionales).
- Cualquier subdominio oficial que enlacemos explícitamente desde el Servicio.

No aplica a sitios de terceros enlazados desde COUNCILia; cada tercero tiene su propia política.

---

## 3. Principios que aplicamos

Tratamos los datos personales de acuerdo con estos principios:

- **Licitud, lealtad y transparencia.** Solo tratamos lo necesario y te lo explicamos de forma comprensible.
- **Limitación de la finalidad.** Usamos los datos solo para los fines descritos aquí, salvo obligación legal o tu consentimiento explícito para un nuevo uso compatible.
- **Minimización.** No pedimos datos que no necesitemos para operar el Servicio.
- **Exactitud.** Te damos medios para corregir datos de cuenta incorrectos.
- **Limitación del plazo de conservación.** Conservamos los datos el tiempo estrictamente necesario y los borramos según los plazos de la sección 8.
- **Integridad y confidencialidad.** Aplicamos medidas técnicas y organizativas razonables (cifrado, controles de acceso, auditoría interna).
- **Responsabilidad proactiva.** Documentamos el tratamiento y revisamos proveedores y subencargados.

---

## 4. Qué datos personales tratamos

Agrupamos los datos en categorías para que sea fácil entender el alcance del tratamiento.

### 4.1 Datos de identificación y cuenta

| Dato | Origen | Finalidad principal |
|---|---|---|
| Correo electrónico | Registro / login | Identificación, comunicación operativa, recuperación de acceso. |
| Identificador de usuario (UUID interno) | Generado al registrarte | Vincular councils, conversaciones y configuración. |
| Hash de contraseña | Registro | Autenticación. No almacenamos la contraseña en texto plano. |
| Estado de verificación de correo | Supabase Auth | Seguridad de la cuenta. |
| Plan de suscripción (gratuito / pro) | Sistema de facturación | Aplicar límites y funciones del tier. |

### 4.2 Datos de la encuesta de onboarding (`userContext`)

| Dato | Origen | Finalidad principal |
|---|---|---|
| Tipo de decisión que vas a analizar | Encuesta | Calibración del comportamiento de los agentes. |
| Presión de tiempo percibida | Encuesta | Idem. |
| Lo que necesitas del council | Encuesta | Idem. |
| Riesgo que más te preocupa al equivocarte | Encuesta | Idem. |

Estas respuestas **no son “anonimizables”** una vez asociadas a tu cuenta: son datos personales en la medida en que describen tu contexto de decisión.

### 4.3 Contenido de las sesiones deliberativas

| Dato | Origen | Finalidad principal |
|---|---|---|
| Mensajes de texto que escribes al council | Tu interacción | Permitir la deliberación y mostrar el historial. |
| Respuestas generadas por los agentes y síntesis | Generadas a partir de tus mensajes | Entregar el Servicio contratado. |
| Metadatos de mensaje (orden, agente, fase, marcas de tiempo) | Sistema | Orquestación, historial, soporte y métricas agregadas. |
| Conteo estimado de tokens por mensaje o turno | Sistema | Control de costes, modelo de negocio y depuración. |

**Importante:** cualquier dato sensible que **tú voluntariamente** escribas sobre tu salud, tu vida afectiva, tu situación laboral o financiera forma parte del contenido de la sesión y se trata como el resto del mensaje. Te recomendamos no incluir más información sensible de la necesaria. COUNCILia **no solicita** de forma activa categorías especiales de datos (salvo lo mínimo implícito en la encuesta sobre tipo de decisión).

### 4.4 Datos de pago (solo tier pro)

| Dato | Origen | Finalidad principal |
|---|---|---|
| Identificador de cliente en Stripe (u otro PSP) | Pasarela de pago | Gestionar la suscripción. |
| Historial de facturación (importes, fechas, estado) | Pasarela de pago | Cumplimiento contable y soporte. |

**COUNCILia no almacena el número completo de tu tarjeta.** Los datos de medio de pago los trata el proveedor de pagos certificado (PCI-DSS).

### 4.5 Datos técnicos y de uso

| Dato | Origen | Finalidad principal |
|---|---|---|
| Dirección IP (parcial o completa, según configuración) | Conexión al Servicio | Seguridad, fraude, cumplimiento. La IP completa **no se conserva más de 30 días** salvo obligación legal o investigación de incidentes. |
| User agent (navegador, sistema) | Navegador | Compatibilidad y diagnóstico de errores. |
| Registros de errores y latencia (sin contenido de tus mensajes salvo que el error lo incluya por defecto) | Servidor y edge | Fiabilidad y mejora del producto. |
| Eventos de producto agregados o pseudonimizados (p. ej. “sesión completada”) | Instrumentación | Métricas internas. |

### 4.6 Comunicaciones transaccionales

| Dato | Origen | Finalidad principal |
|---|---|---|
| Dirección de correo destino | Tu cuenta | Envío de verificación, recuperación de contraseña, avisos de uso (paywall), avisos legales. |
| Estado de entrega (opcional, vía proveedor de email) | Proveedor de email | Depuración de entregas fallidas. |

---

## 5. Finalidades del tratamiento y bases legales

Las bases legales dependen de tu jurisdicción. A continuación usamos el marco del **RGPD (UE)** como referencia; en otros países aplican categorías equivalentes.

| Finalidad | Base legal (RGPD) | Detalle breve |
|---|---|---|
| Proporcionar el Servicio (cuenta, council, deliberación, síntesis) | **Ejecución del contrato** (art. 6.1.b) | Sin estos datos no podemos operar la plataforma. |
| Facturación y gestión de suscripciones | **Ejecución del contrato** + **obligación legal** (art. 6.1.b y c) | Facturas y registros contables. |
| Seguridad, prevención de fraude y abuso | **Interés legítimo** (art. 6.1.f), equilibrado con tus derechos | Rate limiting, detección de scraping, investigación de incidentes. |
| Cumplir obligaciones legales (ej. requerimiento de autoridad competente) | **Obligo legal** (art. 6.1 c) | Solo lo estrictamente necesario. |
| Mejora del producto con métricas **agregadas o pseudonimizadas** | **Interés legítimo** (art. 6.1.f) | No vendemos perfiles individuales. |
| Correos no esenciales (newsletter futura) | **Consentimiento** (art. 6.1.a) | No enviamos marketing sin tu opt-in explícito. |
| Encuesta cualitativa opcional post-sesión | **Consentimiento** (art. 6.1.a) | Puedes rechazarla sin perder el Servicio. |
| Cookies no estrictamente necesarias / analítica con identificadores persistentes | **Consentimiento** (art. 6.1.a) | Ver Política de Cookies (documento 13). |

**No tomamos decisiones automatizadas que produzcan efectos jurídicos significativos sobre ti** en el sentido del art. 22 RGPD. El modo Soporte (crisis) es una regla de seguridad, no un “scoring” sobre tu persona.

---

## 6. Con quién compartimos datos (encargados y subencargados)

Compartimos datos personales **solo** con proveedores que nos ayudan a prestar el Servicio **bajo contrato** (encargados del tratamiento) y obligaciones de confidencialidad y seguridad:

| Proveedor | Ubicación típica | Rol | Tratamiento |
|---|---|---|---|
| **Anthropic** (Claude API) | EE. UU. / según su infraestructura | Procesamiento de mensajes para generar respuestas | Datos enviados solo para la inferencia solicitada; no uso para entrenar según condiciones comerciales vigentes. |
| **Supabase** | UE / EE. UU. según configuración del proyecto | Base de datos, autenticación, almacenamiento | Datos de cuenta y contenido de sesión cifrados en reposo (configuración del proyecto). |
| **Vercel** | Global (edge) | Hosting y funciones serverless | Tráfico HTTPS, logs operativos limitados. |
| **Stripe** (u otro PSP) | Según Stripe | Pagos | Identificadores de cliente y transacción; datos de tarjeta solo en Stripe. |
| **Resend** (o equivalente) | Según proveedor | Email transaccional | Correo destino y metadatos de envío. |

Si incorporamos un nuevo subencargado que implique un **transferencia internacional** de datos fuera de tu región, te notificaremos y, cuando la ley lo exija, usaremos las **cláusulas contractuales tipo** u otro mecanismo reconocido.

Publicaremos y mantendremos actualizada la lista de subencargados en el Servicio con al menos **30 días** de antelación antes de que un subencargado nuevo acceda a datos personales identificables de usuarios existentes, salvo que sea necesario por seguridad y no pueda esperarse.

---

## 7. Conservación (plazos)

Sin perjuicio de lo acordado en los Términos, aplicamos:

| Categoría de datos | Plazo |
|---|---|
| Cuenta activa | Mientras la cuenta exista. |
| Conversaciones y síntesis no borradas | Mientras la cuenta exista. |
| Borrado solicitado por el usuario (conversación, historial o cuenta) | Borrado físico en máximo **7 días naturales**, incluyendo copias de seguridad operativas rutinarias. |
| Inactividad prolongada (sin login **24 meses**) | Aviso por correo y, en su caso, cierre y borrado según proceso documentado. |
| IP completa | **30 días** máximo salvo investigación de seguridad retenida con acceso restringido. |
| Logs de auditoría de seguridad | **12 meses**, luego anonimización o borrado. |
| Datos fiscales y de facturación | El **mínimo** exigido por la legislación tributaria aplicable. |

Cuando debamos conservar datos para el ejercicio o la defensa de reclamaciones legales, el tratamiento se limita al **almacenamiento** (bloqueo) durante el plazo de prescripción aplicable.

---

## 8. Seguridad

Medidas que aplicamos o exigimos a nuestros encargados (lista no exhaustiva):

- Cifrado **TLS** en tránsito entre tu navegador y nuestros servidores.
- Cifrado **en reposo** en la base de datos según la configuración del proveedor cloud.
- **Controles de acceso** por roles al panel de administración y a claves de API.
- **Row Level Security** en Postgres para que cada usuario solo acceda a sus propias filas.
- **Rotación y gestión segura de secretos** (sin commitear claves en el repositorio).
- Procedimientos de **respuesta a incidentes** (detección, contención, notificación cuando la ley lo exija).

Ningún sistema es 100% seguro. Si detectamos una violación de seguridad que pueda afectarte gravemente, te notificaremos y a la autoridad competente cuando la ley así lo requiera, sin demoras indebidas.

---

## 9. Tus derechos

Según tu lugar de residencia, puedes ejercer algunos o todos de los siguientes derechos **gratuitamente** (salvo solicitudes manifiestamente infundadas o excesivas):

- **Acceso:** saber qué datos tratamos y obtener copia en formato estructurado.
- **Rectificación:** corregir datos inexactos.
- **Supresión (“derecho al olvido”):** solicitar el borrado cuando ya no sean necesarios, retires el consentimiento o el tratamiento sea ilícito.
- **Limitación:** en determinados supuestos, marcar los datos para limitar su tratamiento.
- **Portabilidad:** recibir los datos que nos diste en formato estructurado y común (p. ej. JSON).
- **Oposición:** oponerte al tratamiento basado en interés legítimo, en los casos previstos por la ley.
- **Retirar el consentimiento** en cualquier momento (sin afecte a la licitud del tratamiento previo).
- **No ser objeto de decisiones basadas únicamente en tratamiento automatizado** que te afecten significativamente (no aplicable al Servicio en su forma actual, salvo aclaraciones en Términos).

**Cómo ejercerlos:** desde **Ajustes → Privacidad** en el Servicio, o escribiendo a **`privacy@councilia.app`** con el asunto “Ejercicio de derechos ARCO/RGPD/CCPA”. Responderemos en el plazo legal aplicable (p. ej. 1 mes en RGPD, salvo prórroga justificada).

Tienes derecho a **reclamar ante la autoridad de protección de datos** de tu país si consideras que infringimos la normativa.

---

## 10. Menores de edad

No dirigimos el Servicio a menores de **16 años**. No recogemos datos a sabiendas de menores de 16. Si un tutor nos lo comunica, eliminaremos la información de forma diligente. Ver también Términos, sección de edad mínima.

---

## 11. Analítica y cookies

El uso de cookies y tecnologías similares se describe en la **Política de Cookies** (documento 13). Las cookies **no esenciales** (p. ej. analítica con identificador persistente) requieren tu **consentimiento previo** donde la ley lo exija.

---

## 12. Usuarios en California (CCPA / CPRA)

Si eres residente de California, además de lo anterior:

- **No vendemos** tu información personal en el sentido del CCPA (ni compartimos a cambio de contraprestación monetaria).
- **No “compartimos”** datos personales sensibles para publicidad conductual cruzada en el MVP; si en el futuro lo hiciéramos, activaríamos el mecanismo de exclusión (“Do Not Sell or Share”) y actualizaríamos esta política.

Tienes derecho a **conocer**, **acceder**, **rectificar** y **eliminar** determinadas categorías de información personal, y a **limitar** el uso de información sensible en los supuestos del CPRA. Puedes designar un **agente autorizado** con documentación válida.

Para ejercer estos derechos: **`privacy@councilia.app`** con asunto “Solicitud CCPA/CPRA”. No discriminaremos por el ejercicio de tus derechos.

---

## 13. Usuarios en México (LFPDPPP)

Si eres titular de datos en México, puedes ejercer los derechos **ARCO** (Acceso, Rectificación, Cancelación, Oposición) y los demás que reconozca la ley, ante nosotros mediante el correo indicado, acreditando tu identidad cuando sea necesario.

El **AVE** (Aviso de privacidad integral) obra en este documento. Un **Aviso de privacidad simplificado** puede mostrarse en el pie del registro con enlace a la versión integral.

---

## 14. Cambios en esta política

Publicaremos la versión actualizada en **`/privacy`** con fecha de vigencia. Si el cambio es **sustancial**, te notificaremos por correo o mediante aviso destacado en el Servicio con **al menos 30 días** de antelación cuando la ley lo requiera. El uso continuado tras la fecha de vigencia puede constituir aceptación, salvo que el cambio requiera nuevo consentimiento (p. ej. nuevo uso de datos sensibles o nuevo encargado material en terceros países sin salvaguardas).

---

## 15. Contacto

- **Privacidad y derechos:** `privacy@councilia.app`
- **Soporte general:** `support@councilia.app`
- **Delegado de protección de datos** *(si aplica)*: *[correo]*

---

## 16. Historial de versiones

| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 (MVP) | Por definir | Primera publicación. |
