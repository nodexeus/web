import { create } from 'zustand';

export type NotificationType =
  | 'node-created'
  | 'node-updated'
  | 'node-deleted'
  | 'org-created'
  | 'org-updated'
  | 'org-deleted'
  | 'member-joined'
  | 'invitation-created'
  | 'info';

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  nodeId?: string;
  orgId?: string;
};

type NotificationStore = {
  notifications: Notification[];
  unreadCount: number;
  isOpen: boolean;

  addNotification: (
    notification: Omit<Notification, 'id' | 'timestamp' | 'read'>,
  ) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
  clearAll: () => void;
  togglePanel: () => void;
  closePanel: () => void;
};

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isOpen: false,

  addNotification: (notification) => {
    const newNotification: Notification = {
      ...notification,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      read: false,
    };

    set((state) => {
      // Keep max 100 notifications
      const updated = [newNotification, ...state.notifications].slice(0, 100);
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      };
    });
  },

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  markRead: (id) =>
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      );
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      };
    }),

  clearAll: () => set({ notifications: [], unreadCount: 0 }),

  togglePanel: () => set((state) => ({ isOpen: !state.isOpen })),
  closePanel: () => set({ isOpen: false }),
}));
