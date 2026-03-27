import cors from "cors";
import dotenv from "dotenv";
import { Expo } from 'expo-server-sdk';
import express from "express";
import http from "http";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import path from "path";
import { fileURLToPath } from "url";
import webpush from "web-push";
import WebSocket, { WebSocketServer } from "ws";

const expo = new Expo();

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// --- Web Push Configuration ---
const publicVapidKey = process.env.VITE_VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;
webpush.setVapidDetails(
  "mailto:harsh.j@sparrowrms.in",
  publicVapidKey,
  privateVapidKey
);
//this is for hosting frontend in render
app.use(express.static(path.join(__dirname, "dist")));
//this is for hosting frontend in render
app.get("/app", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

const port = process.env.PORT || 5000;
// Create HTTP server wrapping Express
const server = http.createServer(app);

// Initialize WebSocket Server
const wss = new WebSocketServer({ server });

// Enable CORS
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5000",
  "https://backend.strangerchat.space",
  "https://orbyt.strangerchat.space",
  "https://sociall-sigma.vercel.app"   // ✅ ADD THIS
];


app.use(
  cors({
    origin: function (origin, callback) {
      if (
        !origin ||
        origin.includes("vercel.app") ||
        allowedOrigins.includes(origin)
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);



app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

const uri = process.env.MONGO_URI;

const client = new MongoClient(uri, {
  tls: true,
  retryWrites: true,
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db;
const DB_NAME = "socially_db";
const clients = new Map(); // uid -> Set<WebSocket>

// --- WebSocket Logic ---
wss.on('connection', (ws, req) => {
  const urlParams = new URLSearchParams(req.url.split('?')[1]);
  const uid = urlParams.get('uid');

  if (uid) {
    if (!clients.has(uid)) {
      clients.set(uid, new Set());
    }
    clients.get(uid).add(ws);

    ws.on('close', () => {
      if (clients.has(uid)) {
        clients.get(uid).delete(ws);
        if (clients.get(uid).size === 0) {
          clients.delete(uid);
        }
      }
    });

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch (e) {
        // Ignore
      }
    });
  }
});

function sendToUser(uid, data) {
  if (clients.has(uid)) {
    clients.get(uid).forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }
}

async function createNotification(type, fromUid, toUid, postId = null) {
  if (!db || fromUid === toUid) return;
  try {
    const notifications = db.collection('notifications');
    const profiles = db.collection('profiles');
    const sender = await profiles.findOne({ uid: fromUid });
    const receiver = await profiles.findOne({ uid: toUid });

    if (!sender || !receiver) return;

    const senderBlocked = sender.blockedUsers || [];
    const receiverBlocked = receiver.blockedUsers || [];

    if (senderBlocked.includes(toUid) || receiverBlocked.includes(fromUid)) {
      return;
    }

    const notifDoc = {
      type,
      fromUid,
      fromName: sender.displayName,
      fromPhoto: sender.photoURL,
      toUid,
      postId,
      read: false,
      createdAt: Date.now()
    };
    const notifResult = await notifications.insertOne(notifDoc);
    // Push real-time in-app notification over WebSocket
    sendToUser(toUid, {
      type: 'notification',
      notification: { ...notifDoc, _id: notifResult.insertedId }
    });

    // --- Send Web Push Notification ---
    if (receiver.pushSubscription) {
      let title = "New Notification";
      let body = "You have a new notification on Orbyt.";

      switch (type) {
        case 'like':
          title = "New Like!";
          body = `${sender.displayName} liked your post.`;
          break;
        case 'comment':
          title = "New Comment!";
          body = `${sender.displayName} commented on your post.`;
          break;
        case 'friend_request':
          title = "Friend Request";
          body = `${sender.displayName} sent you a friend request.`;
          break;
        case 'friend_accept':
          title = "Friend Request Accepted";
          body = `${sender.displayName} accepted your friend request.`;
          break;
        case 'meetup_request':
          title = "Meetup Request";
          body = `${sender.displayName} requested to join your meetup.`;
          break;
        case 'meetup_accept':
          title = "Meetup Accepted";
          body = `${sender.displayName} accepted your request to join the meetup!`;
          break;
      }

      const payload = JSON.stringify({
        title,
        body,
        icon: sender.photoURL || "/pwa-192x192.png",
        data: { url: postId ? `/post/${postId}` : `/profile/${sender.uid}` }
      });

      const expoPayload = {
        title,
        body,
        data: { url: postId ? `/post/${postId}` : `/profile/${sender.uid}` }
      };

      await sendPushNotification(toUid, payload, expoPayload);
    }

  } catch (e) {
    console.error("Error creating notification", e);
  }
}

// --- DATABASE CLEANUP UTILITY ---
async function cleanupOrphanedData() {
  if (!db) return;
  try {
    const users = db.collection('users');
    const profiles = db.collection('profiles');
    const posts = db.collection('posts');
    const messages = db.collection('messages');
    const notifications = db.collection('notifications');

    // 1. Get valid UIDs (convert ObjectIds to strings)
    const allUsers = await users.find({}).project({ _id: 1 }).toArray();
    const validUids = new Set(allUsers.map(u => u._id.toString()));
    const validUidArray = Array.from(validUids);

    // 2. Delete Orphaned Profiles
    const profRes = await profiles.deleteMany({ uid: { $nin: validUidArray } });

    // 3. Delete Orphaned Posts
    const postRes = await posts.deleteMany({ uid: { $nin: validUidArray } });

    // 4. Delete Orphaned Messages (Invalid sender OR invalid recipient)
    const msgRes = await messages.deleteMany({
      $or: [
        { fromUid: { $nin: validUidArray } },
        { toUid: { $exists: true, $nin: validUidArray } }
      ]
    });


    // 5. Delete Orphaned Notifications
    const notifRes = await notifications.deleteMany({
      $or: [
        { fromUid: { $nin: validUidArray } },
        { toUid: { $nin: validUidArray } }
      ]
    });


    // 6. Clean Arrays (Comments, Likes, Attendees, Friend Lists)

    // Remove comments from deleted users
    await posts.updateMany(
      {},
      { $pull: { comments: { uid: { $nin: validUidArray } } } }
    );

    // Iterate Posts to clean string arrays (likedBy, attendees, etc.)
    const allPosts = await posts.find({}).toArray();
    let postUpdates = 0;
    for (const post of allPosts) {
      let changed = false;
      const updates = {};

      if (post.likedBy) {
        const newLiked = post.likedBy.filter(id => validUids.has(id));
        if (newLiked.length !== post.likedBy.length) {
          updates.likedBy = newLiked;
          updates.likes = newLiked.length;
          changed = true;
        }
      }
      if (post.attendees) {
        const newAtt = post.attendees.filter(id => validUids.has(id));
        if (newAtt.length !== post.attendees.length) {
          updates.attendees = newAtt;
          changed = true;
        }
      }
      if (post.pendingRequests) {
        const newPen = post.pendingRequests.filter(id => validUids.has(id));
        if (newPen.length !== post.pendingRequests.length) {
          updates.pendingRequests = newPen;
          changed = true;
        }
      }

      if (changed) {
        await posts.updateOne({ _id: post._id }, { $set: updates });
        postUpdates++;
      }
    }

    // Iterate Profiles to clean friend lists
    const allProfiles = await profiles.find({}).toArray();
    let profileUpdates = 0;
    for (const p of allProfiles) {
      let changed = false;
      const updates = {};
      const fields = ['friends', 'incomingRequests', 'outgoingRequests', 'blockedUsers'];

      for (const f of fields) {
        if (p[f] && Array.isArray(p[f])) {
          const filtered = p[f].filter(id => validUids.has(id));
          if (filtered.length !== p[f].length) {
            updates[f] = filtered;
            changed = true;
          }
        }
      }
      if (changed) {
        await profiles.updateOne({ _id: p._id }, { $set: updates });
        profileUpdates++;
      }
    }


  } catch (e) {
    console.error("Error during cleanup:", e);
  }
}

async function run() {
  try {
    await client.connect();
    db = client.db(DB_NAME);

    // Run cleanup on startup to sync state
    await cleanupOrphanedData();

  } catch (e) {
    console.error("MongoDB connection error:", e);
  }
}
run().catch(console.dir);

// --- HELPERS ---
function calculateAge(dateString) {
  const birthDate = new Date(dateString);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// --- HELPER: Get Blocked Lists ---
async function getMutualBlockedUids(viewerUid) {
  if (!viewerUid || viewerUid === 'undefined' || viewerUid === 'null') return [];
  try {
    const profiles = db.collection('profiles');
    const viewer = await profiles.findOne({ uid: viewerUid });
    const blockedByViewer = viewer?.blockedUsers || [];
    const blockers = await profiles.find({ blockedUsers: viewerUid }).project({ uid: 1 }).toArray();
    const blockingViewer = blockers.map(b => b.uid);
    return [...new Set([...blockedByViewer, ...blockingViewer])];
  } catch (e) {
    console.error("Error fetching blocked UIDs", e);
    return [];
  }
}

// --- API ROUTES ---

app.post('/api/profile/view', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { viewerUid, targetUid } = req.body;
    if (!viewerUid || !targetUid || viewerUid === targetUid) {
      return res.status(400).json({ error: "Invalid uids" });
    }

    const profileViews = db.collection('profile_views');

    await profileViews.updateOne(
      { viewerUid, targetUid },
      { $set: { timestamp: Date.now() } },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Record view error:", error);
    res.status(500).json({ error: "Failed to record view" });
  }
});

app.get('/api/profile/views/:uid', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { uid } = req.params;
    const profileViews = db.collection('profile_views');
    const profiles = db.collection('profiles');

    const views = await profileViews.find({ targetUid: uid })
      .sort({ timestamp: -1 })
      .limit(20)
      .toArray();

    if (views.length === 0) return res.json([]);

    const viewerUids = views.map(v => v.viewerUid);
    const viewerProfiles = await profiles.find({ uid: { $in: viewerUids } })
      .project({ uid: 1, displayName: 1, photoURL: 1 })
      .toArray();

    const result = views.map(v => {
      const profile = viewerProfiles.find(p => p.uid === v.viewerUid);
      return profile ? { ...profile, viewedAt: v.timestamp } : null;
    }).filter(p => p !== null);

    res.json(result);
  } catch (error) {
    console.error("Get views error:", error);
    res.status(500).json({ error: "Failed to fetch profile views" });
  }
});

// Default route to check server status
app.get('/', (req, res) => {
  res.send(`Orbyt API Running. DB Connected: ${!!db}`);
});

// Manual Cleanup Trigger
app.post('/api/cleanup', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  await cleanupOrphanedData();
  res.json({ success: true, message: "Database cleanup completed" });
});

// App Version Configuration
const APP_CONFIG = {
  minAppVersion: "1.0.1",
  updateUrl: "https://my-app-downloads.s3.ap-south-1.amazonaws.com/app-release.apk" // Placeholder Play Store link
};

app.get('/api/config/version', (req, res) => {
  res.json(APP_CONFIG);
});

app.post('/api/push/subscribe', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { uid, subscription } = req.body;
    if (!uid || !subscription) return res.status(400).json({ error: "Missing uid or subscription object" });

    const profiles = db.collection('profiles');
    await profiles.updateOne(
      { uid },
      { $set: { pushSubscription: subscription } }
    );
    res.json({ success: true, message: "Push subscription saved" });
  } catch (error) {
    console.error("Save subscription error:", error);
    res.status(500).json({ error: "Failed to save push subscription" });
  }
});

