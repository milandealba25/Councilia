"use client";

import { useCallback, useEffect, useState } from "react";
import { chatChangeEventName } from "@/lib/chat/chatStorage";
import { getValidAuthSession } from "@/lib/auth/client";
import {
  formatUsageRatio,
  shouldShowUsageCounters,
} from "@/lib/billing/planLimitUi";
import type { PlanId } from "@/lib/billing/plans";

interface UsageResponse {
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

interface PlanUsageCountersProps {
  activeChatId: string | null;
  compact?: boolean;
}

export function PlanUsageCounters({
  activeChatId,
  compact = false,
}: PlanUsageCountersProps) {
  const [data, setData] = useState<UsageResponse | null>(null);

  const refresh = useCallback(async () => {
    const session = await getValidAuthSession();
    if (!session?.accessToken) {
      setData(null);
      return;
    }

    const params = new URLSearchParams();
    if (activeChatId) params.set("chatId", activeChatId);
    const url = `/api/billing/usage${params.size ? `?${params}` : ""}`;

    const response = await fetch(url, {
      headers: { authorization: `Bearer ${session.accessToken}` },
    }).catch(() => null);

    if (!response?.ok) {
      setData(null);
      return;
    }

    const payload = (await response.json().catch(() => null)) as UsageResponse | null;
    setData(payload);
  }, [activeChatId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    function onChange() {
      void refresh();
    }
    window.addEventListener(chatChangeEventName(), onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(chatChangeEventName(), onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [refresh]);

  if (!data || !shouldShowUsageCounters(data.plan)) {
    return null;
  }

  const chatsLine = formatUsageRatio(
    data.usage.activeChats,
    data.limits.maxActiveChats,
  );
  const messagesLine =
    activeChatId && data.usage.messagesInChat !== null
      ? formatUsageRatio(
          data.usage.messagesInChat,
          data.limits.maxMessagesPerChat,
        )
      : null;

  if (!chatsLine && !messagesLine) return null;

  const className = compact
    ? "text-[10px] leading-relaxed text-[#7a4d3f]/90"
    : "rounded-lg border border-[#d77d4b]/20 bg-[#fff7ef]/55 px-3 py-2 text-[11px] leading-relaxed text-[#6f4535]";

  return (
    <div className={className} aria-live="polite">
      {chatsLine ? <p>Chats activos: {chatsLine}</p> : null}
      {messagesLine ? <p className={chatsLine ? "mt-0.5" : ""}>Mensajes en este chat: {messagesLine}</p> : null}
    </div>
  );
}
