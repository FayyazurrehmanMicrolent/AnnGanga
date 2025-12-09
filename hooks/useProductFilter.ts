/**
 * Custom React Hook for Product Filtering
 * 
 * Usage example:
 * 
 * import { useProductFilter } from '@/hooks/useProductFilter';
 * 
 * function ProductListPage() {
 *   const { 
 *     products, 
 *     pagination, 
 *     appliedFilters,
 *     loading, 
 *     error,
 *     fetchProducts,
 *     updateFilters,
 *     resetFilters
 *   } = useProductFilter();
 * 
 *   // Apply filters
 *   updateFilters({ minPrice: 100, maxPrice: 500, rating: 4 });
 * 
 *   return (
 *     <div>
 *       {loading && <p>Loading...</p>}
 *       {error && <p>Error: {error}</p>}
 *       {products.map(product => (
 *         <ProductCard key={product.productId} product={product} />
 *       ))}
 *     </div>
 *   );
 * }
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  ProductFilterParams, 
  ProductFilterResponse, 
  ProductWithRating,
  PaginationInfo,
  AppliedFilters,
  buildFilterQueryString 
} from '@/types/productFilter';

interface UseProductFilterReturn {
  products: ProductWithRating[];
  pagination: PaginationInfo | null;
  appliedFilters: AppliedFilters | null;
  loading: boolean;
  error: string | null;
  fetchProducts: () => Promise<void>;
  updateFilters: (newFilters: Partial<ProductFilterParams>) => void;
  resetFilters: () => void;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
}

const defaultFilters: ProductFilterParams = {
  page: 1,
  limit: 20,
  sortBy: 'newest',
};

export function useProductFilter(
  initialFilters: Partial<ProductFilterParams> = {}
): UseProductFilterReturn {
  const [filters, setFilters] = useState<ProductFilterParams>({
    ...defaultFilters,
    ...initialFilters,
  });
  
  const [products, setProducts] = useState<ProductWithRating[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/product?action=filter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: ProductFilterResponse = await response.json();
      
      if (data.status === 200) {
        setProducts(data.data.products);
        setPagination(data.data.pagination);
        setAppliedFilters(data.data.appliedFilters);
      } else {
        throw new Error(data.message || 'Failed to fetch products');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Fetch products whenever filters change
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const updateFilters = useCallback((newFilters: Partial<ProductFilterParams>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      // Reset to page 1 when filters change (except when explicitly changing page)
      page: newFilters.page !== undefined ? newFilters.page : 1,
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  const goToPage = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const nextPage = useCallback(() => {
    if (pagination?.hasNextPage) {
      goToPage((pagination.currentPage || 1) + 1);
    }
  }, [pagination, goToPage]);

  const prevPage = useCallback(() => {
    if (pagination?.hasPrevPage) {
      goToPage((pagination.currentPage || 1) - 1);
    }
  }, [pagination, goToPage]);

  return {
    products,
    pagination,
    appliedFilters,
    loading,
    error,
    fetchProducts,
    updateFilters,
    resetFilters,
    goToPage,
    nextPage,
    prevPage,
  };
}

/**
 * Example Component Usage:
 */

/*
'use client';

import { useProductFilter } from '@/hooks/useProductFilter';
import { useState } from 'react';

export default function ProductFilterPage() {
  const { 
    products, 
    pagination, 
    appliedFilters,
    loading, 
    error,
    updateFilters,
    resetFilters,
    nextPage,
    prevPage
  } = useProductFilter();

  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedRating, setSelectedRating] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [selectedVitamins, setSelectedVitamins] = useState<string[]>([]);
  const [showDiscountOnly, setShowDiscountOnly] = useState(false);
  const [deliveryType, setDeliveryType] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const handleApplyFilters = () => {
    updateFilters({
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      rating: selectedRating ? parseFloat(selectedRating) : undefined,
      categoryId: selectedCategory || undefined,
      dietary: selectedDietary.length > 0 ? selectedDietary.join(',') : undefined,
      vitamins: selectedVitamins.length > 0 ? selectedVitamins.join(',') : undefined,
      discount: showDiscountOnly || undefined,
      delivery: deliveryType as any || undefined,
      sortBy: sortBy as any,
    });
  };

  const handleReset = () => {
    setMinPrice('');
    setMaxPrice('');
    setSelectedRating('');
    setSelectedCategory('');
    setSelectedDietary([]);
    setSelectedVitamins([]);
    setShowDiscountOnly(false);
    setDeliveryType('');
    setSortBy('newest');
    resetFilters();
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Filter Products</h1>
      
      {/* Filters Section *\/}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Filters</h2>
        
        {/* Price Range *\/}
        <div className="mb-4">
          <label className="block font-medium mb-2">Price Range</label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Min"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="border rounded px-3 py-2"
            />
            <input
              type="number"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="border rounded px-3 py-2"
            />
          </div>
        </div>

        {/* Star Rating *\/}
        <div className="mb-4">
          <label className="block font-medium mb-2">Minimum Rating</label>
          <select
            value={selectedRating}
            onChange={(e) => setSelectedRating(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="">Any</option>
            <option value="4">4+ Stars</option>
            <option value="3">3+ Stars</option>
            <option value="2">2+ Stars</option>
          </select>
        </div>

        {/* Discount Only *\/}
        <div className="mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={showDiscountOnly}
              onChange={(e) => setShowDiscountOnly(e.target.checked)}
              className="mr-2"
            />
            Show Discounted Products Only
          </label>
        </div>

        {/* Sort By *\/}
        <div className="mb-4">
          <label className="block font-medium mb-2">Sort By</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="newest">Newest</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="rating-desc">Highest Rated</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleApplyFilters}
            className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600"
          >
            Apply Filters
          </button>
          <button
            onClick={handleReset}
            className="bg-gray-300 text-gray-700 px-6 py-2 rounded hover:bg-gray-400"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Loading/Error States *\/}
      {loading && <p className="text-center text-gray-600">Loading products...</p>}
      {error && <p className="text-center text-red-600">Error: {error}</p>}

      {/* Products Grid *\/}
      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {products.map((product) => (
              <div key={product.productId} className="bg-white rounded-lg shadow p-4">
                <img
                  src={product.images[0] || '/placeholder.jpg'}
                  alt={product.title}
                  className="w-full h-48 object-cover rounded mb-2"
                />
                <h3 className="font-semibold mb-2">{product.title}</h3>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg font-bold">₹{product.actualPrice}</span>
                  {product.discountPercentage > 0 && (
                    <>
                      <span className="text-sm line-through text-gray-500">₹{product.mrp}</span>
                      <span className="text-sm text-green-600">{product.discountPercentage}% OFF</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <span>⭐ {product.averageRating.toFixed(1)}</span>
                  <span>({product.totalReviews} reviews)</span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination *\/}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-4">
              <button
                onClick={prevPage}
                disabled={!pagination.hasPrevPage}
                className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span>
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
              <button
                onClick={nextPage}
                disabled={!pagination.hasNextPage}
                className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
*/
