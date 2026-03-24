import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Notification } from '../types';
import { useAuth } from './AuthContext';
import { api } from '../services/api';
import { X } from 'lucide-react';

interface Toast {
    id: string;
    title: string;
    body: string;
    icon?: string;
    url?: string;
    type: 'message' | 'notification';
}

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    markRead: (ids: string[]) => Promise<void>;
    markAllRead: () => Promise<void>;
    addNotification: (n: Notification) => void;
}

const NotificationContext = createContext<NotificationContextType>({
    notifications: [],
    unreadCount: 0,
    markRead: async () => { },
    markAllRead: async () => { },
    addNotification: () => { },
});

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const wsRef = useRef<WebSocket | null>(null);
    const keepAliveRef = useRef<any>(null);

    const unreadCount = notifications.filter(n => !n.read).length;

    // Load initial notifications from server
    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        try {
            const data = await api.notifications.get(user.uid);
            setNotifications(data);
        } catch (e) {
            console.error('Failed to fetch notifications', e);
        }
    }, [user]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Real-time WebSocket subscription for incoming notifications
    useEffect(() => {
        if (!user) return;

        const playSound = (type: 'message' | 'notification') => {
            try {
                // Using standard HTML5 Audio. Web browsers may block this if the user hasn't interacted with the page yet.
                const audioUrl = type === 'message' ? '/sounds/message.wav' : '/sounds/notification.wav';
                const audio = new Audio(audioUrl);
                audio.play().catch(e => console.log("Audio play prevented:", e));
            } catch (e) {
                console.log("Failed to play sound", e);
            }
        };

        const addToast = (toast: Omit<Toast, 'id'>) => {
            const id = Math.random().toString(36).substr(2, 9);
            setToasts(prev => [...prev, { ...toast, id }]);
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, 5000);
        };

        const unsubscribe = api.chat.subscribe(user.uid, (data: any) => {
            if (data?.type === 'notification' && data?.notification) {
                setNotifications(prev => {
                    if (prev.find(n => n._id === data?.notification?._id)) return prev;
                    
                    addToast({
                        title: data.notification.fromName,
                        body: data.notification.type === 'like' ? 'liked your post' : 
                              data.notification.type === 'comment' ? 'commented on your post' :
                              data.notification.type === 'friend_request' ? 'sent you a friend request' :
                              data.notification.type === 'friend_accept' ? 'accepted your friend request' :
                              data.notification.type === 'meetup_request' ? 'wants to join your meetup' :
                              data.notification.type === 'meetup_accept' ? 'accepted your meetup request' : 'sent a notification',
                        icon: data.notification.fromPhoto,
                        url: data.notification.postId ? `/post/${data.notification.postId}` : `/app/profile/${data.notification.fromUid}`,
                        type: 'notification'
                    });

                    playSound('notification');
                    return [data?.notification as Notification, ...prev];
                });
            } else if (data?.text || data?.type === 'message') {
                if (data?.fromUid !== user?.uid && data?.fromUid !== 'system') {
                    addToast({
                        title: data.authorName || 'New Message',
                        body: data.text,
                        icon: data.authorPhoto,
                        url: `/app/chat/${data.fromUid}`,
                        type: 'message'
                    });
                    playSound('message');
                }
            }
        });

        return () => {
            unsubscribe();
        };
    }, [user]);

    const markRead = useCallback(async (ids: string[]) => {
        if (!ids.length) return;
        setNotifications(prev =>
            prev.map(n => ids.includes(n._id) ? { ...n, read: true } : n)
        );
        await api.notifications.markRead(ids);
    }, []);

    const markAllRead = useCallback(async () => {
        if (!user) return;
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        await api.notifications.markAllRead(user.uid);
    }, [user]);

    const addNotification = useCallback((n: Notification) => {
        setNotifications(prev => [n, ...prev]);
    }, []);

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, markRead, markAllRead, addNotification }}>
            {children}
            
            {/* Toast Container */}
            <div className="fixed bottom-20 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
                {toasts.map(toast => (
                    <div 
                        key={toast.id}
                        onClick={() => toast.url && (window.location.href = toast.url)}
                        className="pointer-events-auto bg-slate-900/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-right duration-300 cursor-pointer hover:bg-slate-800 transition-colors group"
                    >
                        {toast.icon ? (
                            <img src={toast.icon} alt={toast.title} className="w-12 h-12 rounded-full object-cover border-2 border-primary-500/20" />
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-primary-500/10 flex items-center justify-center">
                                <span className="text-primary-500 font-bold text-xl">{toast.title[0]}</span>
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <h4 className="text-white font-bold text-sm truncate">{toast.title}</h4>
                            <p className="text-slate-400 text-xs truncate">{toast.body}</p>
                        </div>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setToasts(prev => prev.filter(t => t.id !== toast.id));
                            }}
                            className="p-1 hover:bg-white/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <X size={16} className="text-slate-400" />
                        </button>
                    </div>
                ))}
            </div>

            <style>{`
                @keyframes slide-in-from-right {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .animate-in {
                    animation: slide-in-from-right 0.3s ease-out forwards;
                }
            `}</style>
        </NotificationContext.Provider>
    );
};
