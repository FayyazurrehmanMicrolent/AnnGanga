// Coupon API Integration
export interface Coupon {
  _id: string;
  code: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderValue: number;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  usageLimitPerUser: number;
  usedCount: number;
  userUsage: Record<string, number>;
  expiryDate?: string | null;
  isActive: boolean;
  applicableProducts: string[];
  applicableCategories: string[];
  isDeleted: boolean;
  couponId: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface CreateCouponPayload {
  code: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderValue?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usageLimitPerUser?: number;
  expiryDate?: string;
  isActive?: boolean;
  applicableProducts?: string[];
  applicableCategories?: string[];
}

export interface CouponResponse {
  status: number;
  message: string;
  data: Coupon | Coupon[];
}

/**
 * Fetch all active coupons
 * GET /api/coupons?active=true
 */
export async function fetchActiveCoupons(): Promise<Coupon[]> {
  try {
    const response = await fetch('/api/coupons?active=true', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch coupons: ${response.statusText}`);
    }

    const result: CouponResponse = await response.json();
    
    if (result.status === 200 && Array.isArray(result.data)) {
      return result.data;
    }

    return [];
  } catch (error) {
    console.error('Error fetching active coupons:', error);
    throw error;
  }
}

/**
 * Fetch all coupons with optional filters
 * GET /api/coupons?active=true&expired=false&search=FLAT
 */
export async function fetchCoupons(params?: {
  active?: boolean;
  expired?: boolean;
  search?: string;
}): Promise<Coupon[]> {
  try {
    const searchParams = new URLSearchParams();
    
    if (params?.active !== undefined) {
      searchParams.append('active', params.active.toString());
    }
    
    if (params?.expired !== undefined) {
      searchParams.append('expired', params.expired.toString());
    }
    
    if (params?.search) {
      searchParams.append('search', params.search);
    }

    const url = `/api/coupons${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch coupons: ${response.statusText}`);
    }

    const result: CouponResponse = await response.json();
    
    if (result.status === 200 && Array.isArray(result.data)) {
      return result.data;
    }

    return [];
  } catch (error) {
    console.error('Error fetching coupons:', error);
    throw error;
  }
}

/**
 * Create a new coupon
 * POST /api/coupons
 */
export async function createCoupon(payload: CreateCouponPayload): Promise<Coupon> {
  try {
    const response = await fetch('/api/coupons', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result: CouponResponse = await response.json();

    if (!response.ok) {
      throw new Error(result.message || `Failed to create coupon: ${response.statusText}`);
    }

    if (result.status === 201 && !Array.isArray(result.data)) {
      return result.data;
    }

    throw new Error('Invalid response format');
  } catch (error) {
    console.error('Error creating coupon:', error);
    throw error;
  }
}

/**
 * Update an existing coupon
 * POST /api/coupons with action=edit
 */
export async function updateCoupon(
  couponId: string,
  updates: Partial<CreateCouponPayload>
): Promise<Coupon> {
  try {
    const response = await fetch('/api/coupons', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'edit',
        data: {
          id: couponId,
          ...updates,
        },
      }),
    });

    const result: CouponResponse = await response.json();

    if (!response.ok) {
      throw new Error(result.message || `Failed to update coupon: ${response.statusText}`);
    }

    if (result.status === 200 && !Array.isArray(result.data)) {
      return result.data;
    }

    throw new Error('Invalid response format');
  } catch (error) {
    console.error('Error updating coupon:', error);
    throw error;
  }
}

/**
 * Delete a coupon (soft delete)
 * POST /api/coupons with action=delete
 */
export async function deleteCoupon(couponId: string): Promise<void> {
  try {
    const response = await fetch('/api/coupons', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'delete',
        data: {
          id: couponId,
        },
      }),
    });

    const result: CouponResponse = await response.json();

    if (!response.ok) {
      throw new Error(result.message || `Failed to delete coupon: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error deleting coupon:', error);
    throw error;
  }
}

/**
 * Validate a coupon code
 * POST /api/coupons/validate
 */
export async function validateCoupon(
  code: string,
  userId?: string,
  cartTotal?: number
): Promise<{
  valid: boolean;
  message: string;
  discount?: number;
  coupon?: Coupon;
}> {
  try {
    const response = await fetch('/api/coupons/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        userId,
        cartTotal,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        valid: false,
        message: result.message || 'Failed to validate coupon',
      };
    }

    return result.data || result;
  } catch (error) {
    console.error('Error validating coupon:', error);
    return {
      valid: false,
      message: 'Failed to validate coupon',
    };
  }
}
