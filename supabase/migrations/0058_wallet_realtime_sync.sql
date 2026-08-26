-- Migration 0058: Enable realtime for wallet-related tables
-- The navbar (profile.wallet_balance) and wallet page (wallet_ledger) rely on
-- realtime subscriptions to reflect wallet balance changes without a full page
-- reload. Add the relevant tables to the supabase_realtime publication.

ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_ledger;
