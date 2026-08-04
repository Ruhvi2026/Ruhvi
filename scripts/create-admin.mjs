/**
 * ONE-TIME ADMIN SETUP SCRIPT
 * 
 * Run this ONCE to create the admin account in Supabase, then DELETE this file.
 * 
 * Usage:
 *   node scripts/create-admin.mjs
 * 
 * You need your SUPABASE_SERVICE_ROLE_KEY from:
 *   Supabase Dashboard → Project Settings → API → service_role (secret)
 */

const SUPABASE_URL = 'https://igrkrkxdantrolbldapj.supabase.co';

// ⚠️  PASTE YOUR SERVICE ROLE KEY BELOW (never commit this to git)
// Get it from: https://supabase.com/dashboard/project/igrkrkxdantrolbldapj/settings/api
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'PASTE_YOUR_SERVICE_ROLE_KEY_HERE';

const ADMIN_EMAIL = 'ruhvi.main@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'S23081996s@';

if (SUPABASE_SERVICE_ROLE_KEY === 'PASTE_YOUR_SERVICE_ROLE_KEY_HERE') {
  console.error('\n❌  ERROR: You must set SUPABASE_SERVICE_ROLE_KEY before running this script.');
  console.error('   Run: SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/create-admin.mjs\n');
  process.exit(1);
}

async function createAdminUser() {
  console.log(`\n🔐  Creating admin user: ${ADMIN_EMAIL}`);

  // Step 1: Create user in Supabase Auth (via Admin API)
  const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,       // Skip email verification — account is immediately active
      user_metadata: {
        full_name: 'Ruhvi Admin',
        role: 'admin',
      },
    }),
  });

  const authUser = await createRes.json();

  if (!createRes.ok) {
    if (authUser?.message?.includes('already registered') || authUser?.code === 'email_exists') {
      console.log(`ℹ️   User ${ADMIN_EMAIL} already exists in Auth. Proceeding to update role...\n`);
    } else {
      console.error('\n❌  Failed to create auth user:', JSON.stringify(authUser, null, 2));
      process.exit(1);
    }
  } else {
    console.log(`✅  Auth user created. UUID: ${authUser.id}`);
  }

  // Step 2: Look up user UUID (in case user already existed)
  const listRes = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=200`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    }
  );
  const listData = await listRes.json();
  const existingUser = listData?.users?.find((u) => u.email === ADMIN_EMAIL);
  const userId = existingUser?.id || authUser?.id;

  if (!userId) {
    console.error('❌  Could not resolve user UUID. Aborting.');
    process.exit(1);
  }

  console.log(`📋  Resolved user UUID: ${userId}`);

  // Step 3: Upsert into the public.users table with role = 'admin'
  const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      id: userId,
      email: ADMIN_EMAIL,
      full_name: 'Ruhvi Admin',
      role: 'admin',
      wallet_balance: 0,
      reward_coins: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
  });

  if (!upsertRes.ok) {
    const err = await upsertRes.text();
    console.error('\n❌  Failed to upsert user in public.users table:', err);
    console.error('    Make sure your public.users table has an "id" column that matches auth.users.id');
    process.exit(1);
  }

  console.log(`\n🎉  SUCCESS! Admin account is ready.`);
  console.log(`────────────────────────────────────`);
  console.log(`   Email   : ${ADMIN_EMAIL}`);
  console.log(`   Role    : admin`);
  console.log(`   UUID    : ${userId}`);
  console.log(`────────────────────────────────────`);
  console.log(`\n⚠️   IMPORTANT: Delete this script file now. Do NOT commit it to git.\n`);
}

createAdminUser().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
