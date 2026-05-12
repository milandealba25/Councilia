# `supabase/`

Migraciones SQL para el modelo de datos del MVP.

## Cómo aplicar `001_init.sql`

1. Crear proyecto en https://supabase.com (región más cercana, p. ej. `us-east-1`).
2. En tu Mac, copiar las claves a `.env.local`:
   ```
   SUPABASE_URL=https://<project>.supabase.co
   SUPABASE_ANON_KEY=<anon key>
   ```
3. Supabase Dashboard → **SQL Editor** → **New query** → pegar el contenido de `migrations/001_init.sql` → **Run**.
4. Verificar en **Authentication → Policies** que las 4 tablas (`users`, `councils`, `conversations`, `messages`) tengan RLS activa con las policies declaradas.
5. Probar inserción manual desde el SQL Editor (usando un `auth.uid()` válido) para confirmar que las policies bloquean correctamente datos ajenos.

## Esquema (resumen)

| Tabla | Filas | Propósito |
|-------|-------|-----------|
| `users` | extiende `auth.users` | `plan` (`free`/`pro`), `onboarding_completed_at` |
| `councils` | 1 por encuesta completada | guarda `user_context` JSON, `survey_version` |
| `conversations` | 1 por sesión | título auto-generado, `status` |
| `messages` | N por conversación | postura, réplica o síntesis (con `content_json`) |

RLS: cada usuario solo ve/edita lo suyo. La policy de `messages` se evalúa por subquery contra `conversations.user_id`.

## Backups y retención

Supabase ofrece backups automáticos diarios (proyecto Free retiene 1 día; Pro retiene 7 — coincide con doc 10 §retención). El job de borrado físico (M5) consume el storage de backups dentro del SLA de 7 días naturales: aún no implementado en código, vivirá en `scripts/backfill-delete.ts`.
