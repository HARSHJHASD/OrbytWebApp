import {
  Bell,
  Check,
  Globe,
  Heart,
  Loader2,
  Lock,
  MessageCircle,
  RefreshCw,
  Search,
  Settings,
  UserPlus,
  X,
} from "lucide-react";
import React, { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserLocation } from "../components/LocationGuard";
import PostItem from "../components/PostItem";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { api } from "../services/api";
import { Notification, Post, UserProfile } from "../types";
import StoryBar from "../components/StoryBar";
import StoryViewer from "../components/StoryViewer";
import { compressImage } from "../util/ImageCompression";
import { triggerHaptic } from "../util/haptics";
import { MainLogo } from "../util/Images";
import ConfirmModal from "../components/ui/ConfirmModal";

const getDistanceMeters = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) => {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const PostSkeleton = () => (
  <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-sm animate-pulse">
    <div className="p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-slate-800" />
      <div className="space-y-2 flex-1">
        <div className="h-4 w-24 bg-slate-800 rounded" />
        <div className="h-3 w-16 bg-slate-800 rounded" />
      </div>
    </div>
    <div className="w-full h-64 bg-slate-800" />
    <div className="p-4 space-y-3">
      <div className="h-4 w-3/4 bg-slate-800 rounded" />
      <div className="h-4 w-1/2 bg-slate-800 rounded" />
    </div>
  </div>
);

const Feed: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { location: myLocation } = useUserLocation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [stories, setStories] = useState<any[]>([]);
  const [selectedStoryGroup, setSelectedStoryGroup] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"regular" | "meetup">("regular");
  const [feedSort, setFeedSort] = useState<'latest' | 'nearby' | 'friends' | 'trending'>('latest');
  const [searchQuery, setSearchQuery] = useState('');
  const BOOKMARKS_KEY = 'bookmarkedPostIds';
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(() => {
    try { const s = localStorage.getItem(BOOKMARKS_KEY); return s ? new Set(JSON.parse(s)) : new Set(); } catch { return new Set(); }
  });
  const [blockedUids, setBlockedUids] = useState<Set<string>>(() => {
    try { const s = localStorage.getItem('blockedUids'); return s ? new Set(JSON.parse(s)) : new Set(); } catch { return new Set(); }
  });
  const [mutedUids, setMutedUids] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('mutedStoryUids');
      return stored ? new Set<string>(JSON.parse(stored)) : new Set<string>();
    } catch { return new Set<string>(); }
  });

  const handleMuteUser = (uid: string) => {
    setMutedUids(prev => {
      const next = new Set(prev);
      next.add(uid);
      try { localStorage.setItem('mutedStoryUids', JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const handleBookmark = (postId: string) => {
    setBookmarkedIds(prev => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId); else next.add(postId);
      try { localStorage.setItem(BOOKMARKS_KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const handleBlockFromFeed = async (targetUid: string) => {
    setBlockedUids(prev => {
      const next = new Set(prev);
      next.add(targetUid);
      try { localStorage.setItem('blockedUids', JSON.stringify([...next])); } catch {}
      return next;
    });
    if (user?.uid) {
      try { await api.userAction.block(user.uid, targetUid); } catch {}
    }
  };

  // Activate meetup tab when navigated with ?tab=meetup (e.g. from new_event notification)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('tab') === 'meetup') setActiveTab('meetup');
  }, [location.search]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notification State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Pull to refresh state
  const [refreshing, setRefreshing] = useState(false);
  const [pullY, setPullY] = useState(0);
  const startY = useRef(0);
  const isDragging = useRef(false);

  // Scroll to top state
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pendingStoryFile, setPendingStoryFile] = useState<File | null>(null);
  const [showStoryVisibility, setShowStoryVisibility] = useState(false);

  // Pagination state
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const POSTS_PER_PAGE = 10;

  // Infinite scroll sentinel ref
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Infinite scroll with IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries:any) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          fetchPosts(true);
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Push Notifications
  const { isSupported, isSubscribed, subscribe } = usePushNotifications();
  const [subscribing, setSubscribing] = useState(false);


  const handleSubscribe = async () => {
    setSubscribing(true);
    await subscribe();
    setSubscribing(false);
  };

  const fetchPosts = async (isLoadMore = false) => {
    try {
      if (!user) return;

      const currentPage = isLoadMore ? page + 1 : 1;

      if (!isLoadMore) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const [allPosts, profile, moments] = await Promise.all([
        api.posts.getAll(user?.uid, currentPage, POSTS_PER_PAGE),
        !isLoadMore ? api.profile.get(user?.uid) : Promise.resolve(userProfile),
        !isLoadMore ? api.util.getStories(user?.uid) : Promise.resolve(stories)
      ]);

      if (!isLoadMore) {
        setUserProfile(profile);
        setStories(moments);
        setPosts(allPosts);
      } else {
        setPosts((prev) => [...prev, ...allPosts]);
      }

      setPage(currentPage);
      setHasMore(allPosts.length === POSTS_PER_PAGE);
    } catch (error) {
      console.error(error);
    } finally {
      if (isLoadMore) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  };

  const filteredPostsByTab = useMemo(() => {
    let filtered = posts.filter((p) => p.type === activeTab && !blockedUids.has(p.uid));
    if (feedSort === 'trending') {
      filtered = [...filtered].sort((a, b) => ((b as any).likedBy?.length || 0) - ((a as any).likedBy?.length || 0));
    } else if (feedSort === 'nearby' && myLocation) {
      filtered = [...filtered].sort((a: any, b: any) => {
        const getD = (p: any) => p.location
          ? Math.sqrt(Math.pow(p.location.lat - myLocation.lat, 2) + Math.pow(p.location.lng - myLocation.lng, 2))
          : Infinity;
        return getD(a) - getD(b);
      });
    } else if (feedSort === 'friends') {
      filtered = filtered.filter((p: any) => userProfile?.friends?.includes(p.uid) || p.uid === user?.uid);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter((p: any) =>
        p.content?.toLowerCase().includes(q) ||
        p.authorName?.toLowerCase().includes(q) ||
        p.location?.name?.toLowerCase().includes(q) ||
        p.meetupDetails?.title?.toLowerCase().includes(q) ||
        p.meetupDetails?.activity?.toLowerCase().includes(q) ||
        p.meetupDetails?.venueName?.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [posts, activeTab, blockedUids, feedSort, myLocation, userProfile, user, searchQuery]);

  const handleAddStory = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !userProfile) return;
    // Reset input so same file can be re-selected
    e.target.value = '';
    setPendingStoryFile(file);
    setShowStoryVisibility(true);
  };

  const doAddStory = async (visibility: 'public' | 'friends') => {
    if (!pendingStoryFile || !user || !userProfile) return;
    setShowStoryVisibility(false);
    const file = pendingStoryFile;
    setPendingStoryFile(null);
    try {
      setLoading(true);
      const base64 = await compressImage(file, 640, 0.5, 9 / 16);
      await api.util.createStory({
        uid: user?.uid,
        authorName: userProfile?.displayName,
        authorPhoto: userProfile?.photoURL,
        imageURL: base64,
        visibility,
        location: myLocation ? { ...myLocation, name: 'Nearby' } : undefined
      });
      fetchPosts();
    } catch (err) {
      console.error("Create Story Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    if (user) {
      try {
        const data = await api.notifications.get(user?.uid);
        setNotifications(data);
        setUnreadCount(data?.filter((n) => !n?.read).length);
      } catch (e) {
        console.error("Failed to load notifications", e);
      }
    }
  };

  useEffect(() => {
    fetchPosts();
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchPosts();
        fetchNotifications();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user, myLocation]); // Re-fetch/filter if location changes

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchPosts(false), fetchNotifications()]);
    setRefreshing(false);
    setPullY(0);
  };

  const handleTouchStart = (e:any) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      isDragging.current = true;
    }
  };

  const handleTouchMove = (e: any) => {
    if (!isDragging.current) return;
    if (window.scrollY === 0) {
      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;
      if (diff > 0) {
        const damped = Math.min(diff * 0.4, 150);
        setPullY(damped);
      }
    } else {
      isDragging.current = false;
      setPullY(0);
    }
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    if (pullY > 60) {
      handleRefresh();
    } else {
      setPullY(0);
    }
  };

  const handleLike = async (post: Post) => {
    if (!user || !post?._id) return;
    triggerHaptic(10); // subtle tick on like
    const isLiked = post?.likedBy?.includes(user?.uid);
    const newLikes = isLiked ? post?.likes - 1 : post?.likes + 1;
    const newLikedBy = isLiked
      ? post?.likedBy?.filter((id) => id !== user?.uid) || []
      : [...(post?.likedBy || []), user?.uid];

    setPosts((currentPosts) =>
      currentPosts.map((p) =>
        p?._id === post?._id ? { ...p, likes: newLikes, likedBy: newLikedBy } : p,
      ),
    );

    try {
      const updatedData = await api.posts.toggleLike(post?._id, user?.uid);
      setPosts((currentPosts) =>
        currentPosts.map((p) =>
          p?._id === post?._id
            ? { ...p, likes: updatedData?.likes, likedBy: updatedData?.likedBy }
            : p,
        ),
      );
    } catch (error) {
      setPosts((currentPosts) =>
        currentPosts.map((p) => (p?._id === post?._id ? post : p)),
      );
    }
  };

  const handleAddComment = async (postId: string, text: string) => {
    if (!user) return;
    try {
      const newComment = await api.posts.addComment(postId, user.uid, text);
      setPosts((currentPosts) =>
        currentPosts.map((p) => {
          if (p._id === postId) {
            return {
              ...p,
              comments: [...(p.comments || []), newComment],
            };
          }
          return p;
        }),
      );
    } catch (error) {
      console.error("Failed to add comment", error);
      throw error;
    }
  };

  const handleDeletePost = (postId: string) => {
    setConfirmDeleteId(postId);
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!user) return;
    try {
      await api.posts.deleteComment(postId, commentId, user.uid);
      setPosts(prev => prev.map(p =>
        p._id === postId
          ? { ...p, comments: (p.comments || []).filter((c: any) => (c._id || c.id) !== commentId) }
          : p
      ));
    } catch (e) { console.error(e); }
  };

  const handleLikeComment = async (postId: string, commentId: string) => {
    if (!user) return;
    try { await api.posts.likeComment(postId, commentId, user.uid); } catch (e) { console.error(e); }
  };

  const handleConfirmDelete = async () => {
    if (!user || !confirmDeleteId) return;
    setDeleting(true);
    try {
      await api.posts.deletePost(confirmDeleteId, user.uid);
      setPosts((prev) => prev.filter((p) => p._id !== confirmDeleteId));
      setConfirmDeleteId(null);
    } catch (error) {
      console.error("Failed to delete post", error);
      alert("Failed to delete post. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const handleNotificationClick = async (n: Notification) => {
    setShowNotifications(false);
    if (n?.type === "friend_request") {
      navigate(`/app/profile/${n?.fromUid}`);
    } else if (n?.type === "friend_accept") {
      navigate(`/app/profile/${n?.fromUid}`);
    } else if ((n?.type === "like" || n?.type === "comment") && n?.postId) {
      navigate(`/app/post/${n?.postId}`);
    }
  };

  const openNotifications = async () => {
    setShowNotifications(true);
    if (unreadCount > 0) {
      const unreadIds = notifications?.filter((n) => !n?.read).map((n) => n?._id);
      if (unreadIds?.length > 0) {
        await api.notifications.markRead(unreadIds);
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "friend_request":
        return <UserPlus className="w-4 h-4 text-white" />;
      case "friend_accept":
        return <Check className="w-4 h-4 text-white" />;
      case "like":
        return <Heart className="w-4 h-4 text-white fill-current" />;
      case "comment":
        return <MessageCircle className="w-4 h-4 text-white" />;
      default:
        return <Bell className="w-4 h-4 text-white" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "friend_request":
        return "bg-blue-500 shadow-lg shadow-blue-500/30";
      case "friend_accept":
        return "bg-green-500 shadow-lg shadow-green-500/30";
      case "like":
        return "bg-red-500 shadow-lg shadow-red-500/30";
      case "comment":
        return "bg-indigo-500 shadow-lg shadow-indigo-500/30";
      default:
        return "bg-slate-500";
    }
  };

  const getNotificationText = (n: Notification) => {
    switch (n.type) {
      case "friend_request":
        return (
          <>
            wants to connect with{" "}
            <span className="font-bold text-slate-100">you</span>
          </>
        );
      case "friend_accept":
        return (
          <>
            <span className="font-bold text-slate-100">connected with you</span>
          </>
        );
      case "like":
        return (
          <>
            liked your <span className="font-bold text-slate-100">post</span>
          </>
        );
      case "comment":
        return (
          <>
            commented on your{" "}
            <span className="font-bold text-slate-100">post</span>
          </>
        );
      default:
        return "New notification";
    }
  };
  const { unreadCount: notifUnreadCount } = useNotifications();
  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <div
      className="bg-slate-950 min-h-[100dvh] relative w-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to Refresh Spinner Indicator */}
      <div
        className="absolute left-0 right-0 top-4 flex justify-center z-20 pointer-events-none transition-opacity duration-200"
        style={{ opacity: pullY > 20 ? 1 : 0 }}
      >
        <div
          className="bg-slate-900 rounded-full p-2 shadow-md border border-slate-800"
          style={{ transform: `rotate(${pullY * 2}deg)` }}
        >
          {refreshing ? (
            <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
          ) : (
            <RefreshCw className="w-5 h-5 text-primary-500" />
          )}
        </div>
      </div>

      {/* Header */}
      <div
        className="bg-slate-900/80 backdrop-blur-xl sticky top-0 z-30 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] border-b border-slate-800 flex justify-between items-center transition-transform duration-200 ease-out"
        style={{ transform: `translateY(${pullY * 0.5}px)` }}
      >
        {/* <h1 className="text-xl font-bold text-white tracking-tight">Orbyt</h1> */}
        <div className="flex items-center cursor-pointer group" onClick={() => navigate('/')}>
          <img
            draggable={false}
            src={MainLogo}
            alt="Orbyt Logo"
            className="h-10 w-auto object-contain group-hover:scale-105 transition-transform duration-200 drop-shadow-[0_0_8px_rgba(139,92,246,0.3)]"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Settings Button */}
          <button
            onClick={() => navigate("/app/settings")}
            className="p-2 rounded-full hover:bg-slate-800 transition-colors text-slate-400 hover:text-white"
          >
            <Settings className="w-6 h-6" />
          </button>

          {/* Notification Bell */}
          <button
            onClick={() => navigate("/app/notifications")}
            className="relative p-2 rounded-full hover:bg-slate-800 transition-colors"
          >
            <Bell className="w-6 h-6 text-slate-400" />
            {notifUnreadCount > 0 && (
              <div className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-4 px-0.5 rounded-full flex items-center justify-center border-2 border-slate-900">
                {notifUnreadCount > 9 ? "9+" : notifUnreadCount}
              </div>
            )}
          </button>

          {/* <button
            onClick={() => navigate("/app/notifications")}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 relative ${isActive("/notifications") ? "text-primary-500" : "text-slate-500 hover:text-slate-300"}`}
          >
            <div className="relative">
              <Bell
                className={`w-5 h-5 ${isActive("/notifications") ? "fill-current" : ""}`}
              />
              {notifUnreadCount > 0 && (
                <div className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-4 px-0.5 rounded-full flex items-center justify-center border-2 border-slate-900">
                  {notifUnreadCount > 9 ? "9+" : notifUnreadCount}
                </div>
              )}
            </div>
          
          </button> */}

          {/* User Avatar */}
          <div className="w-8 h-8 rounded-full bg-slate-800 overflow-hidden border border-slate-700 ml-1">
            {user && (
              <div className="w-full h-full bg-slate-800 flex items-center justify-center text-primary-500 font-bold text-xs">
                {user.email?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div
        className="p-4 space-y-4 max-w-lg mx-auto pb-32 relative transition-transform duration-300 ease-out"
        style={{ transform: `translateY(${pullY}px)` }}
      >
        <StoryBar 
          stories={stories.filter((g: any) => !mutedUids.has(g.uid))} 
          userProfile={userProfile} 
          onAddStory={() => fileInputRef.current?.click()}
          onViewStory={(group) => setSelectedStoryGroup(group)}
        />
        <input 
          type="file" 
          hidden 
          ref={fileInputRef} 
          onChange={handleAddStory}
          accept="image/*"
        />

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search posts, events, people…"
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-9 pr-9 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary-500/60 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tabs Navigation */}
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-white pl-1">
            {activeTab === "regular" ? "Recent Posts" : "Upcoming Meetups"}
          </h2>
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
            {["regular", "meetup"].map((type) => (
              <button
                key={type}
                onClick={() => {
                  setActiveTab(type as any);
                  triggerHaptic(5);
                }}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                  activeTab === type
                    ? "bg-primary-500 text-white shadow-lg shadow-primary-500/20"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {type === "regular" ? "Posts" : "Events"}
              </button>
            ))}
          </div>
        </div>

        {/* Feed Sort Pills */}
        {activeTab === 'regular' && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
            {(['latest','nearby','friends','trending'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFeedSort(s)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                  feedSort === s
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-primary-500/50'
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="space-y-6 animate-fade-in">
            <PostSkeleton />
            <PostSkeleton />
            <PostSkeleton />
          </div>
        ) : filteredPostsByTab.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/50 rounded-3xl border border-slate-800/50 border-dashed animate-fade-in">
            <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-800">
              <RefreshCw className="w-8 h-8 text-slate-700" />
            </div>
            <p className="text-slate-500 font-medium px-6">
              No {activeTab === "regular" ? "posts" : "events"} found nearby. 
              Try increasing your discovery radius in settings!
            </p>
          </div>
        ) : (
          <>
            {filteredPostsByTab.map((post, index) => (
              <div
                key={post._id}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <PostItem
                  post={post}
                  currentUserId={user?.uid}
                  onLike={handleLike}
                  onAddComment={handleAddComment}
                  onEdit={post.uid === user?.uid ? (id: string) => navigate(`/app/edit-post/${id}`) : undefined}
                  onDelete={post.uid === user?.uid ? handleDeletePost : undefined}
                  onDeleteComment={handleDeleteComment}
                  onLikeComment={handleLikeComment}
                  onBookmark={handleBookmark}
                  isBookmarked={bookmarkedIds.has((post as any)._id || '')}
                  onBlock={handleBlockFromFeed}
                  friendIds={userProfile?.friends || []}
                />
              </div>
            ))}
            
            {/* Infinite Scroll Sentinel */}
            {hasMore && (
              <div ref={sentinelRef} className="flex justify-center py-8">
                <div className="animate-pulse">
                  <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Notifications Modal */}
      {showNotifications && (
        <div className="fixed inset-0 z-[2000] flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 animate-fade-in">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowNotifications(false)}
          />
          <div className="bg-slate-900 w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-black relative z-10 flex flex-col max-h-[80vh] animate-slide-up overflow-hidden border border-slate-800">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <h3 className="font-bold text-white text-lg">Notifications</h3>
              <button
                onClick={() => setShowNotifications(false)}
                className="p-2 -mr-2 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
              {notifications.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  No notifications yet.
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.map((n) => (
                    <div
                      key={n._id}
                      onClick={() => handleNotificationClick(n)}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-colors cursor-pointer ${n.read ? "bg-transparent hover:bg-slate-800" : "bg-slate-800/60 hover:bg-slate-800"}`}
                    >
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden shrink-0 border border-slate-700">
                          {n.fromPhoto ? (
                            <img
                              draggable={false}
                              src={n.fromPhoto}
                              alt={n.fromName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-slate-500 text-xs">
                              {n.fromName[0]}
                            </div>
                          )}
                        </div>
                        <div
                          className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-slate-900 flex items-center justify-center ${getNotificationColor(n.type)}`}
                        >
                          {getNotificationIcon(n.type)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-400 leading-snug">
                          <span className="font-bold text-slate-200 mr-1">
                            {n.fromName}
                          </span>
                          {getNotificationText(n)}
                        </p>
                        <span className="text-[10px] text-slate-600 font-medium">
                          {new Date(n.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Scroll to Top Button */}
      {selectedStoryGroup && (
        <StoryViewer 
          group={selectedStoryGroup} 
          onClose={() => setSelectedStoryGroup(null)} 
          currentUserId={user?.uid}
          onMute={handleMuteUser}
        />
      )}
      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-24 right-6 p-3 bg-primary-500 text-white rounded-full shadow-lg shadow-primary-500/30 active:scale-95 transition-all animate-in fade-in zoom-in duration-300 z-[1900]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m18 15-6-6-6 6" />
          </svg>
        </button>
      )}
      <ConfirmModal
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Post"
        description="Are you sure you want to delete this post? This action cannot be undone."
        confirmText="Delete"
        danger
        loading={deleting}
      />

      {/* Story Visibility Picker */}
      {showStoryVisibility && (
        <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowStoryVisibility(false)}>
          <div className="bg-[#0d1b2a] w-full max-w-md rounded-t-3xl p-6 pb-10" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-5" />
            <h3 className="text-white font-bold text-lg mb-1">Who can see this Moment?</h3>
            <p className="text-slate-400 text-sm mb-5">Choose your audience before posting</p>
            <button
              onClick={() => doAddStory('public')}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-700 hover:border-primary-500/50 bg-slate-900/60 hover:bg-slate-800/60 transition-all mb-3 text-left"
            >
              <div className="w-11 h-11 rounded-full bg-primary-600/20 flex items-center justify-center shrink-0">
                <Globe className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">Everyone</p>
                <p className="text-slate-400 text-xs mt-0.5">Visible to all Orbyt users nearby</p>
              </div>
            </button>
            <button
              onClick={() => doAddStory('friends')}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-700 hover:border-green-500/50 bg-slate-900/60 hover:bg-slate-800/60 transition-all text-left"
            >
              <div className="w-11 h-11 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">Friends Only</p>
                <p className="text-slate-400 text-xs mt-0.5">Only people you've connected with</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Feed;
