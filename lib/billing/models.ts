import "server-only";

import { getUserEntitlements } from "@/lib/billing/entitlements";

export async function getModelForUser(userId: string): Promise<{
  llmModel: string;
  synthesisModel: string;
  plan: "free" | "plus" | "pro";
}> {
  const entitlements = await getUserEntitlements(userId);
  return {
    llmModel: entitlements.limits.llmModel,
    synthesisModel: entitlements.limits.synthesisModel,
    plan: entitlements.effectivePlan,
  };
}
