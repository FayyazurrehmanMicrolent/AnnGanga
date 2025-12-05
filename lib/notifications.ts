export const markNotificationAsRead = async (notificationId: string) => {
  const response = await fetch(`/api/notifications/mark-read`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ notificationId, isRead: true }),
  });

  if (!response.ok) {
    throw new Error('Failed to mark notification as read');
  }

  return response.json();
};

export const markAllNotificationsAsRead = async (userId: string) => {
  const response = await fetch('/api/notifications/mark-all-read', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to mark all notifications as read');
  }

  return response.json();
};

export const getUnreadCount = async (userId: string): Promise<number> => {
  const response = await fetch(`/api/notifications/count?userId=${userId}&unreadOnly=true`);
  
  if (!response.ok) {
    throw new Error('Failed to get unread notifications count');
  }

  const data = await response.json();
  return data.data?.total || 0;
};
