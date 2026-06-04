import "server-only";
import { AgentRunner } from "@/orchestrator/agentRunner";
import { DebateRouter } from "@/orchestrator/debateRouter";
import { FallbackLlm } from "@/orchestrator/adapters/fallback";
import { GeminiLlm } from "@/orchestrator/adapters/gemini";
import { OpenAILlm } from "@/orchestrator/adapters/openai";
import type { Llm } from "@/orchestrator/llm";
import { env, getGeminiApiKeys } from "@/lib/env";

/**
 * Singletons del orquestador por request scope.
 * En tests inyectamos un Llm fake; aquí construimos el de producción.
 */
let cachedLlm: Llm | null = null;

export function getLlm(): Llm {
  if (!cachedLlm) {
    const hasGemini = getGeminiApiKeys().length > 0;
    const hasOpenAI = Boolean(env.OPENAI_API_KEY);

    if (hasGemini && hasOpenAI) {
      cachedLlm = new FallbackLlm(new GeminiLlm(), new OpenAILlm());
    } else if (hasGemini) {
      cachedLlm = new GeminiLlm();
    } else {
      cachedLlm = new OpenAILlm();
    }
  }
  return cachedLlm;
}

export function getAgentRunner(llm: Llm = getLlm()): AgentRunner {
  return new AgentRunner(llm);
}

export function getDebateRouter(llm: Llm = getLlm()): DebateRouter {
  return new DebateRouter(getAgentRunner(llm));
}
