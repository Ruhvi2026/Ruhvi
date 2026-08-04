import { createClient } from '@supabase/supabase-js';
const url = 'https://igrkrkxdantrolbldapj.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlncmtya3hkYW50cm9sYmxkYXBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MzQ0NDIsImV4cCI6MjEwMTAxMDQ0Mn0.Ks0ZUolRtSKa57knTkV0GP5wDKS3kWKLcAzAKxSD2ko';
const supabase = createClient(url, key);
async function testLogin() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'ruhvi.main@gmail.com',
    password: 'S23081996s@'
  });
  if (error) console.error('Error:', error.message);
  else console.log('Success:', data.user?.email);
}
testLogin();
