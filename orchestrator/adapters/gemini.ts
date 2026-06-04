import "server-only";
import {
  GoogleGenerativeAI,
  GoogleGenerativeAIAbortError,
  GoogleGenerativeAIFetchError,
  GoogleGenerativeAIResponseError,
  type Content,
} from "@google/generative-ai";
import { getGeminiApiKeys } from "@/lib/env";
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

const GEMINI_MODEL_ALIASES = new Set(["gemini-flash"]);

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
    } else if (status === 408 || status === 429) {
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

function unique(values: ReadonlyArray<string>): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

function isGeminiModelId(model: string): boolean {
  return model.startsWith("gemini-") && !GEMINI_MODEL_ALIASES.has(model);
}

function isRetryableAttemptError(err: LlmError): boolean {
  return (
    err.code === "auth" ||
    err.code === "quota" ||
    err.code === "network" ||
    err.code === "unknown"
  );
}

function noModelAvailableError(errors: ReadonlyArray<LlmError>): LlmError {
  if (errors.length === 0) {
    return new LlmError("unknown", "Gemini no devolvio ningun intento.");
  }

  const counts = errors.reduce<Record<LlmErrorCode, number>>(
    (acc, err) => {
      acc[err.code] += 1;
      return acc;
    },
    { auth: 0, quota: 0, blocked: 0, network: 0, aborted: 0, unknown: 0 },
  );
  const code: LlmErrorCode =
    counts.auth === errors.length
      ? "auth"
      : counts.quota > 0
        ? "quota"
        : counts.network > 0
          ? "network"
          : "unknown";
  const summary = (Object.entries(counts) as Array<[LlmErrorCode, number]>)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => `${key}:${count}`)
    .join(", ");
  const last = errors[errors.length - 1];
  return new LlmError(
    code,
    `Gemini no tiene ningun par clave/modelo disponible (${summary}).`,
    { status: last?.status, cause: last ?? errors },
  );
}

interface GeminiClient {
  genAI: GoogleGenerativeAI;
}

export class GeminiLlm implements Llm {
  private readonly clients: GeminiClient[];
  private readonly modelIds: string[];
  private keyCursor = 0;

  constructor(opts?: {
    apiKey?: string;
    apiKeys?: string[];
    model?: string;
    models?: string[];
  }) {
    const apiKeys = unique(
      opts?.apiKeys ?? (opts?.apiKey ? [opts.apiKey] : getGeminiApiKeys()),
    );
    if (apiKeys.length === 0) {
      throw new LlmError(
        "auth",
        "Falta GEMINI_API_KEYS o GEMINI_API_KEY. Anadela a .env.local.",
      );
    }

    this.clients = apiKeys.map((apiKey) => ({
      genAI: new GoogleGenerativeAI(apiKey),
    }));
    this.modelIds = unique(
      opts?.models ??
        (opts?.model ? [opts.model] : parseModelList(process.env.GEMINI_MODELS)),
    );
    if (this.modelIds.length === 0) {
      this.modelIds = [...DEFAULT_GEMINI_MODELS];
    }
  }

  async complete(req: LlmCompletionRequest): Promise<LlmCompletionResult> {
    const modelIds = this.resolveModelIds(req.model);
    const errors: LlmError[] = [];

    for (const client of this.rotatedClients()) {
      for (const modelId of modelIds) {
        try {
          const model = client.genAI.getGenerativeModel({
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
          if (!isRetryableAttemptError(llmError)) throw llmError;
          errors.push(llmError);
          if (llmError.code === "auth") break;
        }
      }
    }
    throw noModelAvailableError(errors);
  }

  async *stream(req: LlmCompletionRequest): AsyncIterable<string> {
    const modelIds = this.resolveModelIds(req.model);
    const errors: LlmError[] = [];

    for (const client of this.rotatedClients()) {
      for (const modelId of modelIds) {
        let streamIter: AsyncIterable<{ text: () => string }>;
        let yielded = false;

        try {
          const model = client.genAI.getGenerativeModel({
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
          if (!isRetryableAttemptError(llmError)) throw llmError;
          errors.push(llmError);
          if (llmError.code === "auth") break;
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
          if (yielded || !isRetryableAttemptError(llmError)) throw llmError;
          errors.push(llmError);
          if (llmError.code === "auth") break;
        }
      }
    }
    throw noModelAvailableError(errors);
  }

  private resolveModelIds(requested: string | undefined): string[] {
    if (!requested || GEMINI_MODEL_ALIASES.has(requested)) {
      return this.modelIds;
    }
    if (isGeminiModelId(requested)) {
      return [requested];
    }
    return this.modelIds;
  }

  private rotatedClients(): GeminiClient[] {
    if (this.clients.length <= 1) return this.clients;
    const start = this.keyCursor % this.clients.length;
    this.keyCursor = (this.keyCursor + 1) % this.clients.length;
    return [...this.clients.slice(start), ...this.clients.slice(0, start)];
  }
}
