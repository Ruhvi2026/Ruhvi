import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const envFile = fs.readFileSync(path.resolve('.env.local'), 'utf8');
const env: Record<string, string> = {};
envFile.split('\n').forEach((line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabaseAdmin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function check() {
  const uid = 'mrlC5lcDsbSkv7W7JAKL4AHpgJ13';
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, email, firebase_uid')
    .eq('firebase_uid', uid)
    .maybeSingle();
  console.log('User found by firebase_uid:', data, error);
}
check();
