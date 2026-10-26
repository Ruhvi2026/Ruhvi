jest.mock('server-only', () => ({}));

import {
  cleanseRoboticAIisms,
  auditProseAgainstAITells,
  HUMANIZER_EDITORIAL_RULES,
} from '../humanizer';

describe('AI Editorial Humanizer Engine', () => {
  it('defines comprehensive editorial rules for AI worker prompts', () => {
    expect(HUMANIZER_EDITORIAL_RULES).toContain('BANNED AI WORDS');
    expect(HUMANIZER_EDITORIAL_RULES).toContain('delve');
    expect(HUMANIZER_EDITORIAL_RULES).toContain('tapestry');
    expect(HUMANIZER_EDITORIAL_RULES).toContain('NOT X BUT Y');
    expect(HUMANIZER_EDITORIAL_RULES).toContain('Let that sink in');
  });

  describe('cleanseRoboticAIisms', () => {
    it('removes chat wrappers and robotic preamble', () => {
      const raw =
        'Sure! Here is the complete SEO blog post:\n\nAuthentic 22K gold jewellery requires gentle care.\n\nHope this helps!';
      const cleaned = cleanseRoboticAIisms(raw);
      expect(cleaned).not.toContain('Sure! Here is');
      expect(cleaned).not.toContain('Hope this helps');
      expect(cleaned).toContain(
        'Authentic 22K gold jewellery requires gentle care.'
      );
    });

    it('cleanses banned AI idioms and dramatic one-line closers', () => {
      const raw =
        "In today's fast-paced world, let's dive in. We will delve into anti-tarnish jewellery. It is a testament to Bengal craftsmanship. Let that sink in.";
      const cleaned = cleanseRoboticAIisms(raw);
      expect(cleaned).not.toContain("In today's fast-paced world");
      expect(cleaned).not.toContain("let's dive in");
      expect(cleaned).not.toContain('delve into');
      expect(cleaned).not.toContain('Let that sink in');
      expect(cleaned).toContain('explore');
    });

    it('handles empty or non-string inputs safely', () => {
      expect(cleanseRoboticAIisms('')).toBe('');
      expect(cleanseRoboticAIisms(null as any)).toBe('');
    });
  });

  describe('auditProseAgainstAITells', () => {
    it('awards human-grade score to clean, craft-focused jewellery copy', () => {
      const prose =
        'Ruhvi necklaces are electro-plated with 22K gold over an allergy-safe copper alloy base. An invisible e-coating barrier shields the surface against daily oxidation and humidity.';
      const audit = auditProseAgainstAITells(prose);
      expect(audit.isHumanGrade).toBe(true);
      expect(audit.score).toBe(100);
      expect(audit.warnings).toHaveLength(0);
    });

    it('penalizes score and flags specific AI tells when present', () => {
      const prose =
        'Delve into the enchanting tapestry of our collection—it is a testament to timeless elegance. Let that sink in.';
      const audit = auditProseAgainstAITells(prose);
      expect(audit.isHumanGrade).toBe(false);
      expect(audit.score).toBeLessThan(80);
      expect(audit.warnings.length).toBeGreaterThanOrEqual(3);
      expect(audit.warnings.some((w) => w.includes('delve'))).toBe(true);
      expect(audit.warnings.some((w) => w.includes('tapestry'))).toBe(true);
      expect(audit.warnings.some((w) => w.includes('testament'))).toBe(true);
    });
  });
});
