-- Speeds up replacing an in-flight draft turn with the completed council turn.
create index if not exists messages_conversation_turn_id_idx
  on public.messages (conversation_id, ((content_json ->> 'turn_id')));
