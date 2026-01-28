import { useEffect, useRef } from 'react';
import { Bell, X, Check, CheckCheck, Trash2 } from 'lucide-react';
import { useNotificationStore, type Notification, type NotificationType } from '../../hooks/useNotificationStore';

// Ícones e cores por tipo
const typeConfig: Record<NotificationType, { bg: string; border: string; icon: string }> = {
    success: { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', icon: '✅' },
    error: { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', icon: '❌' },
    warning: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800', icon: '⚠️' },
    info: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', icon: 'ℹ️' }
};

function formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'Agora';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}min atrás`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h atrás`;
    return date.toLocaleDateString('pt-BR');
}

function NotificationItem({ notification, onMarkAsRead, onRemove }: {
    notification: Notification;
    onMarkAsRead: () => void;
    onRemove: () => void;
}) {
    const config = typeConfig[notification.type];

    return (
        <div
            className={`p-3 border-b border-gray-100 dark:border-gray-700 ${notification.read ? 'opacity-60' : ''} hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors`}
        >
            <div className="flex items-start gap-3">
                <span className="text-lg">{config.icon}</span>
                <div className="flex-1 min-w-0">
                    <p className={`text-sm text-gray-800 dark:text-gray-200 ${notification.read ? '' : 'font-medium'}`}>
                        {notification.message}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {formatTime(notification.timestamp)}
                    </p>
                </div>
                <div className="flex items-center gap-1">
                    {!notification.read && (
                        <button
                            onClick={onMarkAsRead}
                            className="p-1 text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                            title="Marcar como lida"
                        >
                            <Check className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={onRemove}
                        className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                        title="Remover"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export function NotificationBell() {
    const {
        notifications,
        unreadCount,
        isOpen,
        togglePanel,
        closePanel,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAll
    } = useNotificationStore();

    const panelRef = useRef<HTMLDivElement>(null);

    // Fechar ao clicar fora
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                closePanel();
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, closePanel]);

    return (
        <div className="relative" ref={panelRef}>
            {/* Botão do Sininho */}
            <button
                onClick={togglePanel}
                className="relative p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                title="Notificações"
            >
                <Bell className="w-6 h-6" />

                {/* Badge com contador */}
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full px-1">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Painel de Notificações */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-96 max-h-[500px] bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                        <h3 className="font-semibold text-gray-800 dark:text-white">
                            Notificações
                            {unreadCount > 0 && (
                                <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                                    ({unreadCount} não lidas)
                                </span>
                            )}
                        </h3>
                        <div className="flex items-center gap-1">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded text-xs flex items-center gap-1"
                                    title="Marcar todas como lidas"
                                >
                                    <CheckCheck className="w-4 h-4" />
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button
                                    onClick={clearAll}
                                    className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-xs flex items-center gap-1"
                                    title="Limpar todas"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Lista de Notificações */}
                    <div className="overflow-y-auto max-h-[400px]">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 dark:text-gray-500">
                                <Bell className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                <p>Nenhuma notificação</p>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <NotificationItem
                                    key={notification.id}
                                    notification={notification}
                                    onMarkAsRead={() => markAsRead(notification.id)}
                                    onRemove={() => removeNotification(notification.id)}
                                />
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
