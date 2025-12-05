'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Check, Clock, AlertCircle, Gift, Tag, X, ShoppingBag, Truck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { markNotificationAsRead, markAllNotificationsAsRead } from '@lib/notifications';

type NotificationType = 'order' | 'delivery' | 'offer' | 'subscription' | 'reward' | 'general';

interface Notification {
  _id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: any;
}

interface NotificationDropdownProps {
  onMarkAsRead?: () => void;
  onNotificationCountChange?: (count: number) => void;
}

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'order':
      return <ShoppingBag size={16} className="text-blue-500" />;
    case 'delivery':
      return <Truck size={16} className="text-green-500" />;
    case 'offer':
      return <Tag size={16} className="text-purple-500" />;
    case 'reward':
      return <Gift size={16} className="text-amber-500" />;
    case 'subscription':
      return <Bell size={16} className="text-pink-500" />;
    default:
      return <AlertCircle size={16} className="text-gray-500" />;
  }
};

export default function NotificationDropdown({ 
  onMarkAsRead, 
  onNotificationCountChange 
}: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const { isAuthenticated, user } = useAuth();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update parent component with initial count
  useEffect(() => {
    if (typeof onNotificationCountChange === 'function' && unreadCount > 0) {
      onNotificationCountChange(unreadCount);
    }
  }, []); // Only run once on mount

  // Fetch notifications when dropdown is opened or authentication state changes
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!isAuthenticated || !user?._id) return;
      
      try {
        setIsLoading(true);
        const response = await fetch(`/api/notifications?userId=${user._id}`);
        if (response.ok) {
          const result = await response.json();
          const notifications = result.data?.notifications || [];
          setNotifications(notifications);
          
          // Use the unreadCount from the API response or calculate it
          const unread = result.data?.unreadCount || 
                        notifications.filter((n: Notification) => !n.isRead).length;
          setUnreadCount(unread);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen || isAuthenticated) {
      fetchNotifications();
    }
  }, [isOpen, isAuthenticated, user?._id, onNotificationCountChange]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications(prev => {
        const updated = prev.map(n =>
          n._id === notificationId ? { ...n, isRead: true } : n
        );
        
        const unread = updated.filter(n => !n.isRead).length;
        setUnreadCount(unread);
        
        // Notify parent that a notification was read
        if (unread < unreadCount) {
          onMarkAsRead?.();
        }
        
        return updated;
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?._id) return;
    
    try {
      await markAllNotificationsAsRead(user._id);
      setNotifications(prev => {
        const updated = prev.map(n => ({ ...n, isRead: true }));
        // Update unread count
        setUnreadCount(0);
        onMarkAsRead?.();
        return updated;
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const minutes = Math.floor(diffInHours * 60);
      return `${minutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-indigo-600 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={22} className="cursor-pointer" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50">
          <div className="p-3 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-medium text-gray-900">Notifications</h3>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-indigo-600 hover:text-indigo-800"
                >
                  Mark all as read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto"></div>
                <p className="mt-2">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Bell size={32} className="mx-auto text-gray-300 mb-2" />
                <p>No notifications yet</p>
              </div>
            ) : (
              <ul>
                {notifications.map((notification) => (
                  <li
                    key={notification._id}
                    className={`border-b border-gray-100 last:border-0 ${
                      !notification.isRead ? 'bg-blue-50' : 'bg-white'
                    } hover:bg-gray-50 transition-colors`}
                  >
                    <a
                      href={notification.data?.url || '#'}
                      onClick={(e) => {
                        e.preventDefault();
                        handleMarkAsRead(notification._id);
                        if (notification.data?.url) {
                          window.location.href = notification.data.url;
                        }
                      }}
                      className="block p-3"
                    >
                      <div className="flex items-start">
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="ml-3 flex-1">
                          <div className="flex justify-between">
                            <p className="text-sm font-medium text-gray-900">
                              {notification.title}
                            </p>
                            <span className="text-xs text-gray-400">
                              {formatDate(notification.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                        </div>
                        {!notification.isRead && (
                          <div className="ml-2">
                            <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
                          </div>
                        )}
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 text-center">
              <a
                href="/notifications"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
              >
                View all notifications
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
