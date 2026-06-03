import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, Flag, Lock, MoreVertical, Send, Smile, Trash2, VolumeX, X } from 'lucide-react';
import { api } from '../services/api';

const STORY_DURATION_MS = 5000;
const TICK_MS = 50;
const INCREMENT = 100 / (STORY_DURATION_MS / TICK_MS);
const EMOJIS = ['❤️', '🔥', '😂', '😮', '😢', '👏'];

function formatTimeAgo(dateStr?: string): string {
  if (!dateStr) return 'Just now';
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  const hr = Math.floor(diff / 3600000);
  if (hr >= 24) return `${Math.floor(hr / 24)}d ago`;
  if (hr >= 1) return `${hr}h ago`;
  if (min >= 1) return `${min}m ago`;
  return 'Just now';
}

interface StoryViewerProps {
  group: any;
  onClose: () => void;
  currentUserId?: string;
  onMute?: (uid: string) => void;
}

const StoryViewer: React.FC<StoryViewerProps> = ({ group, onClose, currentUserId, onMute }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [showEmojiTray, setShowEmojiTray] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [reportStep, setReportStep] = useState<null | 'confirm' | 'done'>(null);
  const [blockStep, setBlockStep] = useState<null | 'confirm' | 'done'>(null);

  // Long-press pause (mouse + touch)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggeredLongPress = useRef(false);

  const currentStory = group.stories[currentIdx];
  const isOwner = currentStory?.uid === currentUserId;

  // Reset when group changes
  useEffect(() => {
    setCurrentIdx(0);
    setProgress(0);
    setPaused(false);
    setReplyText('');
    setShowEmojiTray(false);
    setShowMoreMenu(false);
  }, [group]);

  // Progress timer
  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setProgress(p => Math.min(p + INCREMENT, 100));
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [currentIdx, paused]);

  // Advance story at 100%
  useEffect(() => {
    if (progress >= 100) {
      if (currentIdx < group.stories.length - 1) {
        setCurrentIdx(i => i + 1);
        setProgress(0);
      } else {
        onClose();
      }
    }
  }, [progress]);

  // View tracking
  useEffect(() => {
    if (currentStory && currentUserId && currentStory.uid !== currentUserId) {
      api.util.viewStory(currentStory._id, currentUserId).catch(console.error);
    }
  }, [currentStory, currentUserId]);

  // ─── Navigation ──────────────────────────────────────────────────────────

  const goNext = () => {
    if (currentIdx < group.stories.length - 1) { setCurrentIdx(i => i + 1); setProgress(0); }
    else { onClose(); }
  };

  const goBack = () => {
    if (currentIdx > 0) { setCurrentIdx(i => i - 1); setProgress(0); }
  };

  // ─── Long-press pause ─────────────────────────────────────────────────────

  const handlePointerDown = () => {
    triggeredLongPress.current = false;
    pressTimer.current = setTimeout(() => {
      triggeredLongPress.current = true;
      setPaused(true);
    }, 150);
  };

  const handlePointerUp = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    if (triggeredLongPress.current) {
      triggeredLongPress.current = false;
      setPaused(false);
    }
  };

  // ─── Actions ─────────────────────────────────────────────────────────────

  const handleDelete = () => setShowDeleteConfirm(true);

  const confirmDelete = async () => {
    setShowDeleteConfirm(false);
    try {
      await api.util.deleteStory(currentStory._id, currentUserId!);
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  const sendReply = async (text: string) => {
    const t = text.trim();
    if (!t || !currentUserId || !currentStory?.uid) return;
    setSendingReply(true);
    try {
      await api.chat.send(currentUserId, currentStory.uid, t);
      setReplyText('');
      setShowEmojiTray(false);
    } catch (err) {
      console.error('Reply error:', err);
    } finally {
      setSendingReply(false);
    }
  };

  const handleReport = async () => {
    setShowMoreMenu(false);
    setReportStep('confirm');
  };

  const confirmReport = async () => {
    try {
      await api.userAction.report(currentUserId!, group.uid, 'Reported from Story Viewer', currentStory?._id);
      setReportStep('done');
    } catch { setReportStep(null); }
  };

  const handleBlock = () => {
    setShowMoreMenu(false);
    setBlockStep('confirm');
  };

  const confirmBlock = async () => {
    try {
      await api.userAction.block(currentUserId!, group.uid);
      setBlockStep(null);
      onClose();
    } catch { setBlockStep(null); }
  };

  const handleMute = () => {
    setShowMoreMenu(false);
    onMute?.(group.uid);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center backdrop-blur-2xl">
      <div className="relative w-full max-w-md aspect-[9/16] bg-[#030B18] rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-white/5">
        {/* Progress Bars */}
        <div className="absolute top-4 left-0 right-0 z-10 flex gap-1 px-4">
          {group.stories.map((_: any, i: number) => (
            <div key={i} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-75 ease-linear"
                style={{ width: `${i === currentIdx ? progress : i < currentIdx ? 100 : 0}%` }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-8 left-0 right-0 z-10 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <img src={group.authorPhoto} className="w-9 h-9 rounded-full border border-white/20" alt="" />
            <div>
              <p className="text-white text-sm font-bold drop-shadow">{group.authorName}</p>
              <p className="text-white/60 text-[10px]">{formatTimeAgo(currentStory?.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!isOwner && (
              <div className="relative">
                <button
                  onClick={() => { setShowMoreMenu(v => !v); setPaused(true); }}
                  className="p-2 bg-black/20 hover:bg-white/10 rounded-full transition-colors"
                >
                  <MoreVertical className="text-white" size={20} />
                </button>
                {showMoreMenu && (
                  <div
                    className="absolute right-0 top-10 bg-[#0d1b2a] border border-white/10 rounded-2xl shadow-xl z-50 overflow-hidden min-w-[180px]"
                    onMouseLeave={() => { setShowMoreMenu(false); setPaused(false); }}
                  >
                    <button
                      onClick={handleMute}
                      className="w-full flex items-center gap-3 px-4 py-3 text-white/80 hover:bg-white/5 text-sm transition-colors"
                    >
                      <VolumeX size={15} /> Mute @{group.authorName}
                    </button>
                    <button
                      onClick={handleReport}
                      className="w-full flex items-center gap-3 px-4 py-3 text-white/80 hover:bg-white/5 text-sm transition-colors"
                    >
                      <Flag size={15} /> Report Moment
                    </button>
                    <button
                      onClick={handleBlock}
                      className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 text-sm transition-colors"
                    >
                      <Lock size={15} /> Block User
                    </button>
                  </div>
                )}
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 bg-black/20 hover:bg-white/10 rounded-full transition-colors backdrop-blur-sm border border-white/10"
            >
              <X className="text-white" size={24} />
            </button>
          </div>
        </div>

        {/* Story image + pause on long press */}
        <div className="flex-1 relative flex items-center justify-center select-none">
          <img
            src={currentStory.imageURL}
            className="w-full h-full object-cover"
            alt=""
            draggable={false}
          />
          {/* Navigation zones */}
          <div className="absolute inset-0 flex">
            <div
              className="flex-1 cursor-w-resize"
              onMouseDown={handlePointerDown}
              onMouseUp={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchEnd={handlePointerUp}
              onClick={goBack}
            />
            <div
              className="flex-1 cursor-e-resize"
              onMouseDown={handlePointerDown}
              onMouseUp={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchEnd={handlePointerUp}
              onClick={goNext}
            />
          </div>
          {/* Paused badge */}
          {paused && (
            <div className="absolute top-1/2 -translate-y-1/2 pointer-events-none">
              <div className="bg-black/60 text-white text-sm font-semibold px-4 py-2 rounded-full backdrop-blur-sm">
                ⏸ Hold
              </div>
            </div>
          )}
        </div>

        {/* Owner footer: views + delete */}
        {isOwner && (
          <div className="p-4 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between">
            <button
              onClick={() => setShowViewers(true)}
              className="flex items-center gap-2 text-white/90 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10 hover:bg-white/20 transition-colors"
            >
              <Eye size={16} />
              <span className="text-xs font-semibold">{currentStory.views?.length || 0} views</span>
            </button>
            <button
              onClick={handleDelete}
              className="p-2.5 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-full transition-all border border-red-500/30"
            >
              <Trash2 size={18} />
            </button>
          </div>
        )}

        {/* Non-owner footer: emoji tray + reply input */}
        {!isOwner && (
          <div className="p-3 bg-gradient-to-t from-black/80 to-transparent space-y-2">
            {showEmojiTray && (
              <div className="flex justify-around bg-black/50 backdrop-blur-sm rounded-2xl px-2 py-2 border border-white/10">
                {EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => sendReply(emoji)}
                    className="text-2xl hover:scale-125 transition-transform p-1"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEmojiTray(v => !v)}
                className="p-2 text-white/60 hover:text-white transition-colors"
              >
                <Smile size={20} />
              </button>
              <input
                type="text"
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onFocus={() => setPaused(true)}
                onBlur={() => setPaused(false)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(replyText); } }}
                placeholder={`Reply to ${group.authorName}...`}
                className="flex-1 bg-white/10 border border-white/15 rounded-full px-4 py-2 text-white text-sm placeholder-white/40 outline-none focus:border-white/30 transition-colors"
              />
              <button
                onClick={() => sendReply(replyText)}
                disabled={!replyText.trim() || sendingReply}
                className="p-2 bg-white/15 hover:bg-white/25 text-white rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Desktop arrow navigation */}
      <div className="hidden md:flex fixed top-1/2 -translate-y-1/2 left-8 md:left-24">
        <button onClick={goBack} className="p-4 bg-white/5 hover:bg-white/10 rounded-full text-white/50 transition-all">
          <ChevronLeft size={32} />
        </button>
      </div>
      <div className="hidden md:flex fixed top-1/2 -translate-y-1/2 right-8 md:right-24">
        <button onClick={goNext} className="p-4 bg-white/5 hover:bg-white/10 rounded-full text-white/50 transition-all">
          <ChevronRight size={32} />
        </button>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-[#0d1b2a] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/15 border border-red-500/30 mx-auto mb-4">
              <Trash2 size={22} className="text-red-400" />
            </div>
            <h3 className="text-white text-center text-lg font-semibold mb-1">Delete Moment?</h3>
            <p className="text-white/50 text-center text-sm mb-6">This moment will be permanently removed and cannot be recovered.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/70 text-sm font-medium hover:bg-white/5 transition-colors">
                Cancel
              </button>
              <button onClick={confirmDelete} className="flex-1 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 text-sm font-semibold transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Seen-by sheet */}
      {showViewers && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowViewers(false)}>
          <div className="bg-[#0d1b2a] w-full max-w-md rounded-t-3xl p-6 pb-10 border-t border-white/6" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />
            <p className="text-white font-bold text-lg mb-1">Seen by</p>
            <p className="text-white/50 text-sm mb-5">{currentStory?.views?.length ?? 0} people viewed this moment</p>
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {(currentStory?.views ?? []).map((v: any, i: number) => {
                const name = typeof v === 'string' ? v : (v?.displayName || v?.name || v?.uid || 'User');
                const photo = typeof v === 'object' ? (v?.photoURL || v?.photo) : null;
                return (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-white/5">
                    {photo
                      ? <img src={photo} className="w-9 h-9 rounded-full" alt="" />
                      : <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-sm">
                          {String(name)[0]?.toUpperCase()}
                        </div>
                    }
                    <span className="text-white text-sm">{name}</span>
                  </div>
                );
              })}
              {(!currentStory?.views || currentStory.views.length === 0) && (
                <p className="text-white/40 text-center py-6 text-sm">No views yet. Share your moment!</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Report Confirmation */}
      {reportStep === 'confirm' && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60" onClick={() => setReportStep(null)}>
          <div className="bg-[#0d1b2a] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-yellow-500/15 border border-yellow-500/30 mx-auto mb-4">
              <Flag size={22} className="text-yellow-400" />
            </div>
            <h3 className="text-white text-center text-lg font-semibold mb-1">Report Moment?</h3>
            <p className="text-white/50 text-center text-sm mb-6">Report this moment for inappropriate content?</p>
            <div className="flex gap-3">
              <button onClick={() => setReportStep(null)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/70 text-sm font-medium hover:bg-white/5 transition-colors">Cancel</button>
              <button onClick={confirmReport} className="flex-1 py-2.5 rounded-xl bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 text-yellow-400 text-sm font-semibold transition-colors">Report</button>
            </div>
          </div>
        </div>
      )}
      {reportStep === 'done' && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60" onClick={() => { setReportStep(null); onClose(); }}>
          <div className="bg-[#0d1b2a] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center" onClick={e => e.stopPropagation()}>
            <p className="text-white font-bold text-lg mb-2">Reported</p>
            <p className="text-white/50 text-sm mb-5">Thank you for keeping Orbyt safe.</p>
            <button onClick={() => { setReportStep(null); onClose(); }} className="w-full py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold">Done</button>
          </div>
        </div>
      )}

      {/* Block Confirmation */}
      {blockStep === 'confirm' && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60" onClick={() => setBlockStep(null)}>
          <div className="bg-[#0d1b2a] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-white text-center text-lg font-semibold mb-1">Block {group.authorName}?</h3>
            <p className="text-white/50 text-center text-sm mb-6">You won't see their posts or moments anymore.</p>
            <div className="flex gap-3">
              <button onClick={() => setBlockStep(null)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/70 text-sm font-medium hover:bg-white/5 transition-colors">Cancel</button>
              <button onClick={confirmBlock} className="flex-1 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 text-sm font-semibold transition-colors">Block</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoryViewer;