app.post('/api/auth/signup', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { email, password } = req.body;
    const users = db.collection('users');
    const profiles = db.collection('profiles');

    const existing = await users.findOne({ email });
    if (existing) return res.status(400).json({ error: "Email already in use" });

    const newUser = { email, password, createdAt: new Date() };
    const result = await users.insertOne(newUser);
    const uid = result.insertedId.toString();

    await profiles.insertOne({
      uid,
      email,
      displayName: email.split('@')[0],
      photoURL: "",
      interests: [],
      blockedUsers: [],
      passedUsers: [],
      isDiscoverable: true,
      discoveryRadius: 10,
      createdAt: Date.now()
    });

    res.json({ user: { uid, email } });
  } catch (error) {
    res.status(500).json({ error: "Signup failed" });
  }
});

app.post('/api/auth/login', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { email, password } = req.body;
    const users = db.collection('users');
    const user = await users.findOne({ email, password });
    if (!user) return res.status(401).json({ error: "Invalid email or password" });
    res.json({ user: { uid: user._id.toString(), email } });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});

app.post('/api/auth/google', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { email, displayName, photoURL } = req.body;
    const users = db.collection('users');
    const profiles = db.collection('profiles');

    let user = await users.findOne({ email });
    let uid;

    if (!user) {
      const newUser = { email, authType: 'google', createdAt: new Date() };
      const result = await users.insertOne(newUser);
      uid = result.insertedId.toString();

      await profiles.insertOne({
        uid,
        email,
        displayName: displayName || email.split('@')[0],
        photoURL: photoURL || "",
        interests: [],
        blockedUsers: [],
        passedUsers: [],
        isDiscoverable: true,
        discoveryRadius: 10,
        createdAt: Date.now()
      });
    } else {
      uid = user._id.toString();
      // Only fill in Google data if the user hasn't already set their own values.
      // This ensures a custom profile picture or display name set via Edit Profile
      // is NEVER overwritten by the Google account data on subsequent logins.
      const existingProfile = await profiles.findOne({ uid });
      const updateFields = {};
      if (!existingProfile?.photoURL && photoURL) {
        updateFields.photoURL = photoURL;
      }
      if (!existingProfile?.displayName && displayName) {
        updateFields.displayName = displayName;
      }
      if (Object.keys(updateFields).length > 0) {
        await profiles.updateOne({ uid }, { $set: updateFields });
      }
    }
    res.json({ user: { uid, email } });
  } catch (error) {
    res.status(500).json({ error: "Google login failed" });
  }
});

