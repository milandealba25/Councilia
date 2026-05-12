# COUNCILia · Lista de Tareas del MVP

> Descomposición detallada del trabajo necesario para llegar al MVP v1.1 funcional en las 8 semanas planeadas. Cubre frontend, backend, orquestador, agentes, datos, pagos, contenido sensible, instrumentación, DevOps, testing y validación. Documento 11 de la serie.

---

## 1. Cómo leer este documento

Cada tarea tiene seis campos:

| Campo | Significado |
|---|---|
| ID | Identificador único, prefijo por área (`A1`, `B2`, etc.). Sirve para referenciar dependencias. |
| Tarea | Qué hay que hacer, expresado como un entregable concreto. |
| Criterio de aceptación | Condición observable que define que la tarea está terminada (Definition of Done). |
| Est. | Estimación de tamaño: **S** ≈ medio día, **M** ≈ 1–2 días, **L** ≈ 3–5 días, **XL** ≈ una semana o más. |
| Sem. | Semana del roadmap donde se planea realizar la tarea (1–8). |
| Dep. | IDs de otras tareas que deben terminarse antes de empezar ésta. |

Las áreas están agrupadas por letra (A: Setup, B: Diseño, C: Onboarding, etc.). Las dependencias críticas inter-áreas se listan al final del documento.

---

## 2. Resumen por semana

| Semana | Foco principal | Áreas activas | Hito de cierre |
|---|---|---|---|
| 1 | Setup + esqueleto del orquestador | A, B, K, L | Llamadas paralelas a Claude funcionando con 3 system prompts distintos en consola. |
| 2 | Streaming + Tension Detector + Synthesis | K, L, D | Una sesión completa (encuesta dummy → 3 posturas → réplica → síntesis) corre punta a punta en CLI o demo interna. |
| 3 | Onboarding real + UI de sesión | C, D, B | Usuario externo puede iniciar una sesión completa desde el navegador, sin auth todavía. |
| 4 | Síntesis, exportación, contenido sensible | E, M, B | Modo Soporte activo. Exportar síntesis funciona. Política de contenido aplicada en pre-procesamiento. |
| 5 | Auth + modelo de datos + historial | G, I, J, F | Usuario se registra, su council se guarda, abre conversaciones previas. |
| 6 | Tier freemium + pagos + ajustes de privacidad | H, N, F | Paywall activo a la sexta sesión del mes. DSAR autoservicio operativo. |
| 7 | Instrumentación + dashboard + QA | O, P, Q | Métricas cuantitativas se ven en dashboard. Tests E2E pasan en CI. |
| 8 | Pruebas con usuarios + iteración + demo | S, L, B | 20+ sesiones reales con usuarios externos, decisión de v1.2 documentada. |

---

## 3. Área A — Setup e infraestructura

| ID | Tarea | Criterio de aceptación | Est. | Sem. | Dep. |
|---|---|---|---|---|---|
| A1 | Inicializar repo Next.js 14 (App Router) con TypeScript estricto | `npm run dev` corre, `tsc --noEmit` pasa sin errores, ESLint configurado. | S | 1 | — |
| A2 | Configurar Tailwind CSS + tokens de diseño base | `tailwind.config.ts` con paleta del documento de diseño, `globals.css` aplicado. | S | 1 | A1 |
| A3 | Estructurar carpetas (`app/`, `lib/`, `components/`, `orchestrator/`, `agents/`) | Esqueleto de carpetas existe y un README corto en cada una explica su responsabilidad. | S | 1 | A1 |
| A4 | Configurar variables de entorno (`.env.example`, validación con `zod`) | Inicio falla con mensaje claro si falta una variable obligatoria; `.env.example` documentado. | S | 1 | A1 |
| A5 | Conectar Anthropic SDK (clave en `.env`) | Llamada hello-world a Claude Sonnet desde script de prueba devuelve texto. | S | 1 | A4 |
| A6 | Conectar Supabase (proyecto creado, claves cargadas) | Migración inicial corre, conexión confirmada desde Next API route. | M | 1 | A4 |
| A7 | Configurar GitHub Actions de lint + typecheck + test unitario básico | Cada PR a `main` ejecuta el workflow y bloquea merge si falla. | S | 1 | A1 |
| A8 | Configurar Vercel: proyecto, dominio dev (`dev.councilia.app`), envs sincronizadas | Push a `main` despliega automáticamente a `dev.councilia.app`. | M | 1 | A1, A6 |
| A9 | Configurar dominio de producción (`councilia.app`) con HTTPS | Sitio servido por HTTPS válido. Redirección de `www` a apex resuelta. | S | 6 | A8 |

