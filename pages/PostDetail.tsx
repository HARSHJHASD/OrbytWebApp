import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { Post, UserProfile } from "../types";
import PostItem from "../components/PostItem";
import {
  ChevronLeft,
  Loader2,
  Check,
  X,
  User as UserIcon,
  MessageCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { safeBack } from "../util/safeBack";

const PostDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Host Management State
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
      if (!id) return;
      try {
        const data = await api.posts.getPost(id);
        if (data) {
          setPost(data);

          // If Host and Meetup, fetch pending requests
          if (
            user &&
            data.uid === user.uid &&
            data.type === "meetup" &&
            data.pendingRequests?.length
          ) {
            setLoadingRequests(true);
            api.profile.getBatch(data.pendingRequests).then((users) => {
              setPendingUsers(users);
              setLoadingRequests(false);
            });
          }
        } else {
          setError("Post not found");
        }
      } catch (e) {
        setError("Failed to load post");
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id, user]);

  const handleLike = async (postToUpdate: Post) => {
    if (!user || !postToUpdate._id) return;

    // Optimistic Update
    const isLiked = postToUpdate.likedBy?.includes(user.uid);
    const newLikes = isLiked ? postToUpdate.likes - 1 : postToUpdate.likes + 1;
    const newLikedBy = isLiked
      ? postToUpdate.likedBy?.filter((id) => id !== user.uid) || []
      : [...(postToUpdate.likedBy || []), user.uid];

    const updatedPost = {
      ...postToUpdate,
      likes: newLikes,
      likedBy: newLikedBy,
    };
    setPost(updatedPost);

    try {
      const updatedData = await api.posts.toggleLike(
        postToUpdate._id,
        user.uid,
      );
      setPost({
        ...updatedPost,
        likes: updatedData.likes,
        likedBy: updatedData.likedBy,
      });
    } catch (error) {
      // Revert
      setPost(postToUpdate);
    }
  };

  const handleAddComment = async (postId: string, text: string) => {
    if (!user) return;
    try {
      const newComment = await api.posts.addComment(postId, user.uid, text);
      setPost((prev) =>
        prev
          ? {
              ...prev,
              comments: [...(prev.comments || []), newComment],
            }
          : null,
      );
    } catch (error) {
      throw error;
    }
  };

  const handleAcceptRequest = async (requesterUid: string) => {
    if (!user || !post?._id) return;
    try {
      await api.meetups.accept(post._id, user.uid, requesterUid);
      setPendingUsers((prev) => prev.filter((u) => u.uid !== requesterUid));
      setPost((prev) =>
        prev
          ? {
              ...prev,
              pendingRequests: prev.pendingRequests?.filter(
                (id) => id !== requesterUid,
              ),
              attendees: [...(prev.attendees || []), requesterUid],
            }
          : null,
      );
    } catch (e) {
      alert("Failed to accept");
    }
  };

  const handleRejectRequest = async (requesterUid: string) => {
    if (!user || !post?._id) return;
    try {
      await api.meetups.reject(post._id, user.uid, requesterUid);
      setPendingUsers((prev) => prev.filter((u) => u.uid !== requesterUid));
      setPost((prev) =>
        prev
          ? {
              ...prev,
              pendingRequests: prev.pendingRequests?.filter(
                (id) => id !== requesterUid,
              ),
            }
          : null,
      );
    } catch (e) {
      alert("Failed to reject");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  const isHost = user && post && user.uid === post.uid;
  const isMeetup = post?.type === "meetup";

  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      <div className="bg-slate-900/80 backdrop-blur-md px-4 py-3 shadow-sm sticky top-0 z-20 flex items-center border-b border-slate-800">
        <button
          onClick={() => safeBack(navigate, "/app")}
          className="p-2 -ml-2 text-slate-400 hover:text-white rounded-full"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="font-bold text-lg text-white ml-2">Post</h2>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {error ? (
          <div className="text-center py-10 text-slate-500">{error}</div>
        ) : post ? (
          <>
            <PostItem
              post={post}
              currentUserId={user?.uid}
              onLike={handleLike}
              onAddComment={handleAddComment}
            />

            {/* Host Management Section */}
            {isHost && isMeetup && (
              <div className="animate-fade-in space-y-4">
                <button
                  onClick={() => navigate(`/app/chat/group/${post._id}`)}
                  className="w-full py-3 bg-slate-800 border border-slate-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors"
                >
                  <MessageCircle className="w-5 h-5 text-primary-500" />
                  Open Group Chat
                </button>

                <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/50">
                    <h3 className="font-bold text-white">
                      Pending Requests ({pendingUsers.length})
                    </h3>
                  </div>

                  {loadingRequests ? (
                    <div className="p-6 flex justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                    </div>
                  ) : pendingUsers.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-sm">
                      No pending requests
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-800">
                      {pendingUsers.map((reqUser) => (
                        <div
                          key={reqUser.uid}
                          className="p-3 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
                        >
                          <div
                            className="flex items-center gap-3 cursor-pointer"
                            onClick={() => navigate(`/app/profile/${reqUser.uid}`)}
                          >
                            <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden shrink-0 border border-slate-700">
                              {reqUser.photoURL ? (
                                <img
                                  draggable={false}
                                  src={reqUser.photoURL}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-500">
                                  <UserIcon className="w-5 h-5" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-white text-sm">
                                {reqUser.displayName}
                              </p>
                              <p className="text-xs text-slate-400 truncate w-32">
                                {reqUser.bio || "No bio"}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAcceptRequest(reqUser.uid)}
                              className="p-2 bg-green-600/20 text-green-500 rounded-xl hover:bg-green-600 hover:text-white transition-colors border border-green-600/30"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRejectRequest(reqUser.uid)}
                              className="p-2 bg-red-600/20 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-colors border border-red-600/30"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
};

export default PostDetail;
