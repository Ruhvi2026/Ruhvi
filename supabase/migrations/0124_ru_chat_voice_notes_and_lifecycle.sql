-- 0124_ru_chat_voice_notes_and_lifecycle.sql
-- Additive tracking for Voice Notes and the 45-day automated Cloudinary lifecycle purge engine.

CREATE TABLE IF NOT EXISTS public.chat_voice_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id),
  cloudinary_public_id TEXT NOT NULL UNIQUE,
  cloudinary_url TEXT NOT NULL,
  duration_seconds NUMERIC(6, 2) NOT NULL DEFAULT 0,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT 'audio/webm',
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '45 days'),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'deleted')),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for cron job to quickly find active voice notes older than 45 days
CREATE INDEX IF NOT EXISTS idx_chat_voice_notes_expiry 
  ON public.chat_voice_notes(expires_at, status) 
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_chat_voice_notes_msg 
  ON public.chat_voice_notes(message_id);

CREATE INDEX IF NOT EXISTS idx_chat_voice_notes_conv 
  ON public.chat_voice_notes(conversation_id);

-- Safely expand message_type check constraint in chat_messages to include 'voice_note'
DO $$
BEGIN
  ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_message_type_check;
  ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_message_type_check 
    CHECK (message_type IN ('text', 'attachment', 'system', 'entity_ref', 'voice_note'));
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not update chat_messages_message_type_check constraint: %', SQLERRM;
END $$;

-- Optional additive column in chat_messages linking to voice note
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_messages' AND column_name = 'voice_note_id'
  ) THEN
    ALTER TABLE public.chat_messages ADD COLUMN voice_note_id UUID REFERENCES public.chat_voice_notes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.chat_voice_notes ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
DROP POLICY IF EXISTS "Service role full access on chat_voice_notes" ON public.chat_voice_notes;
CREATE POLICY "Service role full access on chat_voice_notes"
  ON public.chat_voice_notes FOR ALL USING (true) WITH CHECK (true);

-- Authenticated staff member RLS policies:
-- Staff members can read voice notes for conversations they are part of
DROP POLICY IF EXISTS "Staff members can view voice notes for their conversations" ON public.chat_voice_notes;
CREATE POLICY "Staff members can view voice notes for their conversations"
  ON public.chat_voice_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversation_members m
      WHERE m.conversation_id = chat_voice_notes.conversation_id
      AND m.user_id = auth.uid()
    )
  );

-- Staff members can insert voice notes for conversations they are part of
DROP POLICY IF EXISTS "Staff members can insert voice notes into their conversations" ON public.chat_voice_notes;
CREATE POLICY "Staff members can insert voice notes into their conversations"
  ON public.chat_voice_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.chat_conversation_members m
      WHERE m.conversation_id = chat_voice_notes.conversation_id
      AND m.user_id = auth.uid()
    )
  );

