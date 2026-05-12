import type { AgentId } from "@/lib/agents/ids";
import type { UserContext } from "@/lib/survey/survey.v1";
import type { AgentRunner } from "./agentRunner";
import { detectTension, type TensionPair } from "./tensionDetector";

/**
 * K5 · DebateRouter.
 *
 * Une `TensionDetector` y `AgentRunner.runReplica()`:
 *  1. Recibe el mapa de posturas de la fase 1.
 *  2. Pide a `detectTension` el par con mayor contradicción.
 *  3. Elige direccionalidad (`a → b` o `b → a`) priorizando al agente que
 *     usó más marcadores de contraste (i.e. más probable que escale tensión).
 *  4. Devuelve el stream de la réplica, con contexto reducido a UNA postura
 *     (la del agente al que se responde) — no las tres. Doc 05, §1 fase 2.
 *
 * Si no hay tensión suficiente, devuelve `null` y el orquestador salta la fase 2.
 */

export interface Posture {
  agent: AgentId;
  text: string;
}

export interface ReplicaPlan {
  speaker: AgentId;
  respondingTo: AgentId;
  otherAgentPosture: string;
  tensionScore: number;
}

export interface DebateRouterOpts {
  /** Override del umbral del TensionDetector. */
  tensionThreshold?: number;
}

export class DebateRouter {
  constructor(
    private readonly runner: AgentRunner,
    private readonly opts: DebateRouterOpts = {},
  ) {}

  /**
   * Planifica la réplica sin ejecutarla. Útil para que la UI muestre
   * "X responde a Y" antes de empezar a recibir tokens.
   */
  plan(postures: ReadonlyArray<Posture>): ReplicaPlan | null {
    if (postures.length < 2) return null;
    const tension = detectTension(postures, {
      threshold: this.opts.tensionThreshold,
    });
    if (!tension) return null;

    const { speaker, respondingTo } = pickDirection(tension, postures);
    const target = postures.find((p) => p.agent === respondingTo);
    if (!target) return null;

    return {
      speaker,
      respondingTo,
      otherAgentPosture: target.text,
      tensionScore: tension.score,
    };
  }

  /**
   * Plan + ejecución del stream de réplica. Devuelve el plan y el iterable
   * para que el caller pueda enviar primero el evento "plan" por SSE y luego
   * reenviar los tokens.
   */
  startReplica(args: {
    postures: ReadonlyArray<Posture>;
    userContext: UserContext;
    userMessage: string;
    signal?: AbortSignal;
  }): { plan: ReplicaPlan; stream: AsyncIterable<string> } | null {
    const plan = this.plan(args.postures);
    if (!plan) return null;
    const stream = this.runner.runReplica({
      agent: plan.speaker,
      respondingTo: plan.respondingTo,
      otherAgentPosture: plan.otherAgentPosture,
      userContext: args.userContext,
      userMessage: args.userMessage,
      signal: args.signal,
    });
    return { plan, stream };
  }
}

const CONTRAST_MARKERS_DIRECTIONAL = [
  "pero",
  "sin embargo",
  "en cambio",
  "mientras que",
  "no obstante",
  "riesgo",
  "supuesto",
  "no has",
];

function contrastWeight(text: string): number {
  const lower = " " + text.toLowerCase() + " ";
  let hits = 0;
  for (const m of CONTRAST_MARKERS_DIRECTIONAL) {
    if (lower.includes(` ${m} `) || lower.includes(`${m} `)) hits++;
  }
  return hits;
}

/**
 * Elige quién responde a quién dentro del par detectado por el TensionDetector.
 * Heurística: habla el agente con más marcadores de contraste en su postura
 * (probablemente el más confrontador). Empate → orden determinista por AgentId.
 */
function pickDirection(
  tension: TensionPair,
  postures: ReadonlyArray<Posture>,
): { speaker: AgentId; respondingTo: AgentId } {
  const a = postures.find((p) => p.agent === tension.a);
  const b = postures.find((p) => p.agent === tension.b);
  if (!a || !b) return { speaker: tension.a, respondingTo: tension.b };

  const wa = contrastWeight(a.text);
  const wb = contrastWeight(b.text);

  if (wa === wb) {
    return tension.a < tension.b
      ? { speaker: tension.a, respondingTo: tension.b }
      : { speaker: tension.b, respondingTo: tension.a };
  }
  return wa > wb
    ? { speaker: tension.a, respondingTo: tension.b }
    : { speaker: tension.b, respondingTo: tension.a };
}
