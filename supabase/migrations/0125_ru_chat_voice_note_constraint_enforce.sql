-- 0125_ru_chat_voice_note_constraint_enforce.sql
-- Enforce 'voice_note' message_type check constraint on chat_messages

DO $$
BEGIN
  ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_message_type_check;
  ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_message_type_check 
    CHECK (message_type IN ('text', 'attachment', 'system', 'entity_ref', 'voice_note'));
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not enforce chat_messages_message_type_check constraint: %', SQLERRM;
END $$;

