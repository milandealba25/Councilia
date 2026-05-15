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

function toGeminiContents(messages: ReadonlyArray<LlmMessage>): Content[] {
  return messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
}

/**
 * Clasifica un error nativo del SDK de Google en el `LlmErrorCode` que
 * usa el orquestador. Aísla al resto del sistema del shape del SDK.
 */
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
      "Gemini bloqueó la respuesta por políticas de seguridad.",
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
    } else if (status && status >= 500) {
      code = "network";
    }
    return new LlmError(code, err.message, { status, cause: err });
  }

  // AbortController desde fuera del SDK (route handler abortó).
  if (err instanceof Error && err.name === "AbortError") {
    return new LlmError("aborted", err.message, { cause: err });
  }

  if (err instanceof Error) {
    return new LlmError("unknown", err.message, { cause: err });
  }

  return new LlmError("unknown", String(err));
}

/**
 * Adapter de Google Gemini para la interfaz Llm (K2).
 *
 * Reglas:
 *   - Solo este archivo conoce el SDK de `@google/generative-ai`.
 *   - Todos los errores se normalizan a `LlmError` con `code` semántico
 *     para que el orquestador y la UI no tengan que parsear texto.
 */
export class GeminiLlm implements Llm {
  private readonly genAI: GoogleGenerativeAI;
  private readonly modelId: string;

  constructor(opts?: { apiKey?: string; model?: string }) {
    const apiKey = opts?.apiKey ?? requireGeminiKey();
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelId =
      opts?.model ?? process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
  }

  async complete(req: LlmCompletionRequest): Promise<LlmCompletionResult> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.modelId,
        systemInstruction: req.systemPrompt,
      });
      const result = await model.generateContent(
        {
          contents: toGeminiContents(req.messages),
          generationConfig: {
            maxOutputTokens: req.maxTokens ?? 512,
            temperature: req.temperature ?? 0.7,
          },
        },
        { signal: req.signal },
      );
      const response = result.response;
      const text = response.text();
      const meta = response.usageMetadata;
      return {
        text,
        model: this.modelId,
        usage: {
          inputTokens: meta?.promptTokenCount,
          outputTokens: meta?.candidatesTokenCount,
        },
      };
    } catch (err) {
      throw classifyGeminiError(err);
    }
  }

  async *stream(req: LlmCompletionRequest): AsyncIterable<string> {
    let streamIter: AsyncIterable<{ text: () => string }>;
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.modelId,
        systemInstruction: req.systemPrompt,
      });
      const result = await model.generateContentStream(
        {
          contents: toGeminiContents(req.messages),
          generationConfig: {
            maxOutputTokens: req.maxTokens ?? 512,
            temperature: req.temperature ?? 0.7,
          },
        },
        { signal: req.signal },
      );
      streamIter = result.stream;
    } catch (err) {
      throw classifyGeminiError(err);
    }

    try {
      for await (const chunk of streamIter) {
        const piece = chunk.text();
        if (piece) yield piece;
      }
    } catch (err) {
      throw classifyGeminiError(err);
    }
  }
}
