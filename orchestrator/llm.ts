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
  /** Llamada bloqueante. Útil para tests, evaluación, batches. */
  complete(req: LlmCompletionRequest): Promise<LlmCompletionResult>;

  /**
   * Llamada con streaming. Yieldea fragmentos de texto en orden;
   * el consumidor decide cómo agregarlos a la UI.
   */
  stream(req: LlmCompletionRequest): AsyncIterable<string>;
}

/**
 * Códigos de error normalizados que el orquestador puede inspeccionar
 * para distinguir fallos de configuración (clave inválida), de operación
 * (cuota, red) y de contenido (bloqueo de seguridad).
 *
 * - `auth`: clave faltante, inválida o sin permisos en el proveedor.
 * - `quota`: rate-limit o cuota agotada en el proveedor.
 * - `blocked`: el proveedor bloqueó la respuesta por políticas de seguridad.
 * - `network`: error de transporte (timeout, DNS, abort externo).
 * - `aborted`: cancelación intencional del cliente.
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
 * No expone detalles del proveedor; solo la categoría.
 */
export function llmErrorHeadline(code: LlmErrorCode): string {
  switch (code) {
    case "auth":
      return "El council no puede hablar: la clave de IA no es válida o no está configurada.";
    case "quota":
      return "El proveedor de IA dijo que esperáramos. Intenta de nuevo en un momento.";
    case "blocked":
      return "La respuesta fue bloqueada por las políticas de seguridad del proveedor.";
    case "network":
      return "Se cortó la conexión con el proveedor de IA. Revisa tu red e intenta otra vez.";
    case "aborted":
      return "La generación se canceló.";
    case "unknown":
    default:
      return "El council se quedó callado por un error inesperado. Vuelve a intentarlo.";
  }
}
