import { Message, Notification, Post, UserProfile, Community } from "../types";
import { API_CONFIG, API_ERROR_MESSAGES } from "../constants/config";
import { getErrorMessage } from "../util/apiErrorHandler";

/**
 * API SERVICE
 *
 * Communicates with the Node.js/MongoDB backend.
 */

const getBaseUrl = (): string => {
  const { protocol, hostname } = window?.location;

  const isLocal =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.startsWith(API_CONFIG.DOMAINS.NETWORK) ||
    hostname.startsWith(API_CONFIG.DOMAINS.PRIVATE);

  const isVercel = hostname.includes(API_CONFIG.DOMAINS.VERCEL);

  // 1️⃣ Local or network testing
  if (isLocal) {
    return API_CONFIG.BACKEND.LOCAL(hostname, API_CONFIG.PORT);
  }

  // 2️⃣ If frontend is deployed on Vercel
  if (isVercel) {
    return API_CONFIG.BACKEND.VERCEL;
  }

  // 3️⃣ Production (custom domain / Load Balancer)
  return API_CONFIG.BACKEND.PRODUCTION(protocol, hostname);
};

const API_BASE = getBaseUrl();

export const api = {
  auth: {
    signup: async (email: string, password: string) => {
      const response = await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response?.ok) throw new Error(data?.error || "Signup failed");
      return data;
    },

    login: async (email: string, password: string) => {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response?.ok) throw new Error(data?.error || "Login failed");
      return data;
    },

    googleLogin: async (
      email: string,
      displayName: string,
      photoURL: string,
    ) => {
      const response = await fetch(`${API_BASE}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, displayName, photoURL }),
      });
      const data = await response.json();
      if (!response?.ok) throw new Error(data?.error || "Google Login failed");
      return data;
    },
  },

  profile: {
    get: async (uid: string, viewerUid?: string) => {
      try {
        const query = viewerUid ? `?viewerUid=${encodeURIComponent(viewerUid)}` : "";
        const response = await fetch(`${API_BASE}/profile/${uid}${query}`);
        if (!response?.ok) return null;
        return await response.json();
      } catch (error) {
        console.error("Failed to fetch profile:", error);
        throw error; // Let caller handle offline/error state
      }
    },

    getBatch: async (uids: string[]) => {
      try {
        const response = await fetch(`${API_BASE}/profiles/batch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uids }),
        });
        if (!response?.ok) return [];
        return await response.json();
      } catch (error) {
        console.error("Failed to fetch batch profiles:", error);
        return [];
      }
    },

    getAllWithLocation: async (viewerUid?: string) => {
      try {
        // Pass viewerUid to filter out blocked users from the map/list
        const url = viewerUid
          ? `${API_BASE}/profiles?viewerUid=${viewerUid}`
          : `${API_BASE}/profiles`;

        const response = await fetch(url);
        if (!response?.ok) return [];
        return await response.json();
      } catch (error) {
        console.error("Failed to fetch profiles:", error);
        return [];
      }
    },

    createOrUpdate: async (uid: string, data: Partial<UserProfile>) => {
      // Keep a coarse client-side fallback, but server-side sanitization is authoritative.
      if (typeof data?.lastLocation?.lat === 'number' && typeof data?.lastLocation?.lng === 'number') {
        data.lastLocation.lat = parseFloat(data.lastLocation.lat.toFixed(3));
        data.lastLocation.lng = parseFloat(data.lastLocation.lng.toFixed(3));
      }
      const response = await fetch(`${API_BASE}/profile/${uid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response?.ok) throw new Error("Failed to update profile");
    },

    delete: async (uid: string) => {
      const response = await fetch(`${API_BASE}/profile/${uid}`, {
        method: "DELETE"
      });
      return response?.ok;
    },
    recordView: async (viewerUid: string, targetUid: string) => {
      try {
        await fetch(`${API_BASE}/profile/view`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ viewerUid, targetUid }),
        });
      } catch (e) {
        console.error("Failed to record profile view:", e);
      }
    },
    pass: async (uid: string, targetUid: string) => {
      try {
        await fetch(`${API_BASE}/user/pass`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid, targetUid }),
        });
      } catch (e) {}
    },
    getViewers: async (uid: string) => {
      try {
        const response = await fetch(`${API_BASE}/profile/views/${uid}`);
        if (!response?.ok) return [];
        return await response.json();
      } catch (e) {
        console.error("Failed to fetch profile viewers:", e);
        return [];
      }
    },
  },

  userAction: {
    block: async (uid: string, targetUid: string) => {
      const response = await fetch(`${API_BASE}/user/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, targetUid }),
      });
      if (!response?.ok) throw new Error("Failed to block user");
    },
    unblock: async (uid: string, targetUid: string) => {
      const response = await fetch(`${API_BASE}/user/unblock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, targetUid }),
      });
      if (!response?.ok) throw new Error("Failed to unblock user");
    },
    report: async (
      reporterUid: string,
      targetUid: string,
      reason: string,
      postId?: string,
    ) => {
      const response = await fetch(`${API_BASE}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporterUid, targetUid, reason, postId }),
      });
      if (!response?.ok) throw new Error("Failed to submit report");
    },
  },

  friends: {
    sendRequest: async (fromUid: string, toUid: string, message?: string) => {
      const response = await fetch(`${API_BASE}/friends/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromUid, toUid, message }),
      });
      if (!response?.ok) throw new Error("Failed to send request");
    },
    acceptRequest: async (userUid: string, requesterUid: string) => {
      const response = await fetch(`${API_BASE}/friends/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userUid, requesterUid }),
      });
      if (!response?.ok) throw new Error("Failed to accept request");
    },
    rejectRequest: async (userUid: string, requesterUid: string) => {
      const response = await fetch(`${API_BASE}/friends/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userUid, requesterUid }),
      });
      if (!response?.ok) throw new Error("Failed to reject request");
    },
    removeFriend: async (uid1: string, uid2: string) => {
      const response = await fetch(`${API_BASE}/friends/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid1, uid2 }),
      });
      if (!response?.ok) throw new Error("Failed to remove friend");
    },
  },

  meetups: {
    join: async (postId: string, uid: string) => {
      const response = await fetch(`${API_BASE}/meetups/${postId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid }),
      });
      if (!response?.ok) throw new Error("Failed to join meetup");
    },
    accept: async (postId: string, hostUid: string, requesterUid: string) => {
      const response = await fetch(`${API_BASE}/meetups/${postId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostUid, requesterUid }),
      });
      if (!response?.ok) throw new Error("Failed to accept request");
    },
    reject: async (postId: string, hostUid: string, requesterUid: string) => {
      const response = await fetch(`${API_BASE}/meetups/${postId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostUid, requesterUid }),
      });
      if (!response?.ok) throw new Error("Failed to reject request");
    },
    removeAttendee: async (
      postId: string,
      hostUid: string,
      targetUid: string,
    ) => {
      const response = await fetch(
        `${API_BASE}/meetups/${postId}/remove-attendee`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hostUid, targetUid }),
        },
      );
      if (!response?.ok) throw new Error("Failed to remove attendee");
    },
  },

  chat: {
    send: async (
      fromUid: string,
      toUid: string | undefined,
      text: string,
      groupId?: string,
      mediaType?: 'image' | 'emoji' | 'audio',
      mediaUrl?: string,
      replyTo?: { _id: string; text?: string; fromName: string; mediaType?: 'image' | 'emoji' | 'audio'; },
    ): Promise<Message> => {
      const response = await fetch(`${API_BASE}/chat/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromUid, toUid, groupId, text, mediaType, mediaUrl, replyTo }),
      });
      const data = await response.json();
      if (!response?.ok) throw new Error("Failed to send");
      return data;
    },
    getHistory: async (uid1: string, uid2: string): Promise<Message[]> => {
      try {
        const response = await fetch(
          `${API_BASE}/chat/history/${uid1}/${uid2}`,
        );
        if (!response?.ok) return [];
        return await response.json();
      } catch (error) {
        console.error("Failed to fetch chat history:", error);
        return [];
      }
    },
    getGroupHistory: async (groupId: string): Promise<Message[]> => {
      try {
        const response = await fetch(`${API_BASE}/chat/history/${groupId}`);
        if (!response?.ok) return [];
        return await response.json();
      } catch (error) {
        console.error("Failed to fetch group history:", error);
        return [];
      }
    },
    getInbox: async (uid: string) => {
      try {
        const response = await fetch(`${API_BASE}/chat/inbox/${uid}`);
        if (!response?.ok) return [];
        return await response.json();
      } catch (e) {
        console.error("Failed to fetch inbox:", e);
        return [];
      }
    },
    markRead: async (myUid: string, partnerUid?: string, groupId?: string) => {
      try {
        await fetch(`${API_BASE}/chat/mark-read`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ myUid, partnerUid, groupId }),
        });
      } catch (e) {
        console.error("Failed to mark read:", e);
      }
    },
    getUnreadCount: async (uid: string): Promise<number> => {
      try {
        const response = await fetch(`${API_BASE}/chat/unread-count/${uid}`);
        if (!response?.ok) return 0;
        const data = await response.json();
        return data?.count || 0;
      } catch (e) {
        return 0;
      }
    },
    deleteMessage: async (messageId: string, fromUid: string): Promise<void> => {
      const response = await fetch(`${API_BASE}/chat/message/${messageId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromUid }),
      });
      if (!response?.ok) throw new Error('Failed to delete message');
    },
    subscribe: (uid: string, onMessage: (msg: Message) => void) => {
      const { protocol, hostname, port } = window?.location;

      const isLocal =
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname.startsWith(API_CONFIG.DOMAINS.NETWORK) ||
        hostname.startsWith(API_CONFIG.DOMAINS.PRIVATE);

      const isVercel = hostname.includes(API_CONFIG.DOMAINS.VERCEL);

      let wsUrl: string;

      // 1️⃣ Local development
      if (isLocal) {
        const wsProtocol = "ws:";
        const portPart = port ? `:${port}` : "";
        wsUrl = `${wsProtocol}//${hostname}${portPart}?uid=${uid}`;
      }

      // 2️⃣ If frontend hosted on Vercel
      else if (isVercel) {
        wsUrl = `${API_CONFIG.WEBSOCKET.VERCEL}?uid=${uid}`;
      }

      // 3️⃣ Production (custom domain)
      else {
        const wsProtocol = protocol === "https:" ? "wss:" : "ws:";
        const portPart = port ? `:${port}` : "";
        wsUrl = `${wsProtocol}//${hostname}${portPart}?uid=${uid}`;
      }

      let socket: WebSocket | null = null;
      let keepAliveInterval: NodeJS.Timeout | null = null;

      const connect = (): void => {
        socket = new WebSocket(wsUrl);

        socket.onopen = (): void => {
          keepAliveInterval = setInterval((): void => {
            if (socket?.readyState === WebSocket?.OPEN) {
              socket.send(JSON.stringify({ type: "ping" }));
            }
          }, API_CONFIG.PORT === 5000 ? 30000 : 30000);
        };

        socket.onmessage = (event): void => {
          try {
            const data = JSON.parse(event?.data);
            if (data?.type === "ping" || data?.type === "pong") return;
            onMessage(data);
          } catch (e) {
            console.error("WS Parse Error", e);
          }
        };

        socket.onclose = (): void => {
          if (keepAliveInterval) clearInterval(keepAliveInterval);
        };
      };

      connect();

      return (): void => {
        if (socket) socket.close();
        if (keepAliveInterval) clearInterval(keepAliveInterval);
      };
    },

  },

  notifications: {
    get: async (uid: string): Promise<Notification[]> => {
      try {
        const response = await fetch(`${API_BASE}/notifications/${uid}`);
        if (!response?.ok) return [];
        return await response.json();
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
        return [];
      }
    },
    markRead: async (notificationIds: string[]) => {
      try {
        await fetch(`${API_BASE}/notifications/mark-read`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationIds }),
        });
      } catch (e) {
        console.error("Failed to mark notifications read:", e);
      }
    },
    markAllRead: async (uid: string) => {
      try {
        await fetch(`${API_BASE}/notifications/mark-all-read`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid }),
        });
      } catch (e) {
        console.error("Failed to mark all notifications read:", e);
      }
    },
    getUnreadCount: async (uid: string): Promise<number> => {
      try {
        const response = await fetch(`${API_BASE}/notifications/unread-count/${uid}`);
        if (!response?.ok) return 0;
        const data = await response.json();
        return data?.count || 0;
      } catch (e) {
        return 0;
      }
    },
  },

  push: {
    subscribe: async (uid: string, subscription: PushSubscription) => {
      const response = await fetch(`${API_BASE}/push/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, platform: "web", subscription }),
      });
      if (!response?.ok) throw new Error("Failed to subscribe to push notifications");
    }
  },

  posts: {
    create: async (postData: Partial<Post>) => {
      const response = await fetch(`${API_BASE}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      });
      if (!response?.ok) throw new Error("Failed to create post");
    },
    // Updated: Accept viewerUid to filter blocked content, plus pagination
    getAll: async (viewerUid?: string, page = 1, limit = 10) => {
      try {
        const url = new URL(`${API_BASE}/posts`);
        if (viewerUid) url.searchParams.append('viewerUid', viewerUid);
        url.searchParams.append('page', page.toString());
        url.searchParams.append('limit', limit.toString());
        
        const response = await fetch(url.toString());
        if (!response?.ok) return [];
        return await response.json();
      } catch (error) {
        console.error("Failed to fetch posts:", error);
        return [];
      }
    },
    getUserPosts: async (uid: string) => {
      try {
        const response = await fetch(`${API_BASE}/posts/user/${uid}`);
        if (!response?.ok) return [];
        return await response.json();
      } catch (error) {
        console.error("Failed to fetch user posts:", error);
        return [];
      }
    },
    getPost: async (postId: string) => {
      try {
        const response = await fetch(`${API_BASE}/posts/${postId}`);
        if (!response?.ok) return null;
        return await response.json();
      } catch (error) {
        console.error("Failed to fetch post:", error);
        return null;
      }
    },
    updatePost: async (
      postId: string,
      uid: string,
      content: string,
      imageURL?: string | null,
    ) => {
      const response = await fetch(`${API_BASE}/posts/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, content, imageURL }),
      });
      if (!response?.ok) throw new Error("Failed to update post");
    },
    deletePost: async (postId: string, uid: string) => {
      const response = await fetch(`${API_BASE}/posts/${postId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid }),
      });
      if (!response?.ok) throw new Error("Failed to delete post");
    },
    toggleLike: async (postId: string, uid: string) => {
      const response = await fetch(`${API_BASE}/posts/${postId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid }),
      });
      if (!response?.ok) throw new Error("Failed to toggle like");
      return await response.json();
    },
    addComment: async (postId: string, uid: string, text: string) => {
      const response = await fetch(`${API_BASE}/posts/${postId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, text }),
      });
      if (!response?.ok) throw new Error("Failed to add comment");
      return await response.json();
    },
    deleteComment: async (postId: string, commentId: string, uid: string) => {
      const response = await fetch(`${API_BASE}/posts/${postId}/deleteComment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId, uid }),
      });
      if (!response?.ok) throw new Error("Failed to delete comment");
      return await response.json();
    },
    likeComment: async (postId: string, commentId: string, uid: string) => {
      const response = await fetch(`${API_BASE}/posts/${postId}/likeComment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId, uid }),
      });
      if (!response?.ok) throw new Error("Failed to like comment");
      return await response.json();
    },
  },
  util: {
    getStories: async (viewerUid: string) => {
      const response = await fetch(`${API_BASE}/stories?viewerUid=${viewerUid}`);
      if (!response?.ok) return [];
      return await response.json();
    },
    createStory: async (storyData: any) => {
      const response = await fetch(`${API_BASE}/stories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(storyData),
      });
      if (!response?.ok) throw new Error("Failed to create story");
      return await response.json();
    },
    viewStory: async (storyId: string, uid: string) => {
      const response = await fetch(`${API_BASE}/stories/${storyId}/view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid }),
      });
      if (!response?.ok) throw new Error("Failed to record view");
      return await response.json();
    },
    deleteStory: async (storyId: string, uid: string) => {
      const response = await fetch(`${API_BASE}/stories/${storyId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid }),
      });
      if (!response?.ok) throw new Error("Failed to delete story");
      return await response.json();
    },
  },
  config: {
    getVersion: async () => {
      const response = await fetch(`${API_BASE}/config/version`);
      if (!response?.ok) throw new Error("Failed to fetch version config");
      return await response.json(); // { minAppVersion: string, updateUrl: string }
    }
  },

  communities: {
    create: async (uid: string, name: string, description?: string, tags?: string[], isPrivate?: boolean) => {
      const response = await fetch(`${API_BASE}/communities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, name, description, tags, isPrivate }),
      });
      const data = await response.json();
      if (!response?.ok) throw new Error(data?.error || "Failed to create room");
      return data as { success: boolean; id: string };
    },
    getAll: async () => {
      try {
        const response = await fetch(`${API_BASE}/communities`);
        if (!response?.ok) return [];
        return await response.json() as Community[];
      } catch { return []; }
    },
    get: async (id: string) => {
      try {
        const response = await fetch(`${API_BASE}/communities/${id}`);
        if (!response?.ok) return null;
        return await response.json() as Community;
      } catch { return null; }
    },
    join: async (id: string, uid: string) => {
      const response = await fetch(`${API_BASE}/communities/${id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid }),
      });
      if (!response?.ok) throw new Error("Failed to join room");
    },
    leave: async (id: string, uid: string) => {
      const response = await fetch(`${API_BASE}/communities/${id}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid }),
      });
      const data = await response.json();
      if (!response?.ok) throw new Error(data?.error || "Failed to leave room");
    },
    update: async (id: string, uid: string, name: string, description?: string, tags?: string[], isPrivate?: boolean) => {
      const response = await fetch(`${API_BASE}/communities/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, name, description, tags, isPrivate }),
      });
      if (!response?.ok) throw new Error("Failed to update room");
    },
    delete: async (id: string, uid: string) => {
      const response = await fetch(`${API_BASE}/communities/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid }),
      });
      if (!response?.ok) throw new Error("Failed to delete room");
    },
    deleteMessage: async (communityId: string, messageId: string, uid: string) => {
      const response = await fetch(`${API_BASE}/communities/${communityId}/messages/${messageId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid }),
      });
      if (!response?.ok) throw new Error("Failed to delete message");
    },
    pinMessage: async (communityId: string, uid: string, messageId: string | null, messageText: string | null) => {
      const response = await fetch(`${API_BASE}/communities/${communityId}/pin`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, messageId, messageText }),
      });
      if (!response?.ok) throw new Error("Failed to pin message");
    },
  },
};

// --- Revive Chat API ---
export async function reviveChat(chatId: string) {
  const response = await fetch(`/api/chats/${chatId}/revive`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ uid: getCurrentUserId() }),
  });

  if (!response.ok) {
    throw new Error('Failed to revive chat');
  }

  return await response.json();
}

