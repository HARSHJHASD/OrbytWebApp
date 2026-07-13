import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Message, Community, UserProfile } from '../types';
import { useConfig } from '../context/ConfigContext';
import {
  ArrowLeft, Flag, Hash, Users, Send, Loader2, Image as ImageIcon, X, Crown,
  Copy, Trash2, Reply, Pin, AtSign
} from 'lucide-react';
import { compressImage } from '../util/ImageCompression';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatMsgTime(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── Members Drawer ───────────────────────────────────────────────────────────
interface MembersDrawerProps {
  members: UserProfile[];
  ownerUid: string;
  onClose: () => void;
  onNavigate: (uid: string) => void;
}

const MembersDrawer: React.FC<MembersDrawerProps> = ({ members, ownerUid, onClose, onNavigate }) => (
  <div className="fixed inset-0 z-[2100] flex items-end justify-center">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
    <div className="relative w-full max-w-md bg-slate-900 rounded-t-3xl max-h-[70vh] flex flex-col border-t border-slate-800 shadow-2xl animate-in slide-in-from-bottom duration-300">
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <h3 className="font-bold text-white text-lg">Members ({members.length})</h3>
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
        {members.map(m => (
          <button
            key={m.uid}
            onClick={() => { onClose(); onNavigate(m.uid); }}
            className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-800/40 transition-colors text-left"
          >
            {m.photoURL ? (
              <img src={m.photoURL} alt={m.displayName} className="w-10 h-10 rounded-full object-cover border border-slate-700" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center border border-primary-500/30">
                <span className="text-primary-400 font-bold">{m.displayName?.[0]?.toUpperCase()}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-white font-semibold text-sm truncate">{m.displayName}</span>
                {m.uid === ownerUid && <Crown className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />}
              </div>
              {m.jobRole && <p className="text-slate-500 text-xs truncate">{m.jobRole}</p>}
            </div>
          </button>
        ))}
      </div>
    </div>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
const CommunityRoom: React.FC = () => {
  const { communityId } = useParams<{ communityId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [community, setCommunity] = useState<Community | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [joiningRoom, setJoiningRoom] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [reportStep, setReportStep] = useState<null | 'pick' | 'done'>(null);
  const { lists } = useConfig();
  const REPORT_REASONS = lists?.reportReasons || [];
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentions, setShowMentions] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback((smooth = false) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!communityId || !user) return;

    const init = async () => {
      try {
        const [comm, history, me] = await Promise.all([
          api.communities.get(communityId),
          api.chat.getGroupHistory(communityId),
          api.profile.get(user.uid),
        ]);

        if (!comm) { navigate('/app/rooms'); return; }

        // Check membership without auto-joining
        setIsMember(comm.members.includes(user.uid));

        setCommunity(comm);
        setMessages(history);
        setMyProfile(me);

        // Fetch member profiles
        const profiles = await api.profile.getBatch(comm.members.slice(0, 50));
        setMembers(profiles);
      } catch (e) {
        console.error(e);
        navigate('/app/rooms');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [communityId, user, navigate]);

  useEffect(() => {
    if (!loading) setTimeout(() => scrollToBottom(false), 80);
  }, [loading, scrollToBottom]);

  useEffect(() => {
    scrollToBottom(true);
  }, [messages.length, scrollToBottom]);

  // ── Real-time subscription ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !communityId) return;
    const unsub = api.chat.subscribe(user.uid, (payload: any) => {
      if (payload?.type === 'message_deleted') {
        setMessages(prev => prev.map(m =>
          m._id === payload.messageId ? { ...m, deleted: true, text: '', mediaUrl: undefined } : m
        ));
        return;
      }
      const msg = payload as Message;
      if (msg.groupId !== communityId) return;
      setMessages(prev => prev.some(m => m._id === msg._id) ? prev : [...prev, msg]);
    });
    return () => unsub();
  }, [user, communityId]);

  // ── Send message ───────────────────────────────────────────────────────────
  const handleSend = useCallback(async (imgUrl?: string) => {
    if (!user || !communityId) return;
    const msgText = imgUrl ? '' : text.trim();
    if (!msgText && !imgUrl) return;
    setSending(true);
    setText('');
    setReplyTo(null);
    try {
      const sent = await api.chat.send(
        user.uid, undefined, msgText, communityId,
        imgUrl ? 'image' : undefined, imgUrl,
        replyTo ? { _id: replyTo._id, text: replyTo.text?.slice(0, 80), fromName: replyTo.authorName || replyTo.fromUid || '' } : undefined,
      );
      setMessages(prev => prev.some(m => m._id === sent._id) ? prev : [...prev, sent]);
    } catch (e) {
      console.error(e);
      if (!imgUrl) setText(msgText);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [user, communityId, text, replyTo]);

  const handleDeleteMessage = async (msg: Message) => {
    if (!user || !communityId) return;
    try {
      await api.communities.deleteMessage(communityId, msg._id, user.uid);
      setMessages(prev => prev.map(m =>
        m._id === msg._id ? { ...m, deleted: true, text: '', mediaUrl: undefined } : m
      ));
    } catch (e) {
      console.error(e);
    }
  };

  const handlePinMessage = async (msg: Message) => {
    if (!user || !communityId || !community) return;
    const isAlreadyPinned = community.pinnedMessageId === msg._id;
    try {
      await api.communities.pinMessage(
        communityId, user.uid,
        isAlreadyPinned ? null : msg._id,
        isAlreadyPinned ? null : (msg.text || '').slice(0, 100),
      );
      setCommunity(prev => prev ? {
        ...prev,
        pinnedMessageId: isAlreadyPinned ? undefined : msg._id,
        pinnedMessageText: isAlreadyPinned ? undefined : (msg.text || '').slice(0, 100),
      } : prev);
    } catch (e) {
      console.error(e);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    // @mention detection
    const words = val.split(/\s/);
    const last = words[words.length - 1] ?? '';
    if (last.startsWith('@') && last.length > 1) {
      setMentionQuery(last.slice(1).toLowerCase());
      setShowMentions(true);
    } else {
      setShowMentions(false);
      setMentionQuery('');
    }
  };

  const insertMention = (displayName: string) => {
    const words = text.split(/\s/);
    words[words.length - 1] = `@${displayName}`;
    setText(words.join(' ') + ' ');
    setShowMentions(false);
    setMentionQuery('');
    inputRef.current?.focus();
  };

  const mentionSuggestions = showMentions
    ? members.filter(m => m.uid !== user?.uid && m.displayName?.toLowerCase().includes(mentionQuery)).slice(0, 5)
    : [];

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setSending(true);
      const url = await compressImage(file, 640, 0.5);
      await handleSend(url);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        <p className="text-slate-400 text-sm">Loading…</p>
      </div>
    );
  }

  const isMine = (msg: Message) => msg.fromUid === user?.uid;
  const senderProfile = (uid: string) => members.find(m => m.uid === uid);

  const handleJoinRoom = async () => {
    if (!user || !communityId || !community) return;
    setJoiningRoom(true);
    try {
      await api.communities.join(communityId, user.uid);
      setIsMember(true);
      setCommunity(prev => prev ? { ...prev, members: [...prev.members, user.uid] } : prev);
      if (myProfile) setMembers(prev => [...prev, myProfile]);
    } catch (e) {
      console.error(e);
    } finally {
      setJoiningRoom(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800/70 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-10">
        <button
          onClick={() => navigate('/app/rooms')}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-300" />
        </button>

        <div
          onClick={() => setShowMembers(true)}
          className="w-9 h-9 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center cursor-pointer"
        >
          <Hash className="w-4 h-4 text-primary-400" />
        </div>

        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setShowMembers(true)}>
          <h1 className="font-bold text-white text-sm truncate">{community?.name}</h1>
          <p className="text-slate-500 text-xs">{community?.members.length} members{community?.isPrivate ? ' · 🔒 Private' : ''}</p>
        </div>

        <button
          onClick={() => setShowMembers(true)}
          className="flex items-center gap-1.5 bg-slate-800 rounded-xl px-3 py-1.5 text-slate-400 hover:text-white transition-colors"
        >
          <Users className="w-4 h-4" />
          <span className="text-xs font-semibold">{community?.members.length}</span>
        </button>
        {/* Report room button (non-owners only) */}
        {user && community && user.uid !== community.ownerUid && (
          <button
            onClick={() => setReportStep('pick')}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
            title="Report this room"
          >
            <Flag className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Pinned Message Banner */}
      {community?.pinnedMessageId && community?.pinnedMessageText && (
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/20">
          <Pin className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
          <p className="text-xs text-yellow-200/80 truncate flex-1">{community.pinnedMessageText}</p>
          {community.ownerUid === user?.uid && (
            <button
              onClick={() => handlePinMessage({ _id: community.pinnedMessageId! } as Message)}
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-16 text-slate-600">
            <Hash className="w-10 h-10 mx-auto mb-3 text-slate-800" />
            <p className="font-medium">No messages yet. Say hello! 👋</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const mine = isMine(msg);
          const sender = senderProfile(msg.fromUid);
          const prevMsg = messages[i - 1];
          const showAvatar = !mine && (i === 0 || prevMsg?.fromUid !== msg.fromUid);
          const showName = !mine && showAvatar;
          const isOwner = community?.ownerUid === user?.uid;
          const isPinned = community?.pinnedMessageId === msg._id;

          return (
            <div key={msg._id ?? i} className={`flex items-end gap-2 group ${mine ? 'justify-end' : 'justify-start'}`}>
              {/* Avatar for others */}
              {!mine && (
                <div className="w-7 flex-shrink-0">
                  {showAvatar ? (
                    sender?.photoURL ? (
                      <img
                        src={sender.photoURL}
                        alt={sender.displayName}
                        className="w-7 h-7 rounded-full object-cover cursor-pointer border border-slate-700"
                        onClick={() => navigate(`/app/profile/${msg.fromUid}`)}
                      />
                    ) : (
                      <div
                        className="w-7 h-7 rounded-full bg-primary-500/20 flex items-center justify-center cursor-pointer"
                        onClick={() => navigate(`/app/profile/${msg.fromUid}`)}
                      >
                        <span className="text-primary-400 text-xs font-bold">
                          {(sender?.displayName ?? msg.authorName ?? '?')[0]?.toUpperCase()}
                        </span>
                      </div>
                    )
                  ) : null}
                </div>
              )}

              <div className={`flex flex-col max-w-[75%] ${mine ? 'items-end' : 'items-start'}`}>
                {showName && (
                  <span
                    className="text-xs text-slate-500 font-medium mb-1 px-1 cursor-pointer hover:text-slate-300 transition-colors"
                    onClick={() => navigate(`/app/profile/${msg.fromUid}`)}
                  >
                    {sender?.displayName ?? msg.authorName ?? 'Member'}
                  </span>
                )}

                {/* Hover actions row */}
                {!(msg as any).deleted && (
                  <div className={`flex items-center gap-1 mb-1 opacity-0 group-hover:opacity-100 transition-opacity ${mine ? 'flex-row-reverse' : 'flex-row'}`}>
                    <button
                      title="Reply"
                      onClick={() => setReplyTo(msg)}
                      className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                    >
                      <Reply className="w-3.5 h-3.5" />
                    </button>
                    {msg.text && (
                      <button
                        title="Copy"
                        onClick={() => navigator.clipboard.writeText(msg.text ?? '')}
                        className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isOwner && (
                      <button
                        title={isPinned ? 'Unpin' : 'Pin'}
                        onClick={() => handlePinMessage(msg)}
                        className={`p-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors ${isPinned ? 'text-yellow-400' : 'text-slate-400 hover:text-white'}`}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {(mine || isOwner) && (
                      <button
                        title="Delete"
                        onClick={() => handleDeleteMessage(msg)}
                        className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}

                <div className={`rounded-2xl px-3 py-2 ${mine
                  ? 'bg-primary-500 text-white rounded-br-sm'
                  : 'bg-slate-800 text-slate-100 rounded-bl-sm'
                } ${isPinned ? 'ring-1 ring-yellow-400/40' : ''}`}>
                  {/* Reply-to quote */}
                  {(msg as any).replyToId && (msg as any).replyToText && (
                    <div className={`text-xs border-l-2 pl-2 py-0.5 mb-1.5 rounded-sm ${mine ? 'border-white/40 text-white/60' : 'border-primary-500/40 text-slate-400'}`}>
                      {(msg as any).replyToText}
                    </div>
                  )}
                  {(msg as any).deleted ? (
                    <p className={`text-sm italic ${mine ? 'text-white/50' : 'text-slate-500'}`}>Message deleted</p>
                  ) : msg.mediaType === 'image' && msg.mediaUrl ? (
                    <img
                      src={msg.mediaUrl}
                      alt="Image"
                      className="max-w-[200px] rounded-xl object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      loading="lazy"
                      onClick={() => setLightboxUrl(msg.mediaUrl!)}
                    />
                  ) : (
                    <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{msg.text}</p>
                  )}
                </div>

                <span className="text-[10px] text-slate-600 mt-0.5 px-1">
                  {formatMsgTime(msg.createdAt)}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input or Join Gate */}
      {isMember ? (
        <div className="border-t border-slate-800/70 bg-slate-900/80 backdrop-blur-xl px-3 py-3 pb-[max(env(safe-area-inset-bottom),12px)]">
          {/* Reply-to preview */}
          {replyTo && (
            <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-slate-800 rounded-xl">
              <Reply className="w-3.5 h-3.5 text-primary-400 flex-shrink-0" />
              <p className="text-xs text-slate-400 flex-1 truncate">
                <span className="text-primary-400 font-semibold">{senderProfile(replyTo.fromUid)?.displayName ?? replyTo.authorName} · </span>
                {replyTo.text}
              </p>
              <button onClick={() => setReplyTo(null)}>
                <X className="w-4 h-4 text-slate-500 hover:text-slate-300 transition-colors" />
              </button>
            </div>
          )}

          {/* @mention dropdown */}
          {mentionSuggestions.length > 0 && (
            <div className="mb-2 bg-slate-800 rounded-xl overflow-hidden divide-y divide-slate-700/50">
              {mentionSuggestions.map(m => (
                <button
                  key={m.uid}
                  onClick={() => insertMention(m.displayName ?? m.uid)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700/50 transition-colors text-left"
                >
                  {m.photoURL ? (
                    <img src={m.photoURL} alt={m.displayName} className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-primary-500/20 flex items-center justify-center">
                      <span className="text-primary-400 text-[10px] font-bold">{m.displayName?.[0]?.toUpperCase()}</span>
                    </div>
                  )}
                  <span className="text-sm text-white font-medium">@{m.displayName}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2 bg-slate-800 rounded-2xl px-3 py-2">
            {/* Image attach */}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-primary-400 transition-colors flex-shrink-0 mb-0.5"
            >
              <ImageIcon className="w-5 h-5" />
            </button>

            <button
              onClick={() => { setText(t => t + '@'); inputRef.current?.focus(); }}
              className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-primary-400 transition-colors flex-shrink-0 mb-0.5"
              title="Mention someone"
            >
              <AtSign className="w-4 h-4" />
            </button>

            <textarea
              ref={inputRef}
              className="flex-1 bg-transparent text-white placeholder-slate-500 text-sm resize-none outline-none max-h-32 min-h-[20px] leading-snug py-1"
              placeholder="Message the room…"
              rows={1}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              style={{ height: 'auto' }}
              onInput={e => {
                const t = e.currentTarget;
                t.style.height = 'auto';
                t.style.height = Math.min(t.scrollHeight, 128) + 'px';
              }}
            />

            <button
              onClick={() => handleSend()}
              disabled={sending || (!text.trim())}
              className="w-8 h-8 rounded-xl bg-primary-500 flex items-center justify-center flex-shrink-0 mb-0.5 disabled:opacity-40 active:scale-95 transition-all"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4 text-white" />}
            </button>
          </div>
        </div>
      ) : (
        <div className="border-t border-slate-800/70 bg-slate-900/90 backdrop-blur-xl px-4 py-4 pb-[max(env(safe-area-inset-bottom),16px)]">
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-slate-400 text-xs">You're viewing as a guest · Join to send messages</p>
            <button
              onClick={handleJoinRoom}
              disabled={joiningRoom}
              className="w-full py-3.5 rounded-2xl bg-primary-500 text-white font-bold text-sm shadow-lg shadow-primary-500/25 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {joiningRoom ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {joiningRoom ? 'Joining…' : 'Join Room to Chat'}
            </button>
          </div>
        </div>
      )}

      {/* Members Drawer */}
      {showMembers && community && (
        <MembersDrawer
          members={members}
          ownerUid={community.ownerUid}
          onClose={() => setShowMembers(false)}
          onNavigate={uid => navigate(`/app/profile/${uid}`)}
        />
      )}

      {/* Report Room Sheet */}
      {reportStep === 'pick' && (
        <div className="fixed inset-0 z-[3000] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setReportStep(null)} />
          <div className="relative w-full max-w-md bg-slate-900 rounded-t-3xl p-6 border-t border-slate-800 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-5" />
            <h3 className="font-bold text-white text-lg text-center mb-1">Report Room</h3>
            <p className="text-slate-500 text-sm text-center mb-5">Why are you reporting "{community?.name}"?</p>
            <div className="space-y-2">
              {REPORT_REASONS.map(reason => (
                <button
                  key={reason}
                  onClick={async () => {
                    setReportStep(null);
                    if (!user || !communityId) return;
                    try {
                      await api.userAction.report(user.uid, null, reason, undefined, { type: 'community', communityId });
                    } catch {}
                    setReportStep('done');
                  }}
                  className="w-full text-left px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  {reason}
                </button>
              ))}
            </div>
            <button onClick={() => setReportStep(null)} className="mt-4 w-full py-3 text-slate-500 text-sm">Cancel</button>
          </div>
        </div>
      )}
      {reportStep === 'done' && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setReportStep(null)} />
          <div className="relative bg-slate-900 border border-slate-700 rounded-2xl px-8 py-8 text-center max-w-xs mx-4 shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-emerald-900 flex items-center justify-center mx-auto mb-4"><Flag className="w-6 h-6 text-emerald-400" /></div>
            <p className="text-white font-bold text-base mb-1">Report Submitted</p>
            <p className="text-slate-400 text-sm mb-5">Thanks for keeping Orbyt safe. We'll review this room.</p>
            <button onClick={() => setReportStep(null)} className="px-6 py-2.5 bg-slate-800 text-slate-200 rounded-xl text-sm font-semibold">Done</button>
          </div>
        </div>
      )}

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
    </div>
  );
};

export default CommunityRoom;
