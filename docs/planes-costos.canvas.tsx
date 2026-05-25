import {
  Callout,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Grid,
  H1,
  H2,
  H3,
  Row,
  Stack,
  Stat,
  Table,
  Text,
  Pill,
  useHostTheme,
} from "cursor/canvas";

// ─── DATOS ────────────────────────────────────────────────────────────────────

// Tipo de cambio referencia (May 2026)
const USD_TO_MXN = 17.5;

// ─── ANATOMÍA DE UN TURNO ────────────────────────────────────────────────────
// Por cada mensaje que el usuario envía:
//   Fase 1: 3 agentes en paralelo (system prompt ~800 tok + historia + msg)
//   Réplica: ocurre ~60% de los turnos (1 llamada ~1 200 tok input)
//   Síntesis: 1 llamada al final del chat (~1 500 tok input, 200 output)

// Costo promedio por turno (gpt-4o-mini @ $0.15/1M in, $0.60/1M out)
const MINI_IN = 0.15 / 1_000_000;
const MINI_OUT = 0.60 / 1_000_000;

// Costo promedio por turno (Gemini 2.0 Flash @ $0.10/1M in, $0.40/1M out)
const GEMINI_IN = 0.10 / 1_000_000;
const GEMINI_OUT = 0.40 / 1_000_000;

// ElevenLabs eleven_v3: ~$0.0002 por carácter a escala Creator/Pro
const EL_PER_CHAR = 0.0002;

function costPerTurn(inTokens: number, outTokens: number, model: "mini" | "gemini") {
  const rateIn = model === "mini" ? MINI_IN : GEMINI_IN;
  const rateOut = model === "mini" ? MINI_OUT : GEMINI_OUT;
  return inTokens * rateIn + outTokens * rateOut;
}

// Turno promedio: 3 agentes (1 100 tok input c/u, 55 tok output c/u) + réplica 60%
function avgTurnCost(model: "mini" | "gemini") {
  const initial = 3 * costPerTurn(1_100, 55, model);
  const replica = 0.6 * costPerTurn(1_200, 70, model);
  return initial + replica;
}

const TURN_MINI = avgTurnCost("mini");      // ~$0.00073
const TURN_GEMINI = avgTurnCost("gemini");  // ~$0.00049

const SYNTHESIS_MINI = costPerTurn(1_500, 200, "mini");     // ~$0.00035
const SYNTHESIS_GEMINI = costPerTurn(1_500, 200, "gemini"); // ~$0.00023

function chatCost(turns: number, model: "mini" | "gemini"): number {
  const turnCost = model === "mini" ? TURN_MINI : TURN_GEMINI;
  const synthCost = model === "mini" ? SYNTHESIS_MINI : SYNTHESIS_GEMINI;
  return turns * turnCost + synthCost;
}

// ElevenLabs: chars promedio por click = ~350 chars/agente
// Estimamos que solo X% de mensajes disparan voz, Y agentes en promedio
function elevenCost(chats: number, msgs: number, voicePct: number, avgAgents: number) {
  return chats * msgs * voicePct * avgAgents * 350 * EL_PER_CHAR;
}

// ─── PERFILES DE USUARIO ─────────────────────────────────────────────────────
const profiles = [
  {
    label: "Usuario Free",
    chats: 2,
    msgs: 4,
    voice: 0,
    model: "gemini" as const,
    supabase: 0.01,
    infra: 0.015,
  },
  {
    label: "Usuario Plus",
    chats: 8,
    msgs: 8,
    voice: 0.12,    // 12% de mensajes disparan voz (~1.5 agentes)
    model: "mini" as const,
    supabase: 0.04,
    infra: 0.04,
  },
  {
    label: "Usuario Pro",
    chats: 20,
    msgs: 12,
    voice: 0.18,    // 18% voz
    model: "mini" as const,
    supabase: 0.08,
    infra: 0.08,
  },
];

function totalCostPerUser(p: typeof profiles[0]) {
  const llm = p.chats * chatCost(p.msgs, p.model);
  const el = elevenCost(p.chats, p.msgs, p.voice, 1.5);
  return llm + el + p.supabase + p.infra;
}

const freeCost  = totalCostPerUser(profiles[0]);
const plusCost  = totalCostPerUser(profiles[1]);
const proCost   = totalCostPerUser(profiles[2]);

