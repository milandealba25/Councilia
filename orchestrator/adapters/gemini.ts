import "server-only";
import {
  GoogleGenerativeAI,
  GoogleGenerativeAIAbortError,
  GoogleGenerativeAIFetchError,
  GoogleGenerativeAIResponseError,
  type Content,
} from "@google/generative-ai";
import { requireGeminiKey } from "@/lib/env";
import {
  LlmError,
  type Llm,
  type LlmCompletionRequest,
  type LlmCompletionResult,
  type LlmErrorCode,
  type LlmMessage,
} from "@/orchestrator/llm";

export const DEFAULT_GEMINI_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-2.5-flash",
  "gemini-3-flash",
] as const;

function toGeminiContents(messages: ReadonlyArray<LlmMessage>): Content[] {
  return messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
}

function buildGenerationConfig(
  req: LlmCompletionRequest,
): Record<string, unknown> {
  const cfg: Record<string, unknown> = {
    maxOutputTokens: req.maxTokens ?? 512,
    temperature: req.temperature ?? 0.7,
  };
  const rawBudget = process.env.GEMINI_THINKING_BUDGET ?? "0";
  const budget = Number.parseInt(rawBudget, 10);
  if (Number.isFinite(budget) && budget >= 0) {
    cfg.thinkingConfig = { thinkingBudget: budget };
  }
  return cfg;
}

function classifyGeminiError(err: unknown): LlmError {
  if (err instanceof LlmError) return err;

  if (err instanceof GoogleGenerativeAIAbortError) {
    return new LlmError("aborted", "Llamada a Gemini cancelada.", {
      cause: err,
    });
  }

  if (err instanceof GoogleGenerativeAIResponseError) {
    return new LlmError(
      "blocked",
      "Gemini bloqueo la respuesta por politicas de seguridad.",
      { cause: err },
    );
  }

  if (err instanceof GoogleGenerativeAIFetchError) {
    const status = err.status;
    const detailReason = err.errorDetails?.find(
      (d) =>
        d["@type"] === "type.googleapis.com/google.rpc.ErrorInfo" &&
        typeof (d as { reason?: unknown }).reason === "string",
    ) as { reason?: string } | undefined;

    let code: LlmErrorCode = "unknown";
    if (
      status === 400 &&
      (detailReason?.reason === "API_KEY_INVALID" ||
        /api key/i.test(err.message))
    ) {
      code = "auth";
    } else if (status === 401 || status === 403) {
      code = "auth";
    } else if (status === 429) {
      code = "quota";
    } else if (status === 404 || (status && status >= 500)) {
      code = "network";
    }
    return new LlmError(code, err.message, { status, cause: err });
  }

  if (err instanceof Error && err.name === "AbortError") {
    return new LlmError("aborted", err.message, { cause: err });
  }

  if (err instanceof Error) {
    return new LlmError("unknown", err.message, { cause: err });
  }

  return new LlmError("unknown", String(err));
}

function parseModelList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
}

function isRetryableModelError(err: LlmError): boolean {
  return (
    err.code === "quota" || err.code === "network" || err.code === "unknown"
  );
}

function noModelAvailableError(errors: ReadonlyArray<LlmError>): LlmError {
  const last = errors[errors.length - 1];
  return new LlmError(
    "quota",
    "Ningun modelo Gemini disponible en este momento.",
    { status: last?.status, cause: last ?? errors },
  );
}

export class GeminiLlm implements Llm {
  private readonly genAI: GoogleGenerativeAI;
  private readonly modelIds: string[];

  constructor(opts?: { apiKey?: string; model?: string; models?: string[] }) {
    const apiKey = opts?.apiKey ?? requireGeminiKey();
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelIds =
      opts?.models?.filter(Boolean) ??
      (opts?.model ? [opts.model] : parseModelList(process.env.GEMINI_MODELS));
    if (this.modelIds.length === 0) {
      this.modelIds = [...DEFAULT_GEMINI_MODELS];
    }
  }

  async complete(req: LlmCompletionRequest): Promise<LlmCompletionResult> {
    const errors: LlmError[] = [];
    for (const modelId of this.modelIds) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: modelId,
          systemInstruction: req.systemPrompt,
        });
        const result = await model.generateContent(
          {
            contents: toGeminiContents(req.messages),
            generationConfig:
              buildGenerationConfig(req) as unknown as Record<string, never>,
          },
          { signal: req.signal },
        );
        const response = result.response;
        const meta = response.usageMetadata;
        return {
          text: response.text(),
          model: modelId,
          usage: {
            inputTokens: meta?.promptTokenCount,
            outputTokens: meta?.candidatesTokenCount,
          },
        };
      } catch (err) {
        const llmError = classifyGeminiError(err);
        if (!isRetryableModelError(llmError)) throw llmError;
        errors.push(llmError);
      }
    }
    throw noModelAvailableError(errors);
  }

  async *stream(req: LlmCompletionRequest): AsyncIterable<string> {
    const errors: LlmError[] = [];
    for (const modelId of this.modelIds) {
      let streamIter: AsyncIterable<{ text: () => string }>;
      let yielded = false;

      try {
        const model = this.genAI.getGenerativeModel({
          model: modelId,
          systemInstruction: req.systemPrompt,
        });
        const result = await model.generateContentStream(
          {
            contents: toGeminiContents(req.messages),
            generationConfig:
              buildGenerationConfig(req) as unknown as Record<string, never>,
          },
          { signal: req.signal },
        );
        streamIter = result.stream;
      } catch (err) {
        const llmError = classifyGeminiError(err);
        if (!isRetryableModelError(llmError)) throw llmError;
        errors.push(llmError);
        continue;
      }

      try {
        for await (const chunk of streamIter) {
          const piece = chunk.text();
          if (piece) {
            yielded = true;
            yield piece;
          }
        }
        return;
      } catch (err) {
        const llmError = classifyGeminiError(err);
        if (yielded || !isRetryableModelError(llmError)) throw llmError;
        errors.push(llmError);
      }
    }
    throw noModelAvailableError(errors);
  }
}