app.get('/api/profile/:uid', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const profiles = db.collection('profiles');
    const profile = await profiles.findOne({ uid: req.params.uid });
    res.json(profile || null);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

app.delete('/api/profile/:uid', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { uid } = req.params;

    await db.collection('profiles').deleteOne({ uid });
    if (ObjectId.isValid(uid)) {
      await db.collection('users').deleteOne({ _id: new ObjectId(uid) });
    }
    await db.collection('posts').deleteMany({ authorId: uid });
    await db.collection('messages').deleteMany({ $or: [{ senderId: uid }, { receiverId: uid }] });
    await db.collection('notifications').deleteMany({ $or: [{ recipientUid: uid }, { senderUid: uid }] });

    await db.collection('profiles').updateMany({}, {
      $pull: { friends: uid, incomingRequests: uid, outgoingRequests: uid, blockedUsers: uid }
    });

    res.json({ success: true, message: "Account deleted successfully" });
  } catch (error) {
    console.error("Delete account error:", error);
    res.status(500).json({ error: "Failed to delete account" });
  }
});

app.get('/api/profiles', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    let { viewerUid } = req.query;
    // Fix: Handle 'undefined' or 'null' passed as strings
    if (viewerUid === 'undefined' || viewerUid === 'null') viewerUid = undefined;

    const profiles = db.collection('profiles');
    let filter = {
      lastLocation: { $exists: true, $ne: null },
      isDiscoverable: { $ne: false } // Only show discoverable users
    };
    if (viewerUid) {
      const excludedUids = await getMutualBlockedUids(viewerUid);
      if (excludedUids.length > 0) {
        filter.uid = { $nin: excludedUids };
      }
    }
    const users = await profiles.find(filter).project({
      uid: 1, displayName: 1, photoURL: 1, lastLocation: 1,
      interests: 1, bio: 1, instagramHandle: 1, friends: 1
    }).limit(100).toArray();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch profiles" });
  }
});