// ─── PLANES ──────────────────────────────────────────────────────────────────
const plans = [
  {
    name: "Free",
    usd: 0,
    usdAnnual: 0,
    mxn: 0,
    mxnAnnual: 0,
    margin: "-",
    marginAnnual: "-",
    cogs: freeCost,
  },
  {
    name: "Plus",
    usd: 9,
    usdAnnual: 85,   // ~$7.08/mes — 21% descuento
    mxn: Math.round(9 * USD_TO_MXN / 10) * 10,
    mxnAnnual: Math.round(85 * USD_TO_MXN / 10) * 10,
    margin: Math.round((1 - plusCost / 9) * 100) + "%",
    marginAnnual: Math.round((1 - plusCost / (85 / 12)) * 100) + "%",
    cogs: plusCost,
  },
  {
    name: "Pro",
    usd: 24,
    usdAnnual: 220, // ~$18.3/mes — 24% descuento
    mxn: Math.round(24 * USD_TO_MXN / 10) * 10,
    mxnAnnual: Math.round(220 * USD_TO_MXN / 10) * 10,
    margin: Math.round((1 - proCost / 24) * 100) + "%",
    marginAnnual: Math.round((1 - proCost / (220 / 12)) * 100) + "%",
    cogs: proCost,
  },
];

// ─── DESGLOSE LLM ────────────────────────────────────────────────────────────
const llmFree  = profiles[0].chats * chatCost(profiles[0].msgs, "gemini");
const llmPlus  = profiles[1].chats * chatCost(profiles[1].msgs, "mini");
const llmPro   = profiles[2].chats * chatCost(profiles[2].msgs, "mini");
const elPlus   = elevenCost(8, 8, 0.12, 1.5);
const elPro    = elevenCost(20, 12, 0.18, 1.5);

function fmt(n: number, decimals = 4) {
  return "$" + n.toFixed(decimals);
}

