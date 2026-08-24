import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require('@next/env');
const { createClient } = require('@supabase/supabase-js');

const projectDir = import.meta.dirname
  ? `${import.meta.dirname}/..`
  : process.cwd();

loadEnvConfig(projectDir);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

const PREFIX = 'enc:v1';

async function main() {
  console.log('Fetching credentials with plaintext keys...');

  const { data: credentials, error } = await supabase
    .from('ai_provider_credentials')
    .select('id, provider_id, display_name, encrypted_key')
    .order('provider_id', { ascending: true });

  if (error) {
    console.error('Error fetching credentials:', error.message);
    process.exit(1);
  }

  if (!credentials || credentials.length === 0) {
    console.log('No credentials found.');
    return;
  }

  const plaintext = credentials.filter(
    (c: any) => c.encrypted_key && !c.encrypted_key.startsWith(PREFIX)
  );

  if (plaintext.length === 0) {
    console.log('All credentials are already encrypted. Nothing to do.');
    return;
  }

  console.log(
    `Found ${plaintext.length} plaintext credentials out of ${credentials.length} total.`
  );

  const { encryptApiKey } = await import('../src/lib/ai/credential-encryption.ts');

  let success = 0;
  let failed = 0;

  for (const cred of plaintext) {
    const encryptedKey = encryptApiKey(cred.encrypted_key);

    const { error: updateError } = await supabase
      .from('ai_provider_credentials')
      .update({ encrypted_key: encryptedKey })
      .eq('id', cred.id);

    if (updateError) {
      console.error(
        `  x ${cred.provider_id}/${cred.display_name}: ${updateError.message}`
      );
      failed++;
    } else {
      console.log(`  ok ${cred.provider_id}/${cred.display_name}`);
      success++;
    }
  }

  console.log(
    `\nDone. Encrypted ${success} credentials${failed ? `, ${failed} failed` : ''}.`
  );
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});