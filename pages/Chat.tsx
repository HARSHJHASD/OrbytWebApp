import { Ban, ChevronLeft, Copy, CornerUpLeft, Crown, Flag, Image as ImageIcon, Loader2, Plus, Send, Trash2, User as UserIcon, Users, X, Smile } from 'lucide-react';
import { compressImage } from '../util/ImageCompression';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Message, UserProfile, Post } from '../types';
import { triggerHaptic } from '../util/haptics';
import ConfirmModal from '../components/ui/ConfirmModal';

export default function Chat() {
    const { user } = useAuth();
    const { uid, groupId } = useParams<{ uid: string, groupId: string }>();
    const navigate = useNavigate();

    const [messages, setMessages] = useState<Message[]>([]);
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(true);
    const [friend, setFriend] = useState<UserProfile | null>(null);
    const [sending, setSending] = useState(false);

    // Group states
    const [members, setMembers] = useState<UserProfile[]>([]);
    const [groupPost, setGroupPost] = useState<Post | null>(null);
    const [showGroupInfo, setShowGroupInfo] = useState(false);
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [reportReason, setReportReason] = useState("");

    const [groupTitle, setGroupTitle] = useState("");
    const [reportingMsg, setReportingMsg] = useState<Message | null>(null);
    
    // Media States
    const [mediaType, setMediaType] = useState<'image' | 'emoji' | 'audio' | null>(null);
    const [mediaUrl, setMediaUrl] = useState<string | null>(null);
    const [showMediaMenu, setShowMediaMenu] = useState(false);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const isGroup = !!groupId;
    const scrollToBottom = (smooth = true) => {
        messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
    };

    useEffect(() => {
        // Scroll on initial load and when messages change
        if (!loading && messages.length > 0) {
            setTimeout(() => {
                scrollToBottom(true);
            }, 100);
        }
    }, [messages.length, loading]);

    useEffect(() => {
        const init = async () => {
            if (!user) return;
            try {
                if (isGroup && groupId) {
                    // Group Mode: Fetch history AND group details
                    const [history, groupData] = await Promise.all([
                        api.chat.getGroupHistory(groupId),
                        api.posts.getPost(groupId)
                    ]);
                    setMessages(history);
                    setGroupPost(groupData);

                    if (groupData) {
                        // Authorization Check
                        const isHost = groupData.uid === user.uid;
                        const isAttendee = groupData.attendees?.includes(user.uid);
                        
                        if (!isHost && !isAttendee) {
                            console.error("Unauthorized access to group chat");
                            navigate('/app');
                            return;
                        }

                        // Fetch members
                        const allMemberIds = [groupData?.uid, ...(groupData?.attendees || [])];
                        const uniqueIds = Array.from(new Set(allMemberIds));
                        const profiles = await api.profile.getBatch(uniqueIds);
                        setMembers(profiles);

                        if (groupData?.meetupDetails?.title) {
                            setGroupTitle(groupData?.meetupDetails?.title);
                        } else if (history?.length > 0 && history?.[0]?.groupTitle) {
                            setGroupTitle(history?.[0]?.groupTitle);
                        } else {
                            setGroupTitle("Group Chat");
                        }
                    } else {
                        setGroupTitle("Group Chat");
                    }

                } else if (uid) {
                    // 1:1 Mode
                    const friendProfile = await api.profile.get(uid);

                    if (!friendProfile) {
                        navigate('/app');
                        return;
                    }
                    setFriend(friendProfile);
                    const history = await api.chat.getHistory(user?.uid, uid);
                    setMessages(history);
                    await api.chat.markRead(user?.uid, uid);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [uid, groupId, user, navigate, isGroup]);

    // Real-time Subscription
    useEffect(() => {
        if (!user) return;

        const unsubscribe = api.chat.subscribe(user.uid, (payload: any) => {
            // Handle delete events
            if (payload?.type === 'message_deleted') {
                setMessages(prev => prev.map(m => m._id === payload.messageId ? { ...m, deleted: true, text: '', mediaUrl: undefined } : m));
                return;
            }
            const newMsg = payload as Message;
            let isRelevant = false;

            if (isGroup && groupId) {
                isRelevant = newMsg.groupId === groupId;
            } else if (uid) {
                isRelevant =
                    (newMsg.fromUid === uid && newMsg.toUid === user.uid) ||
                    (newMsg.fromUid === user.uid && newMsg.toUid === uid);
            }

            if (isRelevant) {
                setMessages(prev => {
                    if (prev.some(m => m._id === newMsg._id)) return prev;
                    return [...prev, newMsg];
                });

                if (!isGroup && uid && newMsg.fromUid === uid) {
                    api.chat.markRead(user.uid, uid).catch(console.error);
                }
            }
        });

        return () => unsubscribe();
    }, [user, uid, groupId, isGroup]);

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setSending(true);
            const compressed = await compressImage(file, 640, 0.5);
            handleSend('image', compressed);
            setShowMediaMenu(false);
        } catch (err) {
            console.error("Image compression failed", err);
        } finally {
            setSending(false);
        }
    };

    const handleSend = async (mType?: 'image' | 'emoji' | 'audio', mUrl?: string) => {
        if (!user?.uid) return;
        if (!text.trim() && !mUrl) return;
        setSending(true);
        const msgText = text.trim();
        const currentMediaType = mType || mediaType;
        const currentMediaUrl = mUrl || mediaUrl;
        const currentReply = replyingTo;

        setText(''); // Optimistic clear
        setMediaType(null);
        setMediaUrl(null);
        setReplyingTo(null);

        const replyTo = currentReply ? {
            _id: currentReply._id,
            text: currentReply.text,
            fromName: currentReply.fromUid === user?.uid
                ? 'You'
                : (isGroup ? (members.find(m => m.uid === currentReply.fromUid)?.displayName || 'User') : (friend?.displayName || 'User')),
            mediaType: currentReply.mediaType,
        } : undefined;

        try {
            const sentMsg = await api.chat.send(user.uid, uid, msgText, groupId, currentMediaType || undefined, currentMediaUrl || undefined, replyTo);
            const msgToAdd = replyTo ? { ...sentMsg, replyTo } : sentMsg;
            setMessages(prev => {
                if (prev?.some(m => m?._id === msgToAdd?._id)) return prev;
                return [...prev, msgToAdd];
            });
            triggerHaptic(15); // subtle tick on send
        } catch (e) {
            console.error("Failed to send", e);
            setText(msgText); // Restore text on fail
            setMediaType(currentMediaType);
            setMediaUrl(currentMediaUrl);
            setReplyingTo(currentReply);
        } finally {
            setSending(false);
        }
    };

    const handleSendEmoji = (emoji: string) => {
        setText(prev => prev + emoji);
    };

    const [confirmState, setConfirmState] = useState<{
        open: boolean;
        targetUid?: string;
    }>({
        open: false,
    });

    const handleConfirmRemove = async () => {
        if (!user || !groupPost || !confirmState.targetUid) return;

        try {
            await api.meetups.removeAttendee(
                groupPost._id!,
                user.uid,
                confirmState.targetUid
            );

            // Update local state
            setMembers(prev =>
                prev.filter(m => m.uid !== confirmState.targetUid)
            );

            setGroupPost(prev =>
                prev
                    ? {
                        ...prev,
                        attendees: prev.attendees?.filter(
                            id => id !== confirmState.targetUid
                        ),
                    }
                    : null
            );
        } catch (e) {
            console.error(e);
        }

        setConfirmState({ open: false });
    };

    const handleRemoveMember = async (targetUid: string) => {
        if (!user || !groupPost || !isGroup) return;

        setConfirmState({
            open: true,
            targetUid,
        });
    };

    const handleReportMessage = (msg: Message) => {
        setReportingMsg(msg);
        setReportModalOpen(true);
    };

    const handleReportSubmit = async () => {
        if (!user || !reportingMsg || !reportReason) return;
        try {
            await api.userAction.report(user.uid, reportingMsg.fromUid, `Message Report: ${reportReason}`, reportingMsg._id);
            setReportModalOpen(false);
            setReportingMsg(null);
            setReportReason("");
            alert("Message has been reported. Thank you.");
        } catch (e) {
            console.error(e);
        }
    };

    const handleDeleteMessage = async (msg: Message) => {
        if (!user) return;
        try {
            await api.chat.deleteMessage(msg._id, user.uid);
            setMessages(prev => prev.map(m => m._id === msg._id ? { ...m, deleted: true, text: '', mediaUrl: undefined } : m));
        } catch (e) {
            console.error('Failed to delete message', e);
        }
    };

    const handleCopyMessage = (text: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text).catch(console.error);
    };

    const handleBlockUser = async () => {
        if (!user || !uid) return;
        if (window.confirm("Are you sure you want to block this user? You will no longer see each other's messages or profile.")) {
            try {
                await api.userAction.block(user.uid, uid);
                navigate('/app');
            } catch (e) {
                console.error(e);
            }
        }
    };



    if (loading) {
        return (
            <div className="h-[100dvh] flex items-center justify-center bg-slate-950">
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
        );
    }

    if (!isGroup && !friend) return null;

    return (
        <div className="flex flex-col h-[100dvh] bg-slate-950 relative">
            {/* Header */}
            <div className="flex items-center px-4 py-3 bg-slate-900 border-b border-slate-800 shadow-sm shrink-0 sticky top-0 z-10">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 -ml-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>

                <div
                    className="flex items-center gap-3 ml-1 flex-1 cursor-pointer"
                    onClick={() => {
                        if (isGroup) {
                            setShowGroupInfo(true);
                        } else if (friend) {
                            navigate(`/app/profile/${uid}`);
                        }
                    }}
                >
                    {isGroup ? (
                        <div className="w-10 h-10 rounded-full bg-primary-900/50 border border-primary-500/30 flex items-center justify-center text-primary-400">
                            <Users className="w-5 h-5" />
                        </div>
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shrink-0">
                            {friend?.photoURL ? (
                                <img draggable={false} src={friend?.photoURL} alt={friend?.displayName} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center font-bold text-slate-500">
                                    {friend?.displayName?.[0] || 'U'}
                                </div>
                            )}
                        </div>
                    )}

                    <div>
                        <h2 className="font-bold text-white text-base leading-tight">
                            {isGroup ? (groupTitle || "Group Chat") : friend?.displayName}
                        </h2>
                        <p className="text-xs text-slate-500">
                            {isGroup ? 'Tap for Group Info' : 'Tap to view profile'}
                        </p>
                    </div>
                </div>

                {!isGroup && (
                    <button
                        onClick={handleBlockUser}
                        className="p-2 text-slate-500 hover:text-red-500 transition-colors"
                        title="Block User"
                    >
                        <Ban className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2 opacity-50">
                        <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center">
                            {isGroup ? <Users className="w-8 h-8" /> : <UserIcon className="w-8 h-8" />}
                        </div>
                        <p className="text-sm">Start the conversation!</p>
                    </div>
                ) : (
                    messages.map((msg, idx) => {
                        const isMe = msg.fromUid === user?.uid;
                        const isDeleted = (msg as any).deleted === true;
                        const showAvatar = !isMe && (idx === messages.length - 1 || messages[idx + 1]?.fromUid !== msg.fromUid);
                        // Date separator
                        const msgDate = new Date(msg.createdAt);
                        const previousMessage = idx > 0 ? messages[idx - 1] : undefined;
                        const prevDate = previousMessage ? new Date(previousMessage.createdAt) : null;
                        const showDateSep = !prevDate || msgDate.toDateString() !== prevDate.toDateString();
                        const today = new Date();
                        const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
                        const dateLabel = msgDate.toDateString() === today.toDateString() ? 'Today'
                            : msgDate.toDateString() === yesterday.toDateString() ? 'Yesterday'
                            : msgDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
                        const msgTime = msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                        return (
                            <React.Fragment key={msg._id}>
                                {showDateSep && (
                                    <div className="flex items-center gap-3 my-2">
                                        <div className="flex-1 h-px bg-slate-800" />
                                        <span className="text-[10px] text-slate-500 font-medium px-2">{dateLabel}</span>
                                        <div className="flex-1 h-px bg-slate-800" />
                                    </div>
                                )}
                                <div className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`flex max-w-[80%] flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        {isGroup && !isMe && showAvatar && (
                                            <span className="text-[10px] text-slate-500 ml-9 mb-0.5">{msg.authorName || 'User'}</span>
                                        )}

                                        <div className={`group flex ${isMe ? 'items-end justify-end' : 'items-end gap-2'}`}>
                                            {!isMe && (
                                                <div className="w-6 h-6 rounded-full bg-slate-800 overflow-hidden shrink-0 mb-1 opacity-80 border border-slate-700">
                                                    {showAvatar && (
                                                        (isGroup ? msg?.authorPhoto : friend?.photoURL) ? (
                                                            <img draggable={false} src={isGroup ? msg?.authorPhoto : friend?.photoURL} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-slate-500">
                                                                {(isGroup ? msg?.authorName : friend?.displayName)?.[0] || '?'}
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            )}

                                            {isMe && !isDeleted && (
                                                <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-all mb-1 shrink-0">
                                                    <button onClick={() => setReplyingTo(msg)} className="p-1 text-slate-600 hover:text-primary-400 transition-colors" title="Reply">
                                                        <CornerUpLeft className="w-3.5 h-3.5" />
                                                    </button>
                                                    {msg.text && <button onClick={() => handleCopyMessage(msg.text || '')} className="p-1 text-slate-600 hover:text-slate-300 transition-colors" title="Copy">
                                                        <Copy className="w-3.5 h-3.5" />
                                                    </button>}
                                                    <button onClick={() => window.confirm('Delete this message for everyone?') && handleDeleteMessage(msg)} className="p-1 text-slate-600 hover:text-red-500 transition-colors" title="Delete">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            )}

                                            <div className={`relative px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words shadow-sm
                                              ${isMe
                                                    ? 'bg-primary-600 text-white rounded-br-none'
                                                    : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'}
                                          `}>
                                                {isDeleted ? (
                                                    <span className={`italic text-xs ${isMe ? 'text-white/50' : 'text-slate-500'}`}>Message deleted</span>
                                                ) : (
                                                    <>
                                                        {msg.replyTo && (
                                                            <div className={`mb-2 -mx-1 px-3 py-1.5 rounded-lg border-l-2 text-xs ${isMe ? 'bg-black/20 border-white/40' : 'bg-slate-700/60 border-primary-500'}`}>
                                                                <p className={`font-bold mb-0.5 truncate ${isMe ? 'text-white/80' : 'text-primary-400'}`}>
                                                                    {msg.replyTo.fromName}
                                                                </p>
                                                                <p className={`truncate ${isMe ? 'text-white/60' : 'text-slate-400'}`}>
                                                                    {msg.replyTo.mediaType === 'image' ? '📷 Photo' : msg.replyTo.text}
                                                                </p>
                                                            </div>
                                                        )}
                                                        {msg.mediaType === 'image' && (
                                                            <div className="mb-2 -mx-1 -mt-1 rounded-xl overflow-hidden border border-white/10 shadow-lg cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setLightboxUrl(msg.mediaUrl || null)}>
                                                                <img src={msg.mediaUrl} alt="Sent image" className="max-w-full h-auto object-cover max-h-64 sm:max-h-80" />
                                                            </div>
                                                        )}
                                                        <span className={/^[\p{Emoji}\s]+$/u.test(msg?.text || "") && (msg?.text?.length || 0) <= 6 ? "text-4xl block py-1" : ""}>
                                                            {msg?.text}
                                                        </span>
                                                    </>
                                                )}
                                                <p className={`text-[9px] mt-1 ${isMe ? 'text-white/40 text-right' : 'text-slate-600'}`}>{msgTime}</p>
                                            </div>

                                            {!isMe && !isDeleted && (
                                                <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-all mb-1 shrink-0">
                                                    <button onClick={() => setReplyingTo(msg)} className="p-1 text-slate-600 hover:text-primary-400 transition-colors" title="Reply">
                                                        <CornerUpLeft className="w-3.5 h-3.5" />
                                                    </button>
                                                    {msg.text && <button onClick={() => handleCopyMessage(msg.text || '')} className="p-1 text-slate-600 hover:text-slate-300 transition-colors" title="Copy">
                                                        <Copy className="w-3.5 h-3.5" />
                                                    </button>}
                                                    <button onClick={() => handleReportMessage(msg)} className="p-1 text-slate-600 hover:text-yellow-500 transition-colors" title="Report">
                                                        <Flag className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </React.Fragment>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-slate-900 border-t border-slate-800 shrink-0 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
                <div className="max-w-md mx-auto relative">
                    
                    {/* Reply Bar */}
                    {replyingTo && (
                        <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-slate-800 rounded-xl border-l-2 border-primary-500">
                            <CornerUpLeft className="w-3.5 h-3.5 text-primary-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold text-primary-400 uppercase tracking-wider">
                                    Replying to {replyingTo.fromUid === user?.uid ? 'yourself' : (isGroup ? (members.find(m => m.uid === replyingTo.fromUid)?.displayName || 'User') : friend?.displayName)}
                                </p>
                                <p className="text-xs text-slate-400 truncate">
                                    {replyingTo.mediaType === 'image' ? '📷 Photo' : replyingTo.text}
                                </p>
                            </div>
                            <button onClick={() => setReplyingTo(null)} className="p-1 text-slate-500 hover:text-white transition-colors">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}

                    {/* Media Preview */}
                    {mediaUrl && (
                        <div className="absolute bottom-full left-0 right-0 mb-3 animate-slide-up">
                            <div className="bg-slate-800 rounded-2xl p-2 border border-slate-700 shadow-2xl flex items-center gap-3">
                                {mediaType === 'image' ? (
                                    <div className="w-16 h-16 rounded-lg overflow-hidden border border-slate-600 shrink-0">
                                        <img src={mediaUrl} className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <div className="w-16 h-16 rounded-lg bg-primary-950 flex items-center justify-center text-primary-500 shrink-0 border border-primary-900">
                                        <Smile className="w-8 h-8" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-white text-sm font-bold truncate">
                                        Image selected
                                    </p>
                                    <p className="text-slate-500 text-xs">Ready to send</p>
                                </div>
                                <button 
                                    onClick={() => { setMediaUrl(null); setMediaType(null); }}
                                    className="p-2 bg-slate-700 text-white rounded-full hover:bg-slate-600"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Media Menu */}
                    {showMediaMenu && (
                        <div className="absolute bottom-full left-0 mb-3 animate-slide-up w-full max-w-[320px]">
                            <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col">
                                <label className="flex items-center gap-3 px-4 py-3 hover:bg-slate-700 cursor-pointer transition-colors text-slate-200 hover:text-white border-b border-slate-700/50">
                                    <ImageIcon className="w-5 h-5 text-blue-400" />
                                    <span className="text-sm font-medium">Send Image</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                                </label>
                                <div className="p-3 bg-slate-800/50">
                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Emojis</div>
                                    <div className="grid grid-cols-6 gap-2">
                                        {['❤️', '🔥', '😂', '👍', '🙌', '✨', '🎉', '💡', '😊', '😍', '🤔', '😎', '😢', '🙏', '💯', '🚀', '🌟', '🌈'].map(emoji => (
                                            <button
                                                key={emoji}
                                                onClick={() => handleSendEmoji(emoji)}
                                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-700 hover:bg-primary-600 hover:border-primary-500 text-xl transition-all active:scale-90"
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowMediaMenu(!showMediaMenu)}
                            className={`p-3 rounded-full transition-all active:scale-95 ${showMediaMenu ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                        >
                            <Plus className={`w-5 h-5 transition-transform duration-300 ${showMediaMenu ? 'rotate-45' : ''}`} />
                        </button>

                        <input
                            value={text}
                            onChange={(e) => {
                                setText(e.target.value);
                                if (showMediaMenu) setShowMediaMenu(false);
                            }}
                            placeholder="Type a message..."
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-full px-5 py-3 text-white placeholder-slate-500 outline-none focus:border-primary-500 transition-colors"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                        />
                        <button
                            onClick={() => handleSend()}
                            disabled={(!text.trim() && !mediaUrl) || sending}
                            className="p-3 bg-primary-600 text-white rounded-full hover:bg-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/20 active:scale-95"
                        >
                            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-0.5" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Group Info Modal */}
            {showGroupInfo && groupPost && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowGroupInfo(false)}></div>
                    <div className="bg-slate-900 w-full max-sm rounded-3xl shadow-2xl relative z-10 flex flex-col max-h-[80vh] animate-slide-up border border-slate-800">

                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                            <h3 className="font-bold text-xl text-white">Group Info</h3>
                            <button onClick={() => setShowGroupInfo(false)} className="p-2 -mr-2 text-slate-400 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="overflow-y-auto p-4 flex-1 no-scrollbar space-y-6">

                            {/* Host Section */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">Host</h4>
                                {members.filter(m => m.uid === groupPost.uid).map(host => (
                                    <div key={host.uid} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-800/50 border border-slate-800">
                                        <div className="w-12 h-12 rounded-full bg-slate-800 overflow-hidden shrink-0 border-2 border-primary-500/50">
                                            {host.photoURL ? (
                                                <img draggable={false} src={host.photoURL} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center font-bold text-slate-500">{host.displayName?.[0]}</div>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-bold text-white">{host.displayName}</span>
                                                <Crown className="w-3.5 h-3.5 text-primary-500 fill-current" />
                                            </div>
                                            <p className="text-xs text-slate-400">Event Organizer</p>
                                        </div>
                                        <button
                                            onClick={() => navigate(`/app/profile/${host.uid}`)}
                                            className="text-xs bg-slate-800 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white transition-colors"
                                        >
                                            View
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Attendees Section */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-2 flex justify-between">
                                    <span>Members</span>
                                    <span className="text-slate-600">{members.length - 1}</span>
                                </h4>

                                <div className="space-y-2">
                                    {members.filter(m => m.uid !== groupPost.uid).length === 0 ? (
                                        <p className="text-slate-500 text-sm px-2 italic">No other members yet.</p>
                                    ) : (
                                        members.filter(m => m.uid !== groupPost.uid).map(member => (
                                            <div key={member.uid} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-800 border border-slate-700">
                                                <div className="w-10 h-10 rounded-full bg-slate-900 overflow-hidden shrink-0">
                                                    {member.photoURL ? (
                                                        <img draggable={false} src={member.photoURL} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center font-bold text-slate-500 text-xs">{member.displayName?.[0]}</div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <span className="font-bold text-white text-sm block truncate">{member.displayName}</span>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => navigate(`/app/profile/${member.uid}`)}
                                                        className="text-xs bg-slate-900 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white transition-colors border border-slate-700"
                                                    >
                                                        View
                                                    </button>

                                                    {/* Host Actions: Remove Member */}
                                                    {user && user.uid === groupPost.uid && (
                                                        <button
                                                            onClick={() => handleRemoveMember(member.uid)}
                                                            className="p-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                                                            title="Remove from group"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={confirmState.open}
                onClose={() => setConfirmState({ open: false })}
                onConfirm={handleConfirmRemove}
                title="Remove Member"
                description={`Remove ${members.find(m => m.uid === confirmState.targetUid)?.displayName || "this user"} from the group?`}
                confirmText="Remove"
                danger
            />

            {/* Image Lightbox */}
            {lightboxUrl && (
                <div
                    className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
                    onClick={() => setLightboxUrl(null)}
                >
                    <button
                        onClick={(e) => { e.stopPropagation(); setLightboxUrl(null); }}
                        className="absolute top-5 right-5 z-10 w-11 h-11 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors backdrop-blur-sm border border-white/10"
                        aria-label="Close"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <img
                        src={lightboxUrl}
                        alt="Full size"
                        draggable={false}
                        className="max-w-[95vw] max-h-[90vh] object-contain rounded-xl shadow-2xl select-none"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}

            {/* Report Modal */}
            {reportModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-fade-in">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setReportModalOpen(false)}></div>
                    <div className="bg-slate-900 w-full max-w-xs rounded-2xl shadow-2xl relative z-10 p-5 animate-slide-up border border-slate-800">
                        <h3 className="text-lg font-bold text-white mb-4 text-center">Report Message</h3>
                        <div className="space-y-2">
                            {["Spam", "Harassment", "Inappropriate", "Fake Profile", "Other"].map(reason => (
                                <button
                                    key={reason}
                                    onClick={() => setReportReason(reason)}
                                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-colors ${
                                        reportReason === reason 
                                        ? "bg-primary-600 text-white" 
                                        : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                                    }`}
                                >
                                    {reason}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={handleReportSubmit}
                            disabled={!reportReason}
                            className="w-full mt-6 py-3 bg-primary-600 text-white rounded-xl font-bold disabled:opacity-50 hover:bg-primary-500 transition-colors"
                        >
                            Submit Report
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
