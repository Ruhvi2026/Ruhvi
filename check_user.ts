import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const envFile = fs.readFileSync(path.resolve('.env.local'), 'utf8');
const env: Record<string, string> = {};
envFile.split('\n').forEach((line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function checkUser() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'ruhvi.main@gmail.com')
    .single();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Current User in DB:', data);
    console.log('Firebase UID in DB:', data.firebase_uid);
  }
}
checkUser();