---

## 4. Área B — Diseño y sistema visual

| ID | Tarea | Criterio de aceptación | Est. | Sem. | Dep. |
|---|---|---|---|---|---|
| B1 | Definir paleta y tokens (color, tipografía, espaciado, radios) | Documento `design-tokens.md` aprobado; archivo de tokens importado en Tailwind. | M | 1 | — |
| B2 | Crear componente `Card` para postura de agente (avatar, nombre, texto con streaming) | Variante "loading", "streaming", "completa", "error" pixel-perfect en escritorio y móvil. | M | 2 | B1 |
| B3 | Crear sistema de iconos (Lucide o set propio) y avatares de los 3 agentes | Avatares de Marco/Elena/Rafael en SVG, consistentes, sin assets pesados. | M | 2 | B1 |
| B4 | Diseñar pantalla de encuesta de onboarding | Maquetas mobile + desktop, transiciones documentadas. | M | 2 | B1 |
| B5 | Diseñar pantalla principal de sesión (3 cards en paralelo / apiladas) | Maquetas con estados: vacío, llenando, completo, esperando síntesis. | L | 2-3 | B1, B2 |
| B6 | Diseñar bloque de síntesis (estructura fija de caminos + tradeoffs) | Maqueta + variante de exportación PDF. | M | 3-4 | B1 |
| B7 | Diseñar pantalla de Modo Soporte (crisis emocional) | Maqueta sobria, copy validado, lista de recursos por región. | M | 4 | B1 |
| B8 | Diseñar pantalla de paywall y de ajustes/privacidad | Maquetas + copy. | M | 6 | B1 |
| B9 | Animaciones de transición con Framer Motion (cards entrando, streaming visible) | Animaciones suaves a <60fps en dispositivos medios. | M | 3 | B5, A1 |

---

## 5. Área C — Onboarding y encuesta

| ID | Tarea | Criterio de aceptación | Est. | Sem. | Dep. |
|---|---|---|---|---|---|
| C1 | Definir esquema versionado de la encuesta (`survey.v1.ts`) | Tipo TypeScript con las 4 preguntas, opciones y validación. | S | 2 | A3 |
| C2 | Implementar pantalla de encuesta (4 preguntas en una vista) | Vista responsive, validación visible, al completar avanza a la sesión. | M | 3 | C1, B4 |
| C3 | Construir objeto `userContext` y persistirlo en el council al guardarse | Council guardado en Supabase incluye `user_context` JSON correctamente serializado. | M | 5 | C1, J2 |
| C4 | Permitir reanudar encuesta si el usuario cierra la pestaña antes de terminar (in-session) | Estado parcial vive en `sessionStorage`; tras refrescar se restaura. | M | 3 | C2 |
| C5 | Mostrar texto introductorio antes de la encuesta ("Antes de reunir tu council…") | Copy validado, sin tipografía rota en ningún breakpoint. | S | 3 | B4 |

---

## 6. Área D — Sesión deliberativa (frontend)

| ID | Tarea | Criterio de aceptación | Est. | Sem. | Dep. |
|---|---|---|---|---|---|
| D1 | Implementar caja de entrada del usuario con counter de caracteres | Maneja envío con Enter, multi-línea con Shift+Enter, deshabilitada durante streaming. | M | 3 | B5 |
| D2 | Renderizar las 3 `Card` en grid responsive (3 columnas / apiladas) | Layout estable cuando una card es más larga que otra. | M | 3 | B2, B5 |
| D3 | Consumir SSE de las 3 posturas en paralelo, mostrar tokens conforme llegan | Las 3 cards muestran texto en streaming simultáneo sin parpadeos. | L | 3 | I2, K3 |
| D4 | Mostrar estado "esperando réplica" tras posturas iniciales | Indicador sutil sin spinner ruidoso. | S | 3 | D3 |
| D5 | Renderizar la réplica como una card con etiqueta "X responde a Y" | La card de réplica aparece con flecha visual o indicación clara del agente emisor. | M | 3 | D2, K4 |
| D6 | Implementar botón "Pedir síntesis" | Visible solo después de fase 2; deshabilitado hasta que termine fase 1. | S | 3 | D4 |
| D7 | Renderizar mensaje del usuario en la línea de tiempo (entre turnos) | Conversación continua con sus propios turnos visibles. | M | 3 | D1 |
| D8 | Manejar reintentos por error transitorio en una de las 3 llamadas | Si una postura falla, el usuario ve "reintentar agente X" sin perder las otras dos. | M | 3 | D3 |
| D9 | Layout móvil: cards apiladas, swipe horizontal opcional para enfocar una | Funciona en pantallas ≥ 360px. | M | 3 | D2 |
| D10 | Indicador de tokens / tiempo de la sesión (footer discreto) | Muestra tokens estimados consumidos, no intrusivo. | S | 7 | O3 |

