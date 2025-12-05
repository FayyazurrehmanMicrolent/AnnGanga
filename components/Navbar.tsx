'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, Search, Heart, ShoppingBag, Bell, User, ChevronDown, ShoppingCart, X, Truck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import CartCount from './CartCount';
import WishlistCount from './WishlistCount';
import NotificationDropdown from './NotificationDropdown';
import Sidebar from './Sidebar';

export default function Navbar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const { user, isAuthenticated } = useAuth();
  
  // Handle notification read events
  const notificationReadRef = useRef(false);
  
  // This effect will handle the notification read state updates
  useEffect(() => {
    if (notificationReadRef.current) {
      setNotificationCount(prev => Math.max(0, prev - 1));
      notificationReadRef.current = false;
    }
  }, [notificationReadRef]);
  
  const handleNotificationRead = useCallback(() => {
    notificationReadRef.current = true;
  }, []);
  
  const handleNotificationCountChange = useCallback((count: number) => {
    setNotificationCount(count);
  }, []);

  // Handle scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isDefaultAvatar = (url?: string) => {
    if (!url) return true;
    return /default-avatar/i.test(url) || url.trim() === '';
  };

  return (
    <>
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity duration-300"
        />
      )}

      {/* Header */}
      <header 
        className={`sticky top-0 z-30 bg-white transition-shadow duration-300 ${
          isScrolled ? 'shadow-md' : 'shadow-sm'
        }`}
      >
        <div className="w-full px-4">
          <div className="flex items-center justify-between h-16">
            {/* LEFT SECTION - Menu and Logo */}
            <div className="flex items-center">
              {/* Menu Button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="text-gray-600 hover:text-indigo-600 transition p-2 mr-1"
                aria-label="Open menu"
              >
                <Menu size={22} />
              </button>

              {/* Logo */}
              <Link href="/" className="flex items-center gap-1.5 hover:opacity-80 transition">
                <div className="w-8 h-8 flex items-center justify-center">
                  <Image 
                    src="/img_Logo.png" 
                    alt="AnnGanga Logo" 
                    width={32} 
                    height={32}
                    className="object-contain"
                  />
                </div>
                <span className="text-gray-900 font-bold text-xl">
                  AnnGanga
                </span>
              </Link>
            </div>

            {/* CENTER – SEARCH BAR */}
            <div className="hidden md:flex items-center justify-center flex-1 px-4">
              <div className="relative w-full max-w-2xl">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-full pl-12 pr-5 py-2.5 text-sm text-gray-800 bg-white border border-gray-200 focus:outline-none focus:ring-0 focus:border-green-400 focus:shadow-md focus:shadow-green-100 transition-all duration-200 shadow-sm"
                  placeholder="Search for products..."
                />
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                {searchQuery && (
                  <button 
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            

            {/* RIGHT SECTION - Icons */}
            <div className="flex items-center gap-2 md:gap-4 text-gray-600">
              {/* Search Icon (Mobile) */}
              <button 
                className="md:hidden p-1.5 hover:text-indigo-600 transition-colors"
                onClick={() => setShowMobileSearch(!showMobileSearch)}
              >
                <Search size={22} />
              </button>

              {/* Wishlist */}
              <Link 
                href="/wishlist" 
                className="relative p-2 hover:text-indigo-600 transition-colors"
                aria-label="Wishlist"
              >
                <Heart size={22} className="cursor-pointer" />
                <WishlistCount />
              </Link>

              <Link 
                href="/cart" 
                className="relative p-2 hover:text-indigo-600 transition-colors"
                aria-label="Shopping Cart"
              >
                <ShoppingBag size={22} className="cursor-pointer" />
                <CartCount />
              </Link>

              <div className="relative">
                <NotificationDropdown 
                  onMarkAsRead={handleNotificationRead}
                  onNotificationCountChange={handleNotificationCountChange}
                />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </div>

              {isAuthenticated && user ? (
                <div className="relative">
                  <Link 
                    href="/profile"
                    className="flex items-center gap-2 text-gray-700 hover:text-indigo-600 transition focus:outline-none"
                    aria-label="User profile"
                  >
                    {user.profileImage && !isDefaultAvatar(user.profileImage) ? (
                      <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-indigo-100">
                        <Image 
                          src={user.profileImage.startsWith('http') ? user.profileImage : `/${user.profileImage.replace(/^\/+/, '')}`} 
                          alt={user.name || 'User'}
                          width={32}
                          height={32}
                          className="object-cover w-full h-full"
                        />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <User size={18} className="text-gray-500" />
                      </div>
                    )}
                  </Link>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors p-1.5"
                >
                  <User size={20} />
                  <span className="hidden lg:inline">Sign In</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* MOBILE SEARCH BAR - Shows on mobile when search icon is clicked */}
        {(showMobileSearch || (typeof window !== 'undefined' && window.innerWidth < 768)) && (
          <div className="md:hidden px-4 py-2 bg-white border-t border-gray-200">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-full pl-10 pr-10 py-2 text-sm bg-white border border-gray-300 focus:outline-none focus:ring-0 focus:border-green-400 focus:shadow-md focus:shadow-green-100 transition-all duration-200 shadow-sm"
                placeholder="Search spices, herbs, seasonings…"
                autoFocus
              />
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                size={18}
              />
              {searchQuery && (
                <button 
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-10 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              )}
              <button 
                type="button"
                onClick={() => setShowMobileSearch(false)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
