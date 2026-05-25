# COUNCILia

Council deliberativo con **tres agentes** (Marco, Elena, Rafael), **streaming** desde el primer token y **síntesis** que nombra tradeoffs sin recomendar. MVP v1.1 en **Next.js 14** (App Router), TypeScript estricto, Tailwind y orquestador propio (sin LangChain/CrewAI).

---

## Inicio rápido (local)

Requisitos: **Node.js 20+** y npm.

```bash
git checkout jaziel
npm install
cp .env.example .env.local
# Edita .env.local y añade GEMINI_API_KEY (ver manual abajo)
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). Flujo: **Inicio** → **Onboarding** (`/onboarding`) → **Sesión** (`/session`).

Sin `GEMINI_API_KEY`, la UI carga pero las rutas `/api/sessions/*` fallarán al llamar a Gemini.

---

## Scripts principales

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest |
| `npm run test:gemini` | Prueba mínima contra la API de Google Gemini |
| `npm run eval` | Evalúa fixtures + anti-prompts contra Gemini (ver `agents/README.md`) |

CI (`.github/workflows/test.yml`): `npm ci`, lint, typecheck, tests y build con `SKIP_ENV_VALIDATION=1`.

---

## Deploy en Vercel

El repo incluye `vercel.json` para usar el preset de Next.js con `npm ci` y `npm run build`. También fija Node.js 20 desde `package.json`, igual que CI.

1. Importa el repo en Vercel como proyecto Next.js.
2. Usa estos settings si Vercel no los autocompleta:
   - Install Command: `npm ci`
   - Build Command: `npm run build`
   - Output Directory: dejar vacío / default de Next.js
3. En `Settings -> Environment Variables`, define al menos:
   - `GEMINI_API_KEY`
   - `NEXT_PUBLIC_APP_URL` con la URL pública de producción, por ejemplo `https://councilia.app`
4. Define también estas si activas auth/perfiles con Supabase:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Opcionales:
   - `GEMINI_MODELS`
   - `GEMINI_THINKING_BUDGET`
   - `LOG_LEVEL`

Para builds de CI sin secretos se puede usar `SKIP_ENV_VALIDATION=1`, pero no lo actives en producción real porque ocultaría errores de configuración.

---

## Documentación del producto

- Visión, scope, agentes, flujo, stack, operaciones, roadmap, principios y legales: carpeta [`docs/`](./docs/).
- PDFs generados a partir de esos markdown: [`pdfs/`](./pdfs/) — regenerar con `python3 scripts/build_pdfs.py` (Python + dependencias del script).

---

## Tareas que debes hacer manualmente (fuera del repo)

**Lista completa y priorizada:** [`docs/14_manual_tareas_operador_desarrollo.md`](./docs/14_manual_tareas_operador_desarrollo.md)

Incluye: clave Anthropic, Supabase (proyecto + migración SQL), Vercel, DNS, Resend, GitHub branch protection, Stripe, revisión legal, reclutamiento de usuarios pilotos y ajustes en Cursor.

**Versión PDF del mismo contenido:** instala dependencias de Python y regenera todos los PDFs (incluido el manual):

```bash
pip3 install -r scripts/requirements-pdf.txt
python3 scripts/build_pdfs.py
```

El archivo resultante queda en `pdfs/14_Manual_Tareas_Operador_Desarrollo.pdf`.

---

## Estructura del código (resumen)

| Ruta | Contenido |
|------|-----------|
| `app/` | Rutas, layouts, páginas legales (`/terms`, `/privacy`, `/cookies`), onboarding, sesión, API routes |
| `components/` | UI (landing, sesión, cookies, legal) |
| `orchestrator/` | IntentCalibrator, AgentRunner, TensionDetector, DebateRouter, síntesis, crisis detector |
| `agents/` | Prompts v1, reglas de evaluación, anti-prompts |
| `lib/` | Env, SSE, markdown, cookies, seguridad (rate limit), observabilidad, survey, DB/repos |
| `supabase/migrations/` | SQL inicial con RLS |
| `tests/fixtures/` | Casos de sesión y evaluación |

---

## Licencia y contribución

Repositorio privado del equipo **Councilia**. Para dudas operativas, prioriza el [manual de tareas manuales](./docs/14_manual_tareas_operador_desarrollo.md).