---

## 7. Área E — Síntesis y exportación

| ID | Tarea | Criterio de aceptación | Est. | Sem. | Dep. |
|---|---|---|---|---|---|
| E1 | Renderizar síntesis con la estructura fija (caminos + tradeoffs + cierre) | El bloque se ve idéntico al diseño aprobado, sin formato libre del modelo. | M | 4 | B6, K5 |
| E2 | Botón "Exportar síntesis a PDF" | Genera un PDF con identidad visual del producto y se descarga. | M | 4 | E1 |
| E3 | Botón "Copiar como markdown" | Copia al portapapeles bloque markdown limpio. | S | 4 | E1 |
| E4 | Permitir que el usuario continúe la conversación después de la síntesis | "Pedir síntesis" no cierra la sesión; usuario puede seguir escribiendo. | S | 4 | E1, D1 |

---

## 8. Área F — Cuenta, historial y ajustes

| ID | Tarea | Criterio de aceptación | Est. | Sem. | Dep. |
|---|---|---|---|---|---|
| F1 | Pantalla de historial de conversaciones | Lista paginada con título auto-generado, fecha, council. | M | 5 | J2, J3 |
| F2 | Vista de conversación previa (modo lectura) | Reproduce las posturas y síntesis sin re-ejecutar el modelo. | M | 5 | F1 |
| F3 | Pantalla "Ajustes → Cuenta" (email, contraseña, cerrar sesión, cerrar cuenta) | Acciones funcionan, confirmaciones claras. | M | 6 | G1 |
| F4 | Pantalla "Ajustes → Privacidad" (descargar datos, borrar historial, borrar cuenta) | Descarga genera ZIP/JSON; borrados disparan job en backend. | L | 6 | I7, M5 |
| F5 | Notificación in-app post-acción ("Tu cuenta se cerrará en 7 días") | Toast persistente con explicación. | S | 6 | F3 |
| F6 | Renombrar council y conversación | Renombrado se persiste y se ve en historial. | S | 6 | F1 |

---

## 9. Área G — Autenticación

| ID | Tarea | Criterio de aceptación | Est. | Sem. | Dep. |
|---|---|---|---|---|---|
| G1 | Registro con email + contraseña (Supabase Auth) | Usuario nuevo recibe email de verificación; verifica y accede. | M | 5 | A6 |
| G2 | Login y recuperación de contraseña | Olvido de contraseña funciona end-to-end con email de reset. | M | 5 | G1 |
| G3 | Middleware de Next.js que protege rutas autenticadas | Rutas privadas redirigen a login si no hay sesión válida. | M | 5 | G1 |
| G4 | Permitir uso anónimo con límite (sesiones guardadas en `localStorage` hasta registro) | Usuario puede probar una sesión completa sin registrarse; al registrarse migra su última sesión. | L | 5 | G1, J2 |
| G5 | Logout coordinado con limpieza de tokens cliente | Tras logout, intentar acceso a privado redirige a landing. | S | 5 | G1 |

---

## 10. Área H — Tier freemium y paywall

| ID | Tarea | Criterio de aceptación | Est. | Sem. | Dep. |
|---|---|---|---|---|---|
| H1 | Contador de sesiones del mes natural por usuario | Endpoint `GET /usage` devuelve sesiones usadas / límite. | M | 6 | I4 |
| H2 | Bloqueo al abrir la 6ª sesión + pantalla de paywall | Usuario gratuito ve paywall al intentar abrir la 6ª sesión, no antes. | M | 6 | H1, B8 |
| H3 | Lógica de "sesión empezada cuenta cuando se envía el primer mensaje" | Si el usuario abre y no escribe, no consume sesión. | S | 6 | H1 |
| H4 | Pantalla de pricing con tier gratuito y tier pro | Comparación clara de límites; CTA visible. | M | 6 | B8 |
| H5 | Aviso por correo cuando el usuario alcanza la 4ª y 5ª sesión del mes | Mail transaccional disparado por evento. | S | 6 | H1, O4 |

