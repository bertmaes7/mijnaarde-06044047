-- Support pause/resume for bulk mailings sent via Brevo's daily send limit
ALTER TABLE public.mailings
  ADD COLUMN IF NOT EXISTS sent_member_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.mailings
  DROP CONSTRAINT IF EXISTS mailings_status_check;

ALTER TABLE public.mailings
  ADD CONSTRAINT mailings_status_check
  CHECK (status IN ('draft', 'scheduled', 'sent', 'failed', 'paused'));
