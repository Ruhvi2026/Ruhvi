'use client';

import React from 'react';

interface AutoLinkTextProps {
  text: string;
  className?: string;
  linkClassName?: string;
}

// Token types for parsed segments
type TokenType = 'text' | 'url' | 'email' | 'phone';

interface Token {
  type: TokenType;
  value: string;
  href?: string;
}

// Regex patterns
const URL_REGEX =
  /(?:https?:\/\/|www\.)[^\s<>"'{}|\\^`[\]]+|(?:meet\.google\.com|zoom\.us\/j|teams\.microsoft\.com)\/[^\s<>"'{}|\\^`[\]]+|\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+(?:com|in|org|net|app|io|co|dev|store|shop|me|site|live|ai|tech|online|xyz|info|biz|edu|gov|us|uk|ca|au|de|fr|ru|jp|cn|club|pro|vip|space|website|agency|world|top|guru|link|news|cloud|mobi|tv|cc|to|global|solutions|digital|today|works|company|community|services|studio|group|design|media|social|network|center|systems|academy|fashion|beauty|care|fit|health|cafe|bar|pub|rest|hotel|travel|page|click|review|express|zone|email|chat)\b(?::\d+)?(?:\/[^\s<>"'{}|\\^`[\]]*)?/gi;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
// Indian & International phone regex (matches +91 9876543210, 9876543210, +1-800-555-0199, etc.)
const PHONE_REGEX =
  /(?:(?:\+?91[\s-]?)?[6789]\d{4}[\s-]?\d{5}|\b\+?[1-9]\d{0,2}[-.\s]?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b)/g;

export function parseAutoLinks(text: string): Token[] {
  if (!text) return [];

  // Combined master regex with named or position matching
  // We can scan text and extract non-overlapping matches in order of index
  interface MatchItem {
    index: number;
    length: number;
    type: TokenType;
    value: string;
    href: string;
  }

  const matches: MatchItem[] = [];

  // Find all URLs
  let match: RegExpExecArray | null;
  const urlRe = new RegExp(URL_REGEX.source, 'gi');
  while ((match = urlRe.exec(text)) !== null) {
    if (match.index > 0 && text[match.index - 1] === '@') {
      continue;
    }

    let raw = match[0];
    const startIndex = match.index;

    while (raw.length > 0 && /[.,!?:;)"'\]]$/.test(raw)) {
      raw = raw.slice(0, -1);
    }
    if (!raw) continue;

    let href = raw;
    if (!href.startsWith('http://') && !href.startsWith('https://')) {
      href = 'https://' + href;
    }
    matches.push({
      index: startIndex,
      length: raw.length,
      type: 'url',
      value: raw,
      href,
    });
  }

  // Find all Emails
  const emailRe = new RegExp(EMAIL_REGEX.source, 'g');
  while ((match = emailRe.exec(text)) !== null) {
    const raw = match[0];
    matches.push({
      index: match.index,
      length: raw.length,
      type: 'email',
      value: raw,
      href: `mailto:${raw}`,
    });
  }

  // Find all Phone numbers
  const phoneRe = new RegExp(PHONE_REGEX.source, 'g');
  while ((match = phoneRe.exec(text)) !== null) {
    const raw = match[0];
    // Filter out simple numbers that are too short to be phone numbers
    const digitsOnly = raw.replace(/\D/g, '');
    if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
      matches.push({
        index: match.index,
        length: raw.length,
        type: 'phone',
        value: raw,
        href: `tel:${raw.replace(/[\s-]/g, '')}`,
      });
    }
  }

  // Sort matches by starting index
  matches.sort((a, b) => a.index - b.index);

  // Filter overlapping matches (e.g. email or url containing numbers)
  const nonOverlapping: MatchItem[] = [];
  let lastEnd = 0;
  for (const m of matches) {
    if (m.index >= lastEnd) {
      nonOverlapping.push(m);
      lastEnd = m.index + m.length;
    }
  }

  // Build final token array
  const tokens: Token[] = [];
  let cursor = 0;
  for (const m of nonOverlapping) {
    if (m.index > cursor) {
      tokens.push({
        type: 'text',
        value: text.slice(cursor, m.index),
      });
    }
    tokens.push({
      type: m.type,
      value: m.value,
      href: m.href,
    });
    cursor = m.index + m.length;
  }

  if (cursor < text.length) {
    tokens.push({
      type: 'text',
      value: text.slice(cursor),
    });
  }

  return tokens;
}

export default function AutoLinkText({
  text,
  className = '',
  linkClassName = '',
}: AutoLinkTextProps) {
  const tokens = parseAutoLinks(text);

  return (
    <span className={className}>
      {tokens.map((token, idx) => {
        if (token.type === 'url') {
          return (
            <a
              key={idx}
              href={token.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={`break-all font-medium text-emerald-400 underline underline-offset-2 transition-colors hover:text-emerald-300 ${linkClassName}`}
              title={`Open link: ${token.href}`}
            >
              {token.value}
            </a>
          );
        }

        if (token.type === 'email') {
          return (
            <a
              key={idx}
              href={token.href}
              onClick={(e) => e.stopPropagation()}
              className={`inline-flex items-center gap-0.5 break-all font-medium text-sky-400 underline underline-offset-2 transition-colors hover:text-sky-300 ${linkClassName}`}
              title={`Send email to ${token.value}`}
            >
              ✉️ {token.value}
            </a>
          );
        }

        if (token.type === 'phone') {
          return (
            <a
              key={idx}
              href={token.href}
              onClick={(e) => e.stopPropagation()}
              className={`inline-flex items-center gap-0.5 font-medium text-amber-300 underline underline-offset-2 transition-colors hover:text-amber-200 ${linkClassName}`}
              title={`Call ${token.value}`}
            >
              📞 {token.value}
            </a>
          );
        }

        return <React.Fragment key={idx}>{token.value}</React.Fragment>;
      })}
    </span>
  );
}
