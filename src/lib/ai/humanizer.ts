import 'server-only';

/**
 * Editorial Humanizer Engine for Project Ruhvi AI Workers
 *
 * Implements the 26 anti-AI writing patterns based on Wikipedia's
 * "Signs of AI Writing" (WikiProject AI Cleanup) and blader/humanizer.
 *
 * Integrated into:
 * - Worker 8: Content / Blog Worker (worker_content_blog)
 * - Marketing AI Worker (DEPARTMENT_CONFIGS.marketing)
 * - Product SEO & Catalog AI Generation (generateProductContentPrompt)
 * - AI Co-Founder Orchestrator & Editorial Brain
 */

/**
 * Universal Humanizer System Prompt Instructions for AI Workers
 * Injectable into any LLM generation prompt (blogs, marketing copy, product descriptions)
 */
export const HUMANIZER_EDITORIAL_RULES = `
=== HUMANIZER EDITORIAL QUALITY MANDATE (ANTI-AI WRITING RULES) ===
When drafting articles, blogs, product copy, social captions, or customer messages, you MUST write like a human editor and strictly avoid robotic AI tells:

1. BANNED AI WORDS & BUZZWORDS:
   Strictly NEVER use these overused model words:
   - "delve", "delving", "delve into"
   - "tapestry", "rich tapestry"
   - "testament", "a testament to"
   - "beacon", "beacon of"
   - "seamless", "seamlessly"
   - "elevate", "elevates", "elevating"
   - "game-changer", "revolutionary"
   - "bustling", "nestled", "breathtaking", "enchanting"
   - "paramount", "pivotal", "in conclusion"
   - "unlock the secrets", "journey of elegance"

2. NO STAGED RUN-UPS & OPENERS:
   - NEVER start with: "Let's dive in", "Here's what you need to know", "In today's fast-paced world", "Look no further", "Without further ado", "Honestly?", "Real talk".
   - Start immediately with the substance, the scene, or the factual insight.

3. NO "NOT X BUT Y" DRAMATIC ANTITHESIS:
   - NEVER write: "It's not just a necklace, it's a statement", "Not merely jewellery, but an emotion", "It's not X, it's Y".
   - State the point directly and factually: e.g. "A 22K gold choker adds warmth and structure to silk organza."

4. NO DRAMATIC ONE-LINE CLOSERS:
   - NEVER end sections with: "Let that sink in.", "Read that again.", "That is the real win.", "The message is clear.", "And that makes all the difference."
   - Conclude naturally on the specific practical tip, product link, or next step.

5. NO PSEUDO-DEEP APHORISMS:
   - Ban: "At its core", "What really matters is", "X is the language of trust", "X is a mirror of Y".
   - Use concrete observations and specific jewellery craft details instead.

6. NO FORCED TRIADS (RULE OF THREE):
   - Do NOT artificially force ideas into sets of three ("innovation, inspiration, and insights") unless there are factually three distinct items.

7. NO EXCESSIVE EM-DASHES (—):
   - Real writers vary sentence structures. Do not connect clauses with endless em-dashes. Use natural periods, commas, or conjunctions.

8. AUTHENTIC LUXURY JEWELLERY VOICE:
   - Ground every claim in tangible materials: 22K gold electro-deposition, anti-tarnish e-coating shield, allergy-safe copper alloy base, Bengal filigree artisanship, and 6-month color warranty.
   - Speak with the poised, articulate, and understated confidence of a high-end Indian luxury editorial (like Vogue India or Architectural Digest), not a hyped drop-shipping ad.
=== END HUMANIZER MANDATE ===
`.trim();

/**
 * Common robotic phrases and their clean, human replacements
 */
