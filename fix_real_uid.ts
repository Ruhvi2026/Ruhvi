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

async function fixRealUid() {
  const correctUid = 'mrICS1cDsbSkV7W7JAKL4AHpgJ13';
  console.log('Fetching existing user...');

  const { data: user, error: fetchErr } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('email', 'ruhvi.main@gmail.com')
    .single();

  if (fetchErr || !user) {
    console.error('Error fetching user:', fetchErr);
    return;
  }

  // Because of the UPDATE trigger crash, we still need to delete and re-insert
  console.log('Deleting existing user to bypass UPDATE trigger crash...');
  const { error: deleteErr } = await supabaseAdmin
    .from('users')
    .delete()
    .eq('id', user.id);

  if (deleteErr) {
    console.error('Delete error:', deleteErr);
    return;
  }

  console.log('Re-inserting user with CORRECT firebase_uid:', correctUid);
  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from('users')
    .insert({
      ...user,
      firebase_uid: correctUid,
    })
    .select()
    .single();

  if (insertErr) {
    console.error('Insert error:', insertErr);
  } else {
    console.log('Successfully re-inserted user with CORRECT UID!', inserted);
  }
}
fixRealUid();
