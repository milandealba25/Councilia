/**
 * K2 - Interfaz Llm + tipos compartidos del orquestador.
 *
 * Definida como interfaz para poder inyectar mocks deterministas en tests
 * y para que el reemplazo de proveedor sea una migracion local.
 */

export interface LlmMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LlmCompletionRequest {
  systemPrompt: string;
  messages: ReadonlyArray<LlmMessage>;
  /**
   * Override opcional del modelo para esta solicitud.
   * Si no se define, cada adapter usa su modelo por defecto.
   */
  model?: string;
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
  /** Llamada bloqueante. Util para tests, evaluacion y batches. */
  complete(req: LlmCompletionRequest): Promise<LlmCompletionResult>;

  /**
   * Llamada con streaming. Yieldea fragmentos de texto en orden;
   * el consumidor decide como agregarlos a la UI.
   */
  stream(req: LlmCompletionRequest): AsyncIterable<string>;
}

/**
 * Codigos de error normalizados que el orquestador puede inspeccionar
 * para distinguir fallos de configuracion, operacion y contenido.
 *
 * - `auth`: clave faltante, invalida o sin permisos en el proveedor.
 * - `quota`: rate-limit o cuota agotada en el proveedor.
 * - `blocked`: el proveedor bloqueo la respuesta por politicas de seguridad.
 * - `network`: error de transporte (timeout, DNS, abort externo).
 * - `aborted`: cancelacion intencional del cliente.
 * - `unknown`: cualquier otro error inesperado.
 */
export type LlmErrorCode =
  | "auth"
  | "quota"
  | "blocked"
  | "network"
  | "aborted"
  | "unknown";

export class LlmError extends Error {
  readonly code: LlmErrorCode;
  readonly status?: number;
  override readonly cause?: unknown;

  constructor(
    code: LlmErrorCode,
    message: string,
    opts?: { status?: number; cause?: unknown },
  ) {
    super(message);
    this.name = "LlmError";
    this.code = code;
    this.status = opts?.status;
    this.cause = opts?.cause;
  }
}

/**
 * Mensaje corto y legible (es-MX) para presentar al usuario o registrar.
 * No expone secretos; solo la categoria accionable.
 */
export function llmErrorHeadline(code: LlmErrorCode): string {
  switch (code) {
    case "auth":
      return "El council no puede hablar: las claves de IA no son validas o no estan configuradas.";
    case "quota":
      return "Gemini agoto sus intentos disponibles y el fallback de IA no pudo completar la respuesta.";
    case "blocked":
      return "La respuesta fue bloqueada por las politicas de seguridad del proveedor.";
    case "network":
      return "Se corto la conexion con el proveedor de IA. Revisa tu red e intenta otra vez.";
    case "aborted":
      return "La generacion se cancelo.";
    case "unknown":
    default:
      return "El council se quedo callado por un error inesperado. Vuelve a intentarlo.";
  }
}
