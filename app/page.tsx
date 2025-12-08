"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { addToCart as addToCartUtil } from '@/lib/cart-utils';
import { toast } from 'react-hot-toast';
import CartCount from '@/components/CartCount';
import { ShoppingCart, Heart, Search, Menu, X, User, Package, Bookmark, MapPin, Gift, BookOpen, Bell, HelpCircle, FileText, LogOut, ChevronRight } from "lucide-react";
import dynamic from 'next/dynamic';

// Dynamically import components with SSR disabled to avoid window is not defined errors
const BannerSlider = dynamic(() => import('@/components/BannerSlider'), {
  ssr: false,
  loading: () => (
    <div className="">
      <div className="animate-pulse text-gray-500">Loading banner...</div>
    </div>
  ),
});

const CategorySlider = dynamic(() => import('@/components/CategorySlider'), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse p-4">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-4"></div>
      <div className="flex space-x-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="w-32 h-32 rounded-full bg-gray-200 dark:bg-gray-700"></div>
        ))}
      </div>
    </div>
  ),
});

interface Category {
  _id: string;
  categoryId: string;
  name: string;
  image: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

type ProductsByTag = Record<string, any[] | { products: any[]; tag?: string; title?: string }>;

const featured = [
  {
    id: 1,
    name: "Oregano Mix",
    weight: "1 kg",
    price: 8,
    oldPrice: 10,
    off: 20,
    img: "/placeholder/oregano.jpg",
  },
  {
    id: 2,
    name: "Turmeric Powder",
    weight: "500 g",
    price: 8,
    oldPrice: 10,
    off: 5,
    img: "/placeholder/turmeric.jpg",
  },
  {
    id: 3,
    name: "Black Pepper Whole",
    weight: "250 g",
    price: 12,
    oldPrice: 15,
    off: 20,
    img: "/placeholder/pepper.jpg",
  },
  {
    id: 4,
    name: "Cinnamon Sticks",
    weight: "200 g",
    price: 9,
    oldPrice: 12,
    off: 25,
    img: "/placeholder/cinnamon.jpg",
  },
];

/* ---------- colours ---------- */
const theme = {
  bg: "#fafafa",
  primary: "#2e7d32",
  primaryLight: "#4caf50",
  text: "#212121",
  muted: "#757575",
  border: "#e0e0e0",
  badge: "#ef5350",
};

/* ---------------------------------- */
export default function HomePage() {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const { itemCount } = useCart();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [productsByTag, setProductsByTag] = useState<ProductsByTag>({});
  const { addToCart: addToCartContext } = useCart();
  const { addToWishlist, removeFromWishlist, items: wishlist } = useWishlist();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/category');
      const data = await response.json();
      
      if (data.status === 200) {
        setCategories(data.data || []);
      } else {
        throw new Error(data.message || 'Failed to fetch categories');
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Failed to load categories. Please try again later.');
    }
  }, []);

  const fetchProducts = useCallback(async (categoryId: string | null = null) => {
    try {
      setIsLoading(true);
      setError(null);
      const url = categoryId
        ? `/api/product?categoryId=${categoryId}`
        : '/api/product';

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 200) {
        // If filtered by category, handle the response format
        if (categoryId) {
          // Check if the response has tags (regular response) or is an array (filtered response)
          if (data.data && data.data.tags) {
            // Regular response with tags
            setProductsByTag(data.data.tags || {});
          } else if (Array.isArray(data.data)) {
            // Direct array response
            if (data.data.length === 0) {
              setProductsByTag({});
              setError('No products found in this category');
            } else {
              setProductsByTag({
                'Filtered Products': {
                  products: data.data,
                  tag: 'filtered',
                  title: 'Filtered Products'
                }
              });
            }
          } else if (data.data && typeof data.data === 'object') {
            // Handle case where filtered products are in data.data
            const products = Object.values(data.data).flatMap((tagGroup: any) =>
              tagGroup.products || []
            );
            if (products.length === 0) {
              setProductsByTag({});
              setError('No products found in this category');
            } else {
              setProductsByTag({
                'Filtered Products': {
                  products,
                  tag: 'filtered',
                  title: 'Filtered Products'
                }
              });
            }
          } else {
            // No products found for this category
            setProductsByTag({});
            setError('No products found in this category');
          }
        } else {
          // Regular non-filtered response
          setProductsByTag(data.data?.tags || {});
        }
      } else {
        throw new Error(data.message || 'Failed to fetch products');
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch products and categories
    const fetchData = async () => {
      try {
        await Promise.all([
          fetchProducts(),
          fetchCategories(),
        ]);
      } catch (err) {
        setError('Failed to load data');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [fetchProducts, fetchCategories]);

  const handleCategorySelect = useCallback(async (categoryId: string | null) => {
    setActiveCategory(categoryId);
    await fetchProducts(categoryId);
  }, [fetchProducts]);

  // Track if we've shown the not found message
  const [hasShownNotFound, setHasShownNotFound] = useState(false);

  const renderProductSection = (title: string, tag: string) => {
    // Handle different data structures for products
    let products = [];
    
    // If products are in the format { [key: string]: { products: [...] } }
    if (productsByTag[tag] && typeof productsByTag[tag] === 'object' && !Array.isArray(productsByTag[tag]) && 'products' in productsByTag[tag]) {
      products = (productsByTag[tag] as { products: any[] }).products;
    } 
    // If products is directly an array
    else if (Array.isArray(productsByTag[tag])) {
      products = productsByTag[tag] as any[];
    }
    
    // If we're filtering by category and no products are found
    if (activeCategory && (!products || products.length === 0)) {
      if (hasShownNotFound) return null;
      
      return (
        <div className="mb-10 text-center py-10 col-span-full">
          <h3 className="text-lg font-medium text-gray-600">No products found in this category</h3>
          <p className="text-gray-500 mt-2">Please try another category or check back later.</p>
          <button
            onClick={() => {
              setActiveCategory(null);
              fetchProducts(null);
              setHasShownNotFound(false);
            }}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
          >
            Show All Products
          </button>
        </div>
      );
    }

    // Don't render the section if there are no products
    if (!products || products.length === 0) return null;
    
    // Reset hasShownNotFound when products are found
    if (hasShownNotFound && products.length > 0) {
      setHasShownNotFound(false);
    }

    // Determine the route for View All button based on tag
    const viewAllRoute = tag === 'featured' ? '/products/featured' 
                       : tag === 'arrival' ? '/products/arrival'
                       : tag === 'hamper' ? '/products/hamper'
                       : '/products';

    return (
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4 px-5">
          <h2 className="text-xl font-bold">{title}</h2>
          <Link 
            href={viewAllRoute}
            className="text-primary hover:text-primary-dark text-sm font-medium flex items-center gap-1"
          >
            View All <ChevronRight size={16} />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-6 px-5">
          {products.slice(0, 10).map((product: any) => {
            // Ensure product has required properties
            if (!product) return null;
            
            const weight = product.weightVsPrice?.[0]?.weight || '';
            const price = product.actualPrice || 0;
            const mrp = product.mrp || price;
            // Use discountPercentage from API if available, otherwise calculate it
            const off = product.discountPercentage ?? (mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0);
            const image = Array.isArray(product.images) && product.images.length > 0 
              ? product.images[0] 
              : '/images/placeholder-product.png';

            return (
              <ProductCard
                key={product._id || Math.random().toString(36).substr(2, 9)}
                id={product._id}
                name={product.title || product.name || 'Unnamed Product'}
                weight={weight}
                price={price}
                oldPrice={mrp}
                off={off}
                img={image}
                images={Array.isArray(product.images) ? product.images : [image]}
              />
            );
          })}
        </div>
      </div>
    );
  };

  const renderProductCard = (product: any) => {
    const isInWishlist = wishlist.some((item: any) => item.productId === product._id);
    const weight = product.weightVsPrice[0]?.weight || '';
    const price = product.actualPrice;
    const oldPrice = product.mrp;
    // Use discountPercentage from API if available, otherwise calculate it
    const off = product.discountPercentage ?? Math.round(((oldPrice - price) / oldPrice) * 100);
    const image = product.images[0] || '/images/placeholder-product.png';

    return (
      <div key={product._id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden h-full flex flex-col">
        <div className="relative flex-grow">
          <Link href={`/product/${product._id}`} className="block h-full">
            <img
              src={image}
              alt={product.title}
              className="w-full h-48 object-cover"
            />
          </Link>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (isInWishlist) {
                removeFromWishlist(product._id);
              } else {
                addToWishlist(product._id);
              }
            }}
            className={`absolute top-2 right-2 p-2 rounded-full ${
              isInWishlist ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
            } bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm`}
          >
            <Heart size={20} fill={isInWishlist ? 'currentColor' : 'none'} />
          </button>
        </div>
        <div className="p-4 flex flex-col h-40">
          <Link href={`/product/${product._id}`} className="flex-grow">
            <h3 className="font-medium text-gray-900 dark:text-white line-clamp-2 h-12">
              {product.title}
            </h3>
            <p className="text-sm text-gray-500 mt-1">{weight}</p>
          </Link>
          <div className="mt-2 flex items-center justify-between">
            <div>
              <span className="text-lg font-bold text-primary">₹{price}</span>
              {oldPrice > price && (
                <span className="ml-2 text-sm text-gray-500 line-through">
                  ₹{oldPrice}
                </span>
              )}
              {off > 0 && (
                <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                  {off}% OFF
                </span>
              )}
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                addToCartContext({
                  productId: product._id,
                  productName: product.title,
                  productImage: image,
                  price: product.actualPrice,
                  quantity: 1,
                  weightOption: weight || ''
                });
                toast.success('Added to cart');
              }}
              className="text-white bg-primary hover:bg-primary/90 px-3 py-1 rounded-full text-sm flex items-center"
            >
              <ShoppingCart size={16} className="mr-1" /> Add
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bg }}>
      {/* ---------- SIDEBAR ---------- */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-white shadow-2xl transform transition-transform duration-300 ${sidebar ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="p-5">
          {/* user strip */}
          <div className="flex items-center gap-3 mb-4  ">
            <div className="h-12 w-12 rounded-full bg-indigo-600 grid place-items-center text-white">
              <User size={24} />
            </div>
            <div>
              <div className="font-bold text-gray-900">Anushshka</div>
              <div className="text-xs text-gray-500">anushshko@gmoll.com</div>
            </div>
          </div>

          {/* nav list */}
          <nav className="space-y-2">
            {/* Navigation Links */}
            {/* Categories Section */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Categories</h3>
              {isLoading ? (
                <div className="px-4 py-2 text-sm text-gray-500">Loading categories...</div>
              ) : error ? (
                <div className="px-4 py-2 text-sm text-red-500">{error}</div>
              ) : categories.length > 0 ? (
                categories.map((category) => (
                  <Link
                    key={category.categoryId}
                    href={`/category/${category.categoryId}`}
                    className={`block px-4 py-2 text-sm hover:bg-gray-100 rounded-md transition-colors ${activeCategory === category.categoryId ? "text-green-600 font-medium" : "text-gray-700"
                      }`}
                    onClick={() => setSidebar(false)}
                  >
                    {category.name}
                  </Link>
                ))
              ) : (
                <div className="px-4 py-2 text-sm text-gray-500">No categories found</div>
              )}
            </div>
          </nav>
        </div>

        {/* close btn */}
        <button
          onClick={() => setSidebar(false)}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-900"
        >
          <X size={22} />
        </button>
      </div>

      {/* overlay */}
      {sidebar && (
        <div
          onClick={() => setSidebar(false)}
          className="fixed inset-0 z-30 "
        />
      )}



      {/* ------- BANNER SLIDER ------- */}
      <section >
        <BannerSlider />
      </section>
      {/* ------- CATEGORIES ------- */}
      <section className="w-full">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <h2 className="text-3xl font-bold mb-2 text-start" style={{ color: theme.text }}>
            Our Categories
          </h2>
          <CategorySlider
            categories={categories}
            theme={theme}
            activeCategory={activeCategory}
            onCategorySelect={handleCategorySelect}
          />
        </div>
      </section>

      {/* ------- PRODUCT SECTIONS ------- */}
      {renderProductSection('Featured Products', 'featured')}
      {renderProductSection('New Arrivals', 'arrival')}
      {renderProductSection('Gift Hampers', 'hamper')}
    </div>
  );
}

/* ---------- product card ---------- */
function ProductCard({
  id,
  name,
  weight,
  price,
  oldPrice,
  off,
  img,
  images = [],
}: {
  id: string | number;
  name: string;
  weight: string;
  price: number;
  oldPrice: number;
  off: number;
  img: string;
  images?: string[];
}) {
  const [isAdding, setIsAdding] = useState(false);
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist, isLoading: wishlistLoading, items: wishlistItems } = useWishlist();
  
  // Debug log to see what's in the wishlist
  useEffect(() => {
    console.log('ProductCard mounted with ID:', id, 'Type:', typeof id);
    console.log('Current wishlist items:', wishlistItems);
  }, [id, wishlistItems]);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsAdding(true);
    try {
      const success = await addToCart({
        productId: id.toString(),
        quantity: 1, // Default quantity is 1 when adding to cart
        price,
        weightOption: weight,
        productName: name,
        productImage: img || (images[0] || ''),
      });

      if (success) {
        // Success feedback is handled by the toast in addToCart
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      // Ensure we're using the correct ID format
      const productId = String(id);
      console.log('Toggling wishlist for product ID:', productId, 'Type:', typeof productId);
      console.log('Current wishlist items before toggle:', wishlistItems);
      await toggleWishlist(productId);
      // Force a re-render by getting the latest wishlist state
      const newWishlistState = isInWishlist(productId);
      console.log('New wishlist state after toggle:', newWishlistState);
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      toast.error('Failed to update wishlist');
    }
  };

  // Ensure we're using the correct ID format for checking
  const productId = String(id);
  const inWishlist = isInWishlist(productId);
  
  // Debug log for wishlist status
  useEffect(() => {
    console.log(`Product ${productId} wishlist status:`, inWishlist);
  }, [inWishlist, productId]);

  return (
    <div
      className="rounded-xl border p-3 hover:shadow-lg transition flex flex-col h-full"
      style={{ borderColor: theme.border }}
    >
      <Link href={`/products/${id}`} className="block flex-grow">
        <div className="relative">
          <div
            className="h-48 rounded-lg mb-3 bg-cover bg-center"
            style={{ backgroundImage: `url(${img})` }}
          />
          <button
            onClick={handleWishlistToggle}
            disabled={wishlistLoading}
            className={`absolute top-2 right-2 p-2 rounded-full bg-white/90 backdrop-blur-sm shadow-md transition-colors ${
              inWishlist ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
            }`}
            aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart size={18} className={inWishlist ? 'fill-current' : ''} />
          </button>
        </div>
        <div className="flex items-start justify-between mb-1">
          <div>
            <h4 className="font-semibold text-sm" style={{ color: theme.text }}>
              {name}
            </h4>
            <p className="text-xs" style={{ color: theme.muted }}>
              {weight}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          <div>
            <span className="font-bold  text-black">₹{price.toFixed(2)}</span>
            {oldPrice > price && (
              <span className="text-xs line-through ml-2" style={{ color: theme.muted }}>
                ₹{oldPrice.toFixed(2)}
              </span>
            )}
          </div>
          {off > 0 && (
            <span
              className="text-xs px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: theme.badge }}
            >
              {off}% off
            </span>
          )}
        </div>
      </Link>

      <button
        onClick={handleAddToCart}
        disabled={isAdding}
        className="mt-4 w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {isAdding ? (
          'Adding...'
        ) : (
          <>
            <ShoppingCart className="w-4 h-4 mr-1.5" />
            Add to Cart
          </>
        )}
      </button>
    </div>
  );
}