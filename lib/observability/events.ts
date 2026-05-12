/**
 * O2 · Eventos clave del producto.
 *
 * Se emiten al `logger` con un `event` discriminador. Cualquier dashboard
 * (interno o externo) puede agregar por ese campo.
 */
import { logger, type LogContext } from "./logger";

export type ProductEvent =
  | "session.started"
  | "session.posture.completed"
  | "session.replica.completed"
  | "session.replica.skipped"
  | "session.synthesis.requested"
  | "session.synthesis.delivered"
  | "session.crisis.triggered"
  | "session.error";

export function emit(event: ProductEvent, ctx: LogContext = {}): void {
  logger.info(`event:${event}`, { event, ...ctx });
}
