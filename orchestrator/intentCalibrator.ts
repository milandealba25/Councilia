import type { UserContext } from "@/lib/survey/survey.v1";
import { AGENT_IDS, type AgentId } from "@/lib/agents/ids";

/**
 * K1 · IntentCalibrator.
 *
 * Lee `userContext` y emite pesos relativos por agente + lista de agentes atenuados.
 * Implementado como tabla declarativa: doc 04, sección 8.
 *
 * "Atenuado" = no interviene en fase 1, solo aparece en la síntesis final.
 */

export interface CalibrationResult {
  weights: Record<AgentId, number>;
  attenuated: ReadonlyArray<AgentId>;
  notes: ReadonlyArray<string>;
}

interface AttenuationRule {
  id: string;
  match: (ctx: UserContext) => boolean;
  attenuate: AgentId;
  note: string;
}

const ATTENUATION_RULES: ReadonlyArray<AttenuationRule> = [
  {
    id: "marco-emocional-pura",
    match: (ctx) =>
      ctx.decisionType === "relacion" && ctx.fearedLoss === "arrepentirme",
    attenuate: "marco",
    note: "Decisión emocional pura: Marco se atenúa, fase 1 corre con Elena y Rafael.",
  },
  {
    id: "rafael-finanzas-decidir",
    match: (ctx) =>
      ctx.decisionType === "dinero" &&
      ctx.needFromCouncil === "decidir_entre_opciones",
    attenuate: "rafael",
    note: "Finanzas + decidir entre opciones: Rafael se atenúa para no diluir el análisis numérico.",
  },
  {
    id: "elena-urgente-estructurar",
    match: (ctx) =>
      ctx.urgency === "hoy" && ctx.needFromCouncil === "estructurar",
    attenuate: "elena",
    note: "Urgencia alta + necesidad de estructurar: Elena se atenúa para no bloquear con escenarios.",
  },
];

const BASE_WEIGHTS: Record<AgentId, number> = {
  marco: 1,
  elena: 1,
  rafael: 1,
};

/**
 * Heurísticas de peso relativo. No definen quién habla (eso lo hace el atenuador):
 * son señales para que Synthesis pondere las posturas en empate.
 */
function applyWeightHeuristics(
  weights: Record<AgentId, number>,
  ctx: UserContext,
): Record<AgentId, number> {
  const w = { ...weights };

  if (ctx.decisionType === "negocio" || ctx.decisionType === "carrera") {
    w.marco += 0.5;
  }
  if (ctx.decisionType === "relacion" || ctx.decisionType === "vida") {
    w.rafael += 0.5;
  }
  if (ctx.needFromCouncil === "confrontar") {
    w.rafael += 0.5;
  }
  if (
    ctx.fearedLoss === "perder_dinero" ||
    ctx.fearedLoss === "perder_tiempo"
  ) {
    w.elena += 0.5;
  }
  if (ctx.fearedLoss === "arrepentirme") {
    w.rafael += 0.25;
  }

  return w;
}

export function calibrate(ctx: UserContext): CalibrationResult {
  const attenuated: AgentId[] = [];
  const notes: string[] = [];

  for (const rule of ATTENUATION_RULES) {
    if (rule.match(ctx) && !attenuated.includes(rule.attenuate)) {
      attenuated.push(rule.attenuate);
      notes.push(rule.note);
    }
  }

  // Safety net: nunca atenuar a los 3 agentes — siempre quedan ≥1 en fase 1.
  const active = AGENT_IDS.filter((id) => !attenuated.includes(id));
  if (active.length === 0) {
    return {
      weights: { ...BASE_WEIGHTS },
      attenuated: [],
      notes: [
        "Las reglas atenuarían a los 3 agentes; se descarta atenuación para preservar la fase 1.",
      ],
    };
  }

  const weights = applyWeightHeuristics(BASE_WEIGHTS, ctx);

  return { weights, attenuated, notes };
}

export function activeAgents(ctx: UserContext): ReadonlyArray<AgentId> {
  const { attenuated } = calibrate(ctx);
  return AGENT_IDS.filter((id) => !attenuated.includes(id));
}
