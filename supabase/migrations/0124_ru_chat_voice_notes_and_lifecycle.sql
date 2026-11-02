-- 0124_ru_chat_voice_notes_and_lifecycle.sql
-- Additive tracking for Voice Notes and the 45-day automated Cloudinary lifecycle purge engine.

CREATE TABLE IF NOT EXISTS chat_voice_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id),
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
  ON chat_voice_notes(expires_at, status) 
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_chat_voice_notes_msg 
  ON chat_voice_notes(message_id);

CREATE INDEX IF NOT EXISTS idx_chat_voice_notes_conv 
  ON chat_voice_notes(conversation_id);

-- Optional additive column in chat_messages linking to voice note
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_messages' AND column_name = 'voice_note_id'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN voice_note_id UUID REFERENCES chat_voice_notes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE chat_voice_notes ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
DROP POLICY IF EXISTS "Service role full access on chat_voice_notes" ON chat_voice_notes;
CREATE POLICY "Service role full access on chat_voice_notes"
  ON chat_voice_notes FOR ALL USING (true) WITH CHECK (true);

