'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { X, User, Heart, ShoppingBag, Settings, LogOut, ChevronRight, icons, Home, MapPin, Star, Bell } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  const navItems = [
    { name: "Home", icon: Home, href: '/' },
    { name: 'My Profile', icon: User, href: '/profile' },
    { name: 'My Orders', icon: ShoppingBag, href: '/orders' },
    { name: 'Wishlist', icon: Heart, href: '/wishlist' },
    { name: "My Addresses", icon: MapPin, href: '/my-addresses' },
    { name: "Blogs", icon: Star, href: '/blogs' },
    { name: "Notifications", icon: Bell, href: '/notifications' }
  ];

  const handleLogout = () => {
    logout();
    onClose();
    router.push('/');
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 w-64 bg-white shadow-2xl z-50 transform transition-all duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        {/* Close Button */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200">

          <Image
            src="/img_Logo.png"
            alt="AnnGanga Logo"
            width={32}
            height={32}
            className="object-contain"
          />
          <div className='flex justify-between items-center w-full'>
            <h2 className="text-lg font-semibold text-gray-800 ml-2">AnnGanga</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 focus:outline-none p-1"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Profile Section */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-full bg-gray-200 overflow-hidden">
              {user?.profileImage ? (
                <Image
                  src={user.profileImage.startsWith('http') ? user.profileImage : `/${user.profileImage.replace(/^\/+/, '')}`}
                  alt={user.name || 'User'}
                  width={48}
                  height={48}
                  className="object-cover w-full h-full"
                  onError={(e) => {
                    // If image fails to load, show the default avatar
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = '';
                  }}
                />
              ) : (
                <div className="w-full h-full bg-indigo-100 flex items-center justify-center">
                  <User size={24} className="text-indigo-500" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-gray-900 truncate">
                {isAuthenticated && user ? user.name : 'Welcome'}
              </h3>
              <p className="text-xs text-gray-500 truncate">
                {isAuthenticated && user ? user.email : 'Sign in to access your account'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="py-1 overflow-y-auto h-[calc(70vh-100px)] flex flex-col justify-between">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center justify-between px-4 py-1 text-gray-700 hover:bg-gray-100 transition-colors duration-200 border-l-4 border-transparent hover:border-indigo-500"
              onClick={onClose}
            >
              <div className="flex items-center gap-3">
                <item.icon size={18} className="text-gray-600 flex-shrink-0" />
                <span className="text-sm">{item.name}</span>
              </div>
              <ChevronRight size={7} className="text-gray-400 flex-shrink-0" />
            </Link>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="absolute bottom-0 w-full p-3 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex items-center justify-center w-full px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
          >
            <LogOut size={16} className="mr-2" />
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
}
