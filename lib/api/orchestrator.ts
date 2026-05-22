import "server-only";
import { AgentRunner } from "@/orchestrator/agentRunner";
import { DebateRouter } from "@/orchestrator/debateRouter";
import { OpenAILlm } from "@/orchestrator/adapters/openai";
import type { Llm } from "@/orchestrator/llm";

/**
 * Singletons del orquestador por request scope.
 * En tests inyectamos un Llm fake; aquí construimos el de producción.
 */
let cachedLlm: Llm | null = null;

export function getLlm(): Llm {
  if (!cachedLlm) cachedLlm = new OpenAILlm();
  return cachedLlm;
}

export function getAgentRunner(llm: Llm = getLlm()): AgentRunner {
  return new AgentRunner(llm);
}

export function getDebateRouter(llm: Llm = getLlm()): DebateRouter {
  return new DebateRouter(getAgentRunner(llm));
}
