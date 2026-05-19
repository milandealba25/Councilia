import { describe, expect, it } from "vitest";
import { createMemoryRepos } from "./memory";

const baseCtx = {
  surveyVersion: "v1" as const,
  decisionType: "carrera" as const,
  ageRange: "25_34" as const,
  urgency: "este_mes" as const,
  needFromCouncil: "estructurar" as const,
  fearedLoss: "perder_tiempo" as const,
};

describe("MemoryRepos", () => {
  it("crea y recupera un usuario y su council", async () => {
    const repos = createMemoryRepos();
    const user = await repos.users.upsert({
      email: "test@councilia.app",
      displayName: null,
      plan: "free",
      onboardingCompletedAt: null,
    });
    const council = await repos.councils.create({
      userId: user.id,
      userContext: baseCtx,
      surveyVersion: "v1",
      name: null,
    });
    expect(council.userId).toBe(user.id);
    expect(await repos.councils.getById(council.id)).not.toBeNull();
  });

  it("ordena conversaciones por fecha descendente y respeta deleted", async () => {
    const repos = createMemoryRepos();
    const user = await repos.users.upsert({
      email: "x@y.z",
      displayName: null,
      plan: "free",
      onboardingCompletedAt: null,
    });
    const c = await repos.councils.create({
      userId: user.id,
      userContext: baseCtx,
      surveyVersion: "v1",
      name: null,
    });
    const a = await repos.conversations.create({
      councilId: c.id,
      userId: user.id,
      title: "A",
      status: "active",
    });
    await new Promise((r) => setTimeout(r, 5));
    const b = await repos.conversations.create({
      councilId: c.id,
      userId: user.id,
      title: "B",
      status: "active",
    });
    await repos.conversations.markDeleted(a.id);

    const list = await repos.conversations.listByUser(user.id);
    expect(list.length).toBe(1);
    expect(list[0].id).toBe(b.id);
  });

  it("messages.listByConversation orden ascendente por fecha", async () => {
    const repos = createMemoryRepos();
    const u = await repos.users.upsert({
      email: "z@z.z",
      displayName: null,
      plan: "free",
      onboardingCompletedAt: null,
    });
    const c = await repos.councils.create({
      userId: u.id,
      userContext: baseCtx,
      surveyVersion: "v1",
      name: null,
    });
    const conv = await repos.conversations.create({
      councilId: c.id,
      userId: u.id,
      title: null,
      status: "active",
    });
    const m1 = await repos.messages.append({
      conversationId: conv.id,
      role: "user",
      phase: "user_input",
      content: "Hola",
      agentId: null,
      contentJson: null,
      tokenCount: null,
      repliesToAgentId: null,
    });
    await new Promise((r) => setTimeout(r, 5));
    const m2 = await repos.messages.append({
      conversationId: conv.id,
      role: "agent",
      phase: "initial",
      content: "Postura de Marco",
      agentId: "marco",
      contentJson: null,
      tokenCount: 150,
      repliesToAgentId: null,
    });
    const list = await repos.messages.listByConversation(conv.id);
    expect(list.map((m) => m.id)).toEqual([m1.id, m2.id]);
  });
});
