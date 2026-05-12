/**
 * Helpers de Server-Sent Events para los route handlers (I1–I4).
 *
 * El cliente consume con `EventSource` (GET) o con `fetch` + reader manual
 * (POST con body). Usamos POST + ReadableStream para enviar payloads grandes
 * (userContext, transcript) sin tocar la URL.
 */

const ENCODER = new TextEncoder();

export interface SseEvent<T> {
  event: string;
  data: T;
  id?: string;
}

export function encodeSseEvent<T>(ev: SseEvent<T>): Uint8Array {
  const lines: string[] = [];
  if (ev.id) lines.push(`id: ${ev.id}`);
  lines.push(`event: ${ev.event}`);
  lines.push(`data: ${JSON.stringify(ev.data)}`);
  lines.push("", "");
  return ENCODER.encode(lines.join("\n"));
}

export function sseHeaders(): HeadersInit {
  return {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  };
}

/**
 * Crea un `ReadableStream` que itera un async generador y emite eventos SSE
 * tipados. Cancela el iterador si el cliente cierra la conexión.
 */
export function sseStreamFromIterable<T>(
  iterable: AsyncIterable<SseEvent<T>>,
): ReadableStream<Uint8Array> {
  let iterator: AsyncIterator<SseEvent<T>>;
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      iterator = iterable[Symbol.asyncIterator]();
      try {
        while (true) {
          const { value, done } = await iterator.next();
          if (done) break;
          controller.enqueue(encodeSseEvent(value));
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
    async cancel() {
      await iterator?.return?.();
    },
  });
}

/**
 * Parser de SSE para el cliente: lee un `Response.body` y entrega eventos
 * tipados. Mantiene buffer entre chunks (los eventos pueden cortarse en medio).
 */
export async function* parseSseStream<T = unknown>(
  body: ReadableStream<Uint8Array>,
): AsyncIterable<SseEvent<T>> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sepIdx: number;
    while ((sepIdx = buffer.indexOf("\n\n")) !== -1) {
      const raw = buffer.slice(0, sepIdx);
      buffer = buffer.slice(sepIdx + 2);
      const parsed = parseEvent<T>(raw);
      if (parsed) yield parsed;
    }
  }
}

function parseEvent<T>(raw: string): SseEvent<T> | null {
  let event = "message";
  let data: string | null = null;
  let id: string | undefined;
  for (const line of raw.split("\n")) {
    if (!line || line.startsWith(":")) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trimStart();
    if (key === "event") event = value;
    else if (key === "data") data = value;
    else if (key === "id") id = value;
  }
  if (data === null) return null;
  try {
    return { event, id, data: JSON.parse(data) as T };
  } catch {
    return null;
  }
}
