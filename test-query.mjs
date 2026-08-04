import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase
    .from('referrals')
    .select('id, status, coins_awarded, created_at, users!referrals_referred_user_id_fkey(full_name)')
    .limit(1);
    
  console.log('Query 1 Error:', error);

  const { data: d2, error: e2 } = await supabase
    .from('referrals')
    .select('id, status, coins_awarded, created_at, users!referred_user_id(full_name)')
    .limit(1);
    
  console.log('Query 2 Error:', e2);
}
run();