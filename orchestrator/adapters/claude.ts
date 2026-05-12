import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { requireAnthropicKey } from "@/lib/env";
import type {
  Llm,
  LlmCompletionRequest,
  LlmCompletionResult,
} from "@/orchestrator/llm";

/**
 * Adapter de Claude para la interfaz Llm (K2).
 * Mantiene `Llm` agnóstico del SDK: solo este archivo conoce Anthropic.
 */
export class ClaudeLlm implements Llm {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(opts?: { apiKey?: string; model?: string }) {
    const apiKey = opts?.apiKey ?? requireAnthropicKey();
    this.client = new Anthropic({ apiKey });
    this.model =
      opts?.model ??
      process.env.ANTHROPIC_MODEL ??
      "claude-3-5-sonnet-20241022";
  }

  async complete(req: LlmCompletionRequest): Promise<LlmCompletionResult> {
    const res = await this.client.messages.create(
      {
        model: this.model,
        max_tokens: req.maxTokens ?? 512,
        temperature: req.temperature ?? 0.7,
        system: req.systemPrompt,
        messages: req.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      },
      { signal: req.signal },
    );

    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    return {
      text,
      model: res.model,
      usage: {
        inputTokens: res.usage?.input_tokens,
        outputTokens: res.usage?.output_tokens,
      },
    };
  }

  async *stream(req: LlmCompletionRequest): AsyncIterable<string> {
    const stream = this.client.messages.stream(
      {
        model: this.model,
        max_tokens: req.maxTokens ?? 512,
        temperature: req.temperature ?? 0.7,
        system: req.systemPrompt,
        messages: req.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      },
      { signal: req.signal },
    );

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield event.delta.text;
      }
    }
  }
}
