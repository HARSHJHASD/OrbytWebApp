import { Message, Notification, Post, UserProfile } from "../types";

/**
 * API SERVICE
 *
 * Communicates with the Node.js/MongoDB backend.
 */

const PORT = 5000;

const getBaseUrl = () => {
  const { protocol, hostname } = window?.location;


  const isLocal =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.");

  const isVercel = hostname.includes("vercel.app");

  // 1️⃣ Local or network testing
  if (isLocal) {
    const localUrl = `http://${hostname}:${PORT}/api`;
    return localUrl;
  }

  // 2️⃣ If frontend is deployed on Vercel
  if (isVercel) {
    const vercelUrl = "https://orbyt.strangerchat.space/api";
    return vercelUrl;
  }

  // 3️⃣ Production (Beanstalk / custom domain / Load Balancer)
  const prodUrl = `${protocol}//${hostname}/api`;
  return prodUrl;
};


const API_BASE = getBaseUrl();


// const API_BASE = getBaseUrl();

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
    get: async (uid: string) => {
      try {
        const response = await fetch(`${API_BASE}/profile/${uid}`);
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
      // Fuzz location for privacy before sending to server
      if (data?.lastLocation?.lat && data?.lastLocation?.lng) {
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
    ): Promise<Message> => {
      const response = await fetch(`${API_BASE}/chat/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromUid, toUid, groupId, text }),
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
    subscribe: (uid: string, onMessage: (msg: Message) => void) => {
      const { protocol, hostname, port } = window?.location;

      const isLocal =
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname.startsWith("192.168.") ||
        hostname.startsWith("10.");

      const isVercel = hostname.includes("vercel.app");

      let wsUrl: string;

      // 1️⃣ Local development
      if (isLocal) {
        const wsProtocol = "ws:";
        const portPart = port ? `:${port}` : "";
        wsUrl = `${wsProtocol}//${hostname}${portPart}?uid=${uid}`;
      }

      // 2️⃣ If frontend hosted on Vercel
      else if (isVercel) {
        wsUrl = `wss://backend.strangerchat.space?uid=${uid}`;
      }

      // 3️⃣ Production (Beanstalk / custom domain)
      else {
        const wsProtocol = protocol === "https:" ? "wss:" : "ws:";
        const portPart = port ? `:${port}` : "";
        wsUrl = `${wsProtocol}//${hostname}${portPart}?uid=${uid}`;
      }

      let socket: WebSocket | null = null;
      let keepAliveInterval: any;

      const connect = () => {
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          keepAliveInterval = setInterval(() => {
            if (socket?.readyState === WebSocket?.OPEN) {
              socket.send(JSON.stringify({ type: "ping" }));
            }
          }, 30000);
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event?.data);
            if (data?.type === "ping" || data?.type === "pong" || data?.type === "notification") return;
            onMessage(data);
          } catch (e) {
            console.error("WS Parse Error", e);
          }
        };

        socket.onclose = () => {
          clearInterval(keepAliveInterval);
        };
      };

      connect();

      return () => {
        if (socket) socket.close();
        clearInterval(keepAliveInterval);
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
        body: JSON.stringify({ uid, subscription }),
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
    // Updated: Accept viewerUid to filter blocked content
    getAll: async (viewerUid?: string) => {
      try {
        const url = viewerUid
          ? `${API_BASE}/posts?viewerUid=${viewerUid}`
          : `${API_BASE}/posts`;
        const response = await fetch(url);
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
  }
};

