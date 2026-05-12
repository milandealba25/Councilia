import { describe, expect, it } from "vitest";
import {
  encodeSseEvent,
  parseSseStream,
  sseStreamFromIterable,
  type SseEvent,
} from "./sse";

function bytesToStream(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(c);
      controller.close();
    },
  });
}

function encodeText(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

describe("SSE helpers", () => {
  it("encodeSseEvent emite formato event/data válido", () => {
    const buf = encodeSseEvent({ event: "delta", data: { x: 1 } });
    const txt = new TextDecoder().decode(buf);
    expect(txt).toContain("event: delta");
    expect(txt).toContain('data: {"x":1}');
    expect(txt.endsWith("\n\n")).toBe(true);
  });

  it("parseSseStream lee eventos completos a través de chunks partidos", async () => {
    const raw =
      "event: delta\ndata: {\"text\":\"hola\"}\n\nevent: done\ndata: {}\n\n";
    const part1 = encodeText(raw.slice(0, 20));
    const part2 = encodeText(raw.slice(20));
    const stream = bytesToStream([part1, part2]);

    const events: Array<SseEvent<unknown>> = [];
    for await (const ev of parseSseStream(stream)) events.push(ev);

    expect(events.length).toBe(2);
    expect(events[0]).toEqual({ event: "delta", data: { text: "hola" } });
    expect(events[1].event).toBe("done");
  });

  it("sseStreamFromIterable encadena un AsyncIterable a un ReadableStream", async () => {
    async function* source(): AsyncIterable<SseEvent<{ n: number }>> {
      yield { event: "tick", data: { n: 1 } };
      yield { event: "tick", data: { n: 2 } };
    }
    const stream = sseStreamFromIterable(source());

    const events: Array<SseEvent<{ n: number }>> = [];
    for await (const ev of parseSseStream<{ n: number }>(stream)) {
      events.push(ev);
    }
    expect(events.map((e) => e.data.n)).toEqual([1, 2]);
  });
});
