import type {
  ConversationRow,
  CouncilRow,
  Insert,
  MessageRow,
  UserRow,
} from "../types";

/**
 * Interfaces de repositorio (J2).
 *
 * Permiten dos implementaciones:
 *  - `MemoryRepos` (in-memory, para tests sin red).
 *  - `SupabaseRepos` (real, se conecta cuando hay claves configuradas).
 *
 * Los route handlers (`/api/sessions/save`, futuro) consumen las interfaces.
 */

export interface UsersRepo {
  getById(id: string): Promise<UserRow | null>;
  upsert(input: Insert<UserRow>): Promise<UserRow>;
  setOnboardingCompleted(userId: string): Promise<void>;
}

export interface CouncilsRepo {
  create(input: Insert<CouncilRow>): Promise<CouncilRow>;
  listByUser(userId: string): Promise<CouncilRow[]>;
  getById(id: string): Promise<CouncilRow | null>;
}

export interface ConversationsRepo {
  create(input: Insert<ConversationRow>): Promise<ConversationRow>;
  listByUser(
    userId: string,
    opts?: { limit?: number; offset?: number },
  ): Promise<ConversationRow[]>;
  getById(id: string): Promise<ConversationRow | null>;
  rename(id: string, title: string): Promise<void>;
  markDeleted(id: string): Promise<void>;
}

export interface MessagesRepo {
  append(input: Insert<MessageRow>): Promise<MessageRow>;
  listByConversation(conversationId: string): Promise<MessageRow[]>;
}

export interface Repos {
  users: UsersRepo;
  councils: CouncilsRepo;
  conversations: ConversationsRepo;
  messages: MessagesRepo;
}