app.post('/api/profiles/batch', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { uids } = req.body;
    if (!Array.isArray(uids) || uids.length === 0) return res.json([]);
    const profiles = db.collection('profiles');
    const users = await profiles.find({ uid: { $in: uids } }).project({
      uid: 1, displayName: 1, photoURL: 1, bio: 1
    }).toArray();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch batch profiles" });
  }
});

app.post('/api/profile/:uid', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { uid } = req.params;
    const data = req.body;
    const profiles = db.collection('profiles');

    // Server-side 18+ validation
    if (data.dob) {
      const age = calculateAge(data.dob);
      if (age < 18) {
        return res.status(400).json({ error: "You must be at least 18 years old." });
      }
    }

    // 1. Update Profile
    const updateFields = { ...data, uid, updatedAt: new Date() };
    const updateDoc = { $set: updateFields };

    await profiles.updateOne({ uid }, updateDoc, { upsert: true });

    // 2. Propagate updates to related collections (Posts, Comments, Messages, Notifications)
    // This ensures that old posts/comments reflect the new username/photo
    if (data.displayName || data.photoURL !== undefined) {
      const posts = db.collection('posts');
      const messages = db.collection('messages');
      const notifications = db.collection('notifications');

      const updates = {};
      const commentUpdates = {};
      const notifUpdates = {};

      if (data.displayName) {
        updates.authorName = data.displayName;
        commentUpdates["comments.$[elem].authorName"] = data.displayName;
        notifUpdates.fromName = data.displayName;
      }
      if (data.photoURL !== undefined) {
        updates.authorPhoto = data.photoURL;
        commentUpdates["comments.$[elem].authorPhoto"] = data.photoURL;
        notifUpdates.fromPhoto = data.photoURL;
      }

      // Update Posts (where user is author)
      if (Object.keys(updates).length > 0) {
        await posts.updateMany({ uid }, { $set: updates });
      }

      // Update Comments (where user is author)
      if (Object.keys(commentUpdates).length > 0) {
        await posts.updateMany(
          { "comments.uid": uid },
          { $set: commentUpdates },
          { arrayFilters: [{ "elem.uid": uid }] }
        );
      }

      // Update Messages (where user is sender)
      if (Object.keys(updates).length > 0) {
        await messages.updateMany({ fromUid: uid }, { $set: updates });
      }

      // Update Notifications (where user is sender)
      if (Object.keys(notifUpdates).length > 0) {
        await notifications.updateMany({ fromUid: uid }, { $set: notifUpdates });
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Profile update error", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// ... (rest of file remains unchanged)
app.post('/api/user/block', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { uid, targetUid } = req.body;
    const profiles = db.collection('profiles');
    await profiles.updateOne({ uid: uid }, { $addToSet: { blockedUsers: targetUid } });
    await profiles.updateOne({ uid: uid }, {
      $pull: { friends: targetUid, incomingRequests: targetUid, outgoingRequests: targetUid },
      $unset: { [`friendRequestMessages.${targetUid}`]: "" }
    });
    await profiles.updateOne({ uid: targetUid }, {
      $pull: { friends: uid, incomingRequests: uid, outgoingRequests: uid },
      $unset: { [`friendRequestMessages.${uid}`]: "" }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to block user" });
  }
});

app.post('/api/user/unblock', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { uid, targetUid } = req.body;
    const profiles = db.collection('profiles');
    await profiles.updateOne({ uid: uid }, { $pull: { blockedUsers: targetUid } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to unblock user" });
  }
});

app.post('/api/user/pass', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { uid, targetUid } = req.body;
    if (!uid || !targetUid) return res.status(400).json({ error: "Missing uid or targetUid" });
    const profiles = db.collection('profiles');
    await profiles.updateOne({ uid: uid }, { $addToSet: { passedUsers: targetUid } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to pass user" });
  }
});

app.post('/api/report', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { reporterUid, targetUid, reason, postId } = req.body;
    const reports = db.collection('reports');
    await reports.insertOne({
      reporterUid, targetUid, reason, postId: postId || null,
      createdAt: Date.now(), status: 'pending'
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to submit report" });
  }
});

app.post('/api/friends/request', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { fromUid, toUid, message } = req.body;
    const profiles = db.collection('profiles');
    await profiles.updateOne({ uid: fromUid }, { $addToSet: { outgoingRequests: toUid } });
    const updateDoc = { $addToSet: { incomingRequests: fromUid } };
    if (message) updateDoc.$set = { [`friendRequestMessages.${fromUid}`]: message };
    await profiles.updateOne({ uid: toUid }, updateDoc);
    await createNotification('friend_request', fromUid, toUid);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to send request" });
  }
});

app.post('/api/friends/accept', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { userUid, requesterUid } = req.body;
    const profiles = db.collection('profiles');
    await profiles.updateOne({ uid: userUid }, {
      $pull: { incomingRequests: requesterUid },
      $addToSet: { friends: requesterUid },
      $unset: { [`friendRequestMessages.${requesterUid}`]: "" }
    });
    await profiles.updateOne({ uid: requesterUid }, {
      $pull: { outgoingRequests: userUid },
      $addToSet: { friends: userUid }
    });
    await createNotification('friend_accept', userUid, requesterUid);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to accept request" });
  }
});

