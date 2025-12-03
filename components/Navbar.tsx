'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, Search, Heart, ShoppingCart, User, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import CartCount from './CartCount';
import WishlistCount from './WishlistCount';

export default function Navbar() {
  const [sidebar, setSidebar] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, isAuthenticated, logout } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const isDefaultAvatar = (url?: string) => {
    if (!url) return false;
    return /default-avatar/i.test(url) || url.trim() === '';
  };

  return (
    <>
      {/* Overlay */}
      {sidebar && (
        <div
          onClick={() => setSidebar(false)}
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* LEFT SECTION */}
            <div className="flex items-center gap-4">
              {/* Sidebar Open Button (Mobile + Desktop) */}
              <button
                onClick={() => setSidebar(true)}
                className="text-gray-700 hover:text-indigo-600 transition md:hidden"
                aria-label="Open menu"
              >
                <Menu size={26} />
              </button>

              {/* Logo */}
              <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
                <Image 
                  src="/img_Logo.png" 
                  alt="AnnGanga Logo" 
                  width={40} 
                  height={40}
                  className="object-contain"
                />
                <span className="text-gray-900 font-extrabold text-2xl tracking-wide">
                  AnnGanga
                </span>
              </Link>
            </div>

            {/* CENTER – SEARCH BAR */}
            <div className="hidden md:flex flex-1 max-w-xl mx-4">
              <div className="relative w-full">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-full pl-10 pr-4 py-2.5 text-sm placeholder-gray-500 text-gray-800 bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Search spices, herbs, seasonings…"
                />
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                  size={20}
                />
              </div>
            </div>

            {/* RIGHT SECTION */}
            <div className="flex items-center gap-6 text-gray-700">
              <Link 
                href="/wishlist" 
                className="relative hover:text-indigo-600 transition"
                aria-label="Wishlist"
              >
                <Heart size={22} className="cursor-pointer" />
                <WishlistCount />
              </Link>

              <Link 
                href="/cart" 
                className="relative hover:text-indigo-600 transition"
                aria-label="Shopping Cart"
              >
                <ShoppingCart size={22} className="cursor-pointer" />
                <CartCount />
              </Link>

              {isAuthenticated && user ? (
                <div className="relative" ref={dropdownRef}>
                  <button 
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-2 text-gray-700 hover:text-indigo-600 transition focus:outline-none"
                    aria-label="User menu"
                    aria-expanded={isDropdownOpen}
                  >
                    {user.profileImage && !isDefaultAvatar(user.profileImage) ? (
                      <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-indigo-100">
                        <Image 
                          src={user.profileImage.startsWith('http') ? user.profileImage : `/${user.profileImage.replace(/^\/+/, '')}`} 
                          alt={user.name || 'User'}
                          width={32}
                          height={32}
                          className="object-cover w-full h-full"
                          unoptimized={true}
                          onError={(e) => {
                            // Prevent infinite loop by replacing with null
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement?.querySelector('.fallback-avatar')?.classList.remove('hidden');
                          }}
                        />
                        {/* Fallback avatar that's hidden by default */}
                        <div className="hidden fallback-avatar w-full h-full flex items-center justify-center bg-indigo-100 text-indigo-700 font-medium">
                          {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                      </div>
                      ) : (
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-medium">
                        {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                    <span className="text-sm font-medium hidden md:inline">
                      {user.name?.split(' ')[0] || 'Account'}
                    </span>
                  </button>
                  
                  {/* Dropdown menu */}
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-100">
                      <Link 
                        href="/profile" 
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <User className="w-4 h-4 mr-2" />
                        My Profile
                      </Link>
                      <Link 
                        href="/orders" 
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        My Orders
                      </Link>    
                      <button
                        onClick={() => {
                          logout();
                          setIsDropdownOpen(false);
                        }}
                        className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link 
                  href="/login"
                  className="hidden md:flex ml-2 items-center gap-2 text-gray-700 hover:text-indigo-600 transition"
                  aria-label="Login"
                >
                  <User size={20} />
                  <span className="text-sm font-medium">Login</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* MOBILE SEARCH BAR */}
        {mobileMenu && (
          <nav className="md:hidden px-4 pb-4">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-full pl-10 pr-4 py-2.5 text-sm placeholder-gray-500 text-gray-800 bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Search spices, herbs, seasonings…"
              />
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                size={20}
              />
            </div>
          </nav>
        )}
      </header>
    </>
  );
}
