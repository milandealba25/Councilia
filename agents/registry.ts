import { MARCO_V2 } from "./marco.v1";
import { ELENA_V3 } from "./elena.v1";
import { RAFAEL_V3 } from "./rafael.v1";
import type { AgentId } from "@/lib/agents/ids";

export const AGENT_REGISTRY = {
  marco: MARCO_V2,
  elena: ELENA_V3,
  rafael: RAFAEL_V3,
} as const;

export type AgentSpec = (typeof AGENT_REGISTRY)[AgentId];

export function getAgent(id: AgentId): AgentSpec {
  return AGENT_REGISTRY[id];
}