app.post('/api/friends/reject', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { userUid, requesterUid } = req.body;
    const profiles = db.collection('profiles');
    await profiles.updateOne({ uid: userUid }, {
      $pull: { incomingRequests: requesterUid },
      $unset: { [`friendRequestMessages.${requesterUid}`]: "" }
    });
    await profiles.updateOne({ uid: requesterUid }, { $pull: { outgoingRequests: userUid } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to reject request" });
  }
});

app.post('/api/friends/remove', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { uid1, uid2 } = req.body;
    const profiles = db.collection('profiles');
    await profiles.updateOne({ uid: uid1 }, { $pull: { friends: uid2 } });
    await profiles.updateOne({ uid: uid2 }, { $pull: { friends: uid1 } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to remove friend" });
  }
});

app.post('/api/posts', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const postData = req.body;
    const posts = db.collection('posts');

    const result = await posts.insertOne({
      ...postData,
      likes: 0, likedBy: [], comments: [],
      attendees: [], pendingRequests: [],
      createdAt: Date.now()
    });
    res.json({ success: true, id: result.insertedId });
  } catch (error) {
    res.status(500).json({ error: "Failed to create post" });
  }
});

app.get('/api/posts', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    let { viewerUid } = req.query;
    // Fix: Handle 'undefined' or 'null' passed as strings
    if (viewerUid === 'undefined' || viewerUid === 'null') viewerUid = undefined;

    const posts = db.collection('posts');
    let filter = {};
    if (viewerUid) {
      const excludedUids = await getMutualBlockedUids(viewerUid);
      if (excludedUids.length > 0) filter.uid = { $nin: excludedUids };
    }
    const allPosts = await posts.find(filter).sort({ createdAt: -1 }).limit(50).toArray();
    res.json(allPosts);
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

app.get('/api/posts/user/:uid', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const posts = db.collection('posts');
    const userPosts = await posts.find({ uid: req.params.uid }).sort({ createdAt: -1 }).toArray();
    res.json(userPosts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user posts" });
  }
});

app.get('/api/posts/:id', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const postId = req.params.id;


    if (!ObjectId.isValid(postId)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const posts = db.collection('posts');
    const post = await posts.findOne({ _id: new ObjectId(postId) });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json(post);
  } catch (error) {
    console.error("Error fetching post:", error);
    res.status(500).json({ error: "Failed to fetch post" });
  }
});

app.put('/api/posts/:id', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const postId = req.params.id;
    const { uid, content, imageURL } = req.body;
    if (!ObjectId.isValid(postId)) return res.status(400).json({ error: "Invalid ID" });
    const posts = db.collection('posts');
    const post = await posts.findOne({ _id: new ObjectId(postId) });
    if (!post) return res.status(404).json({ error: "Post not found" });
    if (post.uid !== uid) return res.status(403).json({ error: "Unauthorized" });
    await posts.updateOne({ _id: new ObjectId(postId) }, { $set: { content, imageURL, updatedAt: Date.now() } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update post" });
  }
});

app.delete('/api/posts/:id', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const postId = req.params.id;
    const { uid } = req.body;
    if (!ObjectId.isValid(postId)) return res.status(400).json({ error: "Invalid ID" });
    const posts = db.collection('posts');
    const post = await posts.findOne({ _id: new ObjectId(postId) });
    if (!post) return res.status(404).json({ error: "Post not found" });
    if (post.uid !== uid) return res.status(403).json({ error: "Unauthorized" });
    await posts.deleteOne({ _id: new ObjectId(postId) });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete post" });
  }
});

app.post('/api/posts/:id/like', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const postId = req.params.id;
    const { uid } = req.body;
    if (!ObjectId.isValid(postId)) return res.status(400).json({ error: "Invalid Post ID" });
    const posts = db.collection('posts');
    const post = await posts.findOne({ _id: new ObjectId(postId) });
    if (!post) return res.status(404).json({ error: "Post not found" });
    const likedBy = post.likedBy || [];
    const isLiked = likedBy.includes(uid);
    let update = isLiked ? { $pull: { likedBy: uid }, $inc: { likes: -1 } } : { $addToSet: { likedBy: uid }, $inc: { likes: 1 } };
    await posts.updateOne({ _id: new ObjectId(postId) }, update);
    const updatedPost = await posts.findOne({ _id: new ObjectId(postId) });
    if (!isLiked && post.uid !== uid) await createNotification('like', uid, post.uid, postId);
    res.json({ likes: updatedPost.likes, likedBy: updatedPost.likedBy || [] });
  } catch (error) {
    res.status(500).json({ error: "Failed to toggle like" });
  }
});

app.post('/api/posts/:id/comment', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const postId = req.params.id;
    const { uid, text } = req.body;
    if (!ObjectId.isValid(postId)) return res.status(400).json({ error: "Invalid Post ID" });
    const profiles = db.collection('profiles');
    const userProfile = await profiles.findOne({ uid });
    const newComment = {
      id: new ObjectId(), uid, authorName: userProfile?.displayName || "User",
      authorPhoto: userProfile?.photoURL || "", text, createdAt: Date.now()
    };
    const posts = db.collection('posts');
    await posts.updateOne({ _id: new ObjectId(postId) }, { $push: { comments: newComment } });
    const post = await posts.findOne({ _id: new ObjectId(postId) });
    if (post && post.uid !== uid) await createNotification('comment', uid, post.uid, postId);
    res.json(newComment);
  } catch (error) {
    res.status(500).json({ error: "Failed to add comment" });
  }
});

