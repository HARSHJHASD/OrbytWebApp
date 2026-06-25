import {
  Bookmark,
  Calendar,
  Clock,
  CornerUpLeft,
  DollarSign,
  Edit,
  ExternalLink,
  Flag,
  Heart,
  Loader2,
  MapPin,
  MessageCircle,
  MoreVertical,
  Navigation,
  PartyPopper,
  Send,
  Share2,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import React, { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { calculateDistance } from "../util/location";
import { useUserLocation } from "./LocationGuard";
import { useTheme } from "../context/ThemeContext";
import { Post, Comment } from '../types';

const REACTIONS = ['❤️','😂','😮','🔥','👏'];
const REPORT_REASONS = ['Spam','Harassment','Misinformation','Nudity / Sexual content','Hate speech','Other'];

const PostItem: React.FC<any> = ({
  post,
  currentUserId,
  onLike,
  onAddComment,
  onDelete,
  onEdit,
  onDeleteComment,
  onLikeComment,
  onReport,
  onBlock,
  onBookmark,
  isBookmarked,
  friendIds,
}) => {
  const navigate = useNavigate();
  const { location: myLocation } = useUserLocation();
  const { isDark } = useTheme();
  const [showAllComments, setShowAllComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ uid: string; authorName: string } | null>(null);
  const [localCommentLikes, setLocalCommentLikes] = useState<Record<string, { count: number; liked: boolean }>>({});
  // New feature state
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [reportStep, setReportStep] = useState<null | 'pick' | 'done'>(null);
  const [showReactions, setShowReactions] = useState(false);
  const [reaction, setReaction] = useState<string | null>(null);
  const [showWhoLiked, setShowWhoLiked] = useState(false);
  const [whoLikedProfiles, setWhoLikedProfiles] = useState<any[]>([]);
  const [loadingWhoLiked, setLoadingWhoLiked] = useState(false);
  const [peekProfile, setPeekProfile] = useState<any>(null);
  const longPressTimer = useRef<any>(null);

  const isLiked = currentUserId && post?.likedBy?.includes(currentUserId);
  const commentCount = post?.comments?.length || 0;
  const seenByFriendIds = (friendIds || []).filter((fid: string) => post?.likedBy?.includes(fid));
  const seenCount = seenByFriendIds.length;

  const hasComments = commentCount > 0;
  const commentsToShow = showAllComments
    ? post?.comments
    : hasComments
      ? [post?.comments?.[post?.comments?.length - 1]]
      : [];

  const isMeetup = post?.type === "meetup" && post?.meetupDetails;
  const isHost = currentUserId === post?.uid;
  const isAttendee = currentUserId && post?.attendees?.includes(currentUserId);
  const isPending =
    currentUserId && post?.pendingRequests?.includes(currentUserId);

  const handleSubmitComment = async () => {
    if (!post?._id || !commentText.trim()) return;
    setSubmittingComment(true);
    try {
      await onAddComment(post?._id, commentText);
      setCommentText("");
      setReplyingTo(null);
      setShowAllComments(true);
    } catch (error) {
      console.error("Failed to add comment", error);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleReply = (comment: any) => {
    setReplyingTo({ uid: comment.uid, authorName: comment.authorName });
    setCommentText(`@${comment.authorName} `);
    setShowAllComments(true);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
    setCommentText('');
  };

  const handleCommentLike = (comment: any) => {
    if (!currentUserId) return;
    const commentId = comment?._id || comment?.id;
    if (!commentId) return;
    const existing = localCommentLikes[commentId];
    const currentLiked = existing !== undefined ? existing.liked : (comment?.likedBy?.includes(currentUserId) || false);
    const currentCount = existing !== undefined ? existing.count : (comment?.likes || 0);
    setLocalCommentLikes(prev => ({
      ...prev,
      [commentId]: { liked: !currentLiked, count: currentLiked ? currentCount - 1 : currentCount + 1 },
    }));
    onLikeComment?.(post?._id, commentId);
  };

  const handleDeleteComment = (comment: any) => {
    const commentId = comment?._id || comment?.id;
    if (!commentId) return;
    onDeleteComment?.(post?._id, commentId);
  };

  const handleReaction = (emoji: string) => {
    setReaction(prev => prev === emoji ? null : emoji);
    setShowReactions(false);
    onLike(post);
  };

  const openWhoLiked = async () => {
    if (!post?.likedBy?.length) return;
    setShowWhoLiked(true);
    setLoadingWhoLiked(true);
    try {
      const profiles = await Promise.all(
        (post.likedBy as string[]).slice(0, 20).map((uid: string) => api.profile.get(uid).catch(() => null))
      );
      setWhoLikedProfiles(profiles.filter(Boolean));
    } catch {}
    setLoadingWhoLiked(false);
  };

  const handleReport = async (reason: string) => {
    setReportStep(null);
    if (!currentUserId) return;
    try {
      const reportType = isMeetup ? 'meetup' : 'post';
      await api.userAction.report(currentUserId, post?.uid, reason, post?._id, { type: reportType });
    } catch {}
    setReportStep('done');
  };

  const handleBlock = async () => {
    setShowMoreMenu(false);
    if (!currentUserId) return;
    try {
      await api.userAction.block(currentUserId, post?.uid);
      onBlock?.(post?.uid);
    } catch {}
  };

  const handleAvatarMouseDown = () => {
    longPressTimer.current = setTimeout(() => {
      openPeek();
    }, 600);
  };
  const handleAvatarMouseUp = () => clearTimeout(longPressTimer.current);

  const openPeek = async () => {
    if (!post?.uid || post?.uid === currentUserId) return;
    try {
      const p = await api.profile.get(post.uid);
      setPeekProfile(p);
    } catch {}
  };

  const handleJoinRequest = async () => {
    if (!currentUserId || !post?._id) return;
    setJoinLoading(true);
    try {
      await api.meetups.join(post?._id, currentUserId);
      setRequestSent(true);
    } catch (e) {
      console.error("Join failed", e);
    } finally {
      setJoinLoading(false);
    }
  };

  const distance =
    post?.location && myLocation
      ? calculateDistance(
        myLocation?.lat,
        myLocation?.lng,
        post?.location?.lat,
        post?.location?.lng,
      )
      : null;

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-3xl shadow-sm border overflow-hidden relative transition-colors duration-300 ${isMeetup ? "border-primary-900/50" : "border-slate-200 dark:border-slate-800"}`}
    >
      {/* Meetup Badge */}
      {isMeetup && (
        <div className="absolute top-0 right-0 bg-primary-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl z-10 uppercase tracking-wide flex items-center gap-1">
          <PartyPopper className="w-3 h-3" /> Meet Up
        </div>
      )}

      <div className="p-4 flex items-center justify-between">
        <Link
          to={`/app/profile/${post?.uid}`}
          className="flex items-center gap-3 group"
        >
          <div
            className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden ring-2 ring-transparent group-hover:ring-primary-500/50 transition-all cursor-pointer"
            onMouseDown={handleAvatarMouseDown}
            onMouseUp={handleAvatarMouseUp}
            onMouseLeave={handleAvatarMouseUp}
            onTouchStart={handleAvatarMouseDown}
            onTouchEnd={handleAvatarMouseUp}
          >
            {post?.authorPhoto ? (
              <img
                src={post?.authorPhoto}
                alt={post?.authorName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-primary-500 font-bold">
                {post?.authorName?.[0] || "U"}
              </div>
            )}
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-200 group-hover:text-primary-400 transition-colors">
              {post?.authorName}
            </h3>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-500">
              <span>{new Date(post?.createdAt || 0).toLocaleDateString()}</span>
              {post?.location && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-0.5">
                    <MapPin className="w-3 h-3" />
                    {post?.location?.name || "Unknown"}
                  </div>
                </>
              )}
            </div>
          </div>
        </Link>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 shrink-0 ml-auto">
          {/* Distance Badge: Hidden on ultra-small screens to prioritize Edit/Delete, or displayed with better margins */}
          {distance && (
            <div className="hidden xs:flex items-center gap-1 text-[10px] sm:text-xs font-black text-primary-400 bg-primary-500/10 px-2.5 py-1 rounded-lg border border-primary-500/20 mr-1 uppercase tracking-tighter">
              <Navigation className="w-3 h-3 fill-current" />
              <span>{distance}</span>
            </div>
          )}

          {/* Action Buttons: Increased hit area for mobile touch points */}
          <div className="flex items-center">
            {onEdit && (
              <button
                onClick={() => onEdit(post?._id)}
                className="p-2.5 text-slate-500 hover:text-primary-400 active:bg-slate-800 rounded-full transition-all duration-200"
                aria-label="Edit Post"
              >
                <Edit className="w-5 h-5 sm:w-[22px] sm:h-[22px]" />
              </button>
            )}

            {onDelete && (
              <button
                onClick={() => onDelete(post?._id)}
                className="p-2.5 text-slate-500 hover:text-red-500 active:bg-red-500/10 rounded-full transition-all duration-200"
                aria-label="Delete Post"
              >
                <Trash2 className="w-5 h-5 sm:w-[22px] sm:h-[22px]" />
              </button>
            )}

            {/* Bookmark */}
            <button
              onClick={() => onBookmark?.(post?._id)}
              className={`p-2.5 rounded-full transition-all duration-200 ${isBookmarked ? 'text-primary-500' : 'text-slate-500 hover:text-primary-400'}`}
              aria-label="Bookmark"
            >
              <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} />
            </button>

            {/* 3-dot more menu (only for other users' posts) */}
            {!isHost && (
              <div className="relative">
                <button
                  onClick={() => setShowMoreMenu(v => !v)}
                  className="p-2.5 text-slate-500 hover:text-slate-300 rounded-full transition-all duration-200"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
                {showMoreMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-30 min-w-[180px] overflow-hidden">
                    <button
                      onClick={() => { setShowMoreMenu(false); setReportStep('pick'); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                    >
                      <Flag className="w-4 h-4" /> Report Post
                    </button>
                    <button
                      onClick={handleBlock}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <UserMinus className="w-4 h-4" /> Block {post?.authorName}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MEETUP CARD DESIGN */}
      {isMeetup ? (
        <div className="px-4 pb-2">
          {/* Image (Optional for meetup, if present) */}
          {post?.imageURL && (
            <div className="w-full h-48 bg-slate-950 rounded-2xl overflow-hidden mb-4 border border-slate-800">
              <img
                src={post?.imageURL}
                alt="Meetup"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/50 relative overflow-hidden">
            {/* Decorative background circle */}
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary-500/10 rounded-full blur-2xl"></div>

            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
              {post?.meetupDetails?.title}
            </h2>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-700/50 text-primary-400 text-xs font-bold mb-4 border border-slate-700">
              <PartyPopper className="w-3 h-3" /> {post?.meetupDetails?.activity}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <div className="p-1.5 bg-slate-700 rounded-lg text-slate-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {new Date(post?.meetupDetails?.date || 0).toLocaleDateString(
                    undefined,
                    { month: "short", day: "numeric" },
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <div className="p-1.5 bg-slate-700 rounded-lg text-slate-400">
                  <Clock className="w-4 h-4" />
                </div>
                <span className="font-medium">
                  {post?.meetupDetails?.startTime} -{" "}
                  {post?.meetupDetails?.endTime}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <div className="p-1.5 bg-slate-700 rounded-lg text-slate-400">
                  <DollarSign className="w-4 h-4" />
                </div>
                <span className="font-medium truncate text-slate-700 dark:text-slate-300">
                  {post?.meetupDetails?.feeType} {post?.meetupDetails?.feeAmount ? `(${post?.meetupDetails?.feeAmount})` : ''}
                </span>
              </div>
              {post?.meetupDetails?.maxGuests && (
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <div className="p-1.5 bg-slate-700 rounded-lg text-slate-400">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="font-medium">
                    {post?.meetupDetails?.maxGuests} Guests Max
                  </span>
                </div>
              )}
            </div>

            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4 border-t border-slate-200 dark:border-slate-700/50 pt-3">
              {post?.content}
            </p>

            {post?.meetupDetails?.meetingUrl && (
              <a
                href={post?.meetupDetails?.meetingUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mb-4 break-all"
              >
                <ExternalLink className="w-4 h-4 flex-shrink-0" />
                {post?.meetupDetails?.meetingUrl}
              </a>
            )}

            {/* Join / Status Button */}
            {!isHost ? (
              <>
                {isAttendee ? (
                  <button
                    onClick={() => navigate(`/app/chat/group/${post?._id}`)}
                    className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-lg shadow-green-500/20 active:scale-95"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Open Group Chat
                  </button>
                ) : isPending || requestSent ? (
                  <button
                    disabled
                    className="w-full py-3 bg-slate-700 text-slate-400 rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-not-allowed border border-slate-600"
                  >
                    <Clock className="w-4 h-4" />
                    Request Pending
                  </button>
                ) : (
                  <button
                    onClick={handleJoinRequest}
                    disabled={joinLoading}
                    className="w-full py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-lg shadow-primary-500/20 active:scale-95"
                  >
                    {joinLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <UserPlus className="w-4 h-4" />
                    )}
                    Request to Join
                  </button>
                )}
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => navigate(`/app/chat/group/${post?._id}`)}
                  className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-lg shadow-green-500/20 active:scale-95"
                >
                  <MessageCircle className="w-4 h-4" />
                  Open Group Chat
                </button>
                <button
                  onClick={() => navigate(`/app/post/${post?._id}`)}
                  className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors border border-slate-600"
                >
                  Manage Guests{" "}
                  {post?.pendingRequests?.length
                    ? `(${post?.pendingRequests?.length})`
                    : ""}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* REGULAR POST DESIGN */
        <>
          {post?.imageURL && (
            <div className="w-full aspect-square bg-slate-950">
              <img
                src={post?.imageURL}
                alt="Post"
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="p-4">
            <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed mb-3">
              {post?.content}
            </p>
          </div>
        </>
      )}

      {/* Common Footer Actions */}
      <div className="px-4 pb-4">
        <div
          className={`flex items-center gap-4 pt-2 ${isMeetup ? "" : "border-t border-slate-100 dark:border-slate-800"}`}
        >
          {/* Like / Reaction button */}
          <div className="relative">
            <button
              onClick={() => onLike(post)}
              onContextMenu={(e) => { e.preventDefault(); setShowReactions(v => !v); }}
              className={`flex items-center gap-1.5 transition-colors group py-2 select-none ${isLiked ? "text-primary-500" : "text-slate-500 hover:text-primary-500"}`}
            >
              {reaction ? (
                <span className="text-xl leading-none">{reaction}</span>
              ) : (
                <Heart className="w-5 h-5" />
              )}
              <button
                onClick={(e) => { e.stopPropagation(); openWhoLiked(); }}
                className="text-sm font-medium hover:underline"
              >{post?.likes}</button>
            </button>
            {showReactions && (
              <div className="absolute bottom-full left-0 mb-1 flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-xl px-3 py-2 z-20">
                {REACTIONS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className="text-2xl hover:scale-127 transition-transform"
                  >{emoji}</button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setShowAllComments(!showAllComments)}
            className={`flex items-center gap-1.5 transition-colors py-2 ${showAllComments ? "text-blue-400" : "text-slate-500 hover:text-blue-400"}`}
          >
            <MessageCircle
              className={`w-6 h-6 ${showAllComments ? "fill-current" : ""}`}
            />
            <span className="text-sm font-medium">{commentCount}</span>
          </button>
        </div>

        {/* Seen by friends */}
        {seenCount > 0 && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 mb-2">
            👁 {seenCount} {seenCount === 1 ? 'friend' : 'friends'} liked this
          </p>
        )}

        {/* Comments Section */}
        <div className="space-y-3 mt-1">
          {!showAllComments && commentCount > 1 && (
            <button
              onClick={() => setShowAllComments(true)}
              className="text-slate-400 dark:text-slate-500 text-xs font-semibold hover:text-primary-500 ml-1 transition-colors"
            >
              View all {commentCount} comments
            </button>
          )}

          {commentsToShow && commentsToShow?.length > 0 && (
            <div className="space-y-3">
              {commentsToShow.map((comment: any, idx: any) => {
                const commentId = comment?._id || comment?.id;
                const localLike = localCommentLikes[commentId];
                const isCommentLiked = localLike !== undefined ? localLike.liked : (comment?.likedBy?.includes(currentUserId) || false);
                const commentLikeCount = localLike !== undefined ? localLike.count : (comment?.likes || 0);
                const canDeleteThis = currentUserId && (comment?.uid === currentUserId || post?.uid === currentUserId);
                return (
                  <div key={commentId || idx} className="flex gap-2.5 animate-fade-in">
                    <Link to={`/app/profile/${comment?.uid}`} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 mt-0.5 border border-slate-200 dark:border-slate-700 block cursor-pointer hover:opacity-80 transition-opacity">
                      {comment?.authorPhoto ? (
                        <img src={comment?.authorPhoto} alt={comment?.authorName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-400">{comment?.authorName?.[0]}</div>
                      )}
                    </Link>
                    <div className="flex-1">
                      <div className="bg-slate-50 dark:bg-slate-800/80 px-4 py-2.5 rounded-2xl text-sm border border-slate-200 dark:border-slate-800">
                        <Link to={`/app/profile/${comment?.uid}`} className="font-bold text-slate-900 dark:text-slate-200 text-xs mr-2 hover:text-primary-500 transition-colors inline-block mb-0.5">
                          {comment?.authorName}
                        </Link>
                        <span className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">{comment?.text}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 ml-2">
                        <button onClick={() => handleReply(comment)} className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-primary-500 transition-colors">
                          <CornerUpLeft className="w-3 h-3" /> Reply
                        </button>
                        <button onClick={() => handleCommentLike(comment)} className={`flex items-center gap-1 text-[11px] transition-colors ${isCommentLiked ? 'text-red-500' : 'text-slate-400 hover:text-red-400'}`}>
                          <Heart className={`w-3 h-3 ${isCommentLiked ? 'fill-current' : ''}`} />
                          {commentLikeCount > 0 && <span>{commentLikeCount}</span>}
                        </button>
                        {canDeleteThis && (
                          <button onClick={() => handleDeleteComment(comment)} className="text-[11px] text-slate-400 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {replyingTo && (
            <div className="flex items-center gap-2 px-1 py-1.5 bg-primary-500/10 rounded-xl text-xs text-primary-400 border border-primary-500/20">
              <CornerUpLeft className="w-3.5 h-3.5" />
              <span>Replying to <strong>{replyingTo.authorName}</strong></span>
              <button onClick={handleCancelReply} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e?.target?.value)}
              placeholder={replyingTo ? `Reply to ${replyingTo.authorName}...` : isMeetup ? "Ask a question..." : "Add a comment..."}
              className="flex-1 bg-transparent border-b border-slate-200 dark:border-slate-800 py-2 text-sm text-slate-900 dark:text-white focus:border-primary-500 outline-none placeholder-slate-400 dark:placeholder-slate-600 transition-colors"
              onKeyDown={(e) => {
                if (e?.key === "Enter" && !e?.shiftKey) {
                  e.preventDefault();
                  handleSubmitComment();
                }
              }}
            />
            <button
              onClick={handleSubmitComment}
              disabled={!commentText.trim() || submittingComment}
              className="p-2 text-primary-500 hover:text-primary-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submittingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Report reason picker */}
      {reportStep === 'pick' && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center" onClick={() => setReportStep(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-5" />
            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4">Why are you reporting this?</h3>
            {REPORT_REASONS.map(reason => (
              <button key={reason} onClick={() => handleReport(reason)} className="w-full text-left py-3 px-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                {reason}
              </button>
            ))}
          </div>
        </div>
      )}

      {reportStep === 'done' && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setReportStep(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center shadow-xl">
            <div className="text-4xl mb-3">✅</div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">Report Submitted</h3>
            <p className="text-sm text-slate-500">Thanks for keeping Orbyt safe.</p>
          </div>
        </div>
      )}

      {/* Who liked modal */}
      {showWhoLiked && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center" onClick={() => setShowWhoLiked(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl w-full max-w-lg p-6 max-h-[60vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-5" />
            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4">Liked by</h3>
            {loadingWhoLiked ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>
            ) : (
              <div className="space-y-3">
                {whoLikedProfiles.map((p: any) => (
                  <button key={p.uid} onClick={() => { setShowWhoLiked(false); window.location.href = `/app/profile/${p.uid}`; }} className="w-full flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl px-2 py-2 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      {p.photoURL ? <img src={p.photoURL} alt={p.displayName} className="w-full h-full object-cover" /> : <span className="text-sm font-bold text-slate-500 flex items-center justify-center h-full">{p.displayName?.[0]}</span>}
                    </div>
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-200">{p.displayName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick profile peek */}
      {peekProfile && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setPeekProfile(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 text-center shadow-xl w-72" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mx-auto mb-3">
              {peekProfile.photoURL ? <img src={peekProfile.photoURL} className="w-full h-full object-cover" /> : <span className="text-xl font-bold text-slate-500 flex items-center justify-center h-full">{peekProfile.displayName?.[0]}</span>}
            </div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">{peekProfile.displayName}</h3>
            {peekProfile.jobRole && <p className="text-xs text-slate-500 mt-0.5">{peekProfile.jobRole}</p>}
            {peekProfile.bio && <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 line-clamp-2">{peekProfile.bio}</p>}
            <button
              onClick={() => { setPeekProfile(null); window.location.href = `/app/profile/${peekProfile.uid}`; }}
              className="mt-4 w-full py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold text-sm transition-colors"
            >View Profile</button>
          </div>
        </div>
      )}
    </div>
  );
};

// Memoized component to prevent unnecessary re-renders when props haven't changed
export default React.memo(PostItem, (prevProps, nextProps) => {
  return (
    prevProps.post?._id === nextProps.post?._id &&
    prevProps.post?.likes === nextProps.post?.likes &&
    prevProps.post?.comments?.length === nextProps.post?.comments?.length &&
    prevProps.post?.likedBy === nextProps.post?.likedBy &&
    prevProps.currentUserId === nextProps.currentUserId &&
    prevProps.onLike === nextProps.onLike &&
    prevProps.onAddComment === nextProps.onAddComment &&
    prevProps.onDelete === nextProps.onDelete &&
    prevProps.onEdit === nextProps.onEdit &&
    prevProps.isBookmarked === nextProps.isBookmarked
  );
});
