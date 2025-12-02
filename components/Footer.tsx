'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="text-white bg-green-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid gap-8 md:grid-cols-4">
        {/* Brand */}
        <div>
          <div className="font-extrabold text-2xl tracking-wide mb-2">SpiceHome</div>
          <p className="text-sm opacity-90">Fresh spices delivered to your doorstep.</p>
        </div>
        
        {/* Quick Links */}
        <div>
          <div className="font-semibold mb-3">Quick Links</div>
          <ul className="space-y-2 text-sm opacity-90">
            <li className="hover:underline cursor-pointer">About Us</li>
            <li className="hover:underline cursor-pointer">Contact</li>
            <li className="hover:underline cursor-pointer">FAQs</li>
          </ul>
        </div>
        
        {/* Shop */}
        <div>
          <div className="font-semibold mb-3">Shop</div>
          <ul className="space-y-2 text-sm opacity-90">
            <li className="hover:underline cursor-pointer">Whole Spices</li>
            <li className="hover:underline cursor-pointer">Ground Spices</li>
            <li className="hover:underline cursor-pointer">Herbs</li>
          </ul>
        </div>
        
        {/* Follow Us */}
        <div>
          <div className="font-semibold mb-3">Follow Us</div>
          <div className="flex gap-4 mt-2">
            <span className="cursor-pointer hover:opacity-80">FB</span>
            <span className="cursor-pointer hover:opacity-80">IG</span>
            <span className="cursor-pointer hover:opacity-80">TW</span>
          </div>
        </div>
      </div>
      
      {/* Copyright */}
      <div className="text-center text-xs py-4 border-t border-green-500">
        &copy; {new Date().getFullYear()} SpiceHome. All rights reserved.
      </div>
    </footer>
  );
}
