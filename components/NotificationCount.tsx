'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function NotificationCount() {
  const [count, setCount] = useState(0);
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !user?._id) return;

    const fetchUnreadCount = async () => {
      try {
        const response = await fetch(
          `/api/notifications?userId=${user._id}&unreadOnly=true`
        );
        if (response.ok) {
          const data = await response.json();
          setCount(data.data?.total || 0);
        }
      } catch (error) {
        console.error('Error fetching notification count:', error);
      }
    };

    fetchUnreadCount();
    // Set up polling every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    
    return () => clearInterval(interval);
  }, [isAuthenticated, user?._id]);

  if (count === 0) return null;

  return (
    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
      {count > 9 ? '9+' : count}
    </span>
  );
}
