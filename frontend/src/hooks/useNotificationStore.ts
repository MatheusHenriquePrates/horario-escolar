import { create } from 'zustand';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
    id: string;
    type: NotificationType;
    message: string;
    timestamp: Date;
    read: boolean;
}

interface NotificationState {
    notifications: Notification[];
    unreadCount: number;
    isOpen: boolean;

    addNotification: (type: NotificationType, message: string) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    removeNotification: (id: string) => void;
    clearAll: () => void;
    togglePanel: () => void;
    closePanel: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
    notifications: [],
    unreadCount: 0,
    isOpen: false,

    addNotification: (type, message) => {
        const newNotification: Notification = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type,
            message,
            timestamp: new Date(),
            read: false
        };

        set((state) => ({
            notifications: [newNotification, ...state.notifications].slice(0, 50), // Máximo 50 notificações
            unreadCount: state.unreadCount + 1
        }));
    },

    markAsRead: (id) => {
        set((state) => {
            const notification = state.notifications.find(n => n.id === id);
            if (notification && !notification.read) {
                return {
                    notifications: state.notifications.map(n =>
                        n.id === id ? { ...n, read: true } : n
                    ),
                    unreadCount: Math.max(0, state.unreadCount - 1)
                };
            }
            return state;
        });
    },

    markAllAsRead: () => {
        set((state) => ({
            notifications: state.notifications.map(n => ({ ...n, read: true })),
            unreadCount: 0
        }));
    },

    removeNotification: (id) => {
        set((state) => {
            const notification = state.notifications.find(n => n.id === id);
            const wasUnread = notification && !notification.read;
            return {
                notifications: state.notifications.filter(n => n.id !== id),
                unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount
            };
        });
    },

    clearAll: () => {
        set({ notifications: [], unreadCount: 0 });
    },

    togglePanel: () => {
        set((state) => ({ isOpen: !state.isOpen }));
    },

    closePanel: () => {
        set({ isOpen: false });
    }
}));
