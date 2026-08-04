import { createClient } from '@supabase/supabase-js';

const url = 'https://igrkrkxdantrolbldapj.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlncmtya3hkYW50cm9sYmxkYXBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MzQ0NDIsImV4cCI6MjEwMTAxMDQ0Mn0.Ks0ZUolRtSKa57knTkV0GP5wDKS3kWKLcAzAKxSD2ko';

const supabase = createClient(url, key);

async function signUpAdmin() {
  console.log('Attempting to create user ruhvi.main@gmail.com...');
  const { data, error } = await supabase.auth.signUp({
    email: 'ruhvi.main@gmail.com',
    password: 'S23081996s@',
    options: {
      data: {
        full_name: 'Ruhvi Admin',
        role: 'admin'
      }
    }
  });

  if (error) {
    console.error('Error creating user:', error.message);
  } else {
    console.log('User created or already exists.');
    console.log('ID:', data.user?.id);
    console.log('Identity:', data.user?.identities?.length ? 'Created new identity' : 'Identity already existed');
    if (data.session) {
      console.log('Session returned (email confirmation disabled)');
    } else {
      console.log('No session returned (email confirmation might be required, or user already exists)');
    }
  }
}

signUpAdmin();
