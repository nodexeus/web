'use client';

import { useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  useNotificationStore,
  Notification,
} from '@/lib/stores/notification-store';
import {
  Bell,
  Server,
  Building2,
  Trash2,
  RefreshCw,
  Rocket,
  X,
  CheckCheck,
} from 'lucide-react';

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getIcon(type: Notification['type']) {
  switch (type) {
    case 'node-created':
      return <Rocket className="h-3.5 w-3.5 text-success" />;
    case 'node-updated':
      return <RefreshCw className="h-3.5 w-3.5 text-warning" />;
    case 'node-deleted':
      return <Trash2 className="h-3.5 w-3.5 text-destructive" />;
    case 'org-created':
    case 'org-updated':
      return <Building2 className="h-3.5 w-3.5 text-primary" />;
    case 'org-deleted':
      return <Trash2 className="h-3.5 w-3.5 text-destructive" />;
    default:
      return <Server className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

export function NotificationPanel() {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const {
    notifications,
    unreadCount,
    isOpen,
    togglePanel,
    closePanel,
    markAllRead,
    markRead,
    clearAll,
  } = useNotificationStore();

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closePanel();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, closePanel]);

  const handleNotificationClick = (notification: Notification) => {
    markRead(notification.id);
    if (notification.nodeId) {
      router.push(`/nodes/${notification.nodeId}`);
      closePanel();
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={togglePanel}
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        title="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-medium">Activity</h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] text-primary hover:bg-accent"
                  title="Mark all read"
                >
                  <CheckCheck className="h-3 w-3" />
                  Read all
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground"
                  title="Clear all"
                >
                  <X className="h-3 w-3" />
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <Bell className="mb-2 h-8 w-8 text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground">No activity yet</p>
                <p className="mt-0.5 text-xs text-muted-foreground/60">
                  Events will appear here in real-time
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50 ${
                      !n.read ? 'bg-accent/20' : ''
                    }`}
                  >
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
                      {getIcon(n.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`truncate text-xs ${!n.read ? 'font-medium' : ''}`}
                        >
                          {n.title}
                        </p>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {timeAgo(n.timestamp)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {n.message}
                      </p>
                    </div>
                    {!n.read && (
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
