import type { EmailAddress, EmailMessage } from '@/types/mailbox';

export function parseEmailAddress(raw: string): EmailAddress {
  if (!raw) return { email: '' };
  const trimmed = raw.trim();
  const match = trimmed.match(/^(?:"?([^"]*)"?\s)?(?:<?(.+@[^>]+)>?)$/);
  if (match) {
    const name = match[1]?.trim();
    const email = match[2]?.trim() || trimmed;
    return { name: name || undefined, email };
  }
  return { email: trimmed };
}

export function parseEmailList(raw: string): EmailAddress[] {
  if (!raw) return [];
  // Split by comma or semicolon, handling possible commas within quotes
  const parts = raw.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
  return parts
    .map((p) => parseEmailAddress(p.trim()))
    .filter((a) => Boolean(a.email));
}

export function mapD1MessageToEmailMessage(
  row: Record<string, unknown>
): EmailMessage {
  const fromAddr = String(row.from_addr || '');
  const toAddr = String(row.to_addr || '');
  const ccAddr = row.cc_addr ? String(row.cc_addr) : undefined;
  const bccAddr = row.bcc_addr ? String(row.bcc_addr) : undefined;
  const createdAtSec = Number(row.created_at || 0);
  const dateIso =
    createdAtSec > 0
      ? new Date(createdAtSec * 1000).toISOString()
      : new Date().toISOString();

  let sentBy: any = undefined;
  if (row.references_header) {
    try {
      const parsed = JSON.parse(String(row.references_header));
      if (parsed.sentBy) sentBy = parsed.sentBy;
    } catch {}
  }

  return {
    id: String(row.id || ''),
    mailboxId: row.mailbox_id ? String(row.mailbox_id) : undefined,
    direction: row.direction === 'outbound' ? 'outbound' : 'inbound',
    from: parseEmailAddress(fromAddr),
    to: parseEmailList(toAddr),
    cc: ccAddr ? parseEmailList(ccAddr) : undefined,
    bcc: bccAddr ? parseEmailList(bccAddr) : undefined,
    subject: String(row.subject || '(No Subject)'),
    snippet: String(row.snippet || ''),
    bodyText: row.text_body ? String(row.text_body) : undefined,
    bodyHtml: row.html_body ? String(row.html_body) : undefined,
    date: dateIso,
    createdAt: createdAtSec,
    read: Boolean(row.read),
    starred: Boolean(row.starred),
    status: row.status ? String(row.status) : undefined,
    threadId: row.thread_id ? String(row.thread_id) : undefined,
    sentBy,
  };
}
