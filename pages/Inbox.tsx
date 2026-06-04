import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { UserProfile, Message } from "../types";
import {
  Loader2,
  MessageCircle,
  ChevronRight,
  Users,
  Calendar,
  Search,
  X,
} from "lucide-react";

interface InboxItem {
  type: "direct" | "group";
  partner?: UserProfile; // For direct
  groupId?: string; // For group
  lastMessage: Message;
  unreadCount?: number;
}

const Inbox: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const fetchInbox = async () => {
    if (!user) return;
    try {
      const data = await api.chat.getInbox(user?.uid);
      setConversations(data);
    } catch (e) {
      console.error("Failed to load inbox", e);
    } finally {
      if (loading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, [user]);

  // Refetch on visibility change (tab switch / focus)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") fetchInbox();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [user]);

  // Real-time subscription for Inbox updates
  useEffect(() => {
    if (!user) return;

    const unsubscribe = api.chat.subscribe(user?.uid, (newMsg: Message) => {
      setConversations((prev) => {
        const existingIndex = prev?.findIndex(conv => {
            if (newMsg?.groupId) {
                return conv?.type === "group" && conv?.groupId === newMsg?.groupId;
            } else {
                return conv?.type === "direct" && conv?.partner && (newMsg?.fromUid === conv?.partner?.uid || newMsg?.toUid === conv?.partner?.uid);
            }
        });

        if (existingIndex > -1) {
            const existingConv = prev?.[existingIndex];
            const isIncoming = newMsg?.fromUid !== user?.uid;
            const updatedConv: InboxItem = {
                ...existingConv,
                lastMessage: newMsg,
                unreadCount: isIncoming ? (existingConv?.unreadCount || 0) + 1 : existingConv?.unreadCount,
            };
            const nextConvs = [...prev];
            nextConvs.splice(existingIndex, 1);
            nextConvs.unshift(updatedConv);
            return nextConvs;
        } else {
            // New conversation detected - fetch full inbox to get details properly
            fetchInbox();
            return prev;
        }
      });
    });

    return () => unsubscribe();
  }, [user]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp || 0);
    const now = new Date();
    const isToday =
      date?.getDate() === now?.getDate() &&
      date?.getMonth() === now?.getMonth() &&
      date?.getFullYear() === now?.getFullYear();

    if (isToday) {
      return date?.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    // Check if within this week
    const diff = now?.getTime() - date?.getTime();
    const days = diff / (1000 * 3600 * 24);
    if (days < 7) {
      return date?.toLocaleDateString(undefined, { weekday: "short" });
    }

    return date?.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  const meetupChats = conversations.filter((c) => c.type === "group");
  const friendChats = conversations.filter((c) => c.type === "direct");

  const filterConvs = (list: InboxItem[]) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(c => {
      const name = c.type === "group"
        ? (c.lastMessage?.groupTitle || "Group Chat")
        : (c.partner?.displayName || "");
      const preview = c.lastMessage?.text || "";
      return name.toLowerCase().includes(q) || preview.toLowerCase().includes(q);
    });
  };

  const renderChatList = (chats: InboxItem[]) => {
    if (chats.length === 0)
      return (
        <p className="text-slate-500 text-sm px-4 py-2 italic">
          No conversations yet.
        </p>
      );

    return (
      <div className="space-y-2">
        {chats.map((conv) => {
          const isGroup = conv.type === "group";
          const isUnread = (conv.unreadCount || 0) > 0;
          const link = isGroup
            ? `/app/chat/group/${conv.groupId}`
            : `/app/chat/${conv.partner?.uid}`;

          // Skip broken direct items
          if (!isGroup && !conv.partner) return null;

          return (
            <div
              key={isGroup ? conv?.groupId : conv?.partner?.uid}
              onClick={() => navigate(link)}
              className={`
                                p-3 rounded-2xl border flex items-center gap-3 active:scale-[0.98] transition-all cursor-pointer hover:bg-slate-800
                                ${isUnread ? "bg-slate-800 border-slate-700" : "bg-slate-900 border-slate-800"}
                            `}
            >
              <div className="relative">
                <div
                  className={`w-12 h-12 rounded-full border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center ${isGroup ? "bg-primary-900/30" : "bg-slate-800"}`}
                >
                  {isGroup ? (
                    <Users className="w-6 h-6 text-primary-400" />
                  ) : conv?.partner?.photoURL ? (
                    <img
                      draggable={false}
                      src={conv?.partner?.photoURL}
                      alt={conv?.partner?.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-slate-500 font-bold">
                      {conv?.partner?.displayName?.[0]}
                    </span>
                  )}
                </div>
                {isUnread && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-slate-900 flex items-center justify-center"></div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <h3
                    className={`text-base truncate ${isUnread ? "font-black text-white" : "font-bold text-slate-200"}`}
                  >
                    {isGroup
                      ? conv?.lastMessage?.groupTitle || "Group Chat"
                      : conv?.partner?.displayName || "Unknown User"}
                  </h3>
                  <span
                    className={`text-[10px] whitespace-nowrap ml-2 ${isUnread ? "text-blue-400 font-bold" : "text-slate-500"}`}
                  >
                    {formatTime(conv?.lastMessage?.createdAt || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p
                    className={`text-sm truncate ${isUnread ? "text-white font-medium" : "text-slate-400"}`}
                  >
                    {conv?.lastMessage?.fromUid === user?.uid && (
                      <span className="text-slate-500 mr-1 font-normal">
                        You:
                      </span>
                    )}
                    {isGroup &&
                      conv?.lastMessage?.fromUid !== user?.uid &&
                      conv?.lastMessage?.fromUid !== "system" && (
                        <span className="text-slate-500 mr-1 font-normal">
                          {conv?.lastMessage?.authorName}:
                        </span>
                      )}
                    {conv?.lastMessage?.text}
                  </p>
                  {isUnread && (
                    <span className="ml-2 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {conv?.unreadCount}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight
                className={`w-4 h-4 ${isUnread ? "text-blue-500" : "text-slate-600"}`}
              />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col pb-20">
      {/* Header */}
      <div className="bg-slate-900/80 backdrop-blur-md px-4 py-4 shadow-sm border-b border-slate-800 sticky top-0 z-20">
        {showSearch ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-slate-800 rounded-xl px-3 py-2 border border-slate-700">
              <Search className="w-4 h-4 text-slate-500 shrink-0" />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="bg-transparent text-white text-sm flex-1 outline-none placeholder-slate-500"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-slate-500 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="text-slate-400 hover:text-white text-sm">
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-white">Messages</h1>
            <button onClick={() => setShowSearch(true)} className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors">
              <Search className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 p-4 max-w-md mx-auto w-full overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4 border border-slate-800">
              <MessageCircle className="w-8 h-8 opacity-50" />
            </div>
            <p>No messages yet.</p>
            <p className="text-sm mt-1">
              Join a meetup or start a chat from a profile!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Meetups Section */}
            <div>
              <div className="flex items-center gap-2 mb-3 px-1">
                <Calendar className="w-4 h-4 text-primary-500" />
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  MeetUps
                </h2>
              </div>
              {renderChatList(filterConvs(meetupChats))}
            </div>

            {/* Friends Section */}
            <div>
              <div className="flex items-center gap-2 mb-3 px-1">
                <Users className="w-4 h-4 text-blue-500" />
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Friends
                </h2>
              </div>
              {renderChatList(filterConvs(friendChats))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inbox;
