import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Heart, MessageCircle, UserPlus, UserCheck, Calendar, CalendarCheck, ChevronLeft, CheckCheck, Zap } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { Notification } from '../types';

/* ---------- Helpers ---------- */

function timeAgo(ts: number): string {
    const diff = Date.now() - ts;
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    return new Date(ts).toLocaleDateString();
}

function getNotifMeta(type: Notification['type']) {
    switch (type) {
        case 'like':
            return { icon: <Heart className="w-4 h-4" />, color: 'bg-red-500', label: 'liked your post' };
        case 'comment':
            return { icon: <MessageCircle className="w-4 h-4" />, color: 'bg-blue-500', label: 'commented on your post' };
        case 'friend_request':
            return { icon: <UserPlus className="w-4 h-4" />, color: 'bg-purple-500', label: 'wants to connect with you' };
        case 'friend_accept':
            return { icon: <UserCheck className="w-4 h-4" />, color: 'bg-green-500', label: '🎉 connected with you!' };
        case 'meetup_request':
            return { icon: <Calendar className="w-4 h-4" />, color: 'bg-orange-500', label: 'wants to join your meetup 🙋' };
        case 'meetup_accept':
            return { icon: <CalendarCheck className="w-4 h-4" />, color: 'bg-teal-500', label: '✅ accepted your meetup request. See you there!' };
        case 'friend_post':
            return { icon: <Zap className="w-4 h-4" />, color: 'bg-yellow-500', label: 'just posted something. Don\'t miss the vibe 🔥' };
        case 'friend_event':
            return { icon: <Calendar className="w-4 h-4" />, color: 'bg-pink-500', label: 'dropped a new event. Grab your spot!' };
        case 'new_event':
            return { icon: <Zap className="w-4 h-4" />, color: 'bg-red-600', label: 'created a hot new event near you 🔥' };
        default:
            return { icon: <Bell className="w-4 h-4" />, color: 'bg-slate-500', label: 'sent you a notification' };
    }
}

function getNotifLink(n: Notification): string {
    if (['like', 'comment', 'meetup_request', 'meetup_accept', 'friend_post', 'friend_event', 'new_event'].includes(n.type) && n.postId) {
        return `/app/post/${n.postId}`;
    }
    return `/app/profile/${n.fromUid}`;
}

/* ---------- Card ---------- */

const NotifCard: React.FC<{ n: Notification; onTap: () => void }> = ({ n, onTap }) => {
    const { icon, color, label } = getNotifMeta(n.type);

    return (
        <button
            onClick={onTap}
            className={`
        w-full flex items-center gap-3 px-4 py-3.5 text-left
        transition-all duration-200 active:bg-slate-800/60
        ${!n.read ? 'bg-blue-500/5 border-l-2 border-blue-500' : 'border-l-2 border-transparent'}
      `}
        >
            {/* Avatar + type badge */}
            <div className="relative shrink-0">
                {n.fromPhoto ? (
                    <img
                        src={n.fromPhoto}
                        alt={n.fromName}
                        draggable={false}
                        className="w-12 h-12 rounded-full object-cover bg-slate-800"
                    />
                ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-lg">
                        {n.fromName?.[0]?.toUpperCase() ?? '?'}
                    </div>
                )}
                <div className={`absolute -bottom-0.5 -right-0.5 ${color} text-white rounded-full w-5 h-5 flex items-center justify-center shadow-lg border-2 border-slate-900`}>
                    {icon}
                </div>
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-100 leading-snug">
                    <span className="font-bold">{n.fromName}</span>
                    {' '}
                    <span className="text-slate-300">{label}</span>
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{timeAgo(n.createdAt)}</p>
            </div>

            {/* Unread dot */}
            {!n.read && (
                <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
            )}
        </button>
    );
};

/* ---------- Grouped sections ---------- */

function groupByDay(notifications: Notification[]): { label: string; items: Notification[] }[] {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const weekStart = todayStart - 6 * 86400000;

    const groups: Record<string, Notification[]> = {
        Today: [],
        Yesterday: [],
        'This Week': [],
        Earlier: [],
    };

    for (const n of notifications) {
        if (n.createdAt >= todayStart) groups['Today'].push(n);
        else if (n.createdAt >= yesterdayStart) groups['Yesterday'].push(n);
        else if (n.createdAt >= weekStart) groups['This Week'].push(n);
        else groups['Earlier'].push(n);
    }

    return Object.entries(groups)
        .filter(([, items]) => items.length > 0)
        .map(([label, items]) => ({ label, items }));
}

/* ---------- Page ---------- */

const NotificationsPage: React.FC = () => {
    const navigate = useNavigate();
    const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

    // Mark all unread as read when this page is opened
    useEffect(() => {
        if (unreadCount > 0) {
            const unreadIds = notifications?.filter(n => !n?.read).map(n => n?._id);
            if (unreadIds?.length > 0) markRead(unreadIds);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const groups = groupByDay(notifications);

    const handleTap = (n: Notification) => {
        if (!n?.read) markRead([n?._id]);
        navigate(getNotifLink(n));
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
                <div className="max-w-md mx-auto flex items-center justify-between px-4 py-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 -ml-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>

                    <h1 className="font-bold text-white text-lg">Notifications</h1>

                    {notifications?.some(n => !n?.read) ? (
                        <button
                            onClick={markAllRead}
                            className="flex items-center gap-1.5 text-xs font-semibold text-primary-400 hover:text-primary-300 transition-colors px-2 py-1.5 rounded-lg hover:bg-primary-500/10"
                        >
                            <CheckCheck className="w-4 h-4" />
                            All read
                        </button>
                    ) : (
                        <div className="w-20" />
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 max-w-md mx-auto w-full">
                {notifications.length === 0 ? (
                    /* Empty state */
                    <div className="flex flex-col items-center justify-center h-[60vh] text-center px-8 gap-4">
                        <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center">
                            <Bell className="w-9 h-9 text-slate-600" />
                        </div>
                        <div>
                            <p className="text-white font-bold text-lg">All caught up!</p>
                            <p className="text-slate-500 text-sm mt-1">
                                When someone likes your post, comments, or likes your profile, you'll see it here.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-800/60">
                        {groups.map(({ label, items }) => (
                            <div key={label}>
                                <div className="px-4 pt-5 pb-2">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</p>
                                </div>
                                <div>
                                    {items.map(n => (
                                        <NotifCard key={n._id} n={n} onTap={() => handleTap(n)} />
                                    ))}
                                </div>
                            </div>
                        ))}
                        <div className="h-6" />
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsPage;
