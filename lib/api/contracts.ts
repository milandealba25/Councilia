import { z } from "zod";
import { userContextSchema } from "@/lib/survey/survey.v1";
import { AGENT_IDS } from "@/lib/agents/ids";

/**
 * P2 (base) · Esquemas Zod de las API routes.
 * Cada endpoint valida su input con uno de estos schemas antes de tocar
 * orquestador o LLM. Si la validación falla → 400 con detalle.
 */

const agentIdSchema = z.enum(AGENT_IDS);

export const initialRequestSchema = z.object({
  userContext: userContextSchema,
  userMessage: z.string().trim().min(1).max(4000),
});
export type InitialRequest = z.infer<typeof initialRequestSchema>;

export const replicaRequestSchema = z.object({
  userContext: userContextSchema,
  userMessage: z.string().trim().min(1).max(4000),
  postures: z
    .array(
      z.object({
        agent: agentIdSchema,
        text: z.string().min(1),
      }),
    )
    .min(2)
    .max(3),
});
export type ReplicaRequest = z.infer<typeof replicaRequestSchema>;

export const synthesisRequestSchema = z.object({
  userContext: userContextSchema,
  transcript: z
    .array(
      z.object({
        role: z.enum(["user", "marco", "elena", "rafael"]),
        text: z.string().min(1),
      }),
    )
    .min(1),
});
export type SynthesisRequest = z.infer<typeof synthesisRequestSchema>;
