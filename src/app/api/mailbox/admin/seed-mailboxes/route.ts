import { NextResponse } from 'next/server';
import { queryMailflareD1 } from '@/lib/mailbox/d1-client';

export const dynamic = 'force-dynamic';

const SCHEMA_STATEMENTS: Array<{ name: string; sql: string }> = [
  {
    name: 'ruhmail_mailboxes',
    sql: `CREATE TABLE IF NOT EXISTS ruhmail_mailboxes (
      id TEXT PRIMARY KEY,
      local_part TEXT NOT NULL UNIQUE,
      display_name TEXT,
      domain TEXT DEFAULT 'ruhvi.in',
      mailbox_type TEXT DEFAULT 'personal',
      created_at INTEGER DEFAULT (unixepoch()),
      is_active INTEGER DEFAULT 1
    )`,
  },
  {
    name: 'ruhmail_members',
    sql: `CREATE TABLE IF NOT EXISTS ruhmail_members (
      id TEXT PRIMARY KEY,
      mailbox_id TEXT NOT NULL,
      staff_uid TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      can_send INTEGER DEFAULT 1,
      can_delete INTEGER DEFAULT 0,
      added_at INTEGER DEFAULT (unixepoch())
    )`,
  },
  {
    name: 'ruhmail_signatures',
    sql: `CREATE TABLE IF NOT EXISTS ruhmail_signatures (
      id TEXT PRIMARY KEY,
      mailbox_id TEXT,
      staff_uid TEXT,
      name TEXT NOT NULL,
      html TEXT NOT NULL,
      is_default INTEGER DEFAULT 0
    )`,
  },
  {
    name: 'ruhmail_auto_reply',
    sql: `CREATE TABLE IF NOT EXISTS ruhmail_auto_reply (
      mailbox_id TEXT PRIMARY KEY,
      enabled INTEGER DEFAULT 0,
      subject TEXT,
      body TEXT,
      start_date TEXT,
      end_date TEXT
    )`,
  },
  {
    name: 'ruhmail_labels',
    sql: `CREATE TABLE IF NOT EXISTS ruhmail_labels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#10b981',
      created_at INTEGER DEFAULT (unixepoch())
    )`,
  },
  {
    name: 'ruhmail_message_labels',
    sql: `CREATE TABLE IF NOT EXISTS ruhmail_message_labels (
      message_id TEXT,
      label_id TEXT,
      PRIMARY KEY (message_id, label_id)
    )`,
  },
  {
    name: 'ruhmail_routing_rules',
    sql: `CREATE TABLE IF NOT EXISTS ruhmail_routing_rules (
      id TEXT PRIMARY KEY,
      priority INTEGER DEFAULT 100,
      condition_field TEXT NOT NULL,
      condition_op TEXT NOT NULL,
      condition_value TEXT NOT NULL,
      action TEXT NOT NULL,
      action_value TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (unixepoch())
    )`,
  },
  {
    name: 'ruhmail_calendar_events',
    sql: `CREATE TABLE IF NOT EXISTS ruhmail_calendar_events (
      id TEXT PRIMARY KEY,
      mailbox_id TEXT,
      staff_uid TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      location TEXT,
      start_time INTEGER NOT NULL,
      end_time INTEGER NOT NULL,
      all_day INTEGER DEFAULT 0,
      attendees TEXT,
      status TEXT DEFAULT 'confirmed',
      ics_uid TEXT,
      created_at INTEGER DEFAULT (unixepoch())
    )`,
  },
  {
    name: 'ruhmail_booking_pages',
    sql: `CREATE TABLE IF NOT EXISTS ruhmail_booking_pages (
      id TEXT PRIMARY KEY,
      staff_uid TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      duration_minutes INTEGER DEFAULT 30,
      buffer_minutes INTEGER DEFAULT 10,
      available_days TEXT DEFAULT '["mon","tue","wed","thu","fri"]',
      available_start TEXT DEFAULT '10:00',
      available_end TEXT DEFAULT '18:00',
      timezone TEXT DEFAULT 'Asia/Kolkata',
      is_active INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (unixepoch())
    )`,
  },
  {
    name: 'ruhmail_bookings',
    sql: `CREATE TABLE IF NOT EXISTS ruhmail_bookings (
      id TEXT PRIMARY KEY,
      page_id TEXT NOT NULL,
      guest_name TEXT NOT NULL,
      guest_email TEXT NOT NULL,
      start_time INTEGER NOT NULL,
      end_time INTEGER NOT NULL,
      notes TEXT,
      status TEXT DEFAULT 'confirmed',
      created_at INTEGER DEFAULT (unixepoch())
    )`,
  },
  {
    name: 'ruhmail_drive_folders',
    sql: `CREATE TABLE IF NOT EXISTS ruhmail_drive_folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_uid TEXT NOT NULL,
      parent_id TEXT,
      created_at INTEGER DEFAULT (unixepoch())
    )`,
  },
  {
    name: 'ruhmail_drive_files',
    sql: `CREATE TABLE IF NOT EXISTS ruhmail_drive_files (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_uid TEXT NOT NULL,
      r2_key TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      content_type TEXT NOT NULL,
      folder_id TEXT,
      is_public INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (unixepoch())
    )`,
  },
];

const SEED_SQL = `INSERT OR IGNORE INTO ruhmail_mailboxes (id, local_part, display_name, mailbox_type)
VALUES 
  ('mbx_shreya', 'shreya.maity', 'Shreya Maity', 'personal'),
  ('mbx_support', 'support', 'Support Team', 'shared'),
  ('mbx_admin', 'admin', 'Admin', 'personal'),
  ('mbx_sales', 'sales', 'Sales', 'shared')`;

export async function GET() {
  const results: Array<{ table: string; success: boolean; error?: string }> =
    [];

  for (const { name, sql } of SCHEMA_STATEMENTS) {
    try {
      await queryMailflareD1(sql);
      results.push({ table: name, success: true });
    } catch (err) {
      results.push({
        table: name,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Seed default mailboxes
  try {
    await queryMailflareD1(SEED_SQL);
    results.push({ table: 'seed_mailboxes', success: true });
  } catch (err) {
    results.push({
      table: 'seed_mailboxes',
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const allSuccess = results.every((r) => r.success);
  return NextResponse.json({
    success: allSuccess,
    message: allSuccess
      ? 'RuhMail schema and seed data applied successfully.'
      : 'Some steps failed — check results.',
    results,
  });
}
