/**
 * Types for Product Filter API
 */

export interface ProductFilterParams {
  // Pagination
  page?: number;
  limit?: number;

  // Price Range
  minPrice?: number;
  maxPrice?: number;

  // Star Rating
  rating?: number; // 1-5

  // Category
  categoryId?: string;

  // Dietary Tags (comma-separated or array)
  dietary?: string | string[];

  // Vitamins (comma-separated or array)
  vitamins?: string | string[];

  // Discount
  discount?: boolean;

  // Delivery Type
  delivery?: 'Normal Delivery' | 'Expedited Delivery';

  // Sort
  sortBy?: 'price-asc' | 'price-desc' | 'rating-desc' | 'newest';
}

export interface ProductWithRating {
  _id: string;
  productId: string;
  title: string;
  mrp: number;
  actualPrice: number;
  weightVsPrice: Array<{
    weight: string;
    price: number;
    quantity?: number;
  }>;
  nutrition: Array<{
    weight: string;
    info: string;
  }>;
  vitamins?: string[];
  delivery?: string[];
  tags?: string[];
  dietary?: string[];
  healthBenefits?: string | null;
  description?: string | null;
  images: string[];
  categoryId?: string | null;
  frequentlyBoughtTogether?: string[];
  isDeleted: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  
  // Computed fields
  averageRating: number;
  totalReviews: number;
  discountPercentage: number;
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalProducts: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface AppliedFilters {
  minPrice: number | null;
  maxPrice: number | null;
  rating: number | null;
  categoryId: string | null;
  dietary: string[];
  vitamins: string[];
  discount: boolean;
  delivery: string | null;
  sortBy: string;
}

export interface ProductFilterResponse {
  status: number;
  message: string;
  data: {
    products: ProductWithRating[];
    pagination: PaginationInfo;
    appliedFilters: AppliedFilters;
  };
}

/**
 * Helper function to build filter query string
 */
export function buildFilterQueryString(params: ProductFilterParams): string {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.minPrice !== undefined) searchParams.set('minPrice', params.minPrice.toString());
  if (params.maxPrice !== undefined) searchParams.set('maxPrice', params.maxPrice.toString());
  if (params.rating !== undefined) searchParams.set('rating', params.rating.toString());
  if (params.categoryId) searchParams.set('categoryId', params.categoryId);
  
  if (params.dietary) {
    const dietaryStr = Array.isArray(params.dietary) 
      ? params.dietary.join(',') 
      : params.dietary;
    searchParams.set('dietary', dietaryStr);
  }
  
  if (params.vitamins) {
    const vitaminsStr = Array.isArray(params.vitamins) 
      ? params.vitamins.join(',') 
      : params.vitamins;
    searchParams.set('vitamins', vitaminsStr);
  }
  
  if (params.discount !== undefined) searchParams.set('discount', params.discount.toString());
  if (params.delivery) searchParams.set('delivery', params.delivery);
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);

  return searchParams.toString();
}

/**
 * Example usage:
 * 
 * const filters: ProductFilterParams = {
 *   page: 1,
 *   limit: 20,
 *   minPrice: 100,
 *   maxPrice: 500,
 *   rating: 4,
 *   dietary: ['Vegan', 'Gluten Free'],
 *   vitamins: ['C', 'D'],
 *   discount: true,
 *   delivery: 'Normal Delivery',
 *   sortBy: 'price-asc'
 * };
 * 
 * const queryString = buildFilterQueryString(filters);
 * const response = await fetch(`/api/product?${queryString}`);
 * const data: ProductFilterResponse = await response.json();
 */
