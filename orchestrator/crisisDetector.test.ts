import { describe, expect, it } from "vitest";
import { detectCrisis } from "./crisisDetector";

describe("CrisisDetector (M2 base)", () => {
  it("detecta ideación suicida en español", () => {
    const r = detectCrisis(
      "Ya no quiero seguir, sería mejor desaparecer de esta vida.",
    );
    expect(r.triggered).toBe(true);
    expect(r.categories).toContain("suicidal_ideation");
  });

  it("detecta self-harm en inglés", () => {
    const r = detectCrisis("I have been cutting myself again");
    expect(r.triggered).toBe(true);
    expect(r.categories).toContain("self_harm");
  });

  it("detecta violencia doméstica", () => {
    const r = detectCrisis("Mi pareja me golpea cuando bebe.");
    expect(r.triggered).toBe(true);
    expect(r.categories).toContain("domestic_violence");
  });

  it("no se activa en dilemas normales", () => {
    expect(
      detectCrisis(
        "Tengo dos ofertas de trabajo y no sé cuál tomar; la decisión me genera ansiedad.",
      ).triggered,
    ).toBe(false);
  });

  it("normaliza tildes para no romperse en español acentuado", () => {
    expect(detectCrisis("Quiero morír y ya no estar acá.").triggered).toBe(true);
  });
});
