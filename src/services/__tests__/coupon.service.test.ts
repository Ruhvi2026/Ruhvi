import { CouponService, CouponRecord } from '../coupon.service';

describe('CouponService', () => {
  describe('calculateDiscount', () => {
    it('calculates flat discount correctly', () => {
      const coupon: CouponRecord = {
        code: 'FLAT100',
        discount_type: 'flat',
        discount_value: 100,
      };
      expect(CouponService.calculateDiscount(coupon, 1000)).toBe(100);
    });

    it('calculates fixed discount correctly when using type and value aliases', () => {
      const coupon: CouponRecord = {
        code: 'FIXED50',
        type: 'fixed',
        value: 50,
      };
      expect(CouponService.calculateDiscount(coupon, 500)).toBe(50);
    });

    it('calculates percentage discount correctly without cap', () => {
      const coupon: CouponRecord = {
        code: 'PERCENT10',
        discount_type: 'percentage',
        discount_value: 10,
      };
      expect(CouponService.calculateDiscount(coupon, 1500)).toBe(150);
    });

    it('caps percentage discount when max_discount is provided', () => {
      const coupon: CouponRecord = {
        code: 'PERCENT20CAP',
        discount_type: 'percentage',
        discount_value: 20,
        max_discount: 200,
      };
      // 20% of 2000 is 400, but capped at 200
      expect(CouponService.calculateDiscount(coupon, 2000)).toBe(200);
      // 20% of 500 is 100, which is below cap of 200
      expect(CouponService.calculateDiscount(coupon, 500)).toBe(100);
    });

    it('caps percentage discount when usage_limit_discount is used as alias', () => {
      const coupon: CouponRecord = {
        code: 'PERCENT20ALIAS',
        discount_type: 'percentage',
        discount_value: 20,
        usage_limit_discount: 150,
      };
      expect(CouponService.calculateDiscount(coupon, 2000)).toBe(150);
    });

    it('returns 0 when discount calculation is negative or invalid', () => {
      const coupon: CouponRecord = {
        code: 'ZERO',
        discount_type: 'flat',
        discount_value: -50,
      };
      expect(CouponService.calculateDiscount(coupon, 500)).toBe(0);
    });
  });

  describe('validateCouponRecord', () => {
    it('returns 404 for null or undefined coupon', () => {
      const result = CouponService.validateCouponRecord(null, {
        code: 'NOTFOUND',
        subtotal: 1000,
      });
      expect(result.valid).toBe(false);
      expect(result.status).toBe(404);
      expect(result.error).toBe('Invalid or unrecognized coupon code.');
    });

    it('returns 400 for inactive coupon (active: false)', () => {
      const coupon: CouponRecord = {
        code: 'INACTIVE',
        active: false,
      };
      const result = CouponService.validateCouponRecord(coupon, {
        code: 'INACTIVE',
        subtotal: 1000,
      });
      expect(result.valid).toBe(false);
      expect(result.status).toBe(400);
      expect(result.error).toBe('This coupon is no longer active.');
    });

    it('returns 400 for inactive coupon (is_active: false)', () => {
      const coupon: CouponRecord = {
        code: 'INACTIVE2',
        is_active: false,
      };
      const result = CouponService.validateCouponRecord(coupon, {
        code: 'INACTIVE2',
        subtotal: 1000,
      });
      expect(result.valid).toBe(false);
      expect(result.status).toBe(400);
      expect(result.error).toBe('This coupon is no longer active.');
    });

    it('returns 400 for expired coupon', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      const coupon: CouponRecord = {
        code: 'EXPIRED',
        expiry_date: pastDate,
      };
      const result = CouponService.validateCouponRecord(coupon, {
        code: 'EXPIRED',
        subtotal: 1000,
      });
      expect(result.valid).toBe(false);
      expect(result.status).toBe(400);
      expect(result.error).toBe('This coupon has expired.');
    });

    it('returns 400 when usage limit is reached', () => {
      const coupon: CouponRecord = {
        code: 'MAXED',
        usage_limit_total: 10,
        uses_count: 10,
      };
      const result = CouponService.validateCouponRecord(coupon, {
        code: 'MAXED',
        subtotal: 1000,
      });
      expect(result.valid).toBe(false);
      expect(result.status).toBe(400);
      expect(result.error).toBe('Coupon usage limit reached.');
    });

    it('returns 400 when subtotal is below minimum order value', () => {
      const coupon: CouponRecord = {
        code: 'MINSPEND',
        min_order_value: 2000,
      };
      const result = CouponService.validateCouponRecord(coupon, {
        code: 'MINSPEND',
        subtotal: 1500,
      });
      expect(result.valid).toBe(false);
      expect(result.status).toBe(400);
      expect(result.error).toContain('Minimum order spend is ₹2,000');
    });

    describe('target_users validation', () => {
      const targetedCoupon: CouponRecord = {
        code: 'VIPEXCLUSIVE',
        target_users: ['vip@example.com', '9876543210'],
        discount_type: 'flat',
        discount_value: 500,
      };

      it('permits user with matching email (case insensitive)', () => {
        const result = CouponService.validateCouponRecord(targetedCoupon, {
          code: 'VIPEXCLUSIVE',
          subtotal: 3000,
          userEmail: 'VIP@EXAMPLE.COM ',
        });
        expect(result.valid).toBe(true);
        expect(result.discount).toBe(500);
      });

      it('permits user with matching phone (+91 format matching last 10 digits)', () => {
        const result = CouponService.validateCouponRecord(targetedCoupon, {
          code: 'VIPEXCLUSIVE',
          subtotal: 3000,
          userPhone: '+91 98765 43210',
        });
        expect(result.valid).toBe(true);
        expect(result.discount).toBe(500);
      });

      it('returns 403 when user email or phone does not match target list', () => {
        const result = CouponService.validateCouponRecord(targetedCoupon, {
          code: 'VIPEXCLUSIVE',
          subtotal: 3000,
          userEmail: 'other@example.com',
          userPhone: '1122334455',
        });
        expect(result.valid).toBe(false);
        expect(result.status).toBe(403);
        expect(result.error).toBe(
          'This coupon is exclusively reserved for its recipient.'
        );
      });
    });

    it('returns valid coupon validation with correctly rounded discount', () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const coupon: CouponRecord = {
        code: 'FESTIVE15',
        active: true,
        expiry_date: futureDate,
        usage_limit_total: 100,
        uses_count: 5,
        min_order_value: 500,
        discount_type: 'percentage',
        discount_value: 15,
      };
      // 15% of 1234 = 185.1 -> rounds to 185
      const result = CouponService.validateCouponRecord(coupon, {
        code: 'FESTIVE15',
        subtotal: 1234,
      });
      expect(result.valid).toBe(true);
      expect(result.status).toBe(200);
      expect(result.discount).toBe(185);
      expect(result.code).toBe('FESTIVE15');
      expect(result.minOrderValue).toBe(500);
      expect(result.isNonStackable).toBe(true);
    });
  });
});
