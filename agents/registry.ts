import { MARCO_V1 } from "./marco.v1";
import { ELENA_V1 } from "./elena.v1";
import { RAFAEL_V1 } from "./rafael.v1";
import type { AgentId } from "@/lib/agents/ids";

export const AGENT_REGISTRY = {
  marco: MARCO_V1,
  elena: ELENA_V1,
  rafael: RAFAEL_V1,
} as const;

export type AgentSpec = (typeof AGENT_REGISTRY)[AgentId];

export function getAgent(id: AgentId): AgentSpec {
  return AGENT_REGISTRY[id];
}
