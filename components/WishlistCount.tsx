'use client';

import { useWishlist } from '@/context/WishlistContext';

export default function WishlistCount() {
  const { itemCount } = useWishlist();

  if (itemCount === 0) {
    return null;
  }

  return (
    <span className="absolute -top-2 -right-2 bg-red-500 text-[10px] font-bold text-white rounded-full h-5 w-5 grid place-items-center">
      {itemCount}
    </span>
  );
}