// --- MEETUP ACTIONS ---

app.post('/api/meetups/:id/join', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const postId = req.params.id;
    const { uid } = req.body;
    if (!ObjectId.isValid(postId)) return res.status(400).json({ error: "Invalid ID" });
    const posts = db.collection('posts');
    const post = await posts.findOne({ _id: new ObjectId(postId) });
    if (!post) return res.status(404).json({ error: "Meetup not found" });
    await posts.updateOne({ _id: new ObjectId(postId) }, { $addToSet: { pendingRequests: uid } });
    await createNotification('meetup_request', uid, post.uid, postId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to join meetup" });
  }
});

app.post('/api/meetups/:id/accept', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const postId = req.params.id;
    const { hostUid, requesterUid } = req.body;
    if (!ObjectId.isValid(postId)) return res.status(400).json({ error: "Invalid ID" });
    const posts = db.collection('posts');
    const post = await posts.findOne({ _id: new ObjectId(postId) });
    if (!post) return res.status(404).json({ error: "Meetup not found" });
    if (post.uid !== hostUid) return res.status(403).json({ error: "Unauthorized" });
    await posts.updateOne({ _id: new ObjectId(postId) }, {
      $pull: { pendingRequests: requesterUid },
      $addToSet: { attendees: requesterUid }
    });
    await createNotification('meetup_accept', hostUid, requesterUid, postId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to accept request" });
  }
});

app.post('/api/meetups/:id/reject', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const postId = req.params.id;
    const { hostUid, requesterUid } = req.body;
    if (!ObjectId.isValid(postId)) return res.status(400).json({ error: "Invalid ID" });
    const posts = db.collection('posts');
    const post = await posts.findOne({ _id: new ObjectId(postId) });
    if (!post) return res.status(404).json({ error: "Meetup not found" });
    if (post.uid !== hostUid) return res.status(403).json({ error: "Unauthorized" });
    await posts.updateOne({ _id: new ObjectId(postId) }, { $pull: { pendingRequests: requesterUid } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to reject request" });
  }
});

app.post('/api/meetups/:id/remove-attendee', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const postId = req.params.id;
    const { hostUid, targetUid } = req.body;
    if (!ObjectId.isValid(postId)) return res.status(400).json({ error: "Invalid ID" });
    const posts = db.collection('posts');
    const post = await posts.findOne({ _id: new ObjectId(postId) });
    if (!post) return res.status(404).json({ error: "Meetup not found" });
    if (post.uid !== hostUid) return res.status(403).json({ error: "Unauthorized" });

    await posts.updateOne({ _id: new ObjectId(postId) }, {
      $pull: { attendees: targetUid }
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to remove attendee" });
  }
});

app.get('/api/notifications/:uid', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const notifications = db.collection('notifications');
    const list = await notifications.find({ toUid: req.params.uid }).sort({ createdAt: -1 }).limit(50).toArray();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

app.post('/api/notifications/mark-read', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { notificationIds } = req.body;
    const notifications = db.collection('notifications');
    const ids = notificationIds.map(id => new ObjectId(id));
    await notifications.updateMany({ _id: { $in: ids } }, { $set: { read: true } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to mark read" });
  }
});

app.post('/api/notifications/mark-all-read', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: "Missing uid" });
    const notifications = db.collection('notifications');
    await notifications.updateMany({ toUid: uid, read: false }, { $set: { read: true } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to mark all read" });
  }
});

app.get('/api/notifications/unread-count/:uid', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const notifications = db.collection('notifications');
    const count = await notifications.countDocuments({ toUid: req.params.uid, read: false });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch unread count" });
  }
});

// --- HELPER: Send Push Notification (Expo & Web) ---
async function sendPushNotification(receiverUid, payloadStr, expoPayload) {
  if (!db) return;
  try {
    const profiles = db.collection('profiles');
    const receiver = await profiles.findOne({ uid: receiverUid });
    if (!receiver || !receiver.pushSubscription) return;

    if (typeof receiver.pushSubscription === 'string' && Expo.isExpoPushToken(receiver.pushSubscription)) {
      try {
        // Calculate total unread count for the badge
        const [msgCount, notifCount] = await Promise.all([
          db.collection('messages').countDocuments({ toUid: receiverUid, read: false }),
          db.collection('notifications').countDocuments({ toUid: receiverUid, read: false })
        ]);
        const totalBadge = msgCount + notifCount;

        await expo.sendPushNotificationsAsync([{
          to: receiver.pushSubscription,
          sound: 'default',
          priority: 'high',
          channelId: 'default',
          badge: totalBadge,
          ttl: 2419200, // 4 weeks
          _displayInForeground: true, // For certain versions of expo-notifications
          ...expoPayload
        }]);
      } catch (err) {
        console.error("Expo Push Notification failed:", err);
      }
    } else {
      try {
        await webpush.sendNotification(receiver.pushSubscription, payloadStr);
      } catch (err) {
        console.error("Web Push Notification failed:", err);
        if (err.statusCode === 410 || err.statusCode === 404) {
          await profiles.updateOne({ uid: receiverUid }, { $unset: { pushSubscription: "" } });
        }
      }
    }
  } catch (e) {
    console.error("Error in sendPushNotification helper", e);
  }
}

