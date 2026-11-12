import type { EmailMessage } from '@/types/mailbox';
import type { RuhMailRoutingRule } from '@/types/mailbox';

export interface RoutingMatchResult {
  rule: RuhMailRoutingRule;
  matched: boolean;
  action: RuhMailRoutingRule['action'];
  action_value: string;
}

/**
 * Evaluates whether an incoming or processed email satisfies a routing rule.
 */
export function evaluateRoutingRule(
  rule: RuhMailRoutingRule,
  message: Pick<EmailMessage, 'from' | 'to' | 'subject' | 'attachments'>
): boolean {
  if (!rule.is_active) return false;

  let targetValue = '';
  if (rule.condition_field === 'from') {
    targetValue = (message.from?.email || '').toLowerCase();
  } else if (rule.condition_field === 'to') {
    targetValue = (message.to || [])
      .map((t) => t.email.toLowerCase())
      .join(',');
  } else if (rule.condition_field === 'subject') {
    targetValue = (message.subject || '').toLowerCase();
  } else if (rule.condition_field === 'has_attachment') {
    const hasAttachments = Boolean(
      message.attachments && message.attachments.length > 0
    );
    return rule.condition_value.toLowerCase() === 'true'
      ? hasAttachments
      : !hasAttachments;
  }

  const expected = rule.condition_value.toLowerCase();

  switch (rule.condition_op) {
    case 'contains':
      return targetValue.includes(expected);
    case 'equals':
      return targetValue === expected;
    case 'starts_with':
      return targetValue.startsWith(expected);
    default:
      return false;
  }
}

/**
 * Evaluates multiple rules in priority order (ascending priority number, e.g. 1 before 100)
 * Returns all rules that matched.
 */
export function processRoutingRules(
  rules: RuhMailRoutingRule[],
  message: Pick<EmailMessage, 'from' | 'to' | 'subject' | 'attachments'>
): RoutingMatchResult[] {
  const sorted = [...rules].sort((a, b) => a.priority - b.priority);
  const matches: RoutingMatchResult[] = [];

  for (const rule of sorted) {
    if (evaluateRoutingRule(rule, message)) {
      matches.push({
        rule,
        matched: true,
        action: rule.action,
        action_value: rule.action_value,
      });
    }
  }

  return matches;
}
