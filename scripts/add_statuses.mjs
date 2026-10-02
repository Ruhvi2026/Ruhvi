import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addStatuses() {
  const statuses = [
    { name: 'Accepted', description: 'Assignee has accepted the task', display_order: 6, color: '#8b5cf6' },
    { name: 'Updated', description: 'Intermediate status for updates', display_order: 7, color: '#f59e0b' },
  ];

  for (const status of statuses) {
    const { data, error } = await supabase
      .from('task_statuses')
      .upsert(status, { onConflict: 'name' });
      
    if (error) {
      console.error(`Error inserting ${status.name}:`, error);
    } else {
      console.log(`Successfully upserted ${status.name}`);
    }
  }
}

addStatuses();
