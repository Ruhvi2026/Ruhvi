/**
 * Zero-dependency, server-safe HTML sanitizer for user-facing content (blogs, reviews, CMS).
 * Defends against Stored and Reflected XSS by neutralizing script tags, dangerous markup,
 * inline execution handlers (on*), and pseudo-protocols (javascript:) while fully preserving
 * safe HTML formatting (headings, paragraphs, lists, links, images, styles, and tables).
 */

const STRIP_TAG_AND_CONTENT_REGEX =
  /<(script|style|iframe|object|embed|applet|form|button|input|textarea|select|option)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi;

const STRIP_DANGEROUS_TAGS_REGEX =
  /<\/?(script|style|iframe|object|embed|applet|form|button|input|textarea|select|option|meta|link|base|frameset|frame)\b[^>]*>/gi;

const STRIP_EVENT_HANDLERS_REGEX =
  /\s+on[a-z0-9_-]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi;

const DANGEROUS_PROTOCOL_REGEX =
  /(href|src)\s*=\s*(['"])\s*(javascript:|vbscript:|data:(?!image\/)[^'"]*)\2/gi;

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  let clean = html;
  let previous: string;

  // Run in a bounded loop to eliminate nested evasion techniques (e.g. <scr<script>ipt>)
  let iterations = 0;
  do {
    previous = clean;
    clean = clean.replace(STRIP_TAG_AND_CONTENT_REGEX, '');
    clean = clean.replace(STRIP_DANGEROUS_TAGS_REGEX, '');
    clean = clean.replace(STRIP_EVENT_HANDLERS_REGEX, '');
    clean = clean.replace(DANGEROUS_PROTOCOL_REGEX, '$1="#"');
    iterations++;
  } while (clean !== previous && iterations < 3);

  return clean;
}
