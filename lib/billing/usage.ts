import "server-only";

import { getUserEntitlements } from "@/lib/billing/entitlements";
import {
  countActiveChatsForUser,
  countUserMessagesInConversation,
} from "@/lib/billing/queries";
import type { PlanId } from "@/lib/billing/plans";

export interface PlanUsageSnapshot {
  plan: PlanId;
  limits: {
    maxActiveChats: number | null;
    maxMessagesPerChat: number | null;
    voiceEnabled: boolean;
  };
  usage: {
    activeChats: number;
    messagesInChat: number | null;
  };
}

export async function getPlanUsage(
  userId: string,
  conversationId?: string | null,
): Promise<PlanUsageSnapshot> {
  const entitlements = await getUserEntitlements(userId);
  const activeChats = await countActiveChatsForUser(userId);
  let messagesInChat: number | null = null;

  if (conversationId) {
    messagesInChat = await countUserMessagesInConversation(conversationId);
  }

  return {
    plan: entitlements.effectivePlan,
    limits: {
      maxActiveChats: entitlements.limits.maxActiveChats,
      maxMessagesPerChat: entitlements.limits.maxMessagesPerChat,
      voiceEnabled: entitlements.limits.voiceEnabled,
    },
    usage: {
      activeChats,
      messagesInChat,
    },
  };
}