app.post('/api/chat/send', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { fromUid, toUid, groupId, text, mediaType, mediaUrl } = req.body;
    const messages = db.collection('messages');
    const profiles = db.collection('profiles');
    const sender = await profiles.findOne({ uid: fromUid });
    const authorName = sender?.displayName || "User";
    const authorPhoto = sender?.photoURL || "";
    
    let displayBody = text || "";
    if (!displayBody && mediaType) {
      if (mediaType === 'image') displayBody = "sent a photo";
      else if (mediaType === 'emoji') displayBody = "sent a big emoji";
      else if (mediaType === 'audio') displayBody = "sent a voice note";
    }

    let newMessage = { fromUid, text, read: false, createdAt: Date.now(), authorName, authorPhoto, mediaType, mediaUrl };

    if (groupId) {
      const posts = db.collection('posts');
      const post = await posts.findOne({ _id: new ObjectId(groupId) });
      if (!post) return res.status(404).json({ error: "Group not found" });

      // Authorization check
      const isHost = post.uid === fromUid;
      const isAttendee = post.attendees && post.attendees.includes(fromUid);
      if (!isHost && !isAttendee) {
        return res.status(403).json({ error: "You are not a member of this group" });
      }

      const groupTitle = post.meetupDetails?.title || "Meetup Group";
      newMessage.groupId = String(groupId); // Force string for consistency
      newMessage.groupTitle = groupTitle;

      const result = await messages.insertOne(newMessage);
      const fullMessage = { ...newMessage, _id: result.insertedId };
      const recipients = new Set([...(post.attendees || []), post.uid]);

      // Dispatch WebSockets & Push
      const expoPayload = { title: groupTitle, body: `${authorName}: ${displayBody}`, data: { url: `/chat/group/${groupId}` } };
      const webPayloadStr = JSON.stringify({ title: groupTitle, body: `${authorName}: ${displayBody}`, icon: authorPhoto || "/pwa-192x192.png", data: { url: `/chat/group/${groupId}` } });

      recipients.forEach(uid => {
        sendToUser(uid, fullMessage);
        if (uid !== fromUid) sendPushNotification(uid, webPayloadStr, expoPayload);
      });

      return res.json(fullMessage);
    } else {
      newMessage.toUid = toUid;
      const result = await messages.insertOne(newMessage);
      const fullMessage = { ...newMessage, _id: result.insertedId };

      sendToUser(toUid, fullMessage);
      sendToUser(fromUid, fullMessage);

      // Dispatch Push to receiver
      const expoPayload = { title: authorName, body: displayBody, data: { url: `/chat/${fromUid}` } };
      const webPayloadStr = JSON.stringify({ title: authorName, body: displayBody, icon: authorPhoto || "/pwa-192x192.png", data: { url: `/chat/${fromUid}` } });
      sendPushNotification(toUid, webPayloadStr, expoPayload);

      return res.json(fullMessage);
    }
  } catch (error) {
    console.error("Chat Send Error:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

app.get('/api/chat/history/:uid1/:uid2', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { uid1, uid2 } = req.params;
    const messages = db.collection('messages');
    const history = await messages.find({
      $or: [{ fromUid: uid1, toUid: uid2 }, { fromUid: uid2, toUid: uid1 }]
    }).sort({ createdAt: 1 }).toArray();
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

app.get('/api/chat/history/:groupId', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { groupId } = req.params;
    const messages = db.collection('messages');

    // Support both string and ObjectId storage for robustness
    let query = { groupId: String(groupId) };
    if (ObjectId.isValid(groupId)) {
      query = {
        $or: [
          { groupId: String(groupId) },
          { groupId: new ObjectId(groupId) }
        ]
      };
    }

    const history = await messages.find(query).sort({ createdAt: 1 }).toArray();
    res.json(history);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch group history" });
  }
});

app.get('/api/chat/inbox/:uid', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { uid } = req.params;
    const messages = db.collection('messages');

    // 1. Direct Messages
    const directPipeline = [
      { $match: { groupId: { $exists: false }, $or: [{ fromUid: uid }, { toUid: uid }] } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: { $cond: [{ $eq: ["$fromUid", uid] }, "$toUid", "$fromUid"] },
          lastMessage: { $first: "$$ROOT" },
          unreadCount: { $sum: { $cond: [{ $and: [{ $eq: ["$toUid", uid] }, { $eq: ["$read", false] }] }, 1, 0] } }
        }
      },
      { $lookup: { from: "profiles", localField: "_id", foreignField: "uid", as: "otherUser" } },
      { $unwind: "$otherUser" },
      { $project: { _id: 0, type: "direct", partner: "$otherUser", lastMessage: 1, unreadCount: 1 } }
    ];

    // 2. Group Chats (Meetups) - Fetch all active meetups user is part of
    const posts = db.collection('posts');
    const userGroups = await posts.find({
      $or: [{ uid: uid }, { attendees: uid }],
      type: 'meetup'
    }).project({ _id: 1, meetupDetails: 1, createdAt: 1 }).toArray();

    const groupIds = userGroups.map(g => g._id.toString());
    const groupObjectIds = userGroups.map(g => g._id);

    // Get actual last messages for these groups, robust against ID type
    const groupPipeline = [
      {
        $match: {
          $or: [
            { groupId: { $in: groupIds } },
            { groupId: { $in: groupObjectIds } }
          ]
        }
      },
      { $sort: { createdAt: -1 } },
      // Normalize groupId to string for grouping to avoid duplicate entries for same group
      { $group: { _id: { $toString: "$groupId" }, lastMessage: { $first: "$$ROOT" } } }
    ];

    const [directChats, groupMessages] = await Promise.all([
      messages.aggregate(directPipeline).toArray(),
      messages.aggregate(groupPipeline).toArray()
    ]);

    // Map existing messages
    const groupMsgMap = {};
    groupMessages.forEach(g => {
      groupMsgMap[g._id] = g.lastMessage;
    });

    // Construct persistent group chat items
    const groupChats = userGroups.map(g => {
      const gid = g._id.toString();
      const existingMsg = groupMsgMap[gid];

      let lastMessage;
      if (existingMsg) {
        lastMessage = existingMsg;
        // Ensure title is up to date from post details
        lastMessage.groupTitle = g.meetupDetails?.title;
      } else {
        // Synthetic message for empty groups
        lastMessage = {
          _id: 'synthetic_' + gid,
          fromUid: 'system',
          text: 'Meetup created',
          createdAt: g.createdAt,
          groupTitle: g.meetupDetails?.title,
          read: true
        };
      }

      return {
        type: 'group',
        groupId: gid,
        lastMessage: lastMessage,
        unreadCount: 0 // Future: implement group read receipts
      };
    });

    // Combine and sort by latest activity
    const allChats = [...directChats, ...groupChats].sort((a, b) => b.lastMessage.createdAt - a.lastMessage.createdAt);

    res.json(allChats);
  } catch (error) {
    console.error("Inbox Error", error);
    res.status(500).json({ error: "Failed to fetch inbox" });
  }
});

