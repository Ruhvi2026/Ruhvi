const { createClient } = require('@supabase/supabase-js');
const pkg = require('@next/env');
const { resolve } = require('path');

// Load env vars
pkg.loadEnvConfig(resolve(__dirname, '../'));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Fetching a user to assign the ticket to...');
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id')
    .limit(1);

  if (userError || !users || users.length === 0) {
    console.error('Error fetching user:', userError);
    return;
  }

  const userId = users[0].id;
  console.log(`Using user ID: ${userId}`);

  console.log('Creating a test ticket...');
  const { data: ticket, error: ticketError } = await supabase
    .from('support_tickets')
    .insert({
      customer_id: userId,
      title: 'Test Ticket from Script',
      description:
        'This is a test ticket generated via script to verify the support ticket queue functionality.',
      priority: 'high',
      source: 'manual',
      ai_created: false,
      status: 'new',
    })
    .select('id, ticket_number')
    .single();

  if (ticketError) {
    console.error('Error creating ticket:', ticketError);
    return;
  }

  console.log('Ticket created successfully:', ticket);

  console.log('Adding initial message...');
  const { error: msgError } = await supabase.from('support_messages').insert({
    ticket_id: ticket.id,
    sender_type: 'customer',
    sender_id: userId,
    message:
      'This is a test ticket generated via script to verify the support ticket queue functionality.',
    visibility: 'customer',
  });

  if (msgError) {
    console.error('Error adding message:', msgError);
    return;
  }

  console.log('Adding audit log...');
  await supabase.from('support_audit_logs').insert({
    ticket_id: ticket.id,
    actor_id: userId,
    actor_type: 'customer',
    action: 'ticket_created',
    new_value: { ticket_number: ticket.ticket_number, source: 'manual' },
  });

  console.log('Test ticket setup complete!');
}

main().catch(console.error);
