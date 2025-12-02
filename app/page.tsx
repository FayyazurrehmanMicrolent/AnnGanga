"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
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
  const [activeCategory, setActiveCategory] = useState("all");
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState({
    categories: true,
    products: true
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/category');
        if (!response.ok) {
          throw new Error('Failed to fetch categories');
        }
        const data = await response.json();
        if (data.status === 200) {
          setCategories(data.data);
        } else {
          throw new Error(data.message || 'Failed to load categories');
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(prev => ({ ...prev, categories: false }));
      }
    };

    const fetchFeaturedProducts = async () => {
      try {
        // First, fetch all products
        const response = await fetch('/api/product?limit=100'); // Increased limit to get more products
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }
        const data = await response.json();
        if (data.status === 200) {
          // Filter products that have either 'featured' or 'arrival' tag
          const featuredProducts = data.data.filter((product: any) => {
            const tags = product.tags || [];
            return tags.includes('featured') || tags.includes('arrival');
          }).slice(0, 8); // Limit to 8 products
          
          // Map the filtered products to match our ProductCard props
          const formattedProducts = featuredProducts.map((product: any) => ({
            id: product.productId || product._id,
            name: product.title,
            weight: product.weightVsPrice?.[0]?.weight || '1 kg',
            price: product.actualPrice || 0,
            oldPrice: product.mrp || 0,
            off: product.mrp > 0 
              ? Math.round(((product.mrp - product.actualPrice) / product.mrp) * 100)
              : 0,
            img: product.images?.[0] || '/placeholder/spice.jpg',
            images: product.images || []
          }));
          setFeaturedProducts(formattedProducts);
        } else {
          throw new Error(data.message || 'Failed to load featured products');
        }
      } catch (err) {
        console.error('Error fetching featured products:', err);
        // Don't set error to state to prevent blocking the UI
        // Just use the static featured data as fallback
        setFeaturedProducts(featured);
      } finally {
        setLoading(prev => ({ ...prev, products: false }));
      }
    };

    fetchCategories();
    fetchFeaturedProducts();
  }, []);

  const navItems = [
    { label: "Products", href: "/products" },
    { label: "My Orders", icon: Package },
    { label: "My Wishlist", icon: Heart },
    { label: "My Address", icon: MapPin },
    { label: "My Rewards", icon: Gift },
    { label: "Subscription", icon: Bookmark },
    { label: "Recipes & Blogs", icon: BookOpen },
    { label: "Notification Settings", icon: Bell },
    { label: "Support", icon: HelpCircle },
    { label: "Terms & Conditions", icon: FileText },
    { label: "Sign Out", icon: LogOut },
  ];

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
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href || '#'}
                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                onClick={() => setSidebar(false)}
              >
                {item.icon && <item.icon size={18} />}
                <span>{item.label}</span>
              </Link>
            ))}
            
            {/* Categories Section */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Categories</h3>
              {loading ? (
                <div className="px-4 py-2 text-sm text-gray-500">Loading categories...</div>
              ) : error ? (
                <div className="px-4 py-2 text-sm text-red-500">{error}</div>
              ) : categories.length > 0 ? (
                categories.map((category) => (
                  <Link
                    key={category.categoryId}
                    href={`/category/${category.categoryId}`}
                    className={`block px-4 py-2 text-sm hover:bg-gray-100 rounded-md transition-colors ${
                      activeCategory === category.categoryId ? "text-green-600 font-medium" : "text-gray-700"
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

      {/* ------- PROMOTION BANNER ------- */}
      {/* <section className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between text-center md:text-left">
            <div className="mb-4 md:mb-0">
              <h2 className="text-xl md:text-2xl font-bold mb-1">20% OFF on your first purchase</h2>
              <p className="text-sm md:text-base">
                Use code <span className="font-mono bg-black/20 px-2 py-1 rounded">FIRST20</span> at checkout
              </p>
            </div>
            <button
            className="px-6 py-3 rounded-full text-white font-semibold shadow"
            style={{ backgroundColor: theme.primaryLight }}
          >
            Shop Now
          </button>
          </div>
        </div>
      </section> */}

      {/* ------- CATEGORIES ------- */}
      <section className="w-full">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <h2 className="text-3xl font-bold mb-2 text-start" style={{ color: theme.text }}>
            Our Categories
          </h2>
          <CategorySlider categories={categories} theme={theme} />
        </div>
      </section>

      {/* ------- FEATURED ------- */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Featured Products</h2>
            {featuredProducts.length > 0 && (
              <Link 
                href="/products" 
                className="text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
              >
                View All <ChevronRight size={16} />
              </Link>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {featuredProducts.slice(0, 8).map((product) => (
              <ProductCard key={product.id} {...product} />
            ))}
          </div>
        </div>
      </section>

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

  return (
    <div
      className="rounded-xl border p-3 hover:shadow-lg transition flex flex-col h-full"
      style={{ borderColor: theme.border }}
    >
      <Link href={`/products/${id}`} className="block flex-grow">
        <div
          className="h-40 rounded-lg mb-3 bg-cover bg-center"
          style={{ backgroundImage: `url(${img})` }}
        />
        <div className="flex items-start justify-between mb-1">
          <div>
            <h4 className="font-semibold text-sm" style={{ color: theme.text }}>
              {name}
            </h4>
            <p className="text-xs" style={{ color: theme.muted }}>
              {weight}
            </p>
          </div>
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Handle wishlist add
            }}
            className="text-gray-400 hover:text-red-500 transition-colors"
          >
            <Heart size={18} />
          </button>
        </div>

        <div className="flex items-center justify-between mt-3">
          <div>
            <span className="font-bold text-base">₹{price.toFixed(2)}</span>
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
        className="mt-4 w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isAdding ? 'Adding...' : 'Add to Cart'}
      </button>
    </div>
  );
}
//             <div className="font-extrabold text-2xl tracking-wide mb-2">SpiceHome</div>
//             <p className="text-sm opacity-90">Fresh spices delivered to your doorstep.</p>
//           </div>

//           {/* quick links */}
//           <div>
//             <div className="font-semibold mb-3">Quick Links</div>
//             <ul className="space-y-2 text-sm opacity-90">
//               <li className="hover:underline cursor-pointer">About Us</li>
//               <li className="hover:underline cursor-pointer">Contact</li>
//               <li className="hover:underline cursor-pointer">FAQs</li>
//             </ul>
//           </div>

//           {/* categories */}
//           <div>
//             <div className="font-semibold mb-3">Shop</div>
//             <ul className="space-y-2 text-sm opacity-90">
//               <li className="hover:underline cursor-pointer">Whole Spices</li>
//               <li className="hover:underline cursor-pointer">Ground Spices</li>
//               <li className="hover:underline cursor-pointer">Herbs</li>
//             </ul>
//           </div>

//           {/* social */}
//           <div>
//             <div className="font-semibold mb-3">Follow Us</div>
//             <div className="flex gap-4 mt-2">
//               <span className="cursor-pointer hover:opacity-80">FB</span>
//               <span className="cursor-pointer hover:opacity-80">IG</span>
//               <span className="cursor-pointer hover:opacity-80">TW</span>
//             </div>
//           </div>
//         </div>

//         {/* copyright strip */}
//         <div
//           className="text-center text-xs py-4 border-t"
//           style={{ borderColor: theme.primaryLight }}
//         >
//           © {new Date().getFullYear()} SpiceHome. All rights reserved.
//         </div>
//       </footer>
//     </div>
//   );
// }

// /* ---------- single product card ---------- */
// function ProductCard({
//   name,
//   weight,
//   price,
//   oldPrice,
//   off,
//   img,
// }: {
//   name: string;
//   weight: string;
//   price: number;
//   oldPrice: number;
//   off: number;
//   img: string;
// }) {
//   return (
//     <div
//       className="rounded-xl border p-3 hover:shadow-lg transition"
//       style={{ borderColor: theme.border }}
//     >
//       <div
//         className="h-40 rounded-lg mb-3 bg-cover bg-center"
//         style={{ backgroundImage: `url(${img})` }}
//       />
//       <div className="flex items-start justify-between mb-1">
//         <div>
//           <h4 className="font-semibold text-sm" style={{ color: theme.text }}>
//             {name}
//           </h4>
//           <p className="text-xs" style={{ color: theme.muted }}>
//             {weight}
//           </p>
//         </div>
//         <Heart size={18} className="cursor-pointer" color={theme.muted} />
//       </div>

//       <div className="flex items-center justify-between mt-3">
//         <div>
//           <span className="font-bold text-base">${price}</span>
//           <span className="text-xs line-through ml-2" style={{ color: theme.muted }}>
//             ${oldPrice}
//           </span>
//         </div>
//         <span
//           className="text-xs px-2 py-0.5 rounded-full text-white"
//           style={{ backgroundColor: theme.badge }}
//         >
//           {off}% off
//         </span>
//       </div>

//       <button
//         className="w-full mt-3 py-2 rounded-full text-white text-sm font-semibold"
//         style={{ backgroundColor: theme.primary }}
//       >
//         Add to Cart
//       </button>
//     </div>
//   );
// }