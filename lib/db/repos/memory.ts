import type {
  ConversationRow,
  ConversationStatus,
  CouncilRow,
  Insert,
  MessageRow,
  UserRow,
} from "../types";
import type {
  ConversationsRepo,
  CouncilsRepo,
  MessagesRepo,
  Repos,
  UsersRepo,
} from "./types";

/**
 * Implementación in-memory de los repos. Útil para tests, eval offline y
 * desarrollo sin Supabase configurado.
 */

function uuid(): string {
  return crypto.randomUUID();
}

function nowIso(): string {
  return new Date().toISOString();
}

export class MemoryUsersRepo implements UsersRepo {
  private store = new Map<string, UserRow>();

  async getById(id: string): Promise<UserRow | null> {
    return this.store.get(id) ?? null;
  }

  async upsert(input: Insert<UserRow>): Promise<UserRow> {
    const existing = input.id ? this.store.get(input.id) : null;
    const now = nowIso();
    const row: UserRow = existing
      ? { ...existing, ...input, id: existing.id, updatedAt: now }
      : {
          id: input.id ?? uuid(),
          email: input.email,
          displayName: input.displayName ?? null,
          plan: input.plan ?? "free",
          onboardingCompletedAt: input.onboardingCompletedAt ?? null,
          createdAt: now,
          updatedAt: now,
        };
    this.store.set(row.id, row);
    return row;
  }

  async setOnboardingCompleted(userId: string): Promise<void> {
    const u = this.store.get(userId);
    if (!u) return;
    this.store.set(userId, {
      ...u,
      onboardingCompletedAt: nowIso(),
      updatedAt: nowIso(),
    });
  }
}

export class MemoryCouncilsRepo implements CouncilsRepo {
  private store = new Map<string, CouncilRow>();

  async create(input: Insert<CouncilRow>): Promise<CouncilRow> {
    const row: CouncilRow = {
      id: input.id ?? uuid(),
      userId: input.userId,
      userContext: input.userContext,
      surveyVersion: input.surveyVersion ?? "v1",
      name: input.name ?? null,
      createdAt: nowIso(),
    };
    this.store.set(row.id, row);
    return row;
  }

  async listByUser(userId: string): Promise<CouncilRow[]> {
    return Array.from(this.store.values())
      .filter((c) => c.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getById(id: string): Promise<CouncilRow | null> {
    return this.store.get(id) ?? null;
  }
}

export class MemoryConversationsRepo implements ConversationsRepo {
  private store = new Map<string, ConversationRow>();

  async create(input: Insert<ConversationRow>): Promise<ConversationRow> {
    const now = nowIso();
    const row: ConversationRow = {
      id: input.id ?? uuid(),
      councilId: input.councilId,
      userId: input.userId,
      title: input.title ?? null,
      summary: input.summary ?? "",
      keyFacts: input.keyFacts ?? [],
      surveySnapshot: input.surveySnapshot ?? null,
      status: (input.status ?? "active") as ConversationStatus,
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(row.id, row);
    return row;
  }

  async listByUser(
    userId: string,
    opts: { limit?: number; offset?: number } = {},
  ): Promise<ConversationRow[]> {
    const all = Array.from(this.store.values())
      .filter((c) => c.userId === userId && c.status !== "deleted")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const offset = opts.offset ?? 0;
    const end = opts.limit ? offset + opts.limit : undefined;
    return all.slice(offset, end);
  }

  async getById(id: string): Promise<ConversationRow | null> {
    return this.store.get(id) ?? null;
  }

  async rename(id: string, title: string): Promise<void> {
    const c = this.store.get(id);
    if (!c) return;
    this.store.set(id, { ...c, title, updatedAt: nowIso() });
  }

  async markDeleted(id: string): Promise<void> {
    const c = this.store.get(id);
    if (!c) return;
    this.store.set(id, { ...c, status: "deleted", updatedAt: nowIso() });
  }
}

export class MemoryMessagesRepo implements MessagesRepo {
  private store = new Map<string, MessageRow>();

  async append(input: Insert<MessageRow>): Promise<MessageRow> {
    const row: MessageRow = {
      id: input.id ?? uuid(),
      conversationId: input.conversationId,
      agentId: input.agentId ?? null,
      role: input.role,
      phase: input.phase,
      content: input.content,
      contentJson: input.contentJson ?? null,
      tokenCount: input.tokenCount ?? null,
      repliesToAgentId: input.repliesToAgentId ?? null,
      createdAt: nowIso(),
    };
    this.store.set(row.id, row);
    return row;
  }

  async listByConversation(conversationId: string): Promise<MessageRow[]> {
    return Array.from(this.store.values())
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
}

export function createMemoryRepos(): Repos {
  return {
    users: new MemoryUsersRepo(),
    councils: new MemoryCouncilsRepo(),
    conversations: new MemoryConversationsRepo(),
    messages: new MemoryMessagesRepo(),
  };
}
