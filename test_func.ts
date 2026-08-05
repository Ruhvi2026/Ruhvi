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

async function getFunctionDef() {
  const uid = 'mrlC5lcDsbSkv7W7JAKL4AHpgJ13';
  const { data, error } = await supabaseAdmin.rpc('get_user_profile', {
    p_user_id: uid,
  });
  console.log('Array or object?', Array.isArray(data));
  console.log('Test call data:', data);

  const { data: maybeSingleData } = await supabaseAdmin
    .rpc('get_user_profile', { p_user_id: uid })
    .maybeSingle();
  console.log('MaybeSingle call data:', maybeSingleData);
}
getFunctionDef();
