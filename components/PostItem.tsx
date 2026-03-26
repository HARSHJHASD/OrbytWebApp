import {
  Calendar,
  Clock,
  DollarSign,
  Edit,
  ExternalLink,
  Heart,
  Loader2,
  MapPin,
  MessageCircle,
  Navigation,
  PartyPopper,
  Send,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { calculateDistance } from "../util/location";
import { useUserLocation } from "./LocationGuard";
import { useTheme } from "../context/ThemeContext";

const PostItem: React.FC<any> = ({
  post,
  currentUserId,
  onLike,
  onAddComment,
  onDelete,
  onEdit,
}) => {
  const navigate = useNavigate();
  const { location: myLocation } = useUserLocation();
  const { isDark } = useTheme();
  const [showAllComments, setShowAllComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false); // Local optimistic state
  const isLiked = currentUserId && post?.likedBy?.includes(currentUserId);
  const commentCount = post?.comments?.length || 0;

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
      setShowAllComments(true);
    } catch (error) {
      console.error("Failed to add comment", error);
    } finally {
      setSubmittingComment(false);
    }
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
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden ring-2 ring-transparent group-hover:ring-primary-500/50 transition-all">
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
              <button
                onClick={() => navigate(`/app/post/${post?._id}`)}
                className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors border border-slate-600"
              >
                Manage Guests{" "}
                {post?.pendingRequests?.length
                  ? `(${post?.pendingRequests?.length})`
                  : ""}
              </button>
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
          <button
            onClick={() => onLike(post)}
            className={`flex items-center gap-1.5 transition-colors group py-2 ${isLiked ? "text-primary-500" : "text-slate-500 hover:text-primary-500"}`}
          >
            <Heart
              className={`w-6 h-6 transition-transform group-active:scale-90 ${isLiked ? "fill-current" : ""}`}
            />
            <span className="text-sm font-medium">{post?.likes}</span>
          </button>
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
              {commentsToShow.map((comment: any, idx: any) => (
                <div key={idx} className="flex gap-2.5 animate-fade-in">
                    <Link to={`/app/profile/${comment?.uid}`} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 mt-0.5 border border-slate-200 dark:border-slate-700 block cursor-pointer hover:opacity-80 transition-opacity">
                      {comment?.authorPhoto ? (
                        <img
                          src={comment?.authorPhoto}
                          alt={comment?.authorName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400 dark:text-slate-500">
                          {comment?.authorName?.[0]}
                        </div>
                      )}
                    </Link>
                  <div className="bg-slate-50 dark:bg-slate-800/80 px-4 py-2.5 rounded-2xl text-sm border border-slate-200 dark:border-slate-800 flex-1">
                    <Link to={`/app/profile/${comment?.uid}`} className="font-bold text-slate-900 dark:text-slate-200 text-xs mr-2 block mb-0.5 hover:text-primary-500 transition-colors inline-block">
                      {comment?.authorName}
                    </Link>
                    <span className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                      {comment?.text}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e?.target?.value)}
              placeholder={isMeetup ? "Ask a question..." : "Add a comment..."}
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
              {submittingComment ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostItem;
