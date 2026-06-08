import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Notification } from '../types';
import { useAuth } from './AuthContext';
import { api } from '../services/api';
import { X, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Haversine great-circle distance in km
const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const NEARBY_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours
const NEARBY_INITIAL_DELAY_MS = 30 * 1000;            // 30 seconds after mount

const KNOWN_NOTIFICATION_TYPES = [
    'friend_request', 'friend_accept', 'like', 'comment',
    'meetup_request', 'meetup_accept', 'friend_post', 'friend_event', 'new_event', 'announcement',
] as const;

// Only check during times when metro-city users are typically free:
// 7–9:30 AM (morning commute), 12–2 PM (lunch), 5–9 PM (evening/after work)
function isActiveHour(): boolean {
    const h = new Date().getHours();
    return (h >= 7 && h < 10) || (h >= 12 && h < 14) || (h >= 17 && h < 21);
}

interface Toast {
    id: string;
    title: string;
    body: string;
    icon?: string;
    url?: string;
    type: 'message' | 'notification' | 'nearby';
}

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    unreadMessages: number;
    unreadRooms: number;
    markRead: (ids: string[]) => Promise<void>;
    markAllRead: () => Promise<void>;
    addNotification: (n: Notification) => void;
    clearUnreadMessages: () => void;
    clearUnreadRooms: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
    notifications: [],
    unreadCount: 0,
    unreadMessages: 0,
    unreadRooms: 0,
    markRead: async () => { },
    markAllRead: async () => { },
    addNotification: () => { },
    clearUnreadMessages: () => { },
    clearUnreadRooms: () => { },
});

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [unreadRooms, setUnreadRooms] = useState(0);
    const wsRef = useRef<WebSocket | null>(null);
    const keepAliveRef = useRef<any>(null);
    const nearbyIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastNearbyUidsRef = useRef<Set<string>>(new Set());

    const unreadCount = notifications.filter(n => !n.read).length;

    const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts(prev => [...prev, { ...toast, id }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);
    }, []);

    const checkNearbyPeople = useCallback(async () => {
        if (!user || !navigator.geolocation) return;
        if (!isActiveHour()) return;
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude: lat, longitude: lng } = position.coords;
                    const [myProfile, allProfiles] = await Promise.all([
                        api.profile.get(user.uid),
                        api.profile.getAllWithLocation(user.uid),
                    ]);
                    const radius: number = (myProfile as any)?.discoveryRadius ?? 10;
                    const nearbyUsers = (allProfiles as any[]).filter((p: any) => {
                        if (p.uid === user.uid) return false;
                        if (!p.lastLocation?.lat || !p.lastLocation?.lng) return false;
                        return haversineKm(lat, lng, p.lastLocation.lat, p.lastLocation.lng) <= radius;
                    });
                    const newPeople = nearbyUsers.filter((p: any) => !lastNearbyUidsRef.current.has(p.uid));
                    lastNearbyUidsRef.current = new Set(nearbyUsers.map((p: any) => p.uid as string));
                    if (newPeople.length > 0) {
                        const first = newPeople[0];
                        addToast({
                            title: `${newPeople.length} ${newPeople.length === 1 ? 'person' : 'people'} near you!`,
                            body: newPeople.length === 1
                                ? `${first.displayName} is nearby`
                                : `${first.displayName} and ${newPeople.length - 1} other${newPeople.length > 2 ? 's' : ''} are nearby`,
                            icon: first.photoURL || undefined,
                            url: '/app/map',
                            type: 'nearby',
                        });
                    }
                } catch (e) {
                    console.error('Nearby people check failed:', e);
                }
            },
            () => { /* silently ignore location errors */ },
            { timeout: 8000, maximumAge: 120000 }
        );
    }, [user, addToast]);

    // Periodic nearby-people check
    useEffect(() => {
        if (!user) return;
        const initialTimeout = setTimeout(checkNearbyPeople, NEARBY_INITIAL_DELAY_MS);
        nearbyIntervalRef.current = setInterval(checkNearbyPeople, NEARBY_CHECK_INTERVAL_MS);
        return () => {
            clearTimeout(initialTimeout);
            if (nearbyIntervalRef.current) clearInterval(nearbyIntervalRef.current);
        };
    }, [user, checkNearbyPeople]);

    // Load initial notifications from server
    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        try {
            const data = await api.notifications.get(user.uid);
            setNotifications(data.filter((n: Notification) => KNOWN_NOTIFICATION_TYPES.includes(n.type as any)));
        } catch (e) {
            console.error('Failed to fetch notifications', e);
        }
    }, [user]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Load initial unread message count
    useEffect(() => {
        if (!user) return;
        api.chat.getUnreadCount(user.uid).then(count => setUnreadMessages(count)).catch(() => {});
    }, [user]);

    const clearUnreadMessages = useCallback(() => setUnreadMessages(0), []);
    const clearUnreadRooms = useCallback(() => setUnreadRooms(0), []);

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

        const unsubscribe = api.chat.subscribe(user.uid, (data: any) => {
            if (data?.type === 'notification' && data?.notification) {
                // room_message no longer creates notification docs — skip that type here
                if (data.notification.type === 'room_message') return;
                // Skip unknown / generic notification types
                if (!KNOWN_NOTIFICATION_TYPES.includes(data.notification.type)) return;
                // Skip own actions (announcements have no fromUid, so only skip when fromUid matches)
                if (data.notification.fromUid && data.notification.fromUid === user.uid) return;

                setNotifications(prev => {
                    if (prev.find(n => n._id === data?.notification?._id)) return prev;

                    if (data.notification.type === 'announcement') {
                        addToast({
                            title: data.notification.title || 'Orbyt',
                            body: data.notification.message || '',
                            icon: undefined,
                            url: '/app/notifications',
                            type: 'notification',
                        });
                    } else {
                        addToast({
                            title: data.notification.type === 'friend_post'
                                ? `📸 ${data.notification.fromName} graced the feed`
                                : data.notification.type === 'friend_event'
                                ? `🎉 ${data.notification.fromName} allegedly has a plan`
                                : data.notification.type === 'new_event'
                                ? `🔥 Someone nearby made plans. No pressure.`
                                : data.notification.fromName,
                            body: data.notification.type === 'like' ? 'actually noticed your post. wild, right?' :
                                  data.notification.type === 'comment' ? 'had thoughts. they couldn\'t help themselves.' :
                                  data.notification.type === 'friend_request' ? 'slid into your orbit' :
                                  data.notification.type === 'friend_accept' ? '🎉 mutual obsession confirmed!' :
                                  data.notification.type === 'meetup_request' ? 'wants in on your gathering. the audacity.' :
                                  data.notification.type === 'meetup_accept' ? '✅ fine, you can come. don\'t be weird about it.' :
                                  data.notification.type === 'friend_post' ? 'blessed the feed. priorities, obviously.' :
                                  data.notification.type === 'friend_event' ? 'planned something. probably involves leaving the house.' :
                                  data.notification.type === 'new_event' ? `${data.notification.fromName} made plans nearby. your couch won\'t miss you.` :
                                  'did something. unclear what.',
                            icon: data.notification.fromPhoto,
                            url: data.notification.postId ? `/app/post/${data.notification.postId}` : `/app/profile/${data.notification.fromUid}`,
                            type: 'notification',
                        });
                    }

                    playSound('notification');
                    return [data?.notification as Notification, ...prev];
                });
            } else if (data?.text || data?.type === 'message') {
                const fromUidStr = String(data?.fromUid || '');
                const userUidStr = String(user?.uid || '');
                
                if (fromUidStr !== userUidStr && fromUidStr !== 'system') {
                    const path = window.location.pathname;
                    if (data?.groupId) {
                        // Room message — only bump the Rooms tab badge, no toast
                        const onRooms = path.startsWith('/app/rooms') || path.startsWith('/app/communities');
                        if (!onRooms) setUnreadRooms(prev => prev + 1);
                    } else {
                        // Direct message — badge + toast
                        const onChat = path.startsWith('/app/inbox') || path.startsWith('/app/chat');
                        if (!onChat) setUnreadMessages(prev => prev + 1);
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
        <NotificationContext.Provider value={{ notifications, unreadCount, unreadMessages, unreadRooms, markRead, markAllRead, addNotification, clearUnreadMessages, clearUnreadRooms }}>
            {children}
            
            {/* Toast Container */}
            <div className="fixed bottom-20 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
                {toasts.map(toast => (
                    <div 
                        key={toast.id}
                        onClick={() => {
                            if (toast.url) {
                                navigate(toast.url);
                                setToasts(prev => prev.filter(t => t.id !== toast.id));
                            }
                        }}
                        className="pointer-events-auto bg-slate-900/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-right duration-300 cursor-pointer hover:bg-slate-800 transition-colors group"
                    >
                        {toast.type === 'nearby' ? (
                            toast.icon ? (
                                <div className="relative w-12 h-12">
                                    <img src={toast.icon} alt={toast.title} className="w-12 h-12 rounded-full object-cover border-2 border-primary-500/40" />
                                    <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                                        <MapPin className="w-3 h-3 text-white" />
                                    </span>
                                </div>
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-primary-500/10 flex items-center justify-center border border-primary-500/30">
                                    <MapPin className="w-6 h-6 text-primary-500" />
                                </div>
                            )
                        ) : toast.icon ? (
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