---

## 11. Área I — Backend / API routes

| ID | Tarea | Criterio de aceptación | Est. | Sem. | Dep. |
|---|---|---|---|---|---|
| I1 | Definir estructura de rutas API (`/api/sessions`, `/api/synthesis`, `/api/usage`) | Documento OpenAPI o equivalente con endpoints y contratos. | M | 2 | A3 |
| I2 | Implementar endpoint que abre una sesión y devuelve SSE con 3 streams | Cliente recibe los 3 streams en paralelo identificados por agente. | L | 2-3 | A5, K3 |
| I3 | Implementar endpoint de réplica selectiva | Devuelve SSE de un solo agente con contexto reducido del otro. | M | 3 | I2, K4 |
| I4 | Implementar endpoint de síntesis | Devuelve la síntesis renderizada como JSON estructurado (caminos / tradeoffs / cierre). | M | 4 | I2, K5 |
| I5 | Endpoint para guardar council, conversaciones y mensajes | Datos quedan en Supabase, ids consistentes, transaccional. | M | 5 | J2 |
| I6 | Endpoint para listar conversaciones del usuario | Pagina, ordena por fecha, filtra por council. | S | 5 | I5 |
| I7 | Endpoint para borrado (conversación, historial, cuenta) | Borra lógicamente y dispara job de borrado físico (≤ 7 días). | M | 6 | M5 |
| I8 | Endpoint webhook de Stripe (`/api/webhooks/stripe`) | Procesa `customer.subscription.*` y actualiza tier del usuario. | M | 6 | N2 |

---

## 12. Área J — Modelo de datos

| ID | Tarea | Criterio de aceptación | Est. | Sem. | Dep. |
|---|---|---|---|---|---|
| J1 | Crear migración inicial de Supabase con tablas `users`, `councils`, `conversations`, `messages` | Migración aplicada en dev y staging; row-level security activada. | M | 5 | A6 |
| J2 | Implementar capa de repositorios (`lib/db/*.ts`) con queries tipadas | Repositorios cubren CRUD básico y queries de historial. | M | 5 | J1 |
| J3 | Indexar columnas para queries de historial (`conversation_id`, `created_at`) | Plan de queries muestra uso de índices; latencia p95 < 100 ms. | S | 5 | J2 |
| J4 | Configurar backups automáticos diarios con retención 7 días | Backups visibles en consola Supabase; restauración probada una vez. | S | 5 | A6 |
| J5 | Cifrado at-rest a nivel de columnas sensibles si Supabase no lo cubre por defecto | Confirmación documentada del nivel de cifrado por columna. | M | 5 | A6 |

---

## 13. Área K — Orquestador (núcleo)

| ID | Tarea | Criterio de aceptación | Est. | Sem. | Dep. |
|---|---|---|---|---|---|
| K1 | Implementar `IntentCalibrator` que lee `userContext` y emite pesos/atenuaciones | Tabla declarativa con reglas; cubre los casos de atenuación de Marco/Elena/Rafael. | M | 1-2 | A3, C1 |
| K2 | Definir interfaz `Llm` y adapter para Claude Sonnet con streaming | Interfaz reemplazable; el adapter inyecta system prompt y devuelve `AsyncIterable<string>`. | M | 1 | A5 |
| K3 | Implementar `AgentRunner.runInitial()`: 3 llamadas paralelas con streaming | Devuelve los 3 streams correlacionados con su `agent_id`; tolera fallo de uno. | L | 2 | K2 |
| K4 | Implementar `TensionDetector` heurístico (overlap léxico negativo + clasificador opcional) | Dada una terna de posturas, devuelve par con mayor contradicción o `null`. | L | 2 | K3 |
| K5 | Implementar `DebateRouter` que arma contexto reducido y dispara la réplica | Réplica usa solo la postura del agente referido, no las tres. | M | 2 | K4 |
| K6 | Implementar `SynthesisGenerator` con la estructura fija de salida | Salida cumple el JSON contract (caminos[], tradeoffs[], cierre). | M | 4 | K5 |
| K7 | Cancelación coordinada de los 3 streams al cerrar la conversación | Si el usuario sale, las llamadas pendientes se abortan en < 1 s. | M | 4 | K3 |
| K8 | Logging estructurado por turno (council_id, conversation_id, fase, tokens, latencia) | Logs van a destino centralizado y son queryables. | M | 7 | O1 |

