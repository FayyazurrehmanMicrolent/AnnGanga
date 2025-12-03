'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function MainLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  
  // Hide navbar and footer on login, register, and otp pages
  const hideNavAndFooter = pathname === '/login' || pathname === '/register' || pathname === '/otp';
  
  // Hide only footer on checkout pages
  const hideFooter = pathname === '/checkout' || pathname?.startsWith('/checkout/');

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {!hideNavAndFooter && <Navbar />}
      <main className="flex-1">
        {children}
      </main>
      {!hideNavAndFooter && !hideFooter && <Footer />}
    </div>
  );
}
