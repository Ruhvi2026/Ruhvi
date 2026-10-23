export interface CouponRecord {
  id?: string;
  code: string;
  active?: boolean;
  is_active?: boolean;
  expiry_date?: string | null;
  valid_until?: string | null;
  usage_limit_total?: number | null;
  max_uses?: number | null;
  uses_count?: number | null;
  min_order_value?: number | null;
  target_users?: string[] | null;
  discount_type?: string | null;
  type?: string | null;
  discount_value?: number | null;
  value?: number | null;
  max_discount?: number | null;
  usage_limit_discount?: number | null;
}

export interface CouponValidationInput {
  code: string;
  subtotal: number;
  userEmail?: string | null;
  userPhone?: string | null;
}

export interface CouponValidationResult {
  valid: boolean;
  code: string;
  discount: number;
  minOrderValue: number;
  isNonStackable: boolean;
  error?: string;
  status: number;
}

/**
 * CouponService handles validation, target-user exclusivity checks,
 * and discount calculation for promotions and checkout orders.
 */
export class CouponService {
  /**
   * Validates a coupon record against cart subtotal, user credentials, and validity constraints.
   */
  public static validateCouponRecord(
    coupon: CouponRecord | null | undefined,
    input: CouponValidationInput
  ): CouponValidationResult {
    if (!coupon) {
      return {
        valid: false,
        code: input.code.toUpperCase(),
        discount: 0,
        minOrderValue: 0,
        isNonStackable: true,
        error: 'Invalid or unrecognized coupon code.',
        status: 404,
      };
    }

    const isActive =
      coupon.active !== undefined
        ? coupon.active
        : coupon.is_active !== undefined
          ? coupon.is_active
          : true;

    if (!isActive) {
      return {
        valid: false,
        code: coupon.code,
        discount: 0,
        minOrderValue: 0,
        isNonStackable: true,
        error: 'This coupon is no longer active.',
        status: 400,
      };
    }

    const expiryDate = coupon.expiry_date || coupon.valid_until;
    if (expiryDate && new Date(expiryDate) < new Date()) {
      return {
        valid: false,
        code: coupon.code,
        discount: 0,
        minOrderValue: 0,
        isNonStackable: true,
        error: 'This coupon has expired.',
        status: 400,
      };
    }

    const maxUses = coupon.usage_limit_total ?? coupon.max_uses;
    const usesCount = Number(coupon.uses_count || 0);
    if (maxUses && usesCount >= maxUses) {
      return {
        valid: false,
        code: coupon.code,
        discount: 0,
        minOrderValue: 0,
        isNonStackable: true,
        error: 'Coupon usage limit reached.',
        status: 400,
      };
    }

    const minSpend = Number(coupon.min_order_value || 0);
    if (minSpend > 0 && input.subtotal < minSpend) {
      return {
        valid: false,
        code: coupon.code,
        discount: 0,
        minOrderValue: minSpend,
        isNonStackable: true,
        error: `Minimum order spend is ₹${minSpend.toLocaleString('en-IN')} on physical jewellery items.`,
        status: 400,
      };
    }

    // Target Users Validation (e.g. exclusive birthday voucher)
    if (
      coupon.target_users &&
      Array.isArray(coupon.target_users) &&
      coupon.target_users.length > 0
    ) {
      const email = (input.userEmail || '').toLowerCase().trim();
      const rawPhone = (input.userPhone || '').replace(/\D/g, '');
      const last10Phone = rawPhone.slice(-10);

      const isAllowed = coupon.target_users.some((target: string) => {
        const cleanTarget = (target || '').toLowerCase().trim();
        const targetDigits = cleanTarget.replace(/\D/g, '');
        return (
          (email && cleanTarget === email) ||
          (last10Phone &&
            (cleanTarget === last10Phone ||
              targetDigits === last10Phone ||
              cleanTarget.endsWith(last10Phone)))
        );
      });

      if (!isAllowed) {
        return {
          valid: false,
          code: coupon.code,
          discount: 0,
          minOrderValue: minSpend,
          isNonStackable: true,
          error: 'This coupon is exclusively reserved for its recipient.',
          status: 403,
        };
      }
    }

    // Calculate discount amount
    const discountAmount = this.calculateDiscount(coupon, input.subtotal);

    return {
      valid: true,
      code: coupon.code,
      discount: Math.round(discountAmount),
      minOrderValue: minSpend,
      isNonStackable: true,
      status: 200,
    };
  }

  /**
   * Calculates the raw discount value for flat or percentage coupons with max discount cap.
   */
  public static calculateDiscount(
    coupon: CouponRecord,
    subtotal: number
  ): number {
    let discountAmount = 0;
    const discountType = (
      coupon.discount_type ||
      coupon.type ||
      'flat'
    ).toLowerCase();
    const discountVal = Number(coupon.discount_value ?? coupon.value ?? 0);

    if (discountType === 'flat' || discountType === 'fixed') {
      discountAmount = discountVal;
    } else if (discountType === 'percentage') {
      discountAmount = (subtotal * discountVal) / 100;
      const maxDiscount = coupon.max_discount || coupon.usage_limit_discount;
      if (maxDiscount) {
        discountAmount = Math.min(discountAmount, Number(maxDiscount));
      }
    }

    return Math.max(0, discountAmount);
  }
}