---

## 14. Área L — Agentes y prompts

| ID | Tarea | Criterio de aceptación | Est. | Sem. | Dep. |
|---|---|---|---|---|---|
| L1 | Redactar prompt v1 de **Marco** (Estratega) con las 6 capas del documento 04 | Prompt en `agents/marco.v1.ts`, revisado por al menos otra persona del equipo. | M | 1-2 | A3 |
| L2 | Redactar prompt v1 de **Elena** (Analista de Riesgo) | Idem. | M | 1-2 | A3 |
| L3 | Redactar prompt v1 de **Rafael** (Crítico) | Idem. | M | 1-2 | A3 |
| L4 | Set de fixtures de prueba (10 casos de uso típicos: negocio, carrera, relación, finanzas, etc.) | Fixtures viven en `tests/fixtures/` y se usan en evaluación cualitativa. | M | 2 | L1-L3 |
| L5 | Banco de "anti-prompts" para validar lo que los agentes NO deben hacer | Set de 10 entradas que prueban no-recomendación, no-felicitación, etc. | M | 2 | L1-L3 |
| L6 | Iterar prompts a la luz de fixtures (al menos 2 vueltas) | Tasa de cumplimiento de reglas ≥ 95% en fixtures internos. | L | 7-8 | L4, L5 |

---

## 15. Área M — Modo Soporte y contenido sensible

| ID | Tarea | Criterio de aceptación | Est. | Sem. | Dep. |
|---|---|---|---|---|---|
| M1 | Lista verificada de recursos de crisis por país (es-MX, es-ES, en-US como mínimo en MVP) | Lista revisada manualmente, fuentes citadas, vigentes a la fecha. | M | 4 | — |
| M2 | Detector heurístico de crisis (keywords + heurísticas básicas) | Cubre ideación suicida, autolesión y violencia doméstica en español/inglés con tasa de detección ≥ 90% en fixtures. | L | 4 | A3 |
| M3 | Clasificador ligero opcional como segunda pasada | Mejora la precisión sin disparar latencia más de 200 ms. | L | 4 | M2 |
| M4 | Pantalla de Modo Soporte conectada al detector | Si el detector marca crisis, el flujo deliberativo se pausa y se muestra la pantalla. | M | 4 | M2, B7 |
| M5 | Job de borrado físico que respeta los plazos del documento 10 (T&C) | Job nocturno borra de DB y de backups dentro del SLA de 7 días naturales. | M | 6 | J1 |
| M6 | Filtros de contenido en input (rechazo de PII de terceros, contenido ilegal) | Mensajes con patrones detectados muestran aviso y no se envían al modelo. | M | 4 | A3 |

---

## 16. Área N — Pagos y facturación

| ID | Tarea | Criterio de aceptación | Est. | Sem. | Dep. |
|---|---|---|---|---|---|
| N1 | Crear cuenta de Stripe (modo test y producción) y productos/precios | Productos definidos: mensual y anual, en USD y MXN. | S | 6 | — |
| N2 | Integrar Stripe Checkout en el frontend | Usuario gratuito pasa a pro tras pago exitoso en sandbox. | M | 6 | N1 |
| N3 | Implementar webhook de Stripe (renovación, cancelación, fallo de pago) | Cambios de estado de suscripción se reflejan en `users.plan`. | M | 6 | I8, N2 |
| N4 | Pantalla "Ajustes → Facturación" con portal de Stripe | Usuario gestiona método de pago y factura desde el portal nativo. | S | 6 | N3 |
| N5 | Reembolso manual por solicitud durante periodo de prueba (14 días) | Operativa interna documentada (no automática) para procesar reembolsos válidos. | S | 6 | N3 |

---

## 17. Área O — Instrumentación y métricas

