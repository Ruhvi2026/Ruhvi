-- 0123_co_founder_multi_conversations.sql
-- Additive tables for AI Co-Founder multi-conversation workspaces and direct worker chats.

CREATE TABLE IF NOT EXISTS co_founder_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  conversation_type TEXT NOT NULL CHECK (conversation_type IN ('cofounder', 'worker')),
  worker_id TEXT,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  summary TEXT,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Guarantee exactly one persistent direct conversation per admin-worker pair
CREATE UNIQUE INDEX IF NOT EXISTS uq_co_founder_worker_conv 
  ON co_founder_conversations(user_id, worker_id) 
  WHERE conversation_type = 'worker';

-- Fast sidebar ordering index
CREATE INDEX IF NOT EXISTS idx_co_founder_conv_user_type 
  ON co_founder_conversations(user_id, conversation_type, last_message_at DESC);

-- Durable message history per conversation
CREATE TABLE IF NOT EXISTS co_founder_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES co_founder_conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'cofounder', 'worker', 'tool', 'system')),
  sender_id TEXT,
  worker_id TEXT,
  content TEXT NOT NULL DEFAULT '',
  content_type TEXT NOT NULL DEFAULT 'text',
  attachments JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for sequential message retrieval in conversations
CREATE INDEX IF NOT EXISTS idx_co_founder_msgs_conv_created 
  ON co_founder_messages(conversation_id, created_at ASC);

-- Worker-to-Worker / Co-Founder collaboration audit trace
CREATE TABLE IF NOT EXISTS co_founder_worker_collaborations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_id TEXT NOT NULL,
  root_conversation_id UUID REFERENCES co_founder_conversations(id) ON DELETE SET NULL,
  requester_id TEXT NOT NULL,
  target_worker_id TEXT NOT NULL,
  task TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'timeout')),
  findings JSONB DEFAULT '[]'::jsonb,
  duration_ms INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cf_collab_correlation 
  ON co_founder_worker_collaborations(correlation_id);

-- Enable RLS
ALTER TABLE co_founder_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE co_founder_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE co_founder_worker_collaborations ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
DROP POLICY IF EXISTS "Service role full access on co_founder_conversations" ON co_founder_conversations;
CREATE POLICY "Service role full access on co_founder_conversations"
  ON co_founder_conversations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on co_founder_messages" ON co_founder_messages;
CREATE POLICY "Service role full access on co_founder_messages"
  ON co_founder_messages FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on co_founder_worker_collaborations" ON co_founder_worker_collaborations;
CREATE POLICY "Service role full access on co_founder_worker_collaborations"
  ON co_founder_worker_collaborations FOR ALL USING (true) WITH CHECK (true);

