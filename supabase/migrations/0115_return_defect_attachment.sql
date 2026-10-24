-- =============================================================================
-- Migration: 0115_return_defect_attachment.sql
-- Description: Adds attachment_url column to public.returns for defect/damage
--              photo evidence uploaded by customers during return submission.
-- =============================================================================

ALTER TABLE public.returns
ADD COLUMN IF NOT EXISTS attachment_url text;

-- Add index if querying returns with photos
CREATE INDEX IF NOT EXISTS idx_returns_attachment_url 
  ON public.returns(attachment_url) 
  WHERE attachment_url IS NOT NULL;