| ID | Tarea | Criterio de aceptación | Est. | Sem. | Dep. |
|---|---|---|---|---|---|
| O1 | Adoptar librería de logging estructurado (pino o equivalente) | Logs JSON enviados a Vercel / Supabase logs / proveedor externo. | S | 7 | A1 |
| O2 | Definir y emitir eventos clave (sesión iniciada, postura completada, réplica, síntesis pedida, error) | Eventos visibles en el destino agregado. | M | 7 | O1 |
| O3 | Tracking de tokens por turno y por usuario | Suma agregada visible en dashboard. | M | 7 | O2, J2 |
| O4 | Email transaccional (Resend o equivalente) con plantillas para registro, recuperación, paywall warning | Correos llegan a inbox con dominio configurado (SPF/DKIM). | M | 6 | A4 |
| O5 | Dashboard interno simple (vista en Next admin protegida) con KPIs | Muestra tasa de finalización, retorno a 7 días, profundidad, tasa de "me cambió perspectiva". | L | 7 | O2 |
| O6 | Encuesta cualitativa post-sesión (opt-in) | Modal sobrio aparece al cerrar; las respuestas se guardan asociadas a la conversación. | M | 7 | E1, J2 |
| O7 | Alertas básicas (tasa de error > 2%, latencia p95 > 8 s, costo medio sesión > $0.25) | Notificación a un canal de Slack interno cuando se cruzan umbrales. | M | 7 | O2 |

---

## 18. Área P — Testing

| ID | Tarea | Criterio de aceptación | Est. | Sem. | Dep. |
|---|---|---|---|---|---|
| P1 | Tests unitarios del orquestador (Intent, Tension, Synthesis) con `vitest` o `jest` | Cobertura > 80% en `orchestrator/`. | M | 2-7 | K1-K6 |
| P2 | Tests de contrato de la API (zod schemas validan request/response) | Ningún endpoint acepta payload no validado. | M | 3-5 | I1 |
| P3 | Tests E2E con Playwright (flujo: encuesta → sesión → síntesis → exportar) | Suite corre en CI sobre Vercel preview y pasa estable. | L | 7 | A7, F1, E1 |
| P4 | Tests del detector de crisis con fixtures positivos y negativos | Falsos negativos en fixtures = 0. | M | 4 | M2 |
| P5 | Tests de regresión de prompts (snapshot de salidas vs. fixtures) | Cambios en prompts se detectan en CI con diff legible. | M | 7-8 | L4 |
| P6 | Pruebas manuales de accesibilidad básicas (contraste, foco visible, navegación con teclado) | Checklist WCAG AA en pantallas principales completado. | M | 7 | B5, B6 |

---

## 19. Área Q — DevOps, observabilidad y seguridad

| ID | Tarea | Criterio de aceptación | Est. | Sem. | Dep. |
|---|---|---|---|---|---|
| Q1 | Configurar entorno de staging en Vercel separado de producción | Cada PR genera preview; staging permanente apunta a `main`. | S | 7 | A8 |
| Q2 | Headers de seguridad (CSP, HSTS, Referrer-Policy, etc.) | Score de `securityheaders.com` ≥ A. | M | 7 | A8 |
| Q3 | Rate limiting básico (por IP y por usuario) en endpoints sensibles | 50 req/min por usuario en `/api/sessions`; 10 req/min para login fallido. | M | 7 | I1 |
| Q4 | Plan de respaldo y restauración documentado | Documento `runbook-backup.md` con pasos verificados al menos una vez. | S | 7 | J4 |
| Q5 | Plan de respuesta a incidentes con plazos (sev1: 2 h, sev2: 1 día) | Documento `runbook-incidents.md` con responsables y canales. | S | 7 | — |
| Q6 | Auditoría dependencias (`npm audit` integrado en CI) | Workflow falla si hay vulnerabilidades críticas. | S | 7 | A7 |

---

## 20. Área R — Contenido legal y de usuario

