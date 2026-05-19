import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Community, Message, UserProfile } from '../types';
import {
  ArrowLeft, Hash, Users, Send, Loader2, Image as ImageIcon, X, Crown
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
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [joiningFirst, setJoiningFirst] = useState(false);

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

        // Auto-join if not a member yet
        if (!comm.members.includes(user.uid)) {
          setJoiningFirst(true);
          await api.communities.join(communityId, user.uid);
          comm.members = [...comm.members, user.uid];
          setJoiningFirst(false);
        }

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
    const unsub = api.chat.subscribe(user.uid, (msg: Message) => {
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
    setImagePreview(null);
    try {
      const sent = await api.chat.send(
        user.uid, undefined, msgText, communityId,
        imgUrl ? 'image' : undefined, imgUrl
      );
      setMessages(prev => prev.some(m => m._id === sent._id) ? prev : [...prev, sent]);
    } catch (e) {
      console.error(e);
      if (!imgUrl) setText(msgText);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [user, communityId, text]);

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
  if (loading || joiningFirst) {
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        <p className="text-slate-400 text-sm">{joiningFirst ? 'Joining room…' : 'Loading…'}</p>
      </div>
    );
  }

  const isMine = (msg: Message) => msg.fromUid === user?.uid;
  const senderProfile = (uid: string) => members.find(m => m.uid === uid);

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
          <p className="text-slate-500 text-xs">{community?.members.length} members</p>
        </div>

        <button
          onClick={() => setShowMembers(true)}
          className="flex items-center gap-1.5 bg-slate-800 rounded-xl px-3 py-1.5 text-slate-400 hover:text-white transition-colors"
        >
          <Users className="w-4 h-4" />
          <span className="text-xs font-semibold">{community?.members.length}</span>
        </button>
      </div>

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

          return (
            <div key={msg._id ?? i} className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
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
                  <span className="text-xs text-slate-500 font-medium mb-1 px-1">
                    {sender?.displayName ?? msg.authorName ?? 'Member'}
                  </span>
                )}

                <div className={`rounded-2xl px-3 py-2 ${mine
                  ? 'bg-primary-500 text-white rounded-br-sm'
                  : 'bg-slate-800 text-slate-100 rounded-bl-sm'
                }`}>
                  {msg.mediaType === 'image' && msg.mediaUrl ? (
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

      {/* Input */}
      <div className="border-t border-slate-800/70 bg-slate-900/80 backdrop-blur-xl px-3 py-3 pb-[max(env(safe-area-inset-bottom),12px)]">
        <div className="flex items-end gap-2 bg-slate-800 rounded-2xl px-3 py-2">
          {/* Image attach */}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
          <button
            onClick={() => fileRef.current?.click()}
            className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-primary-400 transition-colors flex-shrink-0 mb-0.5"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          <textarea
            ref={inputRef}
            className="flex-1 bg-transparent text-white placeholder-slate-500 text-sm resize-none outline-none max-h-32 min-h-[20px] leading-snug py-1"
            placeholder="Message the room…"
            rows={1}
            value={text}
            onChange={e => setText(e.target.value)}
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

      {/* Members Drawer */}
      {showMembers && community && (
        <MembersDrawer
          members={members}
          ownerUid={community.ownerUid}
          onClose={() => setShowMembers(false)}
          onNavigate={uid => navigate(`/app/profile/${uid}`)}
        />
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
