import { renderUserContextBlock, type UserContext } from "@/lib/survey/survey.v1";
import { REPLICA_INSTRUCTION } from "@/agents/shared";
import { getAgent } from "@/agents/registry";
import type { AgentId } from "@/lib/agents/ids";
import { AGENT_LABELS } from "@/lib/agents/ids";

interface InitialPromptArgs {
  agent: AgentId;
  userContext: UserContext;
}

interface ReplicaPromptArgs extends InitialPromptArgs {
  /** Agente al que se responde (doc 04: solo se incluye su postura, no la de los tres). */
  respondingTo: AgentId;
  otherAgentPosture: string;
}

/**
 * Construye el system prompt completo para la postura inicial (fase 1).
 * Capas 1–3 + 5 vienen del agente; capa 4 (userContext) se inyecta aquí.
 */
export function buildInitialSystemPrompt({
  agent,
  userContext,
}: InitialPromptArgs): string {
  const spec = getAgent(agent);
  return [
    spec.systemPrompt,
    "",
    "[4] Contexto del usuario (no parafrasear, inferir):",
    renderUserContextBlock(userContext),
  ].join("\n");
}

/**
 * Construye el system prompt para la fase de réplica.
 * Capa 6 = postura del agente al que se responde (sólo una, no las tres).
 */
export function buildReplicaSystemPrompt({
  agent,
  userContext,
  respondingTo,
  otherAgentPosture,
}: ReplicaPromptArgs): string {
  const spec = getAgent(agent);
  return [
    spec.systemPrompt,
    "",
    "[4] Contexto del usuario:",
    renderUserContextBlock(userContext),
    "",
    `[6] Postura del agente ${AGENT_LABELS[respondingTo]} a la que respondes:`,
    "<other_agent_posture>",
    otherAgentPosture.trim(),
    "</other_agent_posture>",
    "",
    REPLICA_INSTRUCTION,
  ].join("\n");
}
