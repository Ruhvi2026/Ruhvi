import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const envFile = fs.readFileSync(path.resolve('.env.local'), 'utf8');
const env: Record<string, string> = {};
envFile.split('\n').forEach((line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

// Create client using the ANON key to simulate Vercel's potential misconfiguration
const supabaseAnon = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

async function testRpc() {
  const uid = 'mrlC5lcDsbSkv7W7JAKL4AHpgJ13';
  console.log('Querying via RLS directly with ANON key:');
  const { data: directData, error: directErr } = await supabaseAnon
    .from('users')
    .select('id')
    .eq('firebase_uid', uid)
    .maybeSingle();
  console.log('Direct Data:', directData, 'Error:', directErr);

  console.log('Querying via RPC with ANON key:');
  const { data: rpcData, error: rpcErr } = await supabaseAnon
    .rpc('get_user_profile', { p_user_id: uid })
    .maybeSingle();
  console.log('RPC Data:', rpcData, 'Error:', rpcErr);
}
testRpc();