app.post('/api/chat/mark-read', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { myUid, partnerUid, groupId } = req.body;
    const messages = db.collection('messages');
    if (!groupId) {
      await messages.updateMany({ toUid: myUid, fromUid: partnerUid, read: false }, { $set: { read: true } });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to mark messages as read" });
  }
});

app.get('/api/chat/unread-count/:uid', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { uid } = req.params;
    const messages = db.collection('messages');
    const count = await messages.countDocuments({ toUid: uid, read: false });
    res.json({ count });
  } catch (e) {
    res.status(500).json({ error: "Failed to get unread count" });
  }
});

// =====================
// STORIES (MOMENTS)
// =====================
app.post('/api/stories', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { uid, authorName, authorPhoto, imageURL, location } = req.body;
    if (!uid || !imageURL) return res.status(400).json({ error: "Missing required fields" });

    const newStory = {
      uid,
      authorName,
      authorPhoto,
      imageURL,
      location, // { lat, lng, name }
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      views: [] // Track uids of viewers
    };

    const result = await db.collection('stories').insertOne(newStory);
    res.json({ ...newStory, _id: result.insertedId });
  } catch (error) {
    console.error("Create Story Error:", error);
    res.status(500).json({ error: "Failed to create story" });
  }
});

app.get('/api/stories', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { viewerUid } = req.query;
    const profile = viewerUid ? await db.collection('profiles').findOne({ uid: viewerUid }) : null;
    const myLocation = profile?.lastLocation;
    const radius = profile?.discoveryRadius || 10; // km

    const now = Date.now();
    const query = { expiresAt: { $gt: now } };

    const stories = await db.collection('stories').find(query).sort({ createdAt: -1 }).toArray();

    // Group by User
    const groupedStories = stories.reduce((acc, story) => {
      // Geo-filtering
      if (myLocation && story.location && story.uid !== viewerUid) {
        const R = 6371; // km
        const dLat = (story.location.lat - myLocation.lat) * Math.PI / 180;
        const dLon = (story.location.lng - myLocation.lng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(myLocation.lat * Math.PI / 180) * Math.cos(story.location.lat * Math.PI / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const dist = R * c;
        if (dist > radius) return acc;
      }

      if (!acc[story.uid]) {
        acc[story.uid] = {
          uid: story.uid,
          authorName: story.authorName,
          authorPhoto: story.authorPhoto,
          stories: []
        };
      }
      acc[story.uid].stories.push(story);
      return acc;
    }, {});

    res.json(Object.values(groupedStories));
  } catch (error) {
    console.error("Get Stories Error:", error);
    res.status(500).json({ error: "Failed to fetch stories" });
  }
});

app.post('/api/stories/:storyId/view', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { storyId } = req.params;
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: "Missing uid" });

    await db.collection('stories').updateOne(
      { _id: new ObjectId(storyId) },
      { $addToSet: { views: uid } }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to record view" });
  }
});

app.delete('/api/stories/:storyId', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { storyId } = req.params;
    const { uid } = req.body; // Owner UID for verification

    const result = await db.collection('stories').deleteOne({
      _id: new ObjectId(storyId),
      uid: uid
    });

    if (result.deletedCount === 1) {
      res.json({ success: true });
    } else {
      res.status(403).json({ error: "Story not found or unauthorized" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to delete story" });
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Server + WebSocket running on port ${port}`);
});

