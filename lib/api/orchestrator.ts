import "server-only";
import { AgentRunner } from "@/orchestrator/agentRunner";
import { DebateRouter } from "@/orchestrator/debateRouter";
import { GeminiLlm } from "@/orchestrator/adapters/gemini";
import { OpenAILlm } from "@/orchestrator/adapters/openai";
import type { Llm } from "@/orchestrator/llm";
import { env } from "@/lib/env";

/**
 * Singletons del orquestador por request scope.
 * En tests inyectamos un Llm fake; aquí construimos el de producción.
 */
let cachedLlm: Llm | null = null;

export function getLlm(): Llm {
  if (!cachedLlm) {
    cachedLlm = env.GEMINI_API_KEY ? new GeminiLlm() : new OpenAILlm();
  }
  return cachedLlm;
}

export function getAgentRunner(llm: Llm = getLlm()): AgentRunner {
  return new AgentRunner(llm);
}

export function getDebateRouter(llm: Llm = getLlm()): DebateRouter {
  return new DebateRouter(getAgentRunner(llm));
}
