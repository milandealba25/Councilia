import { describe, expect, it } from "vitest";

import { buildPlanLimitModalCopy, formatUsageRatio } from "@/lib/billing/planLimitUi";

describe("billing/planLimitUi", () => {
  it("genera copy para límite de chats en Free", () => {
    const copy = buildPlanLimitModalCopy({
      code: "ACTIVE_CHAT_LIMIT_REACHED",
      message: "Tu plan Free permite 1 chat activo.",
      plan: "free",
      limit: 1,
      used: 1,
    });
    expect(copy.title).toContain("Free");
    expect(copy.hint).toMatch(/Plus/);
  });

  it("formatea ratio de uso", () => {
    expect(formatUsageRatio(4, 5)).toBe("4 / 5");
    expect(formatUsageRatio(10, null)).toBeNull();
  });
});
