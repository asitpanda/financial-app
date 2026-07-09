import { create } from 'zustand';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  message: string;
  autoHideMs?: number;
}

interface NotificationStoreState {
  notifications: NotificationItem[];
  pushNotification: (notification: Omit<NotificationItem, 'id'>) => string;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const useNotificationStore = create<NotificationStoreState>((set) => ({
  notifications: [],
  pushNotification: (notification) => {
    const id = createId();
    set((state) => ({
      notifications: [...state.notifications, { id, ...notification }],
    }));
    return id;
  },
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((item) => item.id !== id),
    })),
  clearNotifications: () => set({ notifications: [] }),
}));