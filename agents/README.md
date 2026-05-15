# `agents/`

System prompts versionados por agente (**Marco**, **Elena**, **Rafael**) y el aparato de evaluación cualitativa que mide objetivamente si los prompts respetan las reglas duras del producto.

## Archivos

| Archivo | Rol |
|---|---|
| `marco.v1.ts` · `elena.v1.ts` · `rafael.v1.ts` | Prompt v1 por agente, 6 capas (doc 04 §6). |
| `shared.ts` | Reglas comunes a los 3 agentes (doc 04 §7) y bloque de instrucción para réplica. |
| `registry.ts` | Lookup `AgentId → AgentSpec`. |
| `rules.ts` | Validadores programáticos (no-recomendar, no-felicitar, longitud, una pregunta por turno…). |
| `antiPrompts.ts` | **L5** · 10 anti-prompts adversariales que intentan romper reglas. |
| `eval.ts` | Runner desacoplado del SDK: fixtures × agentes × suite de reglas → `EvalReport`. |

## Evaluación contra Gemini real

```bash
cp .env.example .env.local      # añadir GEMINI_API_KEY
npm run eval                    # corre SESSION_FIXTURES + ANTI_PROMPTS
npm run eval -- --only-anti     # solo anti-prompts (L5)
npm run eval -- --only-fixtures # solo casos representativos (L4)
npm run eval -- --concurrency 5
```

El reporte se imprime en stdout y se guarda como JSON en `tests/fixtures/eval-<timestamp>.json` (ignorado por git). Exit code ≠ 0 si hay violación dura, útil para gates en CI antes de un release de prompts.

## Iteración (L6)

Loop sugerido:

1. `npm run eval` → ver tasa de cumplimiento por agente y por regla.
2. Encontrar la regla con más violaciones; ajustar el prompt correspondiente (`*.v1.ts` → `*.v2.ts` si el cambio es estructural; bump menor en mismo archivo si es solo copy).
3. `git diff` del prompt y re-`npm run eval`. Buscar **≥95%** de cumplimiento agregado para release de prompts.
4. Si una regla nunca baja, considerar si está mal definida (falsos positivos sistemáticos) y refinar el validador en `rules.ts`.

Nunca cambiar un prompt y un validador en el mismo PR sin diferenciar claramente cuál movió el dial.