// ─── COMPONENTE ──────────────────────────────────────────────────────────────
export default function Planes() {
  const theme = useHostTheme();
  const t = theme.tokens;

  return (
    <Stack gap={28}>
      <Stack gap={4}>
        <H1>Análisis de costos · COUNCILia</H1>
        <Text tone="secondary" size="small">
          Estimaciones basadas en la arquitectura real del código (3 agentes paralelos, réplica, síntesis).
          Tipo de cambio referencia: $17.50 MXN/USD · Mayo 2026
        </Text>
      </Stack>

      <Callout tone="info">
        El costo más grande no es el LLM — es ElevenLabs. A escala, la voz sintética
        puede representar el 60–75% del COGS de un usuario Plus/Pro activo.
        El modelo GPT-4o-mini es sorprendentemente barato: ~$0.00073 por turno completo de 3 agentes + réplica.
      </Callout>

      {/* ── ANATOMÍA POR TURNO ── */}
      <Stack gap={10}>
        <H2>Anatomía de costo por turno (1 mensaje del usuario)</H2>
        <Text tone="secondary" size="small">
          Cada "turno" = 3 agentes en paralelo + réplica (60% prob.) · Síntesis: 1 llamada por chat al final
        </Text>
        <Grid columns={3} gap={12}>
          <Card>
            <CardHeader>GPT-4o-mini (Plus / Pro)</CardHeader>
            <CardBody>
              <Stack gap={8}>
                <Stat value={fmt(TURN_MINI, 5)} label="por turno (sin síntesis)" />
                <Divider />
                <Table
                  headers={["Fase", "Input tok", "Output tok", "Costo"]}
                  rows={[
                    ["3 agentes", "3 300", "165", fmt(3 * costPerTurn(1_100, 55, "mini"), 5)],
                    ["Réplica ×60%", "720", "42", fmt(0.6 * costPerTurn(1_200, 70, "mini"), 5)],
                    ["Síntesis (1×chat)", "1 500", "200", fmt(SYNTHESIS_MINI, 5)],
                  ]}
                />
              </Stack>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>Gemini 2.0 Flash (Free)</CardHeader>
            <CardBody>
              <Stack gap={8}>
                <Stat value={fmt(TURN_GEMINI, 5)} label="por turno (sin síntesis)" />
                <Divider />
                <Table
                  headers={["Fase", "Input tok", "Output tok", "Costo"]}
                  rows={[
                    ["3 agentes", "3 300", "165", fmt(3 * costPerTurn(1_100, 55, "gemini"), 5)],
                    ["Réplica ×60%", "720", "42", fmt(0.6 * costPerTurn(1_200, 70, "gemini"), 5)],
                    ["Síntesis (1×chat)", "1 500", "200", fmt(SYNTHESIS_GEMINI, 5)],
                  ]}
                />
              </Stack>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>ElevenLabs eleven_v3</CardHeader>
            <CardBody>
              <Stack gap={8}>
                <Stat value="$0.0002" label="por carácter (~escala Creator+)" />
                <Divider />
                <Table
                  headers={["Agente", "Palabras", "Chars", "Costo/click"]}
                  rows={[
                    ["Marco", "~70", "~385", fmt(385 * EL_PER_CHAR, 4)],
                    ["Elena", "~60", "~330", fmt(330 * EL_PER_CHAR, 4)],
                    ["Rafael", "~25", "~137", fmt(137 * EL_PER_CHAR, 4)],
                    ["Promedio", "~52", "~284", fmt(284 * EL_PER_CHAR, 4)],
                  ]}
                />
                <Text tone="secondary" size="small">
                  Solo se genera audio si el usuario presiona "Escuchar". Modelo en código: eleven_v3.
                </Text>
              </Stack>
            </CardBody>
          </Card>
        </Grid>
      </Stack>

      <Divider />

      {/* ── COSTO PROMEDIO POR PERFIL ── */}
      <Stack gap={10}>
        <H2>Costo promedio por usuario / mes</H2>
        <Text tone="secondary" size="small">
          Supuestos: Free = 2 chats × 4 msg; Plus = 8 chats × 8 msg, 12% voz; Pro = 20 chats × 12 msg, 18% voz
        </Text>
        <Grid columns={3} gap={12}>
          {[
            {
              label: "Free",
              llm: llmFree,
              el: 0,
              infra: 0.025,
              model: "Gemini Flash",
              chats: "2 / mes",
              msgs: "4 / chat",
            },
            {
              label: "Plus",
              llm: llmPlus,
              el: elPlus,
              infra: 0.08,
              model: "GPT-4o-mini",
              chats: "8 / mes",
              msgs: "8 / chat",
            },
            {
              label: "Pro",
              llm: llmPro,
              el: elPro,
              infra: 0.16,
              model: "GPT-4o-mini",
              chats: "20 / mes",
              msgs: "12 / chat",
            },
          ].map((p) => {
            const total = p.llm + p.el + p.infra;
            return (
              <Card key={p.label}>
                <CardHeader>{p.label}</CardHeader>
                <CardBody>
                  <Stack gap={10}>
                    <Stat value={fmt(total, 3)} label="costo total / mes / usuario" tone={total < 0.1 ? "success" : total < 3 ? "warning" : "danger"} />
                    <Table
                      headers={["Componente", "Costo/mes"]}
                      rows={[
                        ["LLM (" + p.model + ")", fmt(p.llm, 4)],
                        ["ElevenLabs", fmt(p.el, 4)],
                        ["Supabase + Infra", fmt(p.infra, 4)],
                        ["TOTAL", fmt(total, 4)],
                      ]}
                      rowTone={[undefined, undefined, undefined, "info"]}
                    />
                    <Text tone="secondary" size="small">{p.chats} · {p.msgs}</Text>
                  </Stack>
                </CardBody>
              </Card>
            );
          })}
        </Grid>
      </Stack>

      <Divider />

      {/* ── PLANES Y PRECIOS ── */}
      <Stack gap={10}>
        <H2>Planes sugeridos y márgenes</H2>
        <Text tone="secondary" size="small">
          Margen bruto sobre COGS directo (LLM + ElevenLabs + infra).
          No incluye salarios, soporte ni amortización de desarrollo.
        </Text>
        <Table
          headers={[
            "Plan",
            "Precio / mes (USD)",
            "Precio / año (USD)",
            "Precio / mes (MXN)",
            "Precio / año (MXN)",
            "COGS / usuario",
            "Margen bruto",
          ]}
          rows={plans.map((p) => [
            p.name,
            p.usd === 0 ? "Gratis" : "$" + p.usd,
            p.usdAnnual === 0 ? "Gratis" : "$" + p.usdAnnual,
            p.mxn === 0 ? "Gratis" : "$" + p.mxn.toLocaleString("es-MX"),
            p.mxnAnnual === 0 ? "Gratis" : "$" + p.mxnAnnual.toLocaleString("es-MX"),
            fmt(p.cogs, 3),
            p.name === "Free" ? "Mktg" : p.margin,
          ])}
          rowTone={["info", "warning", "success"]}
        />
      </Stack>

      {/* ── DETALLE DE PLANES ── */}
      <Grid columns={3} gap={12}>
        {/* FREE */}
        <Card>
          <CardHeader>
            <Row gap={8} align="center">
              <Text weight="bold">Free</Text>
              <Pill label="Gratis" tone="info" />
            </Row>
          </CardHeader>
          <CardBody>
            <Stack gap={10}>
              <Stat value="$0" label="para siempre" />
              <Divider />
              <Stack gap={6}>
                <H3>Límites</H3>
                <Table
                  headers={["Parámetro", "Límite"]}
                  rows={[
                    ["Chats simultáneos", "1 activo"],
                    ["Mensajes por chat", "5"],
                    ["Historial guardado", "Solo el último"],
                    ["Modelo LLM", "Gemini Flash"],
                    ["Voz (ElevenLabs)", "No"],
                    ["Síntesis al cierre", "Sí"],
                  ]}
                />
              </Stack>
              <Callout tone="info">
                COGS estimado: {fmt(freeCost, 4)}/usuario·mes.
                El riesgo real es usuarios que abren y cierran chats repetidamente — considera límite de 10 chats nuevos/mes.
              </Callout>
            </Stack>
          </CardBody>
        </Card>

        {/* PLUS */}
        <Card>
          <CardHeader>
            <Row gap={8} align="center">
              <Text weight="bold">Plus</Text>
              <Pill label="Recomendado" tone="warning" />
            </Row>
          </CardHeader>
          <CardBody>
            <Stack gap={10}>
              <Grid columns={2} gap={8}>
                <Stat value="$9 USD" label="/ mes" />
                <Stat value="$85 USD" label="/ año (~$7.08/mes)" />
              </Grid>
              <Grid columns={2} gap={8}>
                <Stat value={`$${Math.round(9 * USD_TO_MXN / 10) * 10} MXN`} label="/ mes" />
                <Stat value={`$${Math.round(85 * USD_TO_MXN).toLocaleString("es-MX")} MXN`} label="/ año" />
              </Grid>
              <Divider />
              <Table
                headers={["Parámetro", "Límite"]}
                rows={[
                  ["Chats simultáneos", "10"],
                  ["Mensajes por chat", "20"],
                  ["Historial guardado", "Últimos 10 chats"],
                  ["Modelo LLM", "GPT-4o-mini"],
                  ["Voz (ElevenLabs)", "Sí — 3 voces por agente"],
                  ["Síntesis al cierre", "Sí"],
                  ["Exportar chat", "No"],
                ]}
              />
              <Callout tone="warning">
                COGS: {fmt(plusCost, 3)}/usuario·mes · Margen bruto: {plans[1].margin}.
                ElevenLabs = {fmt(elPlus, 3)} ({Math.round(elPlus / plusCost * 100)}% del COGS).
              </Callout>
            </Stack>
          </CardBody>
        </Card>

        {/* PRO */}
        <Card>
          <CardHeader>
            <Row gap={8} align="center">
              <Text weight="bold">Pro</Text>
              <Pill label="Power users" tone="success" />
            </Row>
          </CardHeader>
          <CardBody>
            <Stack gap={10}>
              <Grid columns={2} gap={8}>
                <Stat value="$24 USD" label="/ mes" />
                <Stat value="$220 USD" label="/ año (~$18.3/mes)" />
              </Grid>
              <Grid columns={2} gap={8}>
                <Stat value={`$${Math.round(24 * USD_TO_MXN / 10) * 10} MXN`} label="/ mes" />
                <Stat value={`$${Math.round(220 * USD_TO_MXN).toLocaleString("es-MX")} MXN`} label="/ año" />
              </Grid>
              <Divider />
              <Table
                headers={["Parámetro", "Límite"]}
                rows={[
                  ["Chats simultáneos", "Sin límite"],
                  ["Mensajes por chat", "Sin límite"],
                  ["Historial guardado", "Todo el historial"],
                  ["Modelo LLM", "GPT-4o-mini (+ síntesis GPT-4o)"],
                  ["Voz (ElevenLabs)", "Sí — autoplay secuencial"],
                  ["Síntesis al cierre", "Sí (modelo más potente)"],
                  ["Exportar chat", "Sí (PDF / markdown)"],
                ]}
              />
              <Callout tone="success">
                COGS: {fmt(proCost, 3)}/usuario·mes · Margen bruto: {plans[2].margin}.
                ElevenLabs = {fmt(elPro, 3)} ({Math.round(elPro / proCost * 100)}% del COGS).
              </Callout>
            </Stack>
          </CardBody>
        </Card>
      </Grid>

      <Divider />

      {/* ── COMPARATIVA MODELO ── */}
      <Stack gap={10}>
        <H2>¿GPT-4o para Pro vale la pena?</H2>
        <Text tone="secondary" size="small">
          GPT-4o cuesta ~16× más que gpt-4o-mini. Para la síntesis final (1 llamada/chat) el impacto es mínimo.
          Para las 3 posturas iniciales, el costo sube notablemente.
        </Text>
        <Table
          headers={["Escenario Pro", "LLM / usuario·mes", "COGS total", "Margen a $24/mes"]}
          rows={[
            [
              "Solo GPT-4o-mini",
              fmt(llmPro, 3),
              fmt(proCost, 3),
              plans[2].margin,
            ],
            [
              "Síntesis con GPT-4o (1 llamada/chat)",
              fmt(llmPro + 20 * (costPerTurn(1_500, 200, "mini") * 16 - costPerTurn(1_500, 200, "mini")), 3),
              fmt(proCost + 20 * costPerTurn(1_500, 200, "mini") * 15, 3),
              Math.round((1 - (proCost + 20 * costPerTurn(1_500, 200, "mini") * 15) / 24) * 100) + "%",
            ],
            [
              "Todo GPT-4o (posturas + réplica + síntesis)",
              fmt(llmPro * 16, 3),
              fmt(proCost + llmPro * 15, 3),
              Math.round((1 - (proCost + llmPro * 15) / 24) * 100) + "%",
            ],
          ]}
          rowTone={["success", "warning", "danger"]}
        />
        <Callout tone="warning">
          Recomendación: mantener GPT-4o-mini para posturas y réplica. Usar GPT-4o solo en síntesis
          para Pro (1 llamada/chat = impacto mínimo en COGS, mejora perceptible en calidad del cierre).
        </Callout>
      </Stack>

      <Divider />

      {/* ── NOTAS FINALES ── */}
      <Stack gap={10}>
        <H2>Supuestos y variables críticas</H2>
        <Grid columns={2} gap={12}>
          <Stack gap={6}>
            <H3>Lo que puede encarecer el costo</H3>
            <Table
              headers={["Variable", "Impacto"]}
              rows={[
                ["Usuarios Free que generan muchos chats nuevos", "Alto"],
                ["Uso masivo de voz en Plus/Pro", "Alto"],
                ["Chats con historial largo (>15 mensajes)", "Medio"],
                ["Síntesis larga / reintentos", "Bajo"],
                ["Supabase más allá del plan Free", "Medio (desde 100k MAU)"],
              ]}
              rowTone={["danger", "danger", "warning", undefined, "warning"]}
            />
          </Stack>
          <Stack gap={6}>
            <H3>Lo que puede abaratar</H3>
            <Table
              headers={["Táctica", "Ahorro estimado"]}
              rows={[
                ["Caché de system prompts (OpenAI Prompt Caching)", "~50% en input tokens"],
                ["Limitar historial en contexto a últimos N turnos", "20–40% en input"],
                ["Voz solo en Plus+ (sin fallback ElevenLabs en Free)", "Elimina mayor COGS variable"],
                ["Rate-limiting conservador en Free", "Protege contra abuso"],
                ["Gemini para Free (ya en código)", "~33% vs GPT-4o-mini"],
              ]}
              rowTone={["success", "success", "success", "success", "success"]}
            />
          </Stack>
        </Grid>
      </Stack>

      <Text tone="secondary" size="small" style={{ marginTop: 8 }}>
        Cálculos basados en: gpt-4o-mini $0.15/1M input · $0.60/1M output · Gemini 2.0 Flash $0.10/1M input · $0.40/1M output ·
        ElevenLabs eleven_v3 ~$0.0002/char · Supabase Free (hasta ~50k MAU) ·
        Tipo de cambio $17.50 MXN/USD · Mayo 2026
      </Text>
    </Stack>
  );
}
