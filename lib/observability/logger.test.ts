import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "./logger";
import { emit } from "./events";

function captureConsole() {
  const out: string[] = [];
  const spies = [
    vi.spyOn(console, "log").mockImplementation((m) => out.push(String(m))),
    vi.spyOn(console, "warn").mockImplementation((m) => out.push(String(m))),
    vi.spyOn(console, "error").mockImplementation((m) => out.push(String(m))),
  ];
  return {
    out,
    restore: () => spies.forEach((s) => s.mockRestore()),
  };
}

describe("Logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("emite JSON con timestamp y nivel", () => {
    const { out, restore } = captureConsole();
    logger.info("hola", { foo: 1 });
    restore();
    expect(out.length).toBe(1);
    const parsed = JSON.parse(out[0]);
    expect(parsed.msg).toBe("hola");
    expect(parsed.level).toBe("info");
    expect(parsed.foo).toBe(1);
    expect(typeof parsed.ts).toBe("string");
  });

  it("child preserva bindings", () => {
    const { out, restore } = captureConsole();
    const child = logger.child({ requestId: "req-1" });
    child.info("ping");
    restore();
    expect(JSON.parse(out[0]).requestId).toBe("req-1");
  });
});

describe("Events", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("emit() emite con campo `event` discriminador", () => {
    const { out, restore } = captureConsole();
    emit("session.started", { foo: "bar" });
    restore();
    const parsed = JSON.parse(out[0]);
    expect(parsed.event).toBe("session.started");
    expect(parsed.foo).toBe("bar");
  });
});
