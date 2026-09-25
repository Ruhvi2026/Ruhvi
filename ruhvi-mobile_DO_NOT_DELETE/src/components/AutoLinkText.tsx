import React from 'react';
import { Text, StyleSheet, Linking, Alert } from 'react-native';

interface AutoLinkTextProps {
  text: string;
  style?: any;
  isMe?: boolean;
  onPressMention?: (mention: string) => void;
  onPressOrder?: (order: string) => void;
}

type TokenType = 'text' | 'url' | 'email' | 'phone' | 'mention' | 'order';

interface Token {
  type: TokenType;
  value: string;
  href?: string;
}

// Regex patterns
const URL_REGEX = /(?:https?:\/\/|www\.)[^\s<>"'{}|\\^`[\]]+|(?:meet\.google\.com|zoom\.us\/j|teams\.microsoft\.com)\/[^\s<>"'{}|\\^`[\]]+/gi;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
// Indian & International phone regex
const PHONE_REGEX = /(?:(?:\+?91[\s-]?)?[6789]\d{4}[\s-]?\d{5}|\b\+?[1-9]\d{0,2}[-.\s]?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b)/g;
// @Mentions (e.g. @Subhas, @support, @operations, @all)
const MENTION_REGEX = /@([a-zA-Z0-9_.-]+)/g;
// #Orders (e.g. #RUH-2026-8941, #8941)
const ORDER_REGEX = /#(RUH-[a-zA-Z0-9-]+|\d{4,12}|[A-Za-z0-9_-]{5,})/gi;

export function parseAutoLinks(text: string): Token[] {
  if (!text) return [];

  interface MatchItem {
    index: number;
    length: number;
    type: TokenType;
    value: string;
    href?: string;
  }

  const matches: MatchItem[] = [];

  // URLs
  let match: RegExpExecArray | null;
  const urlRe = new RegExp(URL_REGEX.source, 'gi');
  while ((match = urlRe.exec(text)) !== null) {
    const raw = match[0];
    let href = raw;
    if (!href.startsWith('http://') && !href.startsWith('https://')) {
      href = 'https://' + href;
    }
    matches.push({
      index: match.index,
      length: raw.length,
      type: 'url',
      value: raw,
      href,
    });
  }

  // Emails
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

  // Phone numbers
  const phoneRe = new RegExp(PHONE_REGEX.source, 'g');
  while ((match = phoneRe.exec(text)) !== null) {
    const raw = match[0];
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

  // Mentions (@user or @dept)
  const mentionRe = new RegExp(MENTION_REGEX.source, 'g');
  while ((match = mentionRe.exec(text)) !== null) {
    const raw = match[0];
    matches.push({
      index: match.index,
      length: raw.length,
      type: 'mention',
      value: raw,
    });
  }

  // Order references (#RUH-...)
  const orderRe = new RegExp(ORDER_REGEX.source, 'gi');
  while ((match = orderRe.exec(text)) !== null) {
    const raw = match[0];
    matches.push({
      index: match.index,
      length: raw.length,
      type: 'order',
      value: raw,
    });
  }

  matches.sort((a, b) => a.index - b.index);

  const nonOverlapping: MatchItem[] = [];
  let lastEnd = 0;
  for (const m of matches) {
    if (m.index >= lastEnd) {
      nonOverlapping.push(m);
      lastEnd = m.index + m.length;
    }
  }

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
  style,
  isMe = false,
  onPressMention,
  onPressOrder,
}: AutoLinkTextProps) {
  const tokens = parseAutoLinks(text);

  const handlePress = async (href?: string, label?: string) => {
    if (!href) return;
    try {
      const supported = await Linking.canOpenURL(href);
      if (supported) {
        await Linking.openURL(href);
      } else {
        await Linking.openURL(href);
      }
    } catch (err: any) {
      Alert.alert('Cannot Open', `Unable to open ${label || href}: ${err.message}`);
    }
  };

  return (
    <Text style={style}>
      {tokens.map((token, idx) => {
        if (token.type === 'url') {
          return (
            <Text
              key={idx}
              style={[styles.link, isMe ? styles.linkMe : styles.linkOther]}
              onPress={() => handlePress(token.href, 'link')}
            >
              {token.value}
            </Text>
          );
        }

        if (token.type === 'email') {
          return (
            <Text
              key={idx}
              style={[styles.email, isMe ? styles.emailMe : styles.emailOther]}
              onPress={() => handlePress(token.href, 'email')}
            >
              ✉️ {token.value}
            </Text>
          );
        }

        if (token.type === 'phone') {
          return (
            <Text
              key={idx}
              style={[styles.phone, isMe ? styles.phoneMe : styles.phoneOther]}
              onPress={() => handlePress(token.href, 'phone number')}
            >
              📞 {token.value}
            </Text>
          );
        }

        if (token.type === 'mention') {
          return (
            <Text
              key={idx}
              style={[styles.mention, isMe ? styles.mentionMe : styles.mentionOther]}
              onPress={() => onPressMention?.(token.value)}
            >
              {token.value}
            </Text>
          );
        }

        if (token.type === 'order') {
          return (
            <Text
              key={idx}
              style={[styles.order, isMe ? styles.orderMe : styles.orderOther]}
              onPress={() => onPressOrder?.(token.value)}
            >
              {token.value}
            </Text>
          );
        }

        return <Text key={idx}>{token.value}</Text>;
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  link: {
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  linkMe: {
    color: '#0D47A1',
  },
  linkOther: {
    color: '#0288D1',
  },
  email: {
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  emailMe: {
    color: '#1565C0',
  },
  emailOther: {
    color: '#0277BD',
  },
  phone: {
    textDecorationLine: 'underline',
    fontWeight: 'bold',
  },
  phoneMe: {
    color: '#00695C',
  },
  phoneOther: {
    color: '#00796B',
  },
  mention: {
    fontWeight: '700',
  },
  mentionMe: {
    color: '#004D40',
    backgroundColor: '#C8E6C9',
  },
  mentionOther: {
    color: '#0277BD',
    backgroundColor: '#E1F5FE',
  },
  order: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  orderMe: {
    color: '#BF360C',
    backgroundColor: '#FFCCBC',
  },
  orderOther: {
    color: '#E65100',
    backgroundColor: '#FFE0B2',
  },
});
