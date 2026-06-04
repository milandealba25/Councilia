import { describe, expect, it, vi } from "vitest";
import { FallbackLlm } from "./fallback";
import { LlmError, type Llm, type LlmCompletionRequest } from "../llm";

vi.mock("server-only", () => ({}));

const req: LlmCompletionRequest = {
  systemPrompt: "system",
  messages: [{ role: "user", content: "hola" }],
  model: "gemini-flash",
};

function fakeLlm(args: {
  complete?: Llm["complete"];
  stream?: Llm["stream"];
}): Llm {
  return {
    complete:
      args.complete ??
      (async () => ({
        text: "ok",
        model: "fake",
      })),
    stream:
      args.stream ??
      (async function* () {
        yield "ok";
      }),
  };
}

describe("FallbackLlm", () => {
  it("usa OpenAI sin pasar aliases Gemini cuando Gemini agota cuota", async () => {
    let fallbackModel: string | undefined = "not-called";
    const llm = new FallbackLlm(
      fakeLlm({
        complete: async () => {
          throw new LlmError("quota", "Gemini exhausted");
        },
      }),
      fakeLlm({
        complete: async (fallbackReq) => {
          fallbackModel = fallbackReq.model;
          return { text: "openai", model: "gpt-4o-mini" };
        },
      }),
    );

    await expect(llm.complete(req)).resolves.toEqual({
      text: "openai",
      model: "gpt-4o-mini",
    });
    expect(fallbackModel).toBeUndefined();
  });

  it("no cambia a fallback si Gemini ya emitio texto en streaming", async () => {
    const llm = new FallbackLlm(
      fakeLlm({
        stream: async function* () {
          yield "parcial";
          throw new LlmError("quota", "Gemini exhausted");
        },
      }),
      fakeLlm({
        stream: async function* () {
          yield "fallback";
        },
      }),
    );

    const chunks: string[] = [];
    await expect(async () => {
      for await (const chunk of llm.stream(req)) {
        chunks.push(chunk);
      }
    }).rejects.toThrow("Gemini exhausted");
    expect(chunks).toEqual(["parcial"]);
  });
});
