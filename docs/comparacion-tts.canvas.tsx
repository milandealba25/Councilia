import {
  BarChart,
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

// ─── TARIFAS POR CARÁCTER (USD) ───────────────────────────────────────────────
const RATE = {
  elevenlabs: 0.0002,      // $200 / 1M chars
  openai:     0.000015,    // $15  / 1M chars  (tts-1)
  google:     0.000016,    // $16  / 1M chars  (Neural2)
  azure:      0.000016,    // $16  / 1M chars  (Neural)
};

// ─── CHARS POR USUARIO/MES ───────────────────────────────────────────────────
// Plus: 8 chats × 8 msgs × 12% voz × 1.5 agentes × 350 chars
const CHARS_PLUS = 8 * 8 * 0.12 * 1.5 * 350;   // 4 032 chars
// Pro:  20 chats × 12 msgs × 18% voz × 1.5 agentes × 350 chars
const CHARS_PRO  = 20 * 12 * 0.18 * 1.5 * 350; // 22 680 chars

// ─── COSTO DE VOZ POR USUARIO/MES (USD) ──────────────────────────────────────
function voiceCost(chars: number, rate: number) { return chars * rate; }

const voice = {
  plus: {
    el:     voiceCost(CHARS_PLUS, RATE.elevenlabs),
    openai: voiceCost(CHARS_PLUS, RATE.openai),
    google: voiceCost(CHARS_PLUS, RATE.google),
    azure:  voiceCost(CHARS_PLUS, RATE.azure),
  },
  pro: {
    el:     voiceCost(CHARS_PRO,  RATE.elevenlabs),
    openai: voiceCost(CHARS_PRO,  RATE.openai),
    google: voiceCost(CHARS_PRO,  RATE.google),
    azure:  voiceCost(CHARS_PRO,  RATE.azure),
  },
};

// ─── COGS TOTAL POR USUARIO (USD) ────────────────────────────────────────────
const LLM_PLUS = 0.0493, INFRA_PLUS = 0.08;
const LLM_PRO  = 0.1814, INFRA_PRO  = 0.16;

const cogs = {
  plus: {
    el:     LLM_PLUS + voice.plus.el     + INFRA_PLUS,
    openai: LLM_PLUS + voice.plus.openai + INFRA_PLUS,
    google: LLM_PLUS + voice.plus.google + INFRA_PLUS,
    azure:  LLM_PLUS + voice.plus.azure  + INFRA_PLUS,
  },
  pro: {
    el:     LLM_PRO + voice.pro.el     + INFRA_PRO,
    openai: LLM_PRO + voice.pro.openai + INFRA_PRO,
    google: LLM_PRO + voice.pro.google + INFRA_PRO,
    azure:  LLM_PRO + voice.pro.azure  + INFRA_PRO,
  },
};

// ─── MÁRGENES ─────────────────────────────────────────────────────────────────
const PLUS_USD = 85 / 17.5;   // $4.857
const PRO_USD  = 210 / 17.5;  // $12.00

function margin(price: number, cost: number) {
  return Math.round((1 - cost / price) * 100);
}

// ─── PROYECCIONES A ESCALA ────────────────────────────────────────────────────
// Mix: 70% Free, 22% Plus, 8% Pro
const MIX = { plus: 0.22, pro: 0.08 };

function voiceAtScale(n: number, provider: keyof typeof voice.plus) {
  return n * MIX.plus * voice.plus[provider] + n * MIX.pro * voice.pro[provider];
}

const SCALES = [1_000, 5_000, 10_000];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function usd(n: number, d = 2) { return "$" + n.toFixed(d); }
function pct(n: number) { return n + "%"; }

export default function ComparacionTTS() {
  const t = useHostTheme().tokens;

  const providers = ["ElevenLabs", "OpenAI TTS", "Google TTS", "Azure TTS"];
  const providerKeys = ["el", "openai", "google", "azure"] as const;
  const tones = { el: "danger", openai: "success", google: "success", azure: "success" } as const;

  return (
    <Stack gap={28}>

      {/* ── TÍTULO ── */}
      <Stack gap={4}>
        <H1>Comparación de proveedores TTS · COUNCILia</H1>
        <Text tone="secondary" size="small">
          ElevenLabs vs OpenAI TTS (tts-1) vs Google Cloud TTS Neural2 vs Azure Cognitive TTS Neural ·
          Mix asumido: 70% Free · 22% Plus ($85 MXN) · 8% Pro ($210 MXN) · $17.50 MXN/USD · Mayo 2026
        </Text>
      </Stack>

      {/* ── TARIFAS RÁPIDAS ── */}
      <Grid columns={4} gap={12}>
        <Stat value="$200/1M" label="ElevenLabs · por carácter" tone="danger" />
        <Stat value="$15/1M"  label="OpenAI TTS · por carácter" tone="success" />
        <Stat value="$16/1M"  label="Google TTS Neural · por carácter" tone="success" />
        <Stat value="$16/1M"  label="Azure TTS Neural · por carácter" tone="success" />
      </Grid>

      <Callout tone="info">
        OpenAI TTS es 13.3× más barato que ElevenLabs. Google y Azure son 12.5× más baratos.
        La diferencia entre las tres alternativas es mínima (&lt;7%) — la elección depende de calidad de voz en español y facilidad de integración.
      </Callout>

      <Divider />

      {/* ── COSTO DE VOZ POR USUARIO ── */}
      <Stack gap={10}>
        <H2>Costo de voz por usuario / mes</H2>
        <Text tone="secondary" size="small">
          Plus: 4,032 chars/mes · Pro: 22,680 chars/mes (según uso de voz estimado en código)
        </Text>
        <Table
          headers={["Proveedor", "Tarifa / 1M chars", "Voz Plus / usuario·mes", "Voz Pro / usuario·mes", "Factor de ahorro vs EL"]}
          rows={[
            ["ElevenLabs (actual)", "$200", usd(voice.plus.el, 4), usd(voice.pro.el, 4), "1×"],
            ["OpenAI TTS (tts-1)",  "$15",  usd(voice.plus.openai, 4), usd(voice.pro.openai, 4), "13.3×"],
            ["Google TTS Neural2",  "$16",  usd(voice.plus.google, 4), usd(voice.pro.google, 4), "12.5×"],
            ["Azure TTS Neural",    "$16",  usd(voice.plus.azure, 4),  usd(voice.pro.azure, 4),  "12.5×"],
          ]}
          rowTone={["danger", "success", "success", "success"]}
        />
      </Stack>

      <Divider />

      {/* ── COGS TOTAL Y MÁRGENES ── */}
      <Stack gap={10}>
        <H2>COGS total y márgenes por plan</H2>
        <Text tone="secondary" size="small">
          COGS = LLM + Voz + Supabase/Infra · Precio: Plus $4.857 USD · Pro $12.00 USD
        </Text>

        <Grid columns={2} gap={16}>
          {/* PLUS */}
          <Stack gap={8}>
            <H3>Plan Plus — $85 MXN/mes (~$4.857 USD)</H3>
            <Table
              headers={["Proveedor", "COGS/usuario", "Margen bruto", "vs ElevenLabs"]}
              rows={[
                ["ElevenLabs",   usd(cogs.plus.el, 3),     pct(margin(PLUS_USD, cogs.plus.el)),     "—"],
                ["OpenAI TTS",   usd(cogs.plus.openai, 3), pct(margin(PLUS_USD, cogs.plus.openai)), "+" + (margin(PLUS_USD, cogs.plus.openai) - margin(PLUS_USD, cogs.plus.el)) + " pp"],
                ["Google TTS",   usd(cogs.plus.google, 3), pct(margin(PLUS_USD, cogs.plus.google)), "+" + (margin(PLUS_USD, cogs.plus.google) - margin(PLUS_USD, cogs.plus.el)) + " pp"],
                ["Azure TTS",    usd(cogs.plus.azure, 3),  pct(margin(PLUS_USD, cogs.plus.azure)),  "+" + (margin(PLUS_USD, cogs.plus.azure) - margin(PLUS_USD, cogs.plus.el)) + " pp"],
              ]}
              rowTone={["danger", "success", "success", "success"]}
            />
          </Stack>

          {/* PRO */}
          <Stack gap={8}>
            <H3>Plan Pro — $210 MXN/mes (~$12.00 USD)</H3>
            <Table
              headers={["Proveedor", "COGS/usuario", "Margen bruto", "vs ElevenLabs"]}
              rows={[
                ["ElevenLabs",   usd(cogs.pro.el, 3),     pct(margin(PRO_USD, cogs.pro.el)),     "—"],
                ["OpenAI TTS",   usd(cogs.pro.openai, 3), pct(margin(PRO_USD, cogs.pro.openai)), "+" + (margin(PRO_USD, cogs.pro.openai) - margin(PRO_USD, cogs.pro.el)) + " pp"],
                ["Google TTS",   usd(cogs.pro.google, 3), pct(margin(PRO_USD, cogs.pro.google)), "+" + (margin(PRO_USD, cogs.pro.google) - margin(PRO_USD, cogs.pro.el)) + " pp"],
                ["Azure TTS",    usd(cogs.pro.azure, 3),  pct(margin(PRO_USD, cogs.pro.azure)),  "+" + (margin(PRO_USD, cogs.pro.azure) - margin(PRO_USD, cogs.pro.el)) + " pp"],
              ]}
              rowTone={["danger", "success", "success", "success"]}
            />
          </Stack>
        </Grid>
      </Stack>

      <Divider />

      {/* ── COSTO DE VOZ A ESCALA ── */}
      <Stack gap={10}>
        <H2>Costo total de voz a escala (USD / mes)</H2>
        <Text tone="secondary" size="small">
          Costo agregado del componente de voz para toda la base de usuarios activos con voz (Plus + Pro)
        </Text>

        <BarChart
          categories={["1,000 usuarios", "5,000 usuarios", "10,000 usuarios"]}
          series={[
            {
              name: "ElevenLabs",
              data: SCALES.map(n => Math.round(voiceAtScale(n, "el"))),
              tone: "danger",
            },
            {
              name: "OpenAI TTS",
              data: SCALES.map(n => Math.round(voiceAtScale(n, "openai"))),
              tone: "success",
            },
            {
              name: "Google TTS",
              data: SCALES.map(n => Math.round(voiceAtScale(n, "google"))),
            },
            {
              name: "Azure TTS",
              data: SCALES.map(n => Math.round(voiceAtScale(n, "azure"))),
              tone: "info",
            },
          ]}
          height={240}
          valueSuffix=" USD"
        />
        <Text tone="secondary" size="small">
          Fuente: tarifas públicas Mayo 2026 · Mix 70% Free / 22% Plus / 8% Pro
        </Text>
      </Stack>

      <Divider />

      {/* ── TABLA DE AHORRO ── */}
      <Stack gap={10}>
        <H2>Ahorro mensual vs ElevenLabs (USD / mes)</H2>

        <Table
          headers={["Escenario", "ElevenLabs (actual)", "OpenAI TTS", "Google TTS", "Azure TTS"]}
          rows={SCALES.map(n => {
            const el = Math.round(voiceAtScale(n, "el"));
            const oa = Math.round(voiceAtScale(n, "openai"));
            const go = Math.round(voiceAtScale(n, "google"));
            const az = Math.round(voiceAtScale(n, "azure"));
            return [
              n.toLocaleString("es-MX") + " usuarios",
              "$" + el.toLocaleString("en-US"),
              "$" + oa + "  (ahorra $" + (el - oa).toLocaleString("en-US") + ")",
              "$" + go + "  (ahorra $" + (el - go).toLocaleString("en-US") + ")",
              "$" + az + "  (ahorra $" + (el - az).toLocaleString("en-US") + ")",
            ];
          })}
          rowTone={[undefined, undefined, undefined]}
        />

        {/* Ahorro anual destacado */}
        <H3>Ahorro anual proyectado a 10,000 usuarios</H3>
        <Grid columns={3} gap={12}>
          <Stat
            value={"$" + Math.round((voiceAtScale(10_000, "el") - voiceAtScale(10_000, "openai")) * 12).toLocaleString("en-US") + " USD"}
            label="Ahorro anual · OpenAI TTS"
            tone="success"
          />
          <Stat
            value={"$" + Math.round((voiceAtScale(10_000, "el") - voiceAtScale(10_000, "google")) * 12).toLocaleString("en-US") + " USD"}
            label="Ahorro anual · Google TTS"
            tone="success"
          />
          <Stat
            value={"$" + Math.round((voiceAtScale(10_000, "el") - voiceAtScale(10_000, "azure")) * 12).toLocaleString("en-US") + " USD"}
            label="Ahorro anual · Azure TTS"
            tone="success"
          />
        </Grid>
      </Stack>

      <Divider />

      {/* ── COMPARATIVA CUALITATIVA ── */}
      <Stack gap={10}>
        <H2>Comparativa cualitativa</H2>
        <Table
          headers={["Criterio", "ElevenLabs", "OpenAI TTS", "Google TTS Neural2", "Azure TTS Neural"]}
          rows={[
            ["Calidad voz ES",          "⬛⬛⬛⬛⬛ Excelente",  "⬛⬛⬛⬛ Muy buena",     "⬛⬛⬛⬛ Muy buena",     "⬛⬛⬛⬛ Muy buena"],
            ["Naturalidad / emoción",   "Muy alta",             "Alta",                  "Alta",                  "Alta"],
            ["Voces en español (MX)",   "Muchas",               "6 voces globales",      "Muchas + regionales",   "Muchas + regionales"],
            ["Integración (ya en uso)", "Sí",                   "Sí (misma API key)",    "Nueva cuenta GCP",      "Nueva cuenta Azure"],
            ["Latencia generación",     "Media",                "Baja",                  "Baja",                  "Baja"],
            ["Costo / 1M chars",        "$200",                 "$15",                   "$16",                   "$16"],
            ["Clonar voz personalizada","Sí (diferenciador)",   "No",                    "No",                    "No"],
          ]}
        />
      </Stack>

      <Callout tone="success">
        Recomendación: migrar a OpenAI TTS como primer paso. Es la opción más rápida de implementar
        (misma librería, misma API key que GPT-4o-mini), ahorra ~$59,900 USD/año a 10k usuarios y
        mantiene calidad de voz muy buena en español. Si en el futuro se requieren voces regionales
        más naturales o precios aún más bajos, Google TTS Neural2 es la mejor segunda opción.
      </Callout>

      <Text tone="secondary" size="small">
        Tarifas: ElevenLabs eleven_v3 Creator+ ~$0.0002/char · OpenAI tts-1 $15/1M chars ·
        Google Cloud TTS Neural2 $16/1M chars · Azure Cognitive Neural $16/1M chars ·
        $17.50 MXN/USD · Mayo 2026
      </Text>
    </Stack>
  );
}
