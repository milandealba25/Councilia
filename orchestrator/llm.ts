/**
 * K2 · Interfaz Llm + tipos compartidos del orquestador.
 *
 * Definida como interfaz para poder inyectar mocks deterministas en tests
 * (fixtures sin pegarle al modelo) y para que el reemplazo de proveedor
 * sea una migración local.
 */

export interface LlmMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LlmCompletionRequest {
  systemPrompt: string;
  messages: ReadonlyArray<LlmMessage>;
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}

export interface LlmCompletionResult {
  text: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
  model: string;
}

export interface Llm {
  /** Llamada bloqueante. Útil para tests, evaluación, batches. */
  complete(req: LlmCompletionRequest): Promise<LlmCompletionResult>;

  /**
   * Llamada con streaming. Yieldea fragmentos de texto en orden;
   * el consumidor decide cómo agregarlos a la UI.
   */
  stream(req: LlmCompletionRequest): AsyncIterable<string>;
}