| ID | Tarea | Criterio de aceptación | Est. | Sem. | Dep. |
|---|---|---|---|---|---|
| R1 | Revisión legal de los documentos publicados al usuario: Términos (doc 10), Privacidad (doc 12) y Cookies (doc 13) por abogado | Versiones finales aprobadas, comentarios resueltos. | L | 5-7 | — |
| R2 | Página pública "/terms" con los Términos | Versión markdown se renderiza con estilo, anclas por sección. | M | 6 | R1 |
| R3 | Página pública "/privacy" alineada con el documento 12 (Política de Privacidad) | Renderizado consistente con /terms, enlaces cruzados correctos. | M | 6 | R1 |
| R4 | Página pública "/cookies" alineada con el documento 13 (Política de Cookies) | Renderizado consistente; lista de cookies actualizada con lo desplegado en prod. | M | 6 | R1 |
| R5 | Banner y centro de preferencias de cookies según documento 13 | Categorías (necesaria / funcional / analítica) respetadas; no se carga analítica sin consentimiento. | M | 6 | R4, O5 |
| R6 | Página pública de "Sobre el producto" con la visión (basada en doc 01) | Página simple con copy del documento 01 sin información técnica interna. | S | 6 | — |
| R7 | Página de soporte con FAQs y contacto | FAQs cubren paywall, borrado, modo Soporte, exportación, cookies y privacidad. | M | 7 | — |

---

## 21. Área S — Validación con usuarios

| ID | Tarea | Criterio de aceptación | Est. | Sem. | Dep. |
|---|---|---|---|---|---|
| S1 | Definir guión de prueba moderada (situaciones a explorar, qué observar) | Documento con 5–7 situaciones, métricas a observar y formulario post-sesión. | M | 7 | O6 |
| S2 | Reclutar 20–30 usuarios externos al equipo | Confirmados con cita y consentimiento informado. | M | 7 | R1 |
| S3 | Realizar las sesiones (presencial y remoto) y grabar con consentimiento | Grabaciones almacenadas con plazo de retención claro. | L | 8 | S1, S2 |
| S4 | Recopilar resultados (cualitativos y cuantitativos del dashboard) | Reporte de hallazgos con citas anonimizadas. | M | 8 | S3, O5 |
| S5 | Decisión documentada de v1.2: sí / pivote / iterar | Documento corto que cita métricas y hallazgos, firmado por el equipo. | S | 8 | S4 |
| S6 | Iteración rápida sobre top-3 hallazgos críticos antes de cerrar el sprint | Cambios merged a `main` y desplegados. | M | 8 | S4 |

---

## 22. Dependencias críticas inter-áreas

Las cadenas más sensibles del cronograma (si una se rompe, arrastra varias):

1. **A5 → K2 → K3 → I2 → D3 → D2.** Si el SSE de las 3 posturas no está estable al final de la semana 3, todo el demo de la semana 3 cae.
2. **C1 → C3 → J2 → I5.** El `userContext` debe estar congelado como contrato antes de tocar persistencia.
3. **L1-L3 → L4 → L6.** Sin fixtures la iteración de prompts en semanas 7-8 se convierte en intuición.
4. **R1 → R2/R3/R4 → H2.** No se puede mostrar paywall sin los textos legales base publicados (Términos, Privacidad y, si hay cookies no esenciales, página de Cookies + banner).
5. **M2 → M4 → S3.** Sin Modo Soporte funcional no se puede correr la validación con usuarios reales.

---

## 23. Resumen de hitos críticos

| Hito | Semana | Criterio binario |
|---|---|---|
| H-1 Backbone deliberativo en consola | 2 | Una sesión completa imprime postura + réplica + síntesis sin UI. |
| H-2 Sesión completa en navegador (sin auth) | 3 | Un usuario externo puede usar el flujo en `dev.councilia.app`. |
| H-3 Crisis flow operativo | 4 | Detector + pantalla de soporte funcionan con fixtures positivos. |
| H-4 Persistencia y auth | 5 | Usuario registrado retoma su última conversación. |
| H-5 Freemium y paywall | 6 | Sexta sesión del mes muestra paywall correctamente. |
| H-6 Instrumentación y QA | 7 | Dashboard interno operativo, E2E verde en CI. |
| H-7 Validación + decisión | 8 | 20+ usuarios, decisión documentada de v1.2 / pivote / iterar. |

---

## 24. Lo que NO está en esta lista (deliberadamente)

Para protegernos de inflación de scope, conviene listar lo que **no** entra al sprint:

- Cuarto agente (SOFÍA): va a v1.2.
- Pieles dinámicas: va a v1.2.
- Interrupción durante streaming: va a v1.2.
- Memoria entre sesiones: va a v1.3.
- App móvil nativa: va a v1.3.
- Voz: va a v1.4+.
- Multimodal: va a v1.4+.
- Tier equipo: va a v1.3+.

Si una propuesta no aparece en esta lista y tampoco está en el roadmap post-MVP, hay que enviarla al **principio 10** (cada feature necesita métrica) antes de aceptarla.
