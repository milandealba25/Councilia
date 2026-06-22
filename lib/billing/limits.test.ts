import { describe, expect, it } from "vitest";

import {
  canCreateActiveChat,
  canExportChats,
  canSendMessageInChat,
  canUseVoice,
  clampHistorySize,
  resolveLlmModel,
  resolveSynthesisModel,
} from "@/lib/billing/limits";
import { PLANS } from "@/lib/billing/plans";

describe("billing/limits", () => {
  describe("canCreateActiveChat", () => {
    it("free: permite el primer chat y bloquea el segundo", () => {
      expect(canCreateActiveChat("free", 0)).toEqual({ allowed: true, limit: 1 });
      expect(canCreateActiveChat("free", 1)).toEqual({
        allowed: false,
        reason: "plan_chat_limit",
        limit: 1,
      });
    });

    it("plus: permite hasta 10 chats simultáneos", () => {
      expect(canCreateActiveChat("plus", 9).allowed).toBe(true);
      expect(canCreateActiveChat("plus", 10)).toEqual({
        allowed: false,
        reason: "plan_chat_limit",
        limit: 10,
      });
    });

    it("pro: no tiene límite", () => {
      expect(canCreateActiveChat("pro", 250)).toEqual({
        allowed: true,
        limit: null,
      });
    });
  });

  describe("canSendMessageInChat", () => {
    it.each([
      ["free", 14, true],
      ["free", 15, false],
      ["plus", 29, true],
      ["plus", 30, false],
      ["pro", 999, true],
    ])("plan=%s msgs=%i → allowed=%s", (plan, count, expected) => {
      const result = canSendMessageInChat(plan as "free" | "plus" | "pro", count);
      expect(result.allowed).toBe(expected);
      if (!expected) {
        expect(result.reason).toBe("plan_message_limit");
      }
    });
  });

  describe("canUseVoice", () => {
    it("solo Plus y Pro activan voz", () => {
      expect(canUseVoice("free")).toEqual({
        allowed: false,
        reason: "feature_disabled",
      });
      expect(canUseVoice("plus").allowed).toBe(true);
      expect(canUseVoice("pro").allowed).toBe(true);
    });
  });

  describe("canExportChats", () => {
    it("solo Pro puede exportar", () => {
      expect(canExportChats("free").allowed).toBe(false);
      expect(canExportChats("plus").allowed).toBe(false);
      expect(canExportChats("pro").allowed).toBe(true);
    });
  });

  describe("clampHistorySize", () => {
    it("free → 1, plus → 10, pro → ilimitado", () => {
      expect(clampHistorySize("free", 12)).toBe(1);
      expect(clampHistorySize("plus", 12)).toBe(10);
      expect(clampHistorySize("pro", 12)).toBe(12);
    });

    it("respeta totales menores al tope", () => {
      expect(clampHistorySize("plus", 3)).toBe(3);
      expect(clampHistorySize("free", 0)).toBe(0);
    });
  });

  describe("resolveLlmModel / resolveSynthesisModel", () => {
    it("Free usa Gemini; Plus usa mini; Pro usa GPT-4o en síntesis", () => {
      expect(resolveLlmModel("free")).toBe("gemini-flash");
      expect(resolveSynthesisModel("free")).toBe("gemini-flash");
      expect(resolveLlmModel("plus")).toBe("gpt-4o-mini");
      expect(resolveSynthesisModel("plus")).toBe("gpt-4o-mini");
      expect(resolveLlmModel("pro")).toBe("gpt-4o-mini");
      expect(resolveSynthesisModel("pro")).toBe("gpt-4o");
    });
  });

  describe("catálogo (snapshot ligero)", () => {
    it("Plus no debe tener badge; Pro sí debe ser el recomendado", () => {
      expect(PLANS.plus.copy.badge).toBeUndefined();
      expect(PLANS.pro.copy.badge).toBe("Recomendado");
    });

    it("Ninguna feature lista 'Síntesis al cierre' (ya implícita)", () => {
      for (const plan of Object.values(PLANS)) {
        for (const feature of plan.copy.features) {
          expect(feature.toLowerCase()).not.toMatch(/síntesis al cierre/);
        }
      }
    });

    it("Los lookup_keys de Plus/Pro están definidos para mensual y anual", () => {
      for (const planId of ["plus", "pro"] as const) {
        expect(PLANS[planId].pricing.monthly?.lookupKey).toBeTruthy();
        expect(PLANS[planId].pricing.annual?.lookupKey).toBeTruthy();
      }
    });
  });
});
