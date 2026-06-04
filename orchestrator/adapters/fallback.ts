import "server-only";
import {
  LlmError,
  type Llm,
  type LlmCompletionRequest,
  type LlmCompletionResult,
} from "@/orchestrator/llm";

function shouldFallback(err: unknown): boolean {
  return (
    err instanceof LlmError &&
    (err.code === "auth" ||
      err.code === "quota" ||
      err.code === "network" ||
      err.code === "unknown")
  );
}

function isGeminiRequestModel(model: string | undefined): boolean {
  return model === "gemini-flash" || model?.startsWith("gemini-") === true;
}

function fallbackRequest(req: LlmCompletionRequest): LlmCompletionRequest {
  if (!isGeminiRequestModel(req.model)) return req;
  const { model: _model, ...rest } = req;
  return rest;
}

export class FallbackLlm implements Llm {
  constructor(
    private readonly primary: Llm,
    private readonly fallback: Llm,
  ) {}

  async complete(req: LlmCompletionRequest): Promise<LlmCompletionResult> {
    try {
      return await this.primary.complete(req);
    } catch (err) {
      if (!shouldFallback(err)) throw err;
      return this.fallback.complete(fallbackRequest(req));
    }
  }

  async *stream(req: LlmCompletionRequest): AsyncIterable<string> {
    let yielded = false;
    try {
      for await (const chunk of this.primary.stream(req)) {
        yielded = true;
        yield chunk;
      }
      return;
    } catch (err) {
      if (yielded || !shouldFallback(err)) throw err;
    }

    yield* this.fallback.stream(fallbackRequest(req));
  }
}
