import {
  GIA_SYSTEM_IDENTITY,
  GIA_HUMAN_CONVERSATION_GUIDELINES,
  cleanseGiaResponse,
} from '../gia-conversation';

describe('GIA Human Conversation Skill & Sanitizer', () => {
  describe('Prompt Constants & Guidelines', () => {
    it('should define GIA atelier heritage and Jaipur identity', () => {
      expect(GIA_SYSTEM_IDENTITY).toContain('Golden Concierge');
      expect(GIA_SYSTEM_IDENTITY).toContain('Johari Bazaar, Jaipur');
      expect(GIA_SYSTEM_IDENTITY).toContain('karigars');
    });

    it('should mandate direct openings and forbid robotic openings', () => {
      expect(GIA_HUMAN_CONVERSATION_GUIDELINES).toContain('Open directly');
      expect(GIA_HUMAN_CONVERSATION_GUIDELINES).toContain(
        'Thank you for reaching out'
      );
      expect(GIA_HUMAN_CONVERSATION_GUIDELINES).toContain('Close naturally');
    });

    it('should explicitly support Bengali and Banglish', () => {
      expect(GIA_HUMAN_CONVERSATION_GUIDELINES).toContain('Banglish');
      expect(GIA_HUMAN_CONVERSATION_GUIDELINES).toContain('বাংলা লিপি');
      expect(GIA_HUMAN_CONVERSATION_GUIDELINES).toContain('Ei pendant-tar dam');
    });

    it('should mandate strict zero-hallucination rules', () => {
      expect(GIA_HUMAN_CONVERSATION_GUIDELINES).toContain(
        'STRICT FACTUAL INTEGRITY'
      );
      expect(GIA_HUMAN_CONVERSATION_GUIDELINES).toContain(
        'NEVER invent or guess'
      );
    });
  });

  describe('cleanseGiaResponse', () => {
    it('should strip robotic opening "Thank you for reaching out to Ruhvi!"', () => {
      const raw =
        'Thank you for reaching out to Ruhvi! This 18KT pendant is ₹14,500.';
      const cleaned = cleanseGiaResponse(raw);
      expect(cleaned).toBe('This 18KT pendant is ₹14,500.');
    });

    it('should strip "Of course!" and "Certainly!" openings', () => {
      const raw = 'Of course! Let me check the order status for you.';
      const cleaned = cleanseGiaResponse(raw);
      expect(cleaned).toBe('Let me check the order status for you.');
    });

    it('should strip robotic ending "Is there anything else I can help you with today?"', () => {
      const raw =
        'The necklace is crafted with solid 14KT yellow gold. Is there anything else I can help you with today?';
      const cleaned = cleanseGiaResponse(raw);
      expect(cleaned).toBe(
        'The necklace is crafted with solid 14KT yellow gold.'
      );
    });

    it('should strip forced atelier closing "Until we meet at the atelier."', () => {
      const raw =
        'We offer complimentary express delivery across India. Until we meet at the atelier.';
      const cleaned = cleanseGiaResponse(raw);
      expect(cleaned).toBe(
        'We offer complimentary express delivery across India.'
      );
    });

    it('should preserve natural Banglish responses', () => {
      const banglish =
        'Ei necklace-tar dam ₹24,000 ebong eta 18KT hallmarked gold-e toiri.';
      expect(cleanseGiaResponse(banglish)).toBe(banglish);
    });

    it('should handle empty or null values gracefully', () => {
      expect(cleanseGiaResponse('')).toBe('');
      expect(cleanseGiaResponse(null as any)).toBeNull();
      expect(cleanseGiaResponse(undefined as any)).toBeUndefined();
    });
  });
});
