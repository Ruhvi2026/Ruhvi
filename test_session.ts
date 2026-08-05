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

async function testSessionQuery() {
  const uid = 'mrlC5lcDsbSkv7W7JAKL4AHpgJ13';
  console.log('Querying for firebase_uid:', uid);
  const { data: userProfile, error } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('firebase_uid', uid)
    .maybeSingle();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('userProfile:', userProfile);
  }
}
testSessionQuery();
