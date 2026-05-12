/**
 * Tipos de la base de datos alineados a `supabase/migrations/001_init.sql`.
 *
 * Cuando se conecte el cliente real, esto puede regenerarse con
 * `supabase gen types typescript` y reemplazar este archivo. Mientras tanto,
 * son la fuente de verdad para los repos.
 */
import type { UserContext } from "@/lib/survey/survey.v1";
import type { Synthesis } from "@/orchestrator/synthesis";

export type Plan = "free" | "pro";

export interface UserRow {
  id: string;
  email: string;
  plan: Plan;
  onboardingCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CouncilRow {
  id: string;
  userId: string;
  userContext: UserContext;
  surveyVersion: string;
  name: string | null;
  createdAt: string;
}

export type ConversationStatus = "active" | "archived" | "deleted";

export interface ConversationRow {
  id: string;
  councilId: string;
  userId: string;
  title: string | null;
  status: ConversationStatus;
  createdAt: string;
  updatedAt: string;
}

export type MessageRole = "user" | "agent" | "synthesis";
export type MessagePhase = "initial" | "replica" | "synthesis" | "user_input";
export type MessageAgent = "marco" | "elena" | "rafael";

export interface MessageRow {
  id: string;
  conversationId: string;
  agentId: MessageAgent | null;
  role: MessageRole;
  phase: MessagePhase;
  content: string;
  contentJson: Synthesis | Record<string, unknown> | null;
  tokenCount: number | null;
  repliesToAgentId: MessageAgent | null;
  createdAt: string;
}

export type Insert<T> = Omit<T, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
};
