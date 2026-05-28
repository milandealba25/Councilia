"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { PlanLimitModal } from "@/components/billing/PlanLimitModal";
import type { PlanLimitPayload } from "@/lib/billing/planLimitUi";
import { isPlanLimitError } from "@/lib/chat/chatStorage";

interface PlanLimitContextValue {
  openPlanLimitModal: (payload: PlanLimitPayload) => void;
  closePlanLimitModal: () => void;
  handlePlanLimitError: (err: unknown) => boolean;
}

const PlanLimitContext = createContext<PlanLimitContextValue | null>(null);

export function PlanLimitProvider({ children }: { children: ReactNode }) {
  const [payload, setPayload] = useState<PlanLimitPayload | null>(null);

  const openPlanLimitModal = useCallback((next: PlanLimitPayload) => {
    setPayload(next);
  }, []);

  const closePlanLimitModal = useCallback(() => {
    setPayload(null);
  }, []);

  const handlePlanLimitError = useCallback(
    (err: unknown) => {
      if (!isPlanLimitError(err)) return false;
      openPlanLimitModal({
        code: err.code,
        message: err.message,
        plan: err.plan,
        limit: err.limit,
        used: err.used,
      });
      return true;
    },
    [openPlanLimitModal],
  );

  const value = useMemo(
    () => ({
      openPlanLimitModal,
      closePlanLimitModal,
      handlePlanLimitError,
    }),
    [openPlanLimitModal, closePlanLimitModal, handlePlanLimitError],
  );

  return (
    <PlanLimitContext.Provider value={value}>
      {children}
      {payload ? (
        <PlanLimitModal payload={payload} onClose={closePlanLimitModal} />
      ) : null}
    </PlanLimitContext.Provider>
  );
}

export function usePlanLimitModal(): PlanLimitContextValue {
  const ctx = useContext(PlanLimitContext);
  if (!ctx) {
    throw new Error("usePlanLimitModal debe usarse dentro de PlanLimitProvider.");
  }
  return ctx;
}
