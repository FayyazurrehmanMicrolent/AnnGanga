'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, Clock, AlertCircle, Gift, Tag, X, ShoppingBag, Truck, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { markAllNotificationsAsRead } from '@/lib/notifications';

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

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'order':
      return <ShoppingBag size={20} className="text-blue-500" />;
    case 'delivery':
      return <Truck size={20} className="text-green-500" />;
    case 'offer':
      return <Tag size={20} className="text-purple-500" />;
    case 'reward':
      return <Gift size={20} className="text-amber-500" />;
    case 'subscription':
      return <Bell size={20} className="text-pink-500" />;
    default:
      return <AlertCircle size={20} className="text-gray-500" />;
  }
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();

  const fetchNotifications = async (pageNum: number = 1) => {
    if (!user?._id) return;
    
    try {
      const response = await fetch(
        `/api/notifications?userId=${user._id}&page=${pageNum}&limit=10`
      );
      
      if (response.ok) {
        const data = await response.json();
        setNotifications(prev => 
          pageNum === 1 ? data.data.notifications : [...prev, ...data.data.notifications]
        );
        setHasMore(data.data.notifications.length === 10);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?._id) {
      fetchNotifications(page);
    } else if (!isAuthenticated) {
      router.push('/login?redirect=/notifications');
    }
  }, [isAuthenticated, user?._id, page]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationId, isRead: true }),
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n =>
            n._id === notificationId ? { ...n, isRead: true } : n
          )
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?._id) return;
    
    setIsMarkingAllRead(true);
    try {
      await markAllNotificationsAsRead(user._id);
      setNotifications(prev => 
        prev.map(n => ({ ...n, isRead: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const minutes = Math.floor(diffInHours * 60);
      return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    } else if (diffInHours < 168) {
      const days = Math.floor(diffInHours / 24);
      return `${days} day${days === 1 ? '' : 's'} ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-600" />
          <p className="mt-2">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                {unreadCount > 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={isMarkingAllRead}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {isMarkingAllRead ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                      Processing...
                    </>
                  ) : (
                    'Mark all as read'
                  )}
                </button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-600" />
              <p className="mt-2 text-gray-600">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell size={48} className="mx-auto text-gray-300" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">No notifications</h3>
              <p className="mt-1 text-gray-500">We'll notify you when there's something new.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {notifications.map((notification) => (
                <li 
                  key={notification._id}
                  className={`px-6 py-4 hover:bg-gray-50 transition-colors ${
                    !notification.isRead ? 'bg-blue-50' : 'bg-white'
                  }`}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="ml-3 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {notification.title}
                        </p>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-400">
                            {formatDate(notification.createdAt)}
                          </span>
                          {!notification.isRead && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              New
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        {notification.message}
                      </p>
                      {notification.data?.url && (
                        <a
                          href={notification.data.url}
                          onClick={() => handleMarkAsRead(notification._id)}
                          className="mt-2 inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800"
                        >
                          View details
                          <svg className="ml-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </a>
                      )}
                    </div>
                    <button
                      onClick={() => handleMarkAsRead(notification._id)}
                      className="ml-2 p-1 text-gray-400 hover:text-gray-500 rounded-full hover:bg-gray-100"
                      title="Mark as read"
                    >
                      <Check size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {hasMore && !isLoading && (
            <div className="px-6 py-4 border-t border-gray-200 text-center">
              <button
                onClick={() => setPage(p => p + 1)}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
              >
                Load more notifications
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
