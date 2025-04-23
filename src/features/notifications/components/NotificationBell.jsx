'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Bell, Loader2, AlertTriangle, X } from 'lucide-react';
import { useSession } from 'next-auth/react';

function timeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.round((now - date) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);

  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function NotificationBell() {
  const { status: sessionStatus } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const modalRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (sessionStatus !== 'authenticated') {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/notifications');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch notifications');
      }
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [sessionStatus]);

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      const fetchCount = async () => {
        try {
          const response = await fetch('/api/notifications');
          const data = await response.json();
          if (response.ok) {
            setUnreadCount(data.unreadCount || 0);
          }
        } catch (err) {
          console.error('Error fetching initial notification count:', err);
        }
      };
      fetchCount();
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setIsOpen(false);
    }
  }, [sessionStatus]);

  useEffect(() => {
    if (isOpen && sessionStatus === 'authenticated') {
      fetchNotifications();
    }
  }, [isOpen, sessionStatus, fetchNotifications]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, modalRef]);
  const handleMarkAsRead = async (notificationId) => {
    console.log('Marking as read (not implemented):', notificationId);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }
    setIsOpen(false);
  };
  if (sessionStatus !== 'authenticated') {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-1 text-white/70 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-medium focus:ring-brand rounded-full"
        aria-label="Notifications"
        id="notification-bell-button"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 block h-4 w-4 transform -translate-y-1 translate-x-1 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center ring-2 ring-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 backdrop-blur-xl flex items-center justify-center z-50 p-4">
          <div
            ref={modalRef}
            className="animate-modal-appear bg-medium rounded-lg shadow-xl w-full max-w-md border border-light/30 flex flex-col max-h-[80vh]"
          >
            <div className="flex justify-between items-center p-3 border-b border-light/30 flex-shrink-0">
              <h3 className="text-lg font-semibold text-white">
                Notifications
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full text-white/60 hover:bg-light hover:text-white transition-colors"
                aria-label="Close notifications"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-grow overflow-y-auto">
              {isLoading && (
                <div className="flex items-center justify-center py-10 text-white/60">
                  <Loader2 size={20} className="animate-spin mr-2" /> Loading...
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-4 m-4 bg-red-900/30 border border-red-500/50 rounded-md text-red-300 text-sm">
                  <AlertTriangle size={16} /> Error: {error}
                </div>
              )}

              {!isLoading && !error && notifications.length === 0 && (
                <div className="px-3 py-10 text-center text-sm text-white/50">
                  You're all caught up!
                </div>
              )}

              {!isLoading && !error && notifications.length > 0 && (
                <ul className="divide-y divide-light/20">
                  {notifications.map((notification) => (
                    <li
                      key={notification.id}
                      className={`hover:bg-medium/60 transition-colors ${
                        !notification.isRead ? 'bg-light/10' : ''
                      }`}
                    >
                      <Link
                        href={notification.link || '#'}
                        onClick={() => handleNotificationClick(notification)}
                        className="block px-4 py-3 text-sm"
                        aria-disabled={!notification.link}
                        tabIndex={!notification.link ? -1 : 0}
                      >
                        <p
                          className={`mb-0.5 ${
                            !notification.isRead
                              ? 'text-white font-medium'
                              : 'text-white/80'
                          }`}
                        >
                          {notification.message}
                        </p>
                        <p className="text-xs text-white/50">
                          {timeAgo(notification.createdAt)}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
