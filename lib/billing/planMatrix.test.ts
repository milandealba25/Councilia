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
import { PLANS, type PlanId } from "@/lib/billing/plans";

const PLAN_IDS = Object.keys(PLANS) as PlanId[];

function numericLimit(value: number | null): number | null {
  return value;
}

describe("billing/planMatrix — cada plan respeta exactamente su catálogo", () => {
  for (const planId of PLAN_IDS) {
    const definition = PLANS[planId];
    const { limits } = definition;

    describe(`${definition.copy.name} (${planId})`, () => {
      describe("chats activos simultáneos", () => {
        const max = numericLimit(limits.maxActiveChats);

        if (max === null) {
          it("no impone tope numérico", () => {
            expect(canCreateActiveChat(planId, 0).allowed).toBe(true);
            expect(canCreateActiveChat(planId, 999).allowed).toBe(true);
            expect(canCreateActiveChat(planId, 50_000).allowed).toBe(true);
            expect(canCreateActiveChat(planId, 999).limit).toBeNull();
          });
        } else {
          it(`permite hasta ${max - 1} chats (último slot libre)`, () => {
            const result = canCreateActiveChat(planId, max - 1);
            expect(result).toMatchObject({ allowed: true, limit: max });
          });

          it(`bloquea en el tope exacto (${max} chats)`, () => {
            const result = canCreateActiveChat(planId, max);
            expect(result).toMatchObject({
              allowed: false,
              reason: "plan_chat_limit",
              limit: max,
            });
          });

          it(`bloquea por encima del tope (${max + 1}+)`, () => {
            expect(canCreateActiveChat(planId, max + 1).allowed).toBe(false);
            expect(canCreateActiveChat(planId, max + 100).allowed).toBe(false);
          });
        }
      });

      describe("mensajes por chat (solo role=user en backend)", () => {
        const max = numericLimit(limits.maxMessagesPerChat);

        if (max === null) {
          it("no impone tope numérico", () => {
            expect(canSendMessageInChat(planId, 0).allowed).toBe(true);
            expect(canSendMessageInChat(planId, 10_000).allowed).toBe(true);
          });
        } else {
          it(`permite el mensaje ${max} cuando hay ${max - 1} previos`, () => {
            const result = canSendMessageInChat(planId, max - 1);
            expect(result).toMatchObject({ allowed: true, limit: max });
          });

          it(`bloquea cuando ya hay ${max} mensajes user`, () => {
            const result = canSendMessageInChat(planId, max);
            expect(result).toMatchObject({
              allowed: false,
              reason: "plan_message_limit",
              limit: max,
            });
          });

          it(`bloquea con uso muy por encima (${max + 50})`, () => {
            expect(canSendMessageInChat(planId, max + 50).allowed).toBe(false);
          });
        }
      });

      describe("historial visible", () => {
        const max = numericLimit(limits.historySize);

        if (max === null) {
          it("conserva todo el historial", () => {
            expect(clampHistorySize(planId, 0)).toBe(0);
            expect(clampHistorySize(planId, 500)).toBe(500);
          });
        } else {
          it(`recorta a ${max} cuando hay más chats guardados`, () => {
            expect(clampHistorySize(planId, max + 1)).toBe(max);
            expect(clampHistorySize(planId, max * 3)).toBe(max);
          });

          it(`no recorta por debajo de ${max}`, () => {
            expect(clampHistorySize(planId, max)).toBe(max);
            expect(clampHistorySize(planId, max - 1)).toBe(max - 1);
            expect(clampHistorySize(planId, 0)).toBe(0);
          });
        }
      });

      describe("features de producto", () => {
        it(`voz ${limits.voiceEnabled ? "habilitada" : "deshabilitada"}`, () => {
          const result = canUseVoice(planId);
          expect(result.allowed).toBe(limits.voiceEnabled);
          if (!limits.voiceEnabled) {
            expect(result.reason).toBe("feature_disabled");
          }
        });

        it(`exportación ${limits.exportEnabled ? "habilitada" : "deshabilitada"}`, () => {
          const result = canExportChats(planId);
          expect(result.allowed).toBe(limits.exportEnabled);
          if (!limits.exportEnabled) {
            expect(result.reason).toBe("feature_disabled");
          }
        });

        it("síntesis siempre habilitada en catálogo", () => {
          expect(limits.synthesisEnabled).toBe(true);
        });
      });

      describe("modelos LLM asignados", () => {
        it("coinciden con el catálogo PLANS", () => {
          expect(resolveLlmModel(planId)).toBe(limits.llmModel);
          expect(resolveSynthesisModel(planId)).toBe(limits.synthesisModel);
        });
      });
    });
  }

  describe("contraste entre planes (no se mezclan límites)", () => {
    it("Free es el más restrictivo en chats y mensajes", () => {
      expect(PLANS.free.limits.maxActiveChats).toBeLessThan(
        PLANS.plus.limits.maxActiveChats!,
      );
      expect(PLANS.free.limits.maxMessagesPerChat).toBeLessThan(
        PLANS.plus.limits.maxMessagesPerChat!,
      );
    });

    it("Plus tiene voz; Free no", () => {
      expect(PLANS.free.limits.voiceEnabled).toBe(false);
      expect(PLANS.plus.limits.voiceEnabled).toBe(true);
      expect(PLANS.pro.limits.voiceEnabled).toBe(true);
    });

    it("solo Pro exporta", () => {
      expect(PLANS.free.limits.exportEnabled).toBe(false);
      expect(PLANS.plus.limits.exportEnabled).toBe(false);
      expect(PLANS.pro.limits.exportEnabled).toBe(true);
    });

    it("Pro usa GPT-4o en síntesis; Free usa Gemini Flash", () => {
      expect(resolveSynthesisModel("free")).toBe("gemini-flash");
      expect(resolveSynthesisModel("pro")).toBe("gpt-4o");
    });
  });
});