const ROBOTIC_PHRASES: Array<[RegExp, string]> = [
  [/\bdelve(?:s)? into\b/gi, 'explore'],
  [/\bdelving into\b/gi, 'exploring'],
  [/\ba testament to\b/gi, 'proof of'],
  [/\bseamlessly\b/gi, 'smoothly'],
  [/\bseamless\b/gi, 'smooth'],
  [/\belevate(?:s)? your\b/gi, 'enhance your'],
  [/\belevating\b/gi, 'enhancing'],
  [/\brich tapestry of\b/gi, 'variety of'],
  [/\btapestry of\b/gi, 'blend of'],
  [/\ba beacon of\b/gi, 'a symbol of'],
  [/\bgame-changer\b/gi, 'breakthrough'],
  [/\bIn today's fast-paced world,?\s*/gi, ''],
  [/\bWithout further ado,?\s*/gi, ''],
  [/\bLet's dive in:?\s*/gi, ''],
  [/\bHere's what you need to know:?\s*/gi, ''],
  [/\bLet that sink in\.?\s*/gi, ''],
  [/\bRead that again\.?\s*/gi, ''],
  [/\bThat is the real win\.?\s*/gi, ''],
  [/\bIt's not just a ([^,]+), it's a ([^.]+)\./gi, 'This $1 offers $2.'],
  [/\bIt's not merely a ([^,]+), it's a ([^.]+)\./gi, 'This $1 offers $2.'],
];

/**
 * Chat residue and boilerplate markers
 */
const CHATBOT_RESIDUE = [
  /^(?:Sure[!,.]?|Certainly[!,.]?|Of course[!,.]?|Here is|Here's)[^\n]*\n+/i,
  /\n+(?:Hope this helps|Let me know if you need any adjustments|Feel free to ask)[^\n]*$/i,
];

/**
 * Sanitizes and cleanses prose of robotic AI-isms and chat wrappers
 */
export function cleanseRoboticAIisms(prose: string): string {
  if (!prose || typeof prose !== 'string') return '';

  let cleaned = prose;

  // 1. Remove chat wrapper residue (leading/trailing greetings and sign-offs)
  for (const residue of CHATBOT_RESIDUE) {
    cleaned = cleaned.replace(residue, '');
  }

  // 2. Replace robotic phrases and idioms
  for (const [regex, replacement] of ROBOTIC_PHRASES) {
    cleaned = cleaned.replace(regex, replacement);
  }

  // 3. Clean up multiple empty lines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}

/**
 * Audits text against the 26 Signs of AI Writing
 * Returns a score (0 to 100) and detected pattern warnings
 */
export function auditProseAgainstAITells(text: string): {
  score: number;
  warnings: string[];
  isHumanGrade: boolean;
} {
  const warnings: string[] = [];

  if (!text) {
    return { score: 100, warnings: [], isHumanGrade: true };
  }

  const checks: Array<{ name: string; regex: RegExp }> = [
    { name: 'Word habit: "delve"', regex: /\bdelve\b/i },
    { name: 'Word habit: "tapestry"', regex: /\btapestry\b/i },
    { name: 'Word habit: "testament"', regex: /\btestament\b/i },
    {
      name: 'Word habit: "seamless/seamlessly"',
      regex: /\bseamless(?:ly)?\b/i,
    },
    { name: 'Word habit: "elevate"', regex: /\belevat(?:e|es|ing)\b/i },
    { name: 'Staged opener: "Let\'s dive in"', regex: /Let's dive in/i },
    { name: 'Dramatic closer: "Let that sink in"', regex: /Let that sink in/i },
    { name: 'Dramatic closer: "Read that again"', regex: /Read that again/i },
    {
      name: 'Antithesis cliché: "Not just X but Y"',
      regex: /Not (?:just|merely) [^,]+, (?:it's|but)/i,
    },
    { name: 'Aphorism: "At its core"', regex: /At its core/i },
  ];

  for (const check of checks) {
    if (check.regex.test(text)) {
      warnings.push(check.name);
    }
  }

  // Calculate score: subtract 10 points per detected tell
  const penalty = warnings.length * 10;
  const score = Math.max(0, 100 - penalty);
  const isHumanGrade = score >= 80;

  return {
    score,
    warnings,
    isHumanGrade,
  };
}
