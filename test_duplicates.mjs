import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function test() {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, firebase_uid, full_name')
    .ilike('email', 'ruhvi.main@gmail.com');
  
  console.log("Error:", error);
  console.log("Data count:", data?.length);
  console.log("Data:", data);
}

test();
