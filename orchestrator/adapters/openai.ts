import "server-only";
import OpenAI from "openai";
import {
  LlmError,
  type Llm,
  type LlmCompletionRequest,
  type LlmCompletionResult,
  type LlmErrorCode,
} from "@/orchestrator/llm";

function classifyOpenAIError(err: unknown): LlmError {
  if (err instanceof LlmError) return err;

  if (err instanceof OpenAI.APIError) {
    const status = err.status;
    let code: LlmErrorCode = "unknown";

    if (status === 401 || status === 403) {
      code = "auth";
    } else if (status === 429) {
      code = "quota";
    } else if (status && status >= 500) {
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

export class OpenAILlm implements Llm {
  private readonly client: OpenAI;
  private readonly modelId: string;

  constructor(opts?: { apiKey?: string; model?: string }) {
    const apiKey = opts?.apiKey ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new LlmError(
        "auth",
        "Falta OPENAI_API_KEY. Añádela a .env.local.",
      );
    }
    this.client = new OpenAI({ apiKey });
    this.modelId = opts?.model ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  }

  async complete(req: LlmCompletionRequest): Promise<LlmCompletionResult> {
    const model = req.model ?? this.modelId;
    try {
      const response = await this.client.chat.completions.create(
        {
          model,
          max_tokens: req.maxTokens ?? 512,
          temperature: req.temperature ?? 0.7,
          messages: [
            { role: "system", content: req.systemPrompt },
            ...req.messages.map((m) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            })),
          ],
        },
        { signal: req.signal ?? undefined },
      );

      const text = response.choices[0]?.message?.content ?? "";
      return {
        text,
        model,
        usage: {
          inputTokens: response.usage?.prompt_tokens,
          outputTokens: response.usage?.completion_tokens,
        },
      };
    } catch (err) {
      throw classifyOpenAIError(err);
    }
  }

  async *stream(req: LlmCompletionRequest): AsyncIterable<string> {
    const model = req.model ?? this.modelId;
    let streamResponse: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
    try {
      streamResponse = await this.client.chat.completions.create(
        {
          model,
          max_tokens: req.maxTokens ?? 512,
          temperature: req.temperature ?? 0.7,
          stream: true,
          messages: [
            { role: "system", content: req.systemPrompt },
            ...req.messages.map((m) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            })),
          ],
        },
        { signal: req.signal ?? undefined },
      );
    } catch (err) {
      throw classifyOpenAIError(err);
    }

    try {
      for await (const chunk of streamResponse) {
        const piece = chunk.choices[0]?.delta?.content;
        if (piece) yield piece;
      }
    } catch (err) {
      throw classifyOpenAIError(err);
    }
  }
}
