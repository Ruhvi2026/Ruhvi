import { maskPhoneNumber, maskCustomerName } from '../dispatcher';

describe('Proactive Dispatcher PII Protection & Masking', () => {
  describe('maskPhoneNumber', () => {
    it('correctly masks 10-digit Indian phone numbers', () => {
      expect(maskPhoneNumber('9830123482')).toBe('+91 98301 ••••82');
    });

    it('correctly masks 12-digit Indian phone numbers with 91 prefix', () => {
      expect(maskPhoneNumber('+919830123482')).toBe('+91 98301 ••••82');
      expect(maskPhoneNumber('919830123482')).toBe('+91 98301 ••••82');
    });

    it('handles null, undefined, or empty phone strings gracefully', () => {
      expect(maskPhoneNumber(null)).toBe('N/A');
      expect(maskPhoneNumber(undefined)).toBe('N/A');
      expect(maskPhoneNumber('')).toBe('N/A');
    });

    it('masks arbitrary length numbers securely', () => {
      expect(maskPhoneNumber('12345678')).toBe('+91 123••••78');
    });
  });

  describe('maskCustomerName', () => {
    it('masks full names to First Name + Last Initial', () => {
      expect(maskCustomerName('Priya Sharma')).toBe('Priya S.');
      expect(maskCustomerName('Ananya Mukherjee')).toBe('Ananya M.');
      expect(maskCustomerName('Rahul Dev Burman')).toBe('Rahul B.');
    });

    it('retains single names without breaking', () => {
      expect(maskCustomerName('Priya')).toBe('Priya');
    });

    it('falls back to "Customer" if null or empty', () => {
      expect(maskCustomerName(null)).toBe('Customer');
      expect(maskCustomerName('')).toBe('Customer');
      expect(maskCustomerName('   ')).toBe('Customer');
    });
  });
});
