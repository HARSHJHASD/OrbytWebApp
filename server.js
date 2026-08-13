import bcrypt from "bcrypt";
import cors from "cors";
import dotenv from "dotenv";
import { Expo } from "expo-server-sdk";
import express from "express";
import rateLimit from "express-rate-limit";
import http from "http";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import path from "path";
import { fileURLToPath } from "url";
import webpush from "web-push";
import WebSocket, { WebSocketServer } from "ws";
import { z } from "zod";

const expo = new Expo();

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// --- Web Push Configuration ---
const publicVapidKey = process.env.VITE_VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;
const vapidEmail = process.env.VAPID_EMAIL || "orbytapp@gmail.com";
webpush.setVapidDetails(vapidEmail, publicVapidKey, privateVapidKey);
//this is for hosting frontend in render
app.use(express.static(path.join(__dirname, "dist")));
// SPA catch-all: serve index.html for any non-API route so React Router (HashRouter) handles it
app.get(/^\/(?!api\/).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// Smart deep-link page: tries to open native app, falls back to store download
app.get("/post/:id", (req, res) => {
  const postId = req.params.id;
  const deepLink = `orbyt://post/${postId}`;
  const playStoreUrl =
    "https://play.google.com/store/apps/details?id=com.orbyt.official.app";
  const appStoreUrl = "https://apps.apple.com/app/orbyt/id6740371671";

  res.setHeader("Content-Type", "text/html");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
  <title>Open in Orbyt</title>
  <meta name="description" content="View this post on Orbyt — the social app for real connections nearby." />
  <meta property="og:title" content="Open in Orbyt" />
  <meta property="og:description" content="View this post on Orbyt — the social app for real connections nearby." />
  <meta property="og:type" content="website" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #030B18;
      color: #F0F4FF;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      text-align: center;
    }
    .logo {
      width: 80px;
      height: 80px;
      border-radius: 22px;
      background: linear-gradient(135deg, #6C63FF 0%, #4ECDC4 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 38px;
      font-weight: 900;
      color: #fff;
      margin-bottom: 20px;
      box-shadow: 0 8px 32px rgba(108, 99, 255, 0.4);
    }
    h1 { font-size: 26px; font-weight: 800; margin-bottom: 8px; }
    .subtitle { color: #8899BB; font-size: 15px; line-height: 1.5; margin-bottom: 36px; max-width: 320px; }
    .card {
      background: #0D1B2E;
      border: 1px solid #1E3050;
      border-radius: 20px;
      padding: 28px 24px;
      width: 100%;
      max-width: 380px;
    }
    .open-btn {
      display: block;
      width: 100%;
      background: linear-gradient(135deg, #6C63FF 0%, #4ECDC4 100%);
      color: #fff;
      font-size: 17px;
      font-weight: 700;
      padding: 16px;
      border-radius: 14px;
      border: none;
      cursor: pointer;
      text-decoration: none;
      margin-bottom: 12px;
      letter-spacing: 0.2px;
      transition: opacity 0.2s;
    }
    .open-btn:hover { opacity: 0.88; }
    .divider { color: #3A4F6E; font-size: 13px; margin: 16px 0; }
    .store-row { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
    .store-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #162030;
      border: 1px solid #1E3050;
      color: #C8D8F0;
      font-size: 14px;
      font-weight: 600;
      padding: 12px 18px;
      border-radius: 12px;
      text-decoration: none;
      cursor: pointer;
      transition: background 0.2s, border-color 0.2s;
    }
    .store-btn:hover { background: #1E3050; border-color: #6C63FF; }
    .store-icon { font-size: 22px; line-height: 1; }
    .status-msg {
      font-size: 13px;
      color: #8899BB;
      margin-top: 18px;
      min-height: 18px;
    }
    .desktop-note {
      display: none;
      margin-top: 24px;
      color: #556B8C;
      font-size: 13px;
    }
    @media (min-width: 768px) {
      .desktop-note { display: block; }
    }
  </style>
</head>
<body>
  <div class="logo">O</div>
  <h1>Open in Orbyt</h1>
  <p class="subtitle">Someone shared a post with you. Get the app to view it and connect with people nearby.</p>

  <div class="card">
    <a id="openAppBtn" href="${deepLink}" class="open-btn">Open in Orbyt App</a>

    <div class="divider">— Don't have the app? —</div>

    <div class="store-row">
      <a id="androidBtn" href="${playStoreUrl}" class="store-btn" target="_blank" rel="noopener noreferrer">
        <span class="store-icon">▶</span>
        <div><div style="font-size:11px;color:#8899BB;font-weight:500">GET IT ON</div>Google Play</div>
      </a>
      <a id="iosBtn" href="${appStoreUrl}" class="store-btn" target="_blank" rel="noopener noreferrer">
        <span class="store-icon">&#63743;</span>
        <div><div style="font-size:11px;color:#8899BB;font-weight:500">Download on the</div>App Store</div>
      </a>
    </div>

    <p class="status-msg" id="statusMsg"></p>
  </div>

  <p class="desktop-note">Orbyt is a mobile-only app. Scan the QR code or open this link on your phone.</p>

  <script>
    (function () {
      const ua = navigator.userAgent || '';
      const isAndroid = /android/i.test(ua);
      const isIOS = /iphone|ipad|ipod/i.test(ua);
      const playStoreUrl = "${playStoreUrl}";
      const appStoreUrl = "${appStoreUrl}";
      const deepLink = "${deepLink}";
      const statusEl = document.getElementById('statusMsg');

      function tryOpenApp() {
        // Try to open the app via custom scheme
        let didOpenApp = false;
        const start = Date.now();

        window.location.href = deepLink;

        // After a short delay, check if the page is still visible (app didn't open)
        setTimeout(function () {
          if (document.hidden || Date.now() - start > 2500) return;
          // Still here — app not installed, redirect to store
          if (isAndroid) {
            statusEl.textContent = 'Redirecting to Google Play…';
            window.location.href = playStoreUrl;
          } else if (isIOS) {
            statusEl.textContent = 'Redirecting to the App Store…';
            window.location.href = appStoreUrl;
          } else {
            statusEl.textContent = 'Orbyt is available on Android and iOS.';
          }
        }, 1800);
      }

      // Auto-try on mobile only
      if (isAndroid || isIOS) {
        statusEl.textContent = 'Opening Orbyt…';
        tryOpenApp();
      }

      // Manual button — always try deep link first
      document.getElementById('openAppBtn').addEventListener('click', function (e) {
        e.preventDefault();
        statusEl.textContent = 'Opening Orbyt…';
        tryOpenApp();
      });
    })();
  </script>
</body>
</html>`);
});

const port = process.env.PORT || 5000;
// Create HTTP server wrapping Express
const server = http.createServer(app);

// Initialize WebSocket Server
const wss = new WebSocketServer({ server });

// Enable CORS - FIXED: Only allow specific domains
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5000",
  "https://backend.strangerchat.space",
  "https://orbyt.strangerchat.space",
  "https://sociall-sigma.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

// Rate Limiting - Prevent brute force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: "Too many authentication attempts, please try again later",
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: "Too many requests, please try again later",
});

const mapProfilesLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // map refresh abuse guard
  message: "Too many map refresh requests, please try again shortly",
});

app.use("/api/", apiLimiter);

// --- AUDIT LOGGING MIDDLEWARE ---
const auditLogs = [];
function createAuditLog(req, res, next) {
  const startTime = Date.now();
  const originalJson = res.json;

  res.json = function (data) {
    const duration = Date.now() - startTime;
    const logEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      path: req.path,
      uid: req.body?.uid || req.query?.uid || req.params?.uid || "anonymous",
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    };

    // Log to console for real-time monitoring
    if (res.statusCode >= 400) {
      console.warn(
        `[AUDIT] ${res.statusCode} ${req.method} ${req.path} - UID: ${logEntry.uid} - ${duration}ms`,
      );
    } else {
      console.log(
        `[AUDIT] ${res.statusCode} ${req.method} ${req.path} - UID: ${logEntry.uid} - ${duration}ms`,
      );
    }

    // Keep last 1000 logs in memory for debugging
    auditLogs.push(logEntry);
    if (auditLogs.length > 1000) auditLogs.shift();

    return originalJson.call(this, data);
  };

  next();
}

app.use(createAuditLog);

// --- AUDIT LOG RETRIEVAL ENDPOINT ---
app.get("/api/admin/audit-logs", requireAdmin, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 200, 1000);
  const logs = [...auditLogs].reverse().slice(0, limit);
  res.json({ logs, total: auditLogs.length });
});

// Input Validation Schemas
const signupSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

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
const BCRYPT_ROUNDS = 10;

// --- WebSocket Logic ---
wss.on("connection", (ws, req) => {
  const urlParams = new URLSearchParams(req.url.split("?")[1]);
  const uid = urlParams.get("uid");

  if (uid) {
    if (!clients.has(uid)) {
      clients.set(uid, new Set());
    }
    clients.get(uid).add(ws);

    // Add cleanup timeout to prevent memory leaks
    let disconnectTimeout = null;

    ws.on("close", () => {
      if (clients.has(uid)) {
        clients.get(uid).delete(ws);
        if (clients.get(uid).size === 0) {
          // Delay cleanup to allow reconnections
          disconnectTimeout = setTimeout(() => {
            if (clients.has(uid) && clients.get(uid).size === 0) {
              clients.delete(uid);
              console.log(`Cleaned up client: ${uid}`);
            }
          }, 30000); // 30 second timeout
        }
      }
    });

    ws.on("error", (error) => {
      console.error(`WebSocket error for user ${uid}:`, error);
      if (disconnectTimeout) clearTimeout(disconnectTimeout);
      // Clean up on error
      if (clients.has(uid)) {
        clients.get(uid).delete(ws);
        if (clients.get(uid).size === 0) {
          clients.delete(uid);
        }
      }
    });

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message);
        if (data.type === "ping") {
          ws.send(JSON.stringify({ type: "pong" }));
        }
      } catch (e) {
        // Ignore
      }
    });
  }
});

function sendToUser(uid, data) {
  if (clients.has(uid)) {
    clients.get(uid).forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }
}

async function createNotification(
  type,
  fromUid,
  toUid,
  postId = null,
  extra = {},
) {
  if (!db || fromUid === toUid) return;
  try {
    const notifications = db.collection("notifications");
    const profiles = db.collection("profiles");
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
      groupId: extra.groupId || null,
      message: extra.message || null,
      read: false,
      createdAt: Date.now(),
    };
    const notifResult = await notifications.insertOne(notifDoc);
    // Push real-time in-app notification over WebSocket
    sendToUser(toUid, {
      type: "notification",
      notification: { ...notifDoc, _id: notifResult.insertedId },
    });

    let title = "New Notification";
    let body = "You have a new notification on Orbyt.";
    const name = sender.displayName;

    switch (type) {
      case "like":
        title = "❤️ New Like!";
        body = `${name} liked your post.`;
        break;
      case "comment":
        title = "💬 New Comment!";
        body = `${name} commented on your post.`;
        break;
      case "friend_request":
        title = "💛 Someone likes you!";
        body = `${name} wants to connect with you.`;
        break;
      case "friend_accept":
        title = "🎉 It's a match!";
        body = `${name} connected with you! You're now connected.`;
        break;
      case "meetup_request":
        title = "🙋 Meetup Request";
        body = `${name} wants to join your meetup. Accept them?`;
        break;
      case "meetup_accept":
        title = "✅ You're in!";
        body = `${name} accepted your request. See you at the meetup!`;
        break;
      case "friend_post":
        title = `📸 ${name} just dropped something!`;
        body = `New post from your connection. Don't miss the vibe 🔥`;
        break;
      case "friend_event":
        title = `🎉 ${name} is planning something fun!`;
        body = extra.eventTitle
          ? `"${extra.eventTitle}" just dropped. Only a few spots left—grab yours! 🏃‍♂️`
          : `A new event just dropped. Only a few spots left—grab yours! 🏃‍♂️`;
        break;
      case "new_event":
        title = `🔥 Hot new event near you!`;
        body = extra.eventTitle
          ? `${name} is hosting "${extra.eventTitle}". Don't sleep on this—filling up fast! ⚡`
          : `${name} just created a new event. Don't sleep on this—filling up fast! ⚡`;
        break;
      case "room_message":
        title = `💬 ${extra.groupTitle || "Room Activity"}`;
        body = `${name}: ${extra.message || "sent a message"}`;
        break;
      case "profile_view":
        const matchPct = extra.matchPct || 0;
        title = "👀 Someone's curious!";
        body = `Someone with ${matchPct}% matching interests opened your profile today.`;
        break;
      case "meetup_reminder":
        const timeLeft = extra.timeLeft || "soon";
        const spotsLeft = extra.spotsLeft !== undefined ? `${extra.spotsLeft} spots left` : "last few spots";
        title = `⏰ ${extra.eventTitle || "Event"} starting soon!`;
        body = `${extra.eventTitle || "Event"} starts in ${timeLeft}. ${spotsLeft}. Grab your spot!`;
        break;
      case "crossed_paths":
        title = "👣 You crossed paths!";
        body = `You just passed someone who also loves ${extra.interestLabel || "the same things"}. Next time, say hello!`;
        break;
      case "vibe_wave":
        title = "⚡️ Vibe Check: Someone's near!";
        body = `${name} sent a wave. Tap to reach back.`;
        break;
      case "vibe_check":
        title = "🔥 Vibe Confirmed!";
        body = `${name} caught your wave. It's a match.`;
        break;
      case "orbit_collision":
        title = "☄️ Orbit Collision Detected";
        body = `You just intersected paths with ${name}!`;
        break;
    }

    const notifUrl = extra.groupId
      ? `/communities/${extra.groupId}`
      : postId
        ? `/post/${postId}`
        : `/profile/${fromUid}`;

    const payload = JSON.stringify({
      title,
      body,
      icon: sender.photoURL || "/pwa-192x192.png",
      data: { url: notifUrl },
    });

    const expoPayload = {
      title,
      body,
      data: { url: notifUrl },
    };

    await sendPushNotification(toUid, payload, expoPayload);
  } catch (e) {
    console.error("Error creating notification", e);
  }
}

// --- AUTHENTICATION MIDDLEWARE ---
function requireAuth(req, res, next) {
  const uid = req.body?.uid || req.query?.uid || req.params?.uid;
  if (!uid) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  // In a real app, verify JWT token here
  next();
}

// --- DATABASE CLEANUP UTILITY ---
async function cleanupOrphanedData() {
  if (!db) return;
  try {
    const users = db.collection("users");
    const profiles = db.collection("profiles");
    const posts = db.collection("posts");
    const messages = db.collection("messages");
    const notifications = db.collection("notifications");

    // 1. Get valid UIDs (convert ObjectIds to strings)
    const allUsers = await users.find({}).project({ _id: 1 }).toArray();
    const validUids = new Set(allUsers.map((u) => u._id.toString()));
    const validUidArray = Array.from(validUids);

    // 2. Delete Orphaned Profiles
    const profRes = await profiles.deleteMany({ uid: { $nin: validUidArray } });

    // 3. Delete Orphaned Posts
    const postRes = await posts.deleteMany({ uid: { $nin: validUidArray } });

    // 4. Delete Orphaned Messages (Invalid sender OR invalid recipient)
    const msgRes = await messages.deleteMany({
      $or: [
        { fromUid: { $nin: validUidArray } },
        { toUid: { $exists: true, $nin: validUidArray } },
      ],
    });

    // 5. Delete Orphaned Notifications
    const notifRes = await notifications.deleteMany({
      $or: [
        { fromUid: { $nin: validUidArray } },
        { toUid: { $nin: validUidArray } },
      ],
    });

    // 6. Clean Arrays (Comments, Likes, Attendees, Friend Lists)

    // Remove comments from deleted users
    await posts.updateMany(
      {},
      { $pull: { comments: { uid: { $nin: validUidArray } } } },
    );

    // Iterate Posts to clean string arrays (likedBy, attendees, etc.)
    const allPosts = await posts.find({}).toArray();
    let postUpdates = 0;
    for (const post of allPosts) {
      let changed = false;
      const updates = {};

      if (post.likedBy) {
        const newLiked = post.likedBy.filter((id) => validUids.has(id));
        if (newLiked.length !== post.likedBy.length) {
          updates.likedBy = newLiked;
          updates.likes = newLiked.length;
          changed = true;
        }
      }
      if (post.attendees) {
        const newAtt = post.attendees.filter((id) => validUids.has(id));
        if (newAtt.length !== post.attendees.length) {
          updates.attendees = newAtt;
          changed = true;
        }
      }
      if (post.pendingRequests) {
        const newPen = post.pendingRequests.filter((id) => validUids.has(id));
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
      const fields = [
        "friends",
        "incomingRequests",
        "outgoingRequests",
        "blockedUsers",
      ];

      for (const f of fields) {
        if (p[f] && Array.isArray(p[f])) {
          const filtered = p[f].filter((id) => validUids.has(id));
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

async function createIndexes() {
  if (!db) return;
  try {
    const collections = {
      users: ["email"],
      profiles: ["uid", "email"],
      posts: ["uid", "createdAt", "type"],
      messages: ["fromUid", "toUid", "groupId", "createdAt"],
      notifications: ["toUid", "createdAt"],
      stories: ["uid", "expiresAt"],
      profile_views: ["viewerUid", "targetUid"],
      communities: ["ownerUid", "lastActivity"],
    };

    for (const [collName, fields] of Object.entries(collections)) {
      const collection = db.collection(collName);
      for (const field of fields) {
        const index = {};
        index[field] = 1;
        await collection.createIndex(index).catch(() => { }); // Ignore if exists
      }
    }
    console.log("Database indexes created successfully");
  } catch (e) {
    console.error("Error creating indexes:", e);
  }
}

async function run() {
  try {
    await client.connect();
    db = client.db(DB_NAME);

    // Create indexes for performance
    await createIndexes();

    // Initialize default static lists
    const configCollection = db.collection("app_config");
    const existingConfig = await configCollection.findOne({ _id: "static_lists" });
    if (!existingConfig) {
      await configCollection.insertOne({
        _id: "static_lists",
        roomTags: [
          { id: 'fitness', label: 'Fitness', emoji: '🏃' },
          { id: 'food', label: 'Food', emoji: '🍽️' },
          { id: 'music', label: 'Music', emoji: '🎵' },
          { id: 'tech', label: 'Tech', emoji: '💻' },
          { id: 'outdoors', label: 'Outdoors', emoji: '🌍' },
          { id: 'books', label: 'Books', emoji: '📚' },
          { id: 'gaming', label: 'Gaming', emoji: '🎮' },
          { id: 'art', label: 'Art', emoji: '🎨' },
          { id: 'wellness', label: 'Wellness', emoji: '🌿' },
          { id: 'travel', label: 'Travel', emoji: '✈️' },
          { id: 'parenting', label: 'Parenting', emoji: '👶' },
          { id: 'social', label: 'Social', emoji: '🎉' },
          { id: 'movies', label: 'Movies', emoji: '🍿' },
          { id: 'coding', label: 'Coding', emoji: '⌨️' }
        ],
        moods: ['😄','🎉','😤','🥲','😍','🤔','😴','🔥','❤️','💪'],
        popularTags: ['#local','#vibes','#meetup','#explore','#foodie','#fitness','#travel','#art','#music','#tech'],
        meetupCategories: [
          { id: 'active', label: 'Active', emoji: '🏃' },
          { id: 'food', label: 'Food & Drink', emoji: '🍽️' },
          { id: 'music', label: 'Music & Arts', emoji: '🎵' },
          { id: 'tech', label: 'Tech', emoji: '💻' },
          { id: 'wellness', label: 'Wellness', emoji: '🌿' },
          { id: 'social', label: 'Social', emoji: '🎉' },
          { id: 'creative', label: 'Creative', emoji: '🎨' }
        ],
        badgePresets: ["Verified", "Top Contributor", "Trendsetter", "Early Adopter"],
        reportReasons: ['Spam','Harassment','Hate speech','Inappropriate content','Scam / Fraud','Other'],
        communityReportReasons: ['Spam', 'Harassment', 'Hate speech', 'Inappropriate content', 'Scam / Fraud', 'Other'],
        professions: [
  "Accountant",
  "Actor",
  "Actuary",
  "Architect",
  "Artist",
  "Auditor",
  "Author",
  "Baker",
  "Banker",
  "Barber",
  "Barista",
  "Bartender",
  "Biologist",
  "Biomedical Engineer",
  "Blockchain Developer",
  "Business Analyst",
  "Chemist",
  "Chef",
  "Chiropractor",
  "Civil Engineer",
  "Coach",
  "Comedian",
  "Consultant",
  "Content Creator",
  "Copywriter",
  "Cybersecurity Analyst",
  "Data Analyst",
  "Data Scientist",
  "Dentist",
  "Designer",
  "Developer",
  "Dietitian",
  "Director",
  "DJ",
  "Doctor",
  "Driver",
  "Economist",
  "Editor",
  "Electrician",
  "Engineer",
  "Entrepreneur",
  "Event Planner",
  "Farmer",
  "Fashion Designer",
  "Filmmaker",
  "Financial Advisor",
  "Firefighter",
  "Fitness Trainer",
  "Flight Attendant",
  "Florist",
  "Founder",
  "Freelancer",
  "Game Developer",
  "Graphic Designer",
  "Hairdresser",
  "Historian",
  "HR Manager",
  "Illustrator",
  "Influencer",
  "Interior Designer",
  "Investment Banker",
  "Journalist",
  "Lawyer",
  "Librarian",
  "Makeup Artist",
  "Marketing Manager",
  "Massage Therapist",
  "Mechanic",
  "Mechanical Engineer",
  "Model",
  "Musician",
  "Nurse",
  "Nutritionist",
  "Paramedic",
  "Pharmacist",
  "Photographer",
  "Physician",
  "Physiotherapist",
  "Pilot",
  "Plumber",
  "Podcaster",
  "Police Officer",
  "Product Manager",
  "Professor",
  "Programmer",
  "Psychiatrist",
  "Psychologist",
  "Real Estate Agent",
  "Receptionist",
  "Recruiter",
  "Researcher",
  "Sales Representative",
  "Scientist",
  "SEO Specialist",
  "Social Media Manager",
  "Software Developer",
  "Software Engineer",
  "Student",
  "Surgeon",
  "Teacher",
  "Technician",
  "Therapist",
  "Tour Guide",
  "Translator",
  "UX/UI Designer",
  "Veterinarian",
  "Video Editor",
  "Videographer",
  "Waiter",
  "Writer",
  "Yoga Instructor"
]

      });
    }

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
  if (!viewerUid || viewerUid === "undefined" || viewerUid === "null")
    return [];
  try {
    const profiles = db.collection("profiles");
    const viewer = await profiles.findOne({ uid: viewerUid });
    const blockedByViewer = viewer?.blockedUsers || [];
    const blockers = await profiles
      .find({ blockedUsers: viewerUid })
      .project({ uid: 1 })
      .toArray();
    const blockingViewer = blockers.map((b) => b.uid);
    return [...new Set([...blockedByViewer, ...blockingViewer])];
  } catch (e) {
    console.error("Error fetching blocked UIDs", e);
    return [];
  }
}

const LOCATION_PRIVACY = {
  PUBLIC_COORD_DECIMALS: 2, // ~1.1km precision (was 1/~11km — too coarse)
  FRIEND_COORD_DECIMALS: 2, // ~1.1km precision
  PUBLIC_JITTER_METERS: 450,
  FRIEND_JITTER_METERS: 180,
  PUBLIC_LOCATION_DELAY_MS: 5 * 60 * 1000, // 5 minutes
  MAX_LOCATION_AGE_MS: 72 * 60 * 60 * 1000, // 72 hours stale cutoff (was 24h)
  PUBLIC_K_ANON_DECIMALS: 2,
  PUBLIC_K_ANON_MIN_USERS: 1, // was 3 — required 3+ users in same 11km cell, hid everyone
  JITTER_ROTATION_MS: 15 * 60 * 1000, // rotate every 15 minutes
};

function roundCoord(value, decimals) {
  if (typeof value !== "number" || Number.isNaN(value)) return value;
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function hashString(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function addCoordinateJitter(lat, lng, maxMeters, seed) {
  const seedA = hashString(`${seed}:a`);
  const seedB = hashString(`${seed}:b`);
  const angle = (seedA % 360) * (Math.PI / 180);
  const radius = seedB % Math.max(1, maxMeters);
  const dLat = (radius / 111320) * Math.cos(angle);
  const safeCos = Math.max(0.1, Math.cos((lat * Math.PI) / 180));
  const dLng = (radius / (111320 * safeCos)) * Math.sin(angle);
  return {
    lat: lat + dLat,
    lng: lng + dLng,
  };
}

function getLocationTimestamp(profile) {
  if (typeof profile?.locationUpdatedAt === "number")
    return profile.locationUpdatedAt;
  if (typeof profile?.updatedAt === "number") return profile.updatedAt;
  if (profile?.updatedAt) {
    const parsed = new Date(profile.updatedAt).getTime();
    if (!Number.isNaN(parsed)) return parsed;
  }
  return typeof profile?.createdAt === "number" ? profile.createdAt : 0;
}

function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371e3;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) *
    Math.cos(lat2 * rad) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toDistanceBand(distanceMeters) {
  if (typeof distanceMeters !== "number" || Number.isNaN(distanceMeters))
    return null;
  if (distanceMeters < 500) return "< 0.5 km";
  if (distanceMeters < 1000) return "0.5 - 1 km";
  if (distanceMeters < 2000) return "1 - 2 km";
  if (distanceMeters < 5000) return "2 - 5 km";
  if (distanceMeters < 10000) return "5 - 10 km";
  if (distanceMeters < 20000) return "10 - 20 km";
  return "20+ km";
}

function getPublicCellKey(lat, lng) {
  return `${roundCoord(lat, LOCATION_PRIVACY.PUBLIC_K_ANON_DECIMALS)}:${roundCoord(lng, LOCATION_PRIVACY.PUBLIC_K_ANON_DECIMALS)}`;
}

// --- API ROUTES ---

app.post("/api/profile/view", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { viewerUid, targetUid } = req.body;
    if (!viewerUid || !targetUid || viewerUid === targetUid) {
      return res.status(400).json({ error: "Invalid uids" });
    }

    const profileViews = db.collection("profile_views");
    const profiles = db.collection("profiles");

    const lastView = await profileViews.findOne({ viewerUid, targetUid });
    const now = Date.now();
    const isNewDay = !lastView || now - lastView.timestamp > 24 * 60 * 60 * 1000;

    await profileViews.updateOne(
      { viewerUid, targetUid },
      { $set: { timestamp: now } },
      { upsert: true },
    );

    // Trigger notification if it's the first view today
    if (isNewDay) {
      const viewer = await profiles.findOne({ uid: viewerUid });
      const target = await profiles.findOne({ uid: targetUid });

      if (viewer && target) {
        const vInterests = viewer.interests || [];
        const tInterests = target.interests || [];

        let matchPct = 0;
        if (vInterests.length > 0 && tInterests.length > 0) {
          const overlap = vInterests.filter(i => tInterests.includes(i)).length;
          const total = new Set([...vInterests, ...tInterests]).size;
          matchPct = Math.round((overlap / (total || 1)) * 100);

          // Boost logic for psychological impact
          if (overlap > 0 && matchPct < 75) {
            matchPct = 75 + (overlap * 2);
          }
        } else {
          // Stable fallback match percentage based on UIDs
          const combined = viewerUid + targetUid;
          let hash = 0;
          for (let i = 0; i < combined.length; i++) {
            hash = ((hash << 5) - hash) + combined.charCodeAt(i);
            hash |= 0;
          }
          matchPct = 60 + (Math.abs(hash) % 30);
        }

        if (matchPct > 99) matchPct = 99;

        await createNotification("profile_view", viewerUid, targetUid, null, {
          matchPct,
          message: `with ${matchPct}% matching interests opened your profile today.`
        });

        // Quest: Small World (view someone crossed paths with)
        // Check if there was a crossed_paths between them in last 24h
        const pathMatch = await db.collection("notifications").findOne({
          toUid: viewerUid,
          fromUid: targetUid,
          type: 'crossed_paths',
          createdAt: { $gt: Date.now() - 24 * 60 * 60 * 1000 }
        });
        if (pathMatch) {
          await updateQuestProgress(viewerUid, 'crossed_paths');
        }

        // Logic for Feature 2: Time-Limited Urgency
        // If they are a very high match, send a "Scarcity" notification
        if (matchPct > 85) {
          const scarcityMsgs = [
            `is nearby but won't be for long! Say hi now.`,
            `is just around the corner! Don't miss the chance to connect.`,
            `is in your radius. This session expires soon!`
          ];
          const msg = scarcityMsgs[Math.floor(Math.random() * scarcityMsgs.length)];
          await createNotification("meetup_reminder", viewerUid, targetUid, null, {
            message: msg,
            urgency: 'high'
          });
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Record view error:", error);
    res.status(500).json({ error: "Failed to record view" });
  }
});

app.get("/api/profile/views/:uid", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { uid } = req.params;
    const profileViews = db.collection("profile_views");
    const profiles = db.collection("profiles");

    const views = await profileViews
      .find({ targetUid: uid })
      .sort({ timestamp: -1 })
      .limit(20)
      .toArray();

    if (views.length === 0) return res.json([]);

    const viewerUids = views.map((v) => v.viewerUid);
    const viewerProfiles = await profiles
      .find({ uid: { $in: viewerUids } })
      .project({ uid: 1, displayName: 1, photoURL: 1 })
      .toArray();

    const result = views
      .map((v) => {
        const profile = viewerProfiles.find((p) => p.uid === v.viewerUid);
        return profile ? { ...profile, viewedAt: v.timestamp } : null;
      })
      .filter((p) => p !== null);

    res.json(result);
  } catch (error) {
    console.error("Get views error:", error);
    res.status(500).json({ error: "Failed to fetch profile views" });
  }
});

// Default route to check server status
app.get("/", (req, res) => {
  res.send(`Orbyt API Running. DB Connected: ${!!db}`);
});

// Manual Cleanup Trigger
app.post("/api/cleanup", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  await cleanupOrphanedData();
  res.json({ success: true, message: "Database cleanup completed" });
});

// App Version Configuration
const APP_CONFIG = {
  minAppVersion: "1.7.1",
  updateUrl:
    "https://play.google.com/store/apps/details?id=com.orbyt.official.app",
};

app.get("/api/config/version", (req, res) => {
  res.json(APP_CONFIG);
});

app.post("/api/push/subscribe", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { uid, subscription, platform } = req.body;
    if (!uid || !subscription) {
      return res.status(400).json({ error: "Missing uid or subscription" });
    }

    const isExpoToken =
      typeof subscription === "string" && Expo.isExpoPushToken(subscription);
    const resolvedPlatform = platform || (isExpoToken ? "expo" : "web");

    if (resolvedPlatform !== "expo" && resolvedPlatform !== "web") {
      return res
        .status(400)
        .json({ error: "Invalid platform. Use 'expo' or 'web'." });
    }

    const profiles = db.collection("profiles");
    const update =
      resolvedPlatform === "expo"
        ? { $set: { expoPushToken: subscription } }
        : { $set: { webPushSubscription: subscription } };

    await profiles.updateOne({ uid }, update);

    // Keep backwards compatibility while migrating old clients.
    if (resolvedPlatform === "expo") {
      await profiles.updateOne(
        { uid },
        { $set: { pushSubscription: subscription } },
      );
    }

    res.json({
      success: true,
      message: `${resolvedPlatform} push subscription saved`,
    });
  } catch (error) {
    console.error("Save subscription error:", error);
    res.status(500).json({ error: "Failed to save push subscription" });
  }
});

app.post("/api/auth/signup", authLimiter, async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    // Validate input
    const validated = signupSchema.parse(req.body);
    const { email, password } = validated;

    const users = db.collection("users");
    const profiles = db.collection("profiles");

    const existing = await users.findOne({ email });
    if (existing)
      return res.status(400).json({ error: "Email already in use" });

    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const newUser = { email, password: hashedPassword, createdAt: new Date() };
    const result = await users.insertOne(newUser);
    const uid = result.insertedId.toString();

    await profiles.insertOne({
      uid,
      email,
      displayName: email.split("@")[0],
      photoURL: "",
      interests: [],
      blockedUsers: [],
      passedUsers: [],
      isDiscoverable: false,
      discoveryRadius: 10,
      stats: {
        connectionsCreated: 0,
        livesChanged: 0,
        peopleIntroduced: 0
      },
      reputation: [],
      quests: [],
      createdAt: Date.now(),
    });

    res.json({ user: { uid, email } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error("Signup error:", error);
    res.status(500).json({ error: "Signup failed" });
  }
});

// Generate a daily quest for the user if they don't have one or it's expired
async function ensureDailyQuest(user) {
  const now = Date.now();
  const lastQuestTime = user.quests?.[0]?.generatedAt || 0;
  const isExpired = now - lastQuestTime > 24 * 60 * 60 * 1000;

  if (!user.quests || user.quests.length === 0 || isExpired) {
    const QUESTS = [
      { id: 'greet_match', title: 'Friendly Face', description: 'Say hi to someone with a >80% match percentage.', goal: 1, reward: 50 },
      { id: 'comment_post', title: 'Conversation Starter', description: 'Leave a thoughtful comment on a nearby post.', goal: 1, reward: 30 },
      { id: 'visit_room', title: 'Social Butterfly', description: 'Join a new micro-community today.', goal: 1, reward: 40 },
      { id: 'crossed_paths', title: 'Small World', description: 'View the profile of someone you crossed paths with.', goal: 1, reward: 60 },
    ];
    const picked = QUESTS[Math.floor(Math.random() * QUESTS.length)];
    const newQuest = {
      ...picked,
      progress: 0,
      completed: false,
      generatedAt: now,
    };

    await db.collection("profiles").updateOne(
      { uid: user.uid },
      { $set: { quests: [newQuest] } }
    );
    return newQuest;
  }
  return user.quests[0];
}

async function updateQuestProgress(uid, questId, increment = 1) {
  const profile = await db.collection("profiles").findOne({ uid });
  if (!profile || !profile.quests || profile.quests.length === 0) return;

  const quest = profile.quests[0];
  if (quest.id === questId && !quest.completed) {
    const newProgress = quest.progress + increment;
    const completed = newProgress >= quest.goal;

    await db.collection("profiles").updateOne(
      { uid },
      {
        $set: {
          "quests.0.progress": newProgress,
          "quests.0.completed": completed
        }
      }
    );

    if (completed) {
      // Award reputation for first completion
      await db.collection("profiles").updateOne(
        { uid },
        {
          $addToSet: { reputation: "Eager Explorer" },
          $inc: { "stats.livesChanged": 5 }
        }
      );
      console.log(`Quest ${questId} completed for user ${uid}`);
    }
  }
}

app.post("/api/auth/login", authLimiter, async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    // Validate input
    const validated = loginSchema.parse(req.body);
    const { email, password } = validated;

    const users = db.collection("users");
    const user = await users.findOne({ email });
    if (!user)
      return res.status(401).json({ error: "Invalid email or password" });

    // Compare password with hashed password using bcrypt
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch)
      return res.status(401).json({ error: "Invalid email or password" });

    const uid = user._id.toString();
    const profile = await db.collection("profiles").findOne({ uid });
    if (profile) {
      await ensureDailyQuest(profile);
    }

    res.json({ user: { uid, email } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

app.post("/api/auth/google", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { email, displayName, photoURL } = req.body;
    const users = db.collection("users");
    const profiles = db.collection("profiles");

    let user = await users.findOne({ email });
    let uid;

    if (!user) {
      const newUser = { email, authType: "google", createdAt: new Date() };
      const result = await users.insertOne(newUser);
      uid = result.insertedId.toString();

      await profiles.insertOne({
        uid,
        email,
        displayName: displayName || email.split("@")[0],
        photoURL: photoURL || "",
        interests: [],
        blockedUsers: [],
        passedUsers: [],
        isDiscoverable: false,
        discoveryRadius: 10,
        stats: {
          connectionsCreated: 0,
          livesChanged: 0,
          peopleIntroduced: 0
        },
        reputation: [],
        quests: [],
        createdAt: Date.now(),
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

app.post("/api/profile/endorse", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { fromUid, toUid, labels } = req.body;
    if (!fromUid || !toUid || !labels || !Array.isArray(labels)) {
      return res.status(400).json({ error: "Invalid parameters" });
    }

    const profiles = db.collection("profiles");

    // Only allow endorsing friends or people you've met (for now keep it simple: any discoverable user)
    // In a real app, verify they actually met.

    await profiles.updateOne(
      { uid: toUid },
      { $addToSet: { reputation: { $each: labels } } }
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to endorse profile" });
  }
});

app.get("/api/profile/:uid", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    let { viewerUid } = req.query;
    if (viewerUid === "undefined" || viewerUid === "null")
      viewerUid = undefined;

    const profiles = db.collection("profiles");
    const profile = await profiles.findOne({ uid: req.params.uid });
    if (!profile) return res.json(null);

    // Hide precise coordinates unless this is the owner's own profile request.
    if (profile?.lastLocation) {
      const isSelf = !!viewerUid && viewerUid === profile.uid;
      let isFriend = false;

      if (!isSelf && viewerUid) {
        const viewerProfile = await profiles.findOne(
          { uid: viewerUid },
          { projection: { friends: 1 } },
        );
        isFriend = (viewerProfile?.friends || []).includes(profile.uid);
      }

      if (isSelf) {
        // keep as-is
      } else if (isFriend) {
        profile.lastLocation = {
          ...profile.lastLocation,
          lat: roundCoord(
            profile.lastLocation.lat,
            LOCATION_PRIVACY.FRIEND_COORD_DECIMALS,
          ),
          lng: roundCoord(
            profile.lastLocation.lng,
            LOCATION_PRIVACY.FRIEND_COORD_DECIMALS,
          ),
        };
      } else {
        profile.lastLocation = {
          name: profile?.lastLocation?.name || "Nearby area",
        };
      }
    }

    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

app.delete("/api/profile/:uid", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { uid } = req.params;

    await db.collection("profiles").deleteOne({ uid });
    if (ObjectId.isValid(uid)) {
      await db.collection("users").deleteOne({ _id: new ObjectId(uid) });
    }
    await db.collection("posts").deleteMany({ authorId: uid });
    await db
      .collection("messages")
      .deleteMany({ $or: [{ senderId: uid }, { receiverId: uid }] });
    await db
      .collection("notifications")
      .deleteMany({ $or: [{ recipientUid: uid }, { senderUid: uid }] });

    await db.collection("profiles").updateMany(
      {},
      {
        $pull: {
          friends: uid,
          incomingRequests: uid,
          outgoingRequests: uid,
          blockedUsers: uid,
        },
      },
    );

    res.json({ success: true, message: "Account deleted successfully" });
  } catch (error) {
    console.error("Delete account error:", error);
    res.status(500).json({ error: "Failed to delete account" });
  }
});

app.get("/api/profiles", mapProfilesLimiter, async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    let { viewerUid, radius } = req.query;
    // Fix: Handle 'undefined' or 'null' passed as strings
    if (viewerUid === "undefined" || viewerUid === "null")
      viewerUid = undefined;

    const radiusInKm = radius ? parseFloat(radius) : null;

    const profiles = db.collection("profiles");
    const viewerProfile = viewerUid
      ? await profiles.findOne({ uid: viewerUid })
      : null;
    const viewerFriends = new Set(viewerProfile?.friends || []);
    const viewerLocation = viewerProfile?.lastLocation;
    const now = Date.now();

    // Secondary master radius check: if query didn't provide radius but viewer has a discoveryRadius setting
    const effectiveRadius = radiusInKm || viewerProfile?.discoveryRadius || 50;

    let filter = {
      lastLocation: { $exists: true, $ne: null },
      isDiscoverable: { $ne: false }, // Only show discoverable users
    };
    if (viewerUid) {
      const excludedUids = await getMutualBlockedUids(viewerUid);
      if (excludedUids.length > 0) {
        filter.uid = { $nin: excludedUids };
      }
    }

    const rawUsers = await profiles
      .find(filter)
      .project({
        uid: 1,
        displayName: 1,
        photoURL: 1,
        lastLocation: 1,
        locationUpdatedAt: 1,
        updatedAt: 1,
        createdAt: 1,
        interests: 1,
        bio: 1,
        instagramHandle: 1,
        gender: 1,
        isDiscoverable: 1,
      })
      .limit(500)
      .toArray();

    const safeUsers = [];
    for (const user of rawUsers) {
      if (viewerUid && user.uid === viewerUid) continue;

      const lat = user?.lastLocation?.lat;
      const lng = user?.lastLocation?.lng;
      if (typeof lat !== "number" || typeof lng !== "number") continue;

      const distanceMeters = viewerLocation
        ? getDistanceMeters(viewerLocation.lat, viewerLocation.lng, lat, lng)
        : null;

      // STRICT RADIUS FILTER
      if (viewerLocation && distanceMeters !== null) {
        if (distanceMeters > effectiveRadius * 1000) {
          continue;
        }
      }

      const isFriend = viewerFriends.has(user.uid);
      const relation = isFriend ? "friend" : "public";

      // Apply jitter so exact location is never revealed
      const jitterMeters = isFriend
        ? LOCATION_PRIVACY.FRIEND_JITTER_METERS
        : LOCATION_PRIVACY.PUBLIC_JITTER_METERS;
      const coordDecimals = isFriend
        ? LOCATION_PRIVACY.FRIEND_COORD_DECIMALS
        : LOCATION_PRIVACY.PUBLIC_COORD_DECIMALS;

      const roundedLat = roundCoord(lat, coordDecimals);
      const roundedLng = roundCoord(lng, coordDecimals);
      const jitterBucket = Math.floor(
        now / LOCATION_PRIVACY.JITTER_ROTATION_MS,
      );
      const jitterSeed = `${viewerUid || "anon"}:${user.uid}:${jitterBucket}:${relation}`;
      const jittered = addCoordinateJitter(
        roundedLat,
        roundedLng,
        jitterMeters,
        jitterSeed,
      );

      safeUsers.push({
        uid: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
        interests: user.interests || [],
        bio: user.bio,
        instagramHandle: user.instagramHandle,
        gender: user.gender,
        relation,
        distanceBand: toDistanceBand(distanceMeters),
        locationAccuracyMeters: isFriend ? 250 : 1500,
        isDiscoverable: user.isDiscoverable !== false,
        lastLocation: {
          lat: jittered.lat,
          lng: jittered.lng,
          name: isFriend ? user?.lastLocation?.name : "Nearby area",
        },
      });
    }

    res.json(safeUsers);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch profiles" });
  }
});

app.post("/api/profiles/batch", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { uids } = req.body;
    if (!Array.isArray(uids) || uids.length === 0) return res.json([]);
    const profiles = db.collection("profiles");
    const users = await profiles
      .find({ uid: { $in: uids } })
      .project({
        uid: 1,
        displayName: 1,
        photoURL: 1,
        bio: 1,
      })
      .toArray();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch batch profiles" });
  }
});

app.post("/api/profile/:uid", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { uid } = req.params;
    const data = req.body;
    const profiles = db.collection("profiles");

    // Server-side 18+ validation
    if (data.dob) {
      const age = calculateAge(data.dob);
      if (age < 18) {
        return res
          .status(400)
          .json({ error: "You must be at least 18 years old." });
      }
    }

    // 1. Update Profile
    const updateFields = { ...data, uid, updatedAt: new Date() };
    if (
      typeof data?.lastLocation?.lat === "number" &&
      typeof data?.lastLocation?.lng === "number"
    ) {
      updateFields.locationUpdatedAt = Date.now();
    }
    const updateDoc = { $set: updateFields };

    await profiles.updateOne({ uid }, updateDoc, { upsert: true });

    // 3. Crossed Paths Logic (Feature 4)
    if (data.lastLocation?.lat && data.lastLocation?.lng) {
      setImmediate(async () => {
        try {
          const myInterests = data.interests || [];
          if (myInterests.length === 0) return;

          // Find others who were within 200m in the last 30 mins
          const nearby = await profiles.find({
            uid: { $ne: uid },
            "lastLocation.lat": { $gt: data.lastLocation.lat - 0.002, $lt: data.lastLocation.lat + 0.002 },
            "lastLocation.lng": { $gt: data.lastLocation.lng - 0.002, $lt: data.lastLocation.lng + 0.002 },
            locationUpdatedAt: { $gt: Date.now() - 30 * 60 * 1000 },
            isDiscoverable: true,
            interests: { $in: myInterests }
          }).limit(1).toArray();

          if (nearby.length > 0) {
            const other = nearby[0];
            const sharedInterests = myInterests.filter(i => (other.interests || []).includes(i));
            if (sharedInterests.length > 0) {
              const interestLabel = sharedInterests[0];
              await createNotification("crossed_paths", other.uid, uid, null, { interestLabel });
            }
          }
        } catch (e) {
          console.error("Crossed paths check failed", e);
        }
      });
    }

    // 2. Propagate updates to related collections (Posts, Comments, Messages, Notifications)
    // This ensures that old posts/comments reflect the new username/photo
    if (data.displayName || data.photoURL !== undefined) {
      const posts = db.collection("posts");
      const messages = db.collection("messages");
      const notifications = db.collection("notifications");

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
          { arrayFilters: [{ "elem.uid": uid }] },
        );
      }

      // Update Messages (where user is sender)
      if (Object.keys(updates).length > 0) {
        await messages.updateMany({ fromUid: uid }, { $set: updates });
      }

      // Update Notifications (where user is sender)
      if (Object.keys(notifUpdates).length > 0) {
        await notifications.updateMany(
          { fromUid: uid },
          { $set: notifUpdates },
        );
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Profile update error", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

app.post("/api/user/block", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { uid, targetUid } = req.body;
    const profiles = db.collection("profiles");
    await profiles.updateOne(
      { uid: uid },
      { $addToSet: { blockedUsers: targetUid } },
    );
    await profiles.updateOne(
      { uid: uid },
      {
        $pull: {
          friends: targetUid,
          incomingRequests: targetUid,
          outgoingRequests: targetUid,
        },
        $unset: { [`friendRequestMessages.${targetUid}`]: "" },
      },
    );
    await profiles.updateOne(
      { uid: targetUid },
      {
        $pull: { friends: uid, incomingRequests: uid, outgoingRequests: uid },
        $unset: { [`friendRequestMessages.${uid}`]: "" },
      },
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to block user" });
  }
});

app.post("/api/user/unblock", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { uid, targetUid } = req.body;
    const profiles = db.collection("profiles");
    await profiles.updateOne(
      { uid: uid },
      { $pull: { blockedUsers: targetUid } },
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to unblock user" });
  }
});

app.post("/api/user/pass", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { uid, targetUid } = req.body;
    if (!uid || !targetUid)
      return res.status(400).json({ error: "Missing uid or targetUid" });
    const profiles = db.collection("profiles");
    await profiles.updateOne(
      { uid: uid },
      { $addToSet: { passedUsers: targetUid } },
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to pass user" });
  }
});

app.post("/api/report", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const {
      reporterUid,
      targetUid,
      reason,
      postId,
      storyId,
      communityId,
      type,
    } = req.body;
    if (!reporterUid || !reason)
      return res
        .status(400)
        .json({ error: "reporterUid and reason are required" });

    // Infer type from provided IDs if not given explicitly
    let resolvedType = type;
    if (!resolvedType) {
      if (storyId) resolvedType = "story";
      else if (communityId) resolvedType = "community";
      else if (postId) resolvedType = "post";
      else resolvedType = "user";
    }

    const reports = db.collection("reports");
    await reports.insertOne({
      type: resolvedType,
      reporterUid,
      targetUid: targetUid || null,
      reason,
      postId: postId || null,
      storyId: storyId || null,
      communityId: communityId || null,
      createdAt: Date.now(),
      status: "pending",
    });

    // Auto-suspend if threshold met (user-level reports only)
    if (
      targetUid &&
      (resolvedType === "user" ||
        resolvedType === "post" ||
        resolvedType === "story" ||
        resolvedType === "meetup")
    ) {
      try {
        const settings = await db
          .collection("admin_settings")
          .findOne({ _id: "global" });
        const threshold = settings?.autoSuspendThreshold || 0;
        if (threshold > 0) {
          const reportCount = await reports.countDocuments({
            targetUid,
            status: "pending",
          });
          if (reportCount >= threshold) {
            await db
              .collection("profiles")
              .updateOne(
                { uid: targetUid },
                { $set: { isSuspended: true } },
                { upsert: true },
              );
          }
        }
      } catch (_) {
        /* non-fatal */
      }
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to submit report" });
  }
});

app.post("/api/friends/request", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { fromUid, toUid, message } = req.body;
    const profiles = db.collection("profiles");
    await profiles.updateOne(
      { uid: fromUid },
      { $addToSet: { outgoingRequests: toUid } },
    );
    const updateDoc = { $addToSet: { incomingRequests: fromUid } };
    if (message)
      updateDoc.$set = { [`friendRequestMessages.${fromUid}`]: message };
    await profiles.updateOne({ uid: toUid }, updateDoc);
    await createNotification("friend_request", fromUid, toUid);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to send request" });
  }
});

app.post("/api/friends/accept", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { userUid, requesterUid } = req.body;
    const profiles = db.collection("profiles");
    await profiles.updateOne(
      { uid: userUid },
      {
        $pull: { incomingRequests: requesterUid },
        $addToSet: { friends: requesterUid },
        $unset: { [`friendRequestMessages.${requesterUid}`]: "" },
        $inc: { "stats.connectionsCreated": 1 }
      },
    );
    await profiles.updateOne(
      { uid: requesterUid },
      {
        $pull: { outgoingRequests: userUid },
        $addToSet: { friends: userUid },
        $inc: { "stats.connectionsCreated": 1 }
      },
    );
    await createNotification("friend_accept", userUid, requesterUid);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to accept request" });
  }
});

app.post("/api/friends/reject", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { userUid, requesterUid } = req.body;
    const profiles = db.collection("profiles");
    await profiles.updateOne(
      { uid: userUid },
      {
        $pull: { incomingRequests: requesterUid },
        $unset: { [`friendRequestMessages.${requesterUid}`]: "" },
      },
    );
    await profiles.updateOne(
      { uid: requesterUid },
      { $pull: { outgoingRequests: userUid } },
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to reject request" });
  }
});

app.post("/api/friends/remove", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { uid1, uid2 } = req.body;
    const profiles = db.collection("profiles");
    await profiles.updateOne({ uid: uid1 }, { $pull: { friends: uid2 } });
    await profiles.updateOne({ uid: uid2 }, { $pull: { friends: uid1 } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to remove friend" });
  }
});

app.post("/api/posts", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const postData = req.body;
    
    if (!postData.location || typeof postData.location.lat !== 'number' || typeof postData.location.lng !== 'number') {
      return res.status(400).json({ error: "Location is required to create a post. Please enable location services." });
    }

    const posts = db.collection("posts");

    const result = await posts.insertOne({
      ...postData,
      likes: 0,
      likedBy: [],
      comments: [],
      attendees: [],
      pendingRequests: [],
      createdAt: Date.now(),
    });

    const postIdStr = result.insertedId.toString();
    const isMeetup = postData.type === "meetup";
    const notifType = isMeetup ? "friend_event" : "friend_post";
    const extra = isMeetup ? { eventTitle: postData.meetupDetails?.title } : {};

    // Notify all friends about the new post/event (fire-and-forget)
    setImmediate(async () => {
      try {
        const poster = await db
          .collection("profiles")
          .findOne({ uid: postData.uid });
        if (poster?.friends?.length) {
          for (const friendUid of poster.friends) {
            await createNotification(
              notifType,
              postData.uid,
              friendUid,
              postIdStr,
              extra,
            ).catch(() => { });
          }
        }
        // For meetup posts: also notify all other discoverable users (new_event)
        if (isMeetup) {
          const allProfiles = await db
            .collection("profiles")
            .find({
              uid: { $ne: postData.uid, $nin: poster?.friends || [] },
              isDiscoverable: true,
            })
            .limit(80)
            .toArray();
          for (const p of allProfiles) {
            await createNotification(
              "new_event",
              postData.uid,
              p.uid,
              postIdStr,
              extra,
            ).catch(() => { });
          }
        }
      } catch (e) {
        console.error("Post notification error:", e);
      }
    });

    res.json({ success: true, id: result.insertedId });
  } catch (error) {
    res.status(500).json({ error: "Failed to create post" });
  }
});

app.get("/api/posts", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    let { viewerUid, page = 1, limit = 10, lat, lng, radius } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const radiusInKm = parseFloat(radius);

    // Fix: Handle 'undefined' or 'null' passed as strings
    if (viewerUid === "undefined" || viewerUid === "null")
      viewerUid = undefined;

    const posts = db.collection("posts");
    let filter = {};
    if (viewerUid) {
      const excludedUids = await getMutualBlockedUids(viewerUid);
      if (excludedUids.length > 0) filter.uid = { $nin: excludedUids };
    }

    // Apply Radius Filter if coordinates and radius provided
    if (lat && lng && radiusInKm) {
      const centerLat = parseFloat(lat);
      const centerLng = parseFloat(lng);
      // Approximation: 1 degree lat is ~111km
      const latDelta = radiusInKm / 111.32;
      const lngDelta = radiusInKm / (111.32 * Math.cos(centerLat * Math.PI / 180));

      const locFilter = {
        "location.lat": { $gte: centerLat - latDelta, $lte: centerLat + latDelta },
        "location.lng": { $gte: centerLng - lngDelta, $lte: centerLng + lngDelta }
      };

      filter = {
        ...filter,
        $or: [
          { isPinned: true },
          { location: { $exists: false } },
          locFilter
        ]
      };
    }

    const allPosts = await posts
      .find(filter)
      .sort({ isPinned: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();
    res.json(allPosts);
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

app.get("/api/posts/user/:uid", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const posts = db.collection("posts");
    const userPosts = await posts
      .find({ uid: req.params.uid })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(userPosts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user posts" });
  }
});

app.get("/api/posts/:id", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const postId = req.params.id;

    if (!ObjectId.isValid(postId)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const posts = db.collection("posts");
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

app.put("/api/posts/:id", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const postId = req.params.id;
    const { uid, content, imageURL } = req.body;
    if (!ObjectId.isValid(postId))
      return res.status(400).json({ error: "Invalid ID" });
    const posts = db.collection("posts");
    const post = await posts.findOne({ _id: new ObjectId(postId) });
    if (!post) return res.status(404).json({ error: "Post not found" });
    if (post.uid !== uid)
      return res.status(403).json({ error: "Unauthorized" });
    await posts.updateOne(
      { _id: new ObjectId(postId) },
      { $set: { content, imageURL, updatedAt: Date.now() } },
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update post" });
  }
});

app.delete("/api/posts/:id", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const postId = req.params.id;
    const { uid } = req.body;
    if (!ObjectId.isValid(postId))
      return res.status(400).json({ error: "Invalid ID" });
    const posts = db.collection("posts");
    const post = await posts.findOne({ _id: new ObjectId(postId) });
    if (!post) return res.status(404).json({ error: "Post not found" });
    if (post.uid !== uid)
      return res.status(403).json({ error: "Unauthorized" });
    await posts.deleteOne({ _id: new ObjectId(postId) });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete post" });
  }
});

app.post("/api/posts/:id/like", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const postId = req.params.id;
    const { uid } = req.body;
    if (!ObjectId.isValid(postId))
      return res.status(400).json({ error: "Invalid Post ID" });
    const posts = db.collection("posts");
    const post = await posts.findOne({ _id: new ObjectId(postId) });
    if (!post) return res.status(404).json({ error: "Post not found" });
    const likedBy = post.likedBy || [];
    const isLiked = likedBy.includes(uid);
    let update = isLiked
      ? { $pull: { likedBy: uid }, $inc: { likes: -1 } }
      : { $addToSet: { likedBy: uid }, $inc: { likes: 1 } };
    await posts.updateOne({ _id: new ObjectId(postId) }, update);
    const updatedPost = await posts.findOne({ _id: new ObjectId(postId) });
    if (!isLiked && post.uid !== uid)
      await createNotification("like", uid, post.uid, postId);
    res.json({ likes: updatedPost.likes, likedBy: updatedPost.likedBy || [] });
  } catch (error) {
    res.status(500).json({ error: "Failed to toggle like" });
  }
});

app.post("/api/posts/:id/comment", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const postId = req.params.id;
    const { uid, text } = req.body;
    if (!ObjectId.isValid(postId))
      return res.status(400).json({ error: "Invalid Post ID" });
    const profiles = db.collection("profiles");
    const userProfile = await profiles.findOne({ uid });
    const newComment = {
      id: new ObjectId(),
      uid,
      authorName: userProfile?.displayName || "User",
      authorPhoto: userProfile?.photoURL || "",
      text,
      createdAt: Date.now(),
      likedBy: [],
      likes: 0,

      likedBy: [],
    };
    const posts = db.collection("posts");
    await posts.updateOne(
      { _id: new ObjectId(postId) },
      { $push: { comments: newComment } },
    );
    const post = await posts.findOne({ _id: new ObjectId(postId) });
    if (post && post.uid !== uid)
      await createNotification("comment", uid, post.uid, postId);

    await updateQuestProgress(uid, 'comment_post');
    res.json(newComment);
  } catch (error) {
    res.status(500).json({ error: "Failed to add comment" });
  }
});

// Toggle like on a comment
app.post("/api/posts/:id/likeComment", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const postId = req.params.id;
    const { commentId, uid } = req.body;
    if (!ObjectId.isValid(postId))
      return res.status(400).json({ error: "Invalid Post ID" });
    if (!commentId || !uid)
      return res.status(400).json({ error: "Missing parameters" });

    const posts = db.collection("posts");
    const post = await posts.findOne({ _id: new ObjectId(postId) });
    if (!post) return res.status(404).json({ error: "Post not found" });

    const comments = post.comments || [];
    const idx = comments.findIndex((c) => {
      try {
        if (c.id && c.id.toString() === commentId) return true;
      } catch (e) { }
      try {
        if (c._id && c._id.toString() === commentId) return true;
      } catch (e) { }
      // fallback to string id
      return c.id === commentId || c._id === commentId;
    });

    if (idx === -1) return res.status(404).json({ error: "Comment not found" });

    const comment = comments[idx];
    comment.likedBy = comment.likedBy || [];
    comment.likes = comment.likes || 0;
    const alreadyLiked = comment.likedBy.includes(uid);

    if (alreadyLiked) {
      comment.likedBy = comment.likedBy.filter((u) => u !== uid);
      comment.likes = Math.max(0, comment.likes - 1);
    } else {
      comment.likedBy.push(uid);
      comment.likes = (comment.likes || 0) + 1;
      // Notify the comment author
      if (comment.uid && comment.uid !== uid) {
        await createNotification("like", uid, comment.uid, postId);
      }
    }

    // Persist updated comments array
    await posts.updateOne(
      { _id: new ObjectId(postId) },
      { $set: { comments } },
    );

    res.json({ likes: comment.likes, likedBy: comment.likedBy });
  } catch (error) {
    console.error("Like comment error:", error);
    res.status(500).json({ error: "Failed to like comment" });
  }
});

// Like/unlike a comment on a post
app.post("/api/posts/:id/likeComment", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const postId = req.params.id;
    const { commentId, uid } = req.body;
    if (!ObjectId.isValid(postId))
      return res.status(400).json({ error: "Invalid Post ID" });
    if (!commentId || !uid)
      return res.status(400).json({ error: "Missing parameters" });

    const posts = db.collection("posts");
    const post = await posts.findOne({ _id: new ObjectId(postId) });
    if (!post) return res.status(404).json({ error: "Post not found" });

    const comments = post.comments || [];

    // Normalize incoming commentId to string (support ObjectId-like payloads)
    let commentIdStr = "";
    if (typeof commentId === "string") commentIdStr = commentId;
    else if (commentId && commentId.$oid) commentIdStr = commentId.$oid;
    else if (commentId && typeof commentId.toString === "function")
      commentIdStr = commentId.toString();
    else commentIdStr = String(commentId);

    let found = false;
    for (let i = 0; i < comments.length; i++) {
      const c = comments[i];
      const cId = c._id || c.id;
      const cIdStr =
        cId && typeof cId.toString === "function"
          ? cId.toString()
          : String(cId);
      if (cIdStr === commentIdStr) {
        found = true;
        c.likedBy = c.likedBy || [];
        const isLiked = c.likedBy.includes(uid);
        if (isLiked) {
          c.likedBy = c.likedBy.filter((x) => x !== uid);
          c.likes = Math.max(0, (c.likes || 0) - 1);
        } else {
          c.likedBy.push(uid);
          c.likes = (c.likes || 0) + 1;
        }
        // persist full comments array back to DB
        await posts.updateOne(
          { _id: new ObjectId(postId) },
          { $set: { comments } },
        );

        // send notification to comment owner
        if (!isLiked && c.uid && c.uid !== uid) {
          await createNotification("like", uid, c.uid, postId, {
            commentId: commentIdStr,
          });
        }

        return res.json({ success: true, comment: c });
      }
    }

    if (!found) return res.status(404).json({ error: "Comment not found" });
  } catch (error) {
    console.error("Like comment error:", error);
    res.status(500).json({ error: "Failed to like comment" });
  }
});

// --- MEETUP ACTIONS ---

app.post("/api/meetups/:id/join", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const postId = req.params.id;
    const { uid } = req.body;
    if (!ObjectId.isValid(postId))
      return res.status(400).json({ error: "Invalid ID" });
    const posts = db.collection("posts");
    const post = await posts.findOne({ _id: new ObjectId(postId) });
    if (!post) return res.status(404).json({ error: "Meetup not found" });
    await posts.updateOne(
      { _id: new ObjectId(postId) },
      { $addToSet: { pendingRequests: uid } },
    );
    await createNotification("meetup_request", uid, post.uid, postId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to join meetup" });
  }
});

app.post("/api/meetups/:id/accept", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const postId = req.params.id;
    const { hostUid, requesterUid } = req.body;
    if (!ObjectId.isValid(postId))
      return res.status(400).json({ error: "Invalid ID" });
    const posts = db.collection("posts");
    const post = await posts.findOne({ _id: new ObjectId(postId) });
    if (!post) return res.status(404).json({ error: "Meetup not found" });
    if (post.uid !== hostUid)
      return res.status(403).json({ error: "Unauthorized" });
    await posts.updateOne(
      { _id: new ObjectId(postId) },
      {
        $pull: { pendingRequests: requesterUid },
        $addToSet: { attendees: requesterUid },
      },
    );
    await createNotification("meetup_accept", hostUid, requesterUid, postId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to accept request" });
  }
});

app.post("/api/meetups/:id/reject", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const postId = req.params.id;
    const { hostUid, requesterUid } = req.body;
    if (!ObjectId.isValid(postId))
      return res.status(400).json({ error: "Invalid ID" });
    const posts = db.collection("posts");
    const post = await posts.findOne({ _id: new ObjectId(postId) });
    if (!post) return res.status(404).json({ error: "Meetup not found" });
    if (post.uid !== hostUid)
      return res.status(403).json({ error: "Unauthorized" });
    await posts.updateOne(
      { _id: new ObjectId(postId) },
      { $pull: { pendingRequests: requesterUid } },
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to reject request" });
  }
});

app.post("/api/meetups/:id/remove-attendee", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const postId = req.params.id;
    const { hostUid, targetUid } = req.body;
    if (!ObjectId.isValid(postId))
      return res.status(400).json({ error: "Invalid ID" });
    const posts = db.collection("posts");
    const post = await posts.findOne({ _id: new ObjectId(postId) });
    if (!post) return res.status(404).json({ error: "Meetup not found" });
    if (post.uid !== hostUid)
      return res.status(403).json({ error: "Unauthorized" });

    await posts.updateOne(
      { _id: new ObjectId(postId) },
      {
        $pull: { attendees: targetUid },
      },
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to remove attendee" });
  }
});

app.get("/api/notifications/:uid", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const notifications = db.collection("notifications");
    const list = await notifications
      .find({ toUid: req.params.uid })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

app.post("/api/notifications/mark-read", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { notificationIds } = req.body;
    const notifications = db.collection("notifications");
    const ids = notificationIds.map((id) => new ObjectId(id));
    await notifications.updateMany(
      { _id: { $in: ids } },
      { $set: { read: true } },
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to mark read" });
  }
});

app.post("/api/notifications/mark-all-read", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: "Missing uid" });
    const notifications = db.collection("notifications");
    await notifications.updateMany(
      { toUid: uid, read: false },
      { $set: { read: true } },
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to mark all read" });
  }
});

app.get("/api/notifications/unread-count/:uid", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const notifications = db.collection("notifications");
    const count = await notifications.countDocuments({
      toUid: req.params.uid,
      read: false,
    });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch unread count" });
  }
});

// --- VIBE WAVE: Broadcast an anonymous ping to all nearby users ---
app.post("/api/vibe/send", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { uid, radius, lat, lng } = req.body;
    if (!uid || !radius || lat == null || lng == null) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const profiles = db.collection("profiles");

    // Fetch all profiles that have a last location
    const allProfiles = await profiles
      .find({ uid: { $ne: uid }, isDiscoverable: { $ne: false }, "lastLocation.lat": { $exists: true } })
      .project({ uid: 1, lastLocation: 1 })
      .toArray();

    // Haversine filter for radius
    const R = 6371;
    const toRad = (d) => (d * Math.PI) / 180;
    const nearbyUids = allProfiles
      .filter((p) => {
        const dLat = toRad(p.lastLocation.lat - lat);
        const dLng = toRad(p.lastLocation.lng - lng);
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(toRad(lat)) * Math.cos(toRad(p.lastLocation.lat)) * Math.sin(dLng / 2) ** 2;
        const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return distKm <= radius;
      })
      .map((p) => p.uid);

    // Send vibe_wave notification to each nearby user (fire-and-forget)
    const notifPromises = nearbyUids.map((toUid) =>
      createNotification("vibe_wave", uid, toUid)
    );
    await Promise.allSettled(notifPromises);

    res.json({ sent: nearbyUids.length });
  } catch (error) {
    console.error("Failed to send vibe:", error);
    res.status(500).json({ error: "Failed to send vibe" });
  }
});

// --- VIBE ACKNOWLEDGE: Receiver taps back — sends vibe_check to original sender ---
app.post("/api/vibe/acknowledge", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { notificationId } = req.body;
    if (!notificationId) return res.status(400).json({ error: "Missing notificationId" });

    const notifications = db.collection("notifications");
    const notif = await notifications.findOne({ _id: new ObjectId(notificationId) });
    if (!notif) return res.status(404).json({ error: "Notification not found" });

    // The person who received the vibe_wave is now acknowledging — send vibe_check back to the original sender
    await createNotification("vibe_check", notif.toUid, notif.fromUid);

    res.json({ success: true });
  } catch (error) {
    console.error("Failed to acknowledge vibe:", error);
    res.status(500).json({ error: "Failed to acknowledge vibe" });
  }
});

// --- HELPER: Send Push Notification (Expo & Web) with Retry Logic ---
async function sendPushNotification(
  receiverUid,
  payloadStr,
  expoPayload,
  retryCount = 0,
  maxRetries = 2,
) {
  if (!db) return;
  try {
    const profiles = db.collection("profiles");
    const receiver = await profiles.findOne({ uid: receiverUid });
    if (!receiver) {
      console.log(`[PUSH] Receiver profile not found: ${receiverUid}`);
      return;
    }

    const expoPushToken =
      (typeof receiver.expoPushToken === "string" && receiver.expoPushToken) ||
      (typeof receiver.pushSubscription === "string" &&
        Expo.isExpoPushToken(receiver.pushSubscription)
        ? receiver.pushSubscription
        : null);

    const webPushSubscription =
      receiver.webPushSubscription ||
      (receiver.pushSubscription &&
        typeof receiver.pushSubscription === "object"
        ? receiver.pushSubscription
        : null);

    if (!expoPushToken && !webPushSubscription) {
      console.log(`[PUSH] No push tokens found for user: ${receiverUid}`);
      return;
    }

    let expoSuccess = false;
    let webSuccess = false;

    if (expoPushToken) {
      try {
        // Calculate total unread count for the badge
        const [msgCount, notifCount] = await Promise.all([
          db
            .collection("messages")
            .countDocuments({ toUid: receiverUid, read: false }),
          db
            .collection("notifications")
            .countDocuments({ toUid: receiverUid, read: false }),
        ]);
        const totalBadge = msgCount + notifCount;

        const tickets = await expo.sendPushNotificationsAsync([
          {
            to: expoPushToken,
            sound: "default",
            priority: "high",
            channelId: "default",
            badge: totalBadge,
            ttl: 2419200, // 4 weeks
            _displayInForeground: true,
            ...expoPayload,
          },
        ]);

        const receiptIds = [];
        for (const ticket of tickets || []) {
          if (ticket?.status === "error") {
            const errorCode = ticket?.details?.error;
            console.error(
              `[PUSH] Expo Push Ticket Error for ${receiverUid}:`,
              ticket,
            );
            if (errorCode === "DeviceNotRegistered") {
              console.log(
                `[PUSH] Removing invalid Expo token for ${receiverUid}`,
              );
              await profiles.updateOne(
                { uid: receiverUid },
                {
                  $unset: { expoPushToken: "" },
                  $set: { pushSubscription: null },
                },
              );
            }
          } else if (ticket?.status === "ok") {
            expoSuccess = true;
          }
          if (ticket?.id) receiptIds.push(ticket.id);
        }

        if (receiptIds.length) {
          try {
            const receipts =
              await expo.getPushNotificationReceiptsAsync(receiptIds);
            for (const receiptId of Object.keys(receipts || {})) {
              const receipt = receipts[receiptId];
              if (receipt?.status === "error") {
                console.error(
                  `[PUSH] Expo Receipt Error for ${receiverUid}:`,
                  receiptId,
                  receipt,
                );
              }
            }
          } catch (receiptErr) {
            console.error(
              `[PUSH] Expo receipt fetch failed for ${receiverUid}:`,
              receiptErr,
            );
            if (retryCount < maxRetries) {
              console.log(
                `[PUSH] Retrying Expo push for ${receiverUid} (attempt ${retryCount + 1}/${maxRetries})`,
              );
              setTimeout(
                () =>
                  sendPushNotification(
                    receiverUid,
                    payloadStr,
                    expoPayload,
                    retryCount + 1,
                    maxRetries,
                  ),
                2000,
              );
            }
          }
        }
        console.log(
          `[PUSH] Expo notification sent successfully to ${receiverUid}`,
        );
      } catch (err) {
        console.error(
          `[PUSH] Expo Push failed for ${receiverUid}:`,
          err.message,
        );
        if (retryCount < maxRetries) {
          console.log(
            `[PUSH] Retrying Expo push for ${receiverUid} (attempt ${retryCount + 1}/${maxRetries})`,
          );
          setTimeout(
            () =>
              sendPushNotification(
                receiverUid,
                payloadStr,
                expoPayload,
                retryCount + 1,
                maxRetries,
              ),
            2000,
          );
        }
      }
    }

    if (webPushSubscription) {
      try {
        await webpush.sendNotification(webPushSubscription, payloadStr);
        webSuccess = true;
        console.log(
          `[PUSH] Web push notification sent successfully to ${receiverUid}`,
        );
      } catch (err) {
        console.error(
          `[PUSH] Web Push failed for ${receiverUid}:`,
          err.message,
        );
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log(
            `[PUSH] Removing invalid web push subscription for ${receiverUid}`,
          );
          await profiles.updateOne(
            { uid: receiverUid },
            {
              $unset: { webPushSubscription: "" },
              $set: { pushSubscription: null },
            },
          );
        } else if (
          retryCount < maxRetries &&
          err.statusCode !== 410 &&
          err.statusCode !== 404
        ) {
          console.log(
            `[PUSH] Retrying web push for ${receiverUid} (attempt ${retryCount + 1}/${maxRetries})`,
          );
          setTimeout(
            () =>
              sendPushNotification(
                receiverUid,
                payloadStr,
                expoPayload,
                retryCount + 1,
                maxRetries,
              ),
            2000,
          );
        }
      }
    }

    if (!expoSuccess && !webSuccess) {
      console.warn(`[PUSH] Both push methods failed for ${receiverUid}`);
    }
  } catch (e) {
    console.error(
      `[PUSH] Error in sendPushNotification helper for ${receiverUid}:`,
      e,
    );
  }
}

app.post("/api/chat/send", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { fromUid, toUid, groupId, text, mediaType, mediaUrl, replyTo } =
      req.body;
    const messages = db.collection("messages");
    const profiles = db.collection("profiles");
    const sender = await profiles.findOne({ uid: fromUid });
    const authorName = sender?.displayName || "User";
    const authorPhoto = sender?.photoURL || "";

    let displayBody = text || "";
    if (!displayBody && mediaType) {
      if (mediaType === "image") displayBody = "sent a photo";
      else if (mediaType === "emoji") displayBody = "sent a big emoji";
      else if (mediaType === "audio") displayBody = "sent a voice note";
    }

    let newMessage = {
      fromUid,
      text,
      read: false,
      createdAt: Date.now(),
      authorName,
      authorPhoto,
      mediaType,
      mediaUrl,
      ...(replyTo ? { replyTo } : {}),
    };

    if (groupId) {
      // --- 1. Try community rooms first ---
      let community = null;
      if (ObjectId.isValid(groupId)) {
        community = await db
          .collection("communities")
          .findOne({ _id: new ObjectId(groupId) });
      }
      if (!community) {
        community = await db
          .collection("communities")
          .findOne({ _id: groupId });
      }

      let groupTitle, recipients;

      if (community) {
        // Community room
        if (!community.members.includes(fromUid)) {
          return res
            .status(403)
            .json({ error: "You are not a member of this room" });
        }
        groupTitle = community.name;
        newMessage.groupId = community._id.toString();
        newMessage.groupTitle = groupTitle;
        recipients = new Set(community.members);
        // Keep lastActivity fresh
        await db.collection("communities").updateOne(
          { _id: community._id },
          { $set: { lastActivity: Date.now() } }
        );
        await updateQuestProgress(fromUid, 'visit_room');
        // Keep lastActivity fresh
        await db
          .collection("communities")
          .updateOne(
            { _id: community._id },
            { $set: { lastActivity: Date.now() } },
          );
      } else {
        // --- 2. Fall back to meetup posts ---
        const posts = db.collection("posts");
        let query = {};
        if (ObjectId.isValid(groupId)) {
          query = { _id: new ObjectId(groupId) };
        } else {
          query = { _id: groupId };
        }
        const post = await posts.findOne(query);
        if (!post) return res.status(404).json({ error: "Group not found" });

        const isHost = post.uid === fromUid;
        const isAttendee = post.attendees && post.attendees.includes(fromUid);
        if (!isHost && !isAttendee) {
          return res
            .status(403)
            .json({ error: "You are not a member of this group" });
        }
        groupTitle = post.meetupDetails?.title || "Meetup Group";
        newMessage.groupId = String(post._id);
        newMessage.groupTitle = groupTitle;
        recipients = new Set([...(post.attendees || []), post.uid]);
      }

      const result = await messages.insertOne(newMessage);
      const fullMessage = { ...newMessage, _id: result.insertedId };

      const notifUrl = community
        ? {
          expo: `/community/${community._id}`,
          web: `/app/rooms/${community._id}`,
        }
        : { expo: `/chat/group/${groupId}`, web: `/chat/group/${groupId}` };

      const expoPayload = {
        title: `💬 ${groupTitle}`,
        body: `${authorName}: ${displayBody}`,
        data: { url: notifUrl.expo },
      };
      const webPayloadStr = JSON.stringify({
        title: `💬 ${groupTitle}`,
        body: `${authorName}: ${displayBody}`,
        icon: authorPhoto || "/pwa-192x192.png",
        data: { url: notifUrl.web },
      });

      for (const uid of recipients) {
        sendToUser(uid, fullMessage);
        // Push only — no notification document, badge is driven client-side from the WS message
        if (uid !== fromUid)
          sendPushNotification(uid, webPayloadStr, expoPayload).catch(() => { });
      }

      return res.json(fullMessage);
    } else {
      newMessage.toUid = toUid;
      const result = await messages.insertOne(newMessage);
      const fullMessage = { ...newMessage, _id: result.insertedId };

      sendToUser(toUid, fullMessage);
      sendToUser(fromUid, fullMessage);

      // Dispatch Push to receiver
      const expoPayload = {
        title: authorName,
        body: displayBody,
        data: { url: `/chat/${fromUid}` },
      };
      const webPayloadStr = JSON.stringify({
        title: authorName,
        body: displayBody,
        icon: authorPhoto || "/pwa-192x192.png",
        data: { url: `/chat/${fromUid}` },
      });
      await sendPushNotification(toUid, webPayloadStr, expoPayload);

      // Quest: Friendly Face (greet high match)
      const targetUser = await profiles.findOne({ uid: toUid });
      if (targetUser && sender) {
        const uInterests = targetUser.interests || [];
        const myInterests = sender.interests || [];
        const overlap = uInterests.filter(i => myInterests.includes(i)).length;
        if (overlap >= 2) { // 2+ shared interests is high enough for "High Match"
          await updateQuestProgress(fromUid, 'greet_match');
        }
      }

      return res.json(fullMessage);
    }
  } catch (error) {
    console.error("Chat Send Error:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

app.get("/api/chat/history/:uid1/:uid2", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { uid1, uid2 } = req.params;
    const messages = db.collection("messages");
    const history = await messages
      .find({
        $or: [
          { fromUid: uid1, toUid: uid2 },
          { fromUid: uid2, toUid: uid1 },
        ],
      })
      .sort({ createdAt: 1 })
      .toArray();
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

app.get("/api/chat/history/:groupId", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { groupId } = req.params;
    const messages = db.collection("messages");

    // Support both string and ObjectId storage for robustness
    let query = { groupId: String(groupId) };
    if (ObjectId.isValid(groupId)) {
      query = {
        $or: [{ groupId: String(groupId) }, { groupId: new ObjectId(groupId) }],
      };
    }

    const history = await messages.find(query).sort({ createdAt: 1 }).toArray();
    res.json(history);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch group history" });
  }
});

app.get("/api/chat/inbox/:uid", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { uid } = req.params;
    const messages = db.collection("messages");

    // 1. Direct Messages
    const directPipeline = [
      {
        $match: {
          groupId: { $exists: false },
          $or: [{ fromUid: uid }, { toUid: uid }],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: { $cond: [{ $eq: ["$fromUid", uid] }, "$toUid", "$fromUid"] },
          lastMessage: { $first: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$toUid", uid] }, { $eq: ["$read", false] }] },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: "profiles",
          localField: "_id",
          foreignField: "uid",
          as: "otherUser",
        },
      },
      { $unwind: "$otherUser" },
      {
        $project: {
          _id: 0,
          type: "direct",
          partner: "$otherUser",
          lastMessage: 1,
          unreadCount: 1,
        },
      },
    ];

    // 2. Group Chats (Meetups) - Fetch all active meetups user is part of
    const posts = db.collection("posts");
    const userGroups = await posts
      .find({
        $or: [{ uid: uid }, { attendees: uid }],
        type: "meetup",
      })
      .project({ _id: 1, meetupDetails: 1, createdAt: 1 })
      .toArray();

    const groupIds = userGroups.map((g) => g._id.toString());
    const groupObjectIds = userGroups.map((g) => g._id);

    // Get actual last messages for these groups, robust against ID type
    const groupPipeline = [
      {
        $match: {
          $or: [
            { groupId: { $in: groupIds } },
            { groupId: { $in: groupObjectIds } },
          ],
        },
      },
      { $sort: { createdAt: -1 } },
      // Normalize groupId to string for grouping to avoid duplicate entries for same group
      {
        $group: {
          _id: { $toString: "$groupId" },
          lastMessage: { $first: "$$ROOT" },
        },
      },
    ];

    const [directChats, groupMessages] = await Promise.all([
      messages.aggregate(directPipeline).toArray(),
      messages.aggregate(groupPipeline).toArray(),
    ]);

    // Map existing messages
    const groupMsgMap = {};
    groupMessages.forEach((g) => {
      groupMsgMap[g._id] = g.lastMessage;
    });

    // Construct persistent group chat items
    const groupChats = userGroups.map((g) => {
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
          _id: "synthetic_" + gid,
          fromUid: "system",
          text: "Meetup created",
          createdAt: g.createdAt,
          groupTitle: g.meetupDetails?.title,
          read: true,
        };
      }

      return {
        type: "group",
        groupId: gid,
        lastMessage: lastMessage,
        unreadCount: 0, // Future: implement group read receipts
      };
    });

    // Combine and sort by latest activity
    const allChats = [...directChats, ...groupChats].sort(
      (a, b) => b.lastMessage.createdAt - a.lastMessage.createdAt,
    );

    res.json(allChats);
  } catch (error) {
    console.error("Inbox Error", error);
    res.status(500).json({ error: "Failed to fetch inbox" });
  }
});

app.post("/api/chat/mark-read", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { myUid, partnerUid, groupId } = req.body;
    const messages = db.collection("messages");
    if (!groupId) {
      await messages.updateMany(
        { toUid: myUid, fromUid: partnerUid, read: false },
        { $set: { read: true } },
      );
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to mark messages as read" });
  }
});

// Delete (unsend) a single message — only the sender can do this
app.delete("/api/chat/message/:messageId", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { messageId } = req.params;
    const { fromUid } = req.body;
    if (!fromUid) return res.status(400).json({ error: "fromUid required" });

    const messages = db.collection("messages");
    const { ObjectId } = require("mongodb");
    let query;
    try {
      query = { _id: new ObjectId(messageId), fromUid };
    } catch {
      return res.status(400).json({ error: "Invalid message ID" });
    }

    const result = await messages.updateOne(query, {
      $set: { deleted: true, text: "", mediaUrl: null },
    });
    if (result.matchedCount === 0)
      return res.status(403).json({ error: "Not found or not your message" });

    // Broadcast deletion to WebSocket clients
    const broadcastDelete = (uid) => {
      if (clients.has(uid)) {
        clients.get(uid).forEach((ws) => {
          if (ws.readyState === 1)
            ws.send(JSON.stringify({ type: "message_deleted", messageId }));
        });
      }
    };

    // Get message to find the recipient to notify
    const msg = await messages.findOne({ _id: new ObjectId(messageId) });
    if (msg) {
      if (msg.toUid) broadcastDelete(msg.toUid);
      if (msg.groupId) {
        // broadcast to all group members via their open sockets
        clients.forEach((_, uid) => broadcastDelete(uid));
      }
    }
    broadcastDelete(fromUid);

    res.json({ success: true });
  } catch (e) {
    console.error("Delete message error:", e);
    res.status(500).json({ error: "Failed to delete message" });
  }
});

app.get("/api/chat/unread-count/:uid", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { uid } = req.params;
    const messages = db.collection("messages");
    const count = await messages.countDocuments({ toUid: uid, read: false });
    res.json({ count });
  } catch (e) {
    res.status(500).json({ error: "Failed to get unread count" });
  }
});

// =====================
// STORIES (MOMENTS)
// =====================
app.post("/api/stories", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { uid, authorName, authorPhoto, imageURL, location } = req.body;
    if (!uid || !imageURL)
      return res.status(400).json({ error: "Missing required fields" });

    const newStory = {
      uid,
      authorName,
      authorPhoto,
      imageURL,
      location, // { lat, lng, name }
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      views: [], // Track uids of viewers
    };

    const result = await db.collection("stories").insertOne(newStory);
    res.json({ ...newStory, _id: result.insertedId });
  } catch (error) {
    console.error("Create Story Error:", error);
    res.status(500).json({ error: "Failed to create story" });
  }
});

app.get("/api/stories", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { viewerUid } = req.query;
    const profile = viewerUid
      ? await db.collection("profiles").findOne({ uid: viewerUid })
      : null;
    const myLocation = profile?.lastLocation;
    const radius = profile?.discoveryRadius || 10; // km

    const now = Date.now();
    const query = { expiresAt: { $gt: now } };

    const stories = await db
      .collection("stories")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    // Group by User
    const groupedStories = stories.reduce((acc, story) => {
      // Geo-filtering
      if (myLocation && story.location && story.uid !== viewerUid) {
        const R = 6371; // km
        const dLat = ((story.location.lat - myLocation.lat) * Math.PI) / 180;
        const dLon = ((story.location.lng - myLocation.lng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((myLocation.lat * Math.PI) / 180) *
          Math.cos((story.location.lat * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const dist = R * c;
        if (dist > radius) return acc;
      }

      if (!acc[story.uid]) {
        acc[story.uid] = {
          uid: story.uid,
          authorName: story.authorName,
          authorPhoto: story.authorPhoto,
          stories: [],
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

app.post("/api/stories/:storyId/view", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { storyId } = req.params;
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: "Missing uid" });

    await db
      .collection("stories")
      .updateOne({ _id: new ObjectId(storyId) }, { $addToSet: { views: uid } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to record view" });
  }
});

app.delete("/api/stories/:storyId", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { storyId } = req.params;
    const { uid } = req.body; // Owner UID for verification

    const result = await db.collection("stories").deleteOne({
      _id: new ObjectId(storyId),
      uid: uid,
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

// --- Chat Expiration Logic ---
const CHAT_EXPIRATION_DAYS = 7;
const CHAT_EXPIRATION_MS = CHAT_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;

async function expireInactiveChats() {
  if (!db) return;
  try {
    const chats = db.collection("chats");
    const now = Date.now();

    // Mark chats as expired if inactive for 7 days
    await chats.updateMany(
      {
        lastActivity: { $lt: now - CHAT_EXPIRATION_MS },
        expired: { $ne: true },
      },
      { $set: { expired: true } },
    );
  } catch (e) {
    console.error("Error expiring inactive chats:", e);
  }
}

// Schedule chat expiration job
setInterval(expireInactiveChats, 24 * 60 * 60 * 1000); // Run daily

// --- Revive Chat API ---
app.post("/api/chats/:chatId/revive", requireAuth, async (req, res) => {
  const { chatId } = req.params;
  const uid = req.body.uid;

  if (!db) return res.status(500).json({ error: "Database not initialized" });

  try {
    const chats = db.collection("chats");
    const chat = await chats.findOne({ _id: new ObjectId(chatId) });

    if (!chat) return res.status(404).json({ error: "Chat not found" });
    if (chat.expired !== true)
      return res.status(400).json({ error: "Chat is not expired" });

    // Revive the chat
    await chats.updateOne(
      { _id: new ObjectId(chatId) },
      { $set: { expired: false, lastActivity: Date.now() } },
    );

    res.json({ message: "Chat revived successfully" });
  } catch (e) {
    console.error("Error reviving chat:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// --- COMMUNITY ROOMS ---
// ============================================================

// Create a community room
app.post("/api/communities", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { uid, name, description, tags, isPrivate, location } = req.body;
    if (!uid || !name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "uid and name are required" });
    }
    const trimmedName = name.trim().slice(0, 80);
    if (trimmedName.length < 2)
      return res
        .status(400)
        .json({ error: "Name must be at least 2 characters" });
    const communities = db.collection("communities");
    const result = await communities.insertOne({
      name: trimmedName,
      description: (description || "").trim().slice(0, 300),
      ownerUid: uid,
      members: [uid],
      createdAt: Date.now(),
      lastActivity: Date.now(),
      tags: Array.isArray(tags)
        ? tags.slice(0, 5).map((t) => String(t).slice(0, 30))
        : [],
      isPrivate: isPrivate === true,
      pinnedMessageId: null,
      pinnedMessageText: null,
      location: location || null, // Optional location
    });
    res.json({ success: true, id: result.insertedId.toString() });
  } catch (e) {
    console.error("Create community error:", e);
    res.status(500).json({ error: "Failed to create community" });
  }
});

// List all public communities (with optional radius filter)
app.get("/api/communities", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { lat, lng, radius } = req.query;
    const communities = db.collection("communities");

    let filter = {};
    const radiusInKm = radius ? parseFloat(radius) : null;

    if (lat && lng && radiusInKm) {
      const centerLat = parseFloat(lat);
      const centerLng = parseFloat(lng);
      const latDelta = radiusInKm / 111.32;
      const lngDelta = radiusInKm / (111.32 * Math.cos(centerLat * Math.PI / 180));

      filter = {
        $or: [
          { location: null }, // Global rooms
          {
            "location.lat": { $gte: centerLat - latDelta, $lte: centerLat + latDelta },
            "location.lng": { $gte: centerLng - lngDelta, $lte: centerLng + lngDelta }
          }
        ]
      };
    }

    const list = await communities
      .find(filter)
      .sort({ lastActivity: -1 })
      .limit(100)
      .toArray();
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch communities" });
  }
});

// Get a single community
app.get("/api/communities/:id", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid ID" });
    const communities = db.collection("communities");
    const community = await communities.findOne({ _id: new ObjectId(id) });
    if (!community)
      return res.status(404).json({ error: "Community not found" });
    res.json(community);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch community" });
  }
});

// Join a community
app.post("/api/communities/:id/join", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { id } = req.params;
    const { uid } = req.body;
    if (!uid || !ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid request" });
    const communities = db.collection("communities");
    const community = await communities.findOne({ _id: new ObjectId(id) });
    if (!community)
      return res.status(404).json({ error: "Community not found" });
    await communities.updateOne(
      { _id: new ObjectId(id) },
      { $addToSet: { members: uid }, $set: { lastActivity: Date.now() } },
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to join community" });
  }
});

// Leave a community
app.post("/api/communities/:id/leave", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { id } = req.params;
    const { uid } = req.body;
    if (!uid || !ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid request" });
    const communities = db.collection("communities");
    const community = await communities.findOne({ _id: new ObjectId(id) });
    if (!community)
      return res.status(404).json({ error: "Community not found" });
    if (community.ownerUid === uid)
      return res
        .status(400)
        .json({ error: "Owner cannot leave. Delete the room instead." });
    await communities.updateOne(
      { _id: new ObjectId(id) },
      { $pull: { members: uid } },
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to leave community" });
  }
});

// Update a community (owner only)
app.put("/api/communities/:id", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { id } = req.params;
    const { uid, name, description } = req.body;
    if (!uid || !ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid request" });
    const communities = db.collection("communities");
    const community = await communities.findOne({ _id: new ObjectId(id) });
    if (!community)
      return res.status(404).json({ error: "Community not found" });
    if (community.ownerUid !== uid)
      return res
        .status(403)
        .json({ error: "Only the owner can edit this room" });
    const updates = {};
    if (name && name.trim().length >= 2)
      updates.name = name.trim().slice(0, 80);
    if (description !== undefined)
      updates.description = (description || "").trim().slice(0, 300);
    if (Array.isArray(req.body.tags))
      updates.tags = req.body.tags
        .slice(0, 5)
        .map((t) => String(t).slice(0, 30));
    if (typeof req.body.isPrivate === "boolean")
      updates.isPrivate = req.body.isPrivate;
    await communities.updateOne({ _id: new ObjectId(id) }, { $set: updates });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to update community" });
  }
});

// Delete a community (owner only)
app.delete("/api/communities/:id", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { id } = req.params;
    const { uid } = req.body;
    if (!uid || !ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid request" });
    const communities = db.collection("communities");
    const community = await communities.findOne({ _id: new ObjectId(id) });
    if (!community)
      return res.status(404).json({ error: "Community not found" });
    if (community.ownerUid !== uid)
      return res
        .status(403)
        .json({ error: "Only the owner can delete this room" });
    await communities.deleteOne({ _id: new ObjectId(id) });
    // Remove all messages for this room
    await db.collection("messages").deleteMany({ groupId: id });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to delete community" });
  }
});

// Delete a single group message (sender or room owner)
app.delete("/api/communities/:id/messages/:msgId", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { id, msgId } = req.params;
    const { uid } = req.body;
    if (!uid || !ObjectId.isValid(msgId) || !ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid request" });
    const messages = db.collection("messages");
    const msg = await messages.findOne({ _id: new ObjectId(msgId) });
    if (!msg) return res.status(404).json({ error: "Message not found" });
    const community = await db
      .collection("communities")
      .findOne({ _id: new ObjectId(id) });
    const isOwner = community?.ownerUid === uid;
    if (msg.fromUid !== uid && !isOwner)
      return res.status(403).json({ error: "Not authorized" });
    await messages.updateOne(
      { _id: new ObjectId(msgId) },
      { $set: { deleted: true, text: "", mediaUrl: null } },
    );
    // Broadcast deletion to room subscribers
    const roomWs = rooms?.get(id);
    if (roomWs) {
      const payload = JSON.stringify({
        type: "message_deleted",
        messageId: msgId,
      });
      roomWs.forEach((ws) => {
        try {
          ws.send(payload);
        } catch { }
      });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to delete message" });
  }
});

// Pin a message (room owner only)
app.put("/api/communities/:id/pin", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { id } = req.params;
    const { uid, messageId, messageText } = req.body;
    if (!uid || !ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid request" });
    const community = await db
      .collection("communities")
      .findOne({ _id: new ObjectId(id) });
    if (!community)
      return res.status(404).json({ error: "Community not found" });
    if (community.ownerUid !== uid)
      return res.status(403).json({ error: "Only the owner can pin messages" });
    await db
      .collection("communities")
      .updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            pinnedMessageId: messageId || null,
            pinnedMessageText: messageText || null,
          },
        },
      );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to pin message" });
  }
});

// ============================================================
// SUPER ADMIN ROUTES
// All routes require the X-Admin-Secret header to match
// SUPER_ADMIN_SECRET in the environment.
// ============================================================
const SUPER_ADMIN_SECRET =
  process.env.SUPER_ADMIN_SECRET || "orbyt_super_sssssadmin_secret_change_me";

function requireAdmin(req, res, next) {
  const provided = req.headers["x-admin-secret"];
  if (!provided || provided !== SUPER_ADMIN_SECRET) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

// Admin login — just validates the secret and returns a session token
app.post("/api/admin/login", authLimiter, (req, res) => {
  const { secret } = req.body;
  if (!secret || secret !== SUPER_ADMIN_SECRET) {
    return res.status(403).json({ error: "Invalid admin credentials" });
  }
  // Return the secret itself as the "token" — the client stores it
  // and sends it back as X-Admin-Secret on every subsequent request.
  res.json({ success: true, token: SUPER_ADMIN_SECRET });
});

// GET /api/admin/users — server-side search / filter / sort / pagination
app.get("/api/admin/users", requireAdmin, async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100000, Math.max(1, parseInt(req.query.limit) || 50));
    const search = (req.query.search || "").trim().toLowerCase();
    const filter = req.query.filter || "all"; // all|flagged|suspended
    const sortBy = req.query.sort || "reportCount"; // reportCount|postCount|displayName|createdAt|friendCount
    const sortDir = req.query.sortDir === "asc" ? 1 : -1;

    const usersCol = db.collection("users");
    const profiles = db.collection("profiles");
    const posts = db.collection("posts");
    const stories = db.collection("stories");
    const reports = db.collection("reports");

    const [allUsers, allProfiles, postCounts, storyCounts, reportCounts] =
      await Promise.all([
        usersCol
          .find({})
          .project({ _id: 1, email: 1, createdAt: 1, authType: 1 })
          .toArray(),
        profiles
          .find({})
          .project({
            uid: 1,
            displayName: 1,
            photoURL: 1,
            createdAt: 1,
            jobRole: 1,
            bio: 1,
            friends: 1,
            isSuspended: 1,
          })
          .toArray(),
        posts
          .aggregate([{ $group: { _id: "$uid", count: { $sum: 1 } } }])
          .toArray(),
        stories
          .aggregate([{ $group: { _id: "$uid", count: { $sum: 1 } } }])
          .toArray(),
        reports
          .aggregate([{ $group: { _id: "$targetUid", count: { $sum: 1 } } }])
          .toArray(),
      ]);

    const profileMap = {};
    allProfiles.forEach((p) => {
      profileMap[p.uid] = p;
    });
    const postCountMap = {};
    postCounts.forEach((r) => {
      postCountMap[r._id] = r.count;
    });
    const storyCountMap = {};
    storyCounts.forEach((r) => {
      storyCountMap[r._id] = r.count;
    });
    const reportCountMap = {};
    reportCounts.forEach((r) => {
      reportCountMap[r._id] = r.count;
    });

    let result = allUsers.map((u) => {
      const uid = u._id.toString();
      const p = profileMap[uid] || {};
      return {
        uid,
        email: u.email,
        authType: u.authType || "email",
        displayName: p.displayName || u.email?.split("@")[0] || "Unknown",
        photoURL: p.photoURL || "",
        badgeTitle: p.badgeTitle || "",
        bio: p.bio || "",
        jobRole: p.jobRole || "",
        createdAt: u.createdAt,
        postCount: postCountMap[uid] || 0,
        storyCount: storyCountMap[uid] || 0,
        reportCount: reportCountMap[uid] || 0,
        friendCount: (p.friends || []).length,
        isSuspended: p.isSuspended || false,
      };
    });

    // Counts before search/filter (for filter pill badges)
    const counts = {
      all: result.length,
      flagged: result.filter((u) => u.reportCount > 0).length,
      suspended: result.filter((u) => u.isSuspended).length,
    };

    // Search
    if (search) {
      result = result.filter(
        (u) =>
          (u.displayName || "").toLowerCase().includes(search) ||
          (u.email || "").toLowerCase().includes(search) ||
          u.uid.includes(search),
      );
    }

    // Filter
    if (filter === "flagged") result = result.filter((u) => u.reportCount > 0);
    else if (filter === "suspended")
      result = result.filter((u) => u.isSuspended);

    // Sort
    result.sort((a, b) => {
      let diff = 0;
      if (sortBy === "displayName")
        diff = (a.displayName || "").localeCompare(b.displayName || "");
      else if (sortBy === "createdAt")
        diff =
          (new Date(a.createdAt).getTime() || 0) -
          (new Date(b.createdAt).getTime() || 0);
      else if (sortBy === "postCount") diff = a.postCount - b.postCount;
      else if (sortBy === "friendCount") diff = a.friendCount - b.friendCount;
      else diff = a.reportCount - b.reportCount;
      return diff * sortDir;
    });

    const total = result.length;
    const pages = Math.max(1, Math.ceil(total / limit));
    res.json({
      users: result.slice((page - 1) * limit, page * limit),
      total,
      page,
      pages,
      counts,
    });
  } catch (e) {
    console.error("Admin get users error:", e);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// GET /api/admin/users/:uid/comprehensive - comprehensive user details
app.get("/api/admin/users/:uid/comprehensive", requireAdmin, async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { uid } = req.params;
    
    let auth = null;
    try {
      auth = await db.collection("users").findOne({ _id: new ObjectId(uid) }, { projection: { password: 0 } });
    } catch(e) {}
    
    const profile = await db.collection("profiles").findOne({ uid });
    const posts = await db.collection("posts").find({ uid }).sort({ createdAt: -1 }).toArray();
    
    const commentedPosts = await db.collection("posts").find({ "comments.uid": uid }).toArray();
    const comments = [];
    commentedPosts.forEach(post => {
      post.comments?.forEach(comment => {
        if (comment.uid === uid) {
          comments.push({ ...comment, postId: post._id });
        }
      });
    });
    
    const stories = await db.collection("stories").find({ uid }).toArray();
    const communities = await db.collection("communities").find({
      $or: [{ creatorUid: uid }, { members: uid }]
    }).toArray();
    const chats = await db.collection("messages").find({
      $or: [{ senderId: uid }, { receiverId: uid }]
    }).sort({ timestamp: -1 }).toArray();
    const reports = await db.collection("reports").find({
      $or: [{ reportedUid: uid }, { reporterUid: uid }]
    }).sort({ createdAt: -1 }).toArray();
    
    res.json({
      auth,
      profile,
      posts,
      comments,
      communities,
      chats,
      reports,
      stories
    });
  } catch (error) {
    console.error("Comprehensive user fetch error:", error);
    res.status(500).json({ error: "Failed to fetch comprehensive user details" });
  }
});

// DELETE /api/admin/users/bulk — bulk delete specific users by UID
app.delete("/api/admin/users/bulk", requireAdmin, async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { uids } = req.body;
    if (!Array.isArray(uids) || uids.length === 0) {
      return res.status(400).json({ error: "No user IDs provided" });
    }

    const collections = {
      users: db.collection("users"),
      profiles: db.collection("profiles"),
      posts: db.collection("posts"),
      stories: db.collection("stories"),
      messages: db.collection("messages"),
      notifications: db.collection("notifications"),
      reports: db.collection("reports"),
      profile_views: db.collection("profile_views"),
      communities: db.collection("communities"),
    };

    let deletedCount = 0;
    for (const uid of uids) {
      if (ObjectId.isValid(uid)) {
        await collections.users.deleteOne({ _id: new ObjectId(uid) });
      }
      await collections.profiles.deleteOne({ uid });
      await collections.posts.deleteMany({ uid });
      await collections.stories.deleteMany({ uid });
      await collections.messages.deleteMany({ $or: [{ fromUid: uid }, { toUid: uid }] });
      await collections.notifications.deleteMany({ $or: [{ fromUid: uid }, { toUid: uid }] });
      await collections.reports.deleteMany({ $or: [{ reporterUid: uid }, { targetUid: uid }] });
      await collections.profile_views.deleteMany({ $or: [{ viewerUid: uid }, { targetUid: uid }] });
      await collections.profiles.updateMany({}, {
        $pull: { friends: uid, incomingRequests: uid, outgoingRequests: uid, blockedUsers: uid, passedUsers: uid }
      });
      await collections.communities.updateMany({}, { $pull: { members: uid } });
      await collections.posts.updateMany({}, { $pull: { comments: { uid }, likedBy: uid } });
      deletedCount++;
    }

    const affectedPosts = await collections.posts
      .find({ likedBy: { $exists: true } })
      .toArray();
    for (const post of affectedPosts) {
      await collections.posts.updateOne(
        { _id: post._id },
        { $set: { likes: (post.likedBy || []).length } },
      );
    }

    res.json({ success: true, deleted: deletedCount });
  } catch (e) {
    res.status(500).json({ error: "Failed to bulk delete selected users" });
  }
});


// DELETE /api/admin/users/bulk-flagged — bulk delete users with >= minReports
app.delete("/api/admin/users/bulk-flagged", requireAdmin, async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const minReports = parseInt(req.query.minReports) || 3;
    const pendingReports = await db
      .collection("reports")
      .find({ status: "pending" })
      .toArray();
      
    const countMap = {};
    pendingReports.forEach((r) => {
      if (r.targetUid) countMap[r.targetUid] = (countMap[r.targetUid] || 0) + 1;
    });
    
    const uidsToDelete = Object.entries(countMap)
      .filter(([, cnt]) => cnt >= minReports)
      .map(([id]) => id);
      
    if (uidsToDelete.length === 0) return res.json({ success: true, deleted: 0 });

    const collections = {
      users: db.collection("users"),
      profiles: db.collection("profiles"),
      posts: db.collection("posts"),
      stories: db.collection("stories"),
      messages: db.collection("messages"),
      notifications: db.collection("notifications"),
      reports: db.collection("reports"),
      profile_views: db.collection("profile_views"),
      communities: db.collection("communities"),
    };

    let deletedCount = 0;
    for (const uid of uidsToDelete) {
      if (ObjectId.isValid(uid)) {
        await collections.users.deleteOne({ _id: new ObjectId(uid) });
      }
      await collections.profiles.deleteOne({ uid });
      await collections.posts.deleteMany({ uid });
      await collections.stories.deleteMany({ uid });
      await collections.messages.deleteMany({ $or: [{ fromUid: uid }, { toUid: uid }] });
      await collections.notifications.deleteMany({ $or: [{ fromUid: uid }, { toUid: uid }] });
      await collections.reports.deleteMany({ $or: [{ reporterUid: uid }, { targetUid: uid }] });
      await collections.profile_views.deleteMany({ $or: [{ viewerUid: uid }, { targetUid: uid }] });
      await collections.profiles.updateMany({}, {
        $pull: { friends: uid, incomingRequests: uid, outgoingRequests: uid, blockedUsers: uid, passedUsers: uid }
      });
      await collections.communities.updateMany({}, { $pull: { members: uid } });
      await collections.posts.updateMany({}, { $pull: { comments: { uid }, likedBy: uid } });
      deletedCount++;
    }
    
    const affectedPosts = await collections.posts
      .find({ likedBy: { $exists: true } })
      .toArray();
    for (const post of affectedPosts) {
      await collections.posts.updateOne(
        { _id: post._id },
        { $set: { likes: (post.likedBy || []).length } },
      );
    }

    res.json({ success: true, deleted: deletedCount });
  } catch (e) {
    res.status(500).json({ error: "Failed to bulk delete users" });
  }
});

// DELETE /api/admin/users/:uid — permanently delete a user and ALL their data
app.delete("/api/admin/users/:uid", requireAdmin, async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { uid } = req.params;
    if (!uid) return res.status(400).json({ error: "Missing uid" });

    const collections = {
      users: db.collection("users"),
      profiles: db.collection("profiles"),
      posts: db.collection("posts"),
      stories: db.collection("stories"),
      messages: db.collection("messages"),
      notifications: db.collection("notifications"),
      reports: db.collection("reports"),
      profile_views: db.collection("profile_views"),
      communities: db.collection("communities"),
    };

    // 1. Delete user auth record
    if (ObjectId.isValid(uid)) {
      await collections.users.deleteOne({ _id: new ObjectId(uid) });
    }

    // 2. Delete profile
    await collections.profiles.deleteOne({ uid });

    // 3. Delete all posts
    await collections.posts.deleteMany({ uid });

    // 4. Delete all stories
    await collections.stories.deleteMany({ uid });

    // 5. Delete all messages sent or received
    await collections.messages.deleteMany({
      $or: [{ fromUid: uid }, { toUid: uid }],
    });

    // 6. Delete all notifications involving this user
    await collections.notifications.deleteMany({
      $or: [{ fromUid: uid }, { toUid: uid }],
    });

    // 7. Delete all reports by or against this user
    await collections.reports.deleteMany({
      $or: [{ reporterUid: uid }, { targetUid: uid }],
    });

    // 8. Delete profile views
    await collections.profile_views.deleteMany({
      $or: [{ viewerUid: uid }, { targetUid: uid }],
    });

    // 9. Remove this user from all friend/block lists
    await collections.profiles.updateMany(
      {},
      {
        $pull: {
          friends: uid,
          incomingRequests: uid,
          outgoingRequests: uid,
          blockedUsers: uid,
          passedUsers: uid,
        },
      },
    );

    // 10. Remove from community member lists
    await collections.communities.updateMany(
      {},
      {
        $pull: { members: uid },
      },
    );

    // 11. Remove comments & likes left by this user on posts
    await collections.posts.updateMany(
      {},
      {
        $pull: { comments: { uid }, likedBy: uid },
      },
    );
    // Re-calculate like counts
    const affectedPosts = await collections.posts
      .find({ likedBy: { $exists: true } })
      .toArray();
    for (const post of affectedPosts) {
      await collections.posts.updateOne(
        { _id: post._id },
        { $set: { likes: (post.likedBy || []).length } },
      );
    }

    // Log admin action
    auditLogs.push({
      timestamp: new Date().toISOString(),
      action: "admin_delete_user",
      targetUid: uid,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: `User ${uid} and all their data have been permanently deleted.`,
    });
  } catch (e) {
    console.error("Admin delete user error:", e);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// GET /api/admin/reports — server-side status-filter / search / pagination
app.get("/api/admin/reports", requireAdmin, async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
    const status = req.query.status || "all"; // all|pending|resolved|dismissed
    const search = (req.query.search || "").trim().toLowerCase();
    const typeFilter = req.query.type || "all"; // all|user|post|story|meetup|community

    const allReports = await db
      .collection("reports")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    // Enrich reporter / target profiles
    const uids = [
      ...new Set(
        allReports.flatMap((r) => [r.reporterUid, r.targetUid].filter(Boolean)),
      ),
    ];
    const profileDocs = await db
      .collection("profiles")
      .find({ uid: { $in: uids } })
      .project({ uid: 1, displayName: 1, photoURL: 1 })
      .toArray();
    const profileMap = {};
    profileDocs.forEach((p) => {
      profileMap[p.uid] = p;
    });

    // Enrich posts (post / meetup type)
    const postIds = allReports
      .filter((r) => r.postId && ObjectId.isValid(r.postId))
      .map((r) => new ObjectId(r.postId));
    const postDocs =
      postIds.length > 0
        ? await db
          .collection("posts")
          .find({ _id: { $in: postIds } })
          .project({
            _id: 1,
            content: 1,
            imageURL: 1,
            type: 1,
            meetupDetails: 1,
          })
          .toArray()
        : [];
    const postMap = {};
    postDocs.forEach((p) => {
      postMap[p._id.toString()] = p;
    });

    // Enrich stories
    const storyIds = allReports.filter((r) => r.storyId).map((r) => r.storyId);
    const storyDocs =
      storyIds.length > 0
        ? await db
          .collection("stories")
          .find({
            $or: [
              {
                _id: {
                  $in: storyIds
                    .filter((id) => ObjectId.isValid(id))
                    .map((id) => new ObjectId(id)),
                },
              },
              { _id: { $in: storyIds } },
            ],
          })
          .project({
            _id: 1,
            uid: 1,
            imageURL: 1,
            videoURL: 1,
            text: 1,
            caption: 1,
          })
          .toArray()
        : [];
    const storyMap = {};
    storyDocs.forEach((s) => {
      storyMap[s._id.toString()] = s;
    });

    // Enrich communities
    const comIds = allReports
      .filter((r) => r.communityId && ObjectId.isValid(r.communityId))
      .map((r) => new ObjectId(r.communityId));
    const comDocs =
      comIds.length > 0
        ? await db
          .collection("communities")
          .find({ _id: { $in: comIds } })
          .project({ _id: 1, name: 1, description: 1 })
          .toArray()
        : [];
    const comMap = {};
    comDocs.forEach((c) => {
      comMap[c._id.toString()] = c;
    });

    let enriched = allReports.map((r) => {
      // Infer type for legacy records without a type field
      let resolvedType = r.type;
      if (!resolvedType) {
        if (r.storyId) resolvedType = "story";
        else if (r.communityId) resolvedType = "community";
        else if (r.postId) resolvedType = "post";
        else resolvedType = "user";
      }

      const post = r.postId ? postMap[r.postId] : null;
      const story = r.storyId ? storyMap[r.storyId] : null;
      const community = r.communityId ? comMap[r.communityId] : null;

      return {
        ...r,
        _id: r._id.toString(),
        type: resolvedType,
        reporterName: profileMap[r.reporterUid]?.displayName || "Unknown",
        reporterPhoto: profileMap[r.reporterUid]?.photoURL || null,
        targetName:
          profileMap[r.targetUid]?.displayName ||
          (community?.name ? `Room: ${community.name}` : "Unknown"),
        targetPhoto: profileMap[r.targetUid]?.photoURL || null,
        // Post content (post/meetup)
        postContent: post?.content || null,
        postImageURL: post?.imageURL || null,
        postType: post?.type || null,
        // Story content
        storyImageURL: story?.imageURL || story?.videoURL || null,
        storyCaption: story?.caption || story?.text || null,
        // Community info
        communityName: community?.name || null,
        communityDescription: community?.description || null,
      };
    });

    // Status counts before any filtering
    const statusCounts = {
      all: enriched.length,
      pending: enriched.filter((r) => r.status === "pending").length,
      resolved: enriched.filter((r) => r.status === "resolved").length,
      dismissed: enriched.filter((r) => r.status === "dismissed").length,
    };

    // Type counts
    const typeCounts = {};
    for (const r of enriched) {
      typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
    }

    // Apply filters
    if (status !== "all")
      enriched = enriched.filter((r) => r.status === status);
    if (typeFilter !== "all")
      enriched = enriched.filter((r) => r.type === typeFilter);
    if (search) {
      enriched = enriched.filter(
        (r) =>
          (r.reason || "").toLowerCase().includes(search) ||
          (r.reporterName || "").toLowerCase().includes(search) ||
          (r.targetName || "").toLowerCase().includes(search) ||
          (r.communityName || "").toLowerCase().includes(search),
      );
    }

    const total = enriched.length;
    const pages = Math.max(1, Math.ceil(total / limit));
    res.json({
      reports: enriched.slice((page - 1) * limit, page * limit),
      total,
      page,
      pages,
      statusCounts,
      typeCounts,
    });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

// PATCH /api/admin/reports/:id — update report status (resolve / dismiss)
app.patch("/api/admin/reports/:id", requireAdmin, async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { id } = req.params;
    const { status } = req.body; // 'resolved' | 'dismissed'
    if (!ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid id" });
    await db
      .collection("reports")
      .updateOne(
        { _id: new ObjectId(id) },
        { $set: { status, resolvedAt: Date.now() } },
      );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to update report" });
  }
});

// PATCH /api/admin/users/:uid/suspend — toggle user suspension
app.patch("/api/admin/users/:uid/suspend", requireAdmin, async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { uid } = req.params;
    if (!uid) return res.status(400).json({ error: "Missing uid" });
    const profile = await db.collection("profiles").findOne({ uid });
    const current = profile?.isSuspended || false;
    await db
      .collection("profiles")
      .updateOne(
        { uid },
        { $set: { isSuspended: !current } },
        { upsert: true },
      );
    res.json({ success: true, isSuspended: !current });
  } catch (e) {
    res.status(500).json({ error: "Failed to update suspension" });
  }
});

// GET /api/admin/posts — paginated list of all posts with author + report counts
app.get("/api/admin/posts", requireAdmin, async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const flaggedOnly = req.query.flagged === "true";
    const searchQuery = (req.query.search || "").trim();

    // Build filter query
    const filterQuery = {};
    if (flaggedOnly) {
      // Use find+project so postId is always a raw value regardless of how it's stored
      const reportDocs = await db
        .collection("reports")
        .find({ status: "pending", postId: { $exists: true, $ne: null } })
        .project({ postId: 1 })
        .toArray();
      const postIdStrings = [
        ...new Set(
          reportDocs
            .map((r) => String(r.postId))
            .filter(
              (s) => s && s !== "null" && s !== "undefined" && s.length > 0,
            ),
        ),
      ];
      if (postIdStrings.length === 0) {
        return res.json({ posts: [], total: 0, page: 1, pages: 0 });
      }
      const flaggedIds = postIdStrings
        .filter((id) => ObjectId.isValid(id))
        .map((id) => new ObjectId(id));
      if (flaggedIds.length === 0) {
        return res.json({ posts: [], total: 0, page: 1, pages: 0 });
      }
      filterQuery._id = { $in: flaggedIds };
    }
    if (searchQuery) {
      filterQuery.content = { $regex: searchQuery, $options: "i" };
    }

    const total = await db.collection("posts").countDocuments(filterQuery);
    const posts = await db
      .collection("posts")
      .find(filterQuery)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    const postIds = posts.map((p) => p._id.toString());
    const reportCounts = await db
      .collection("reports")
      .aggregate([
        { $match: { postId: { $in: postIds }, status: "pending" } },
        { $group: { _id: "$postId", count: { $sum: 1 } } },
      ])
      .toArray();
    const reportCountMap = {};
    reportCounts.forEach((r) => {
      reportCountMap[r._id] = r.count;
    });

    const uids = [...new Set(posts.map((p) => p.uid).filter(Boolean))];
    const profiles = await db
      .collection("profiles")
      .find({ uid: { $in: uids } })
      .project({ uid: 1, displayName: 1, photoURL: 1 })
      .toArray();
    const profileMap = {};
    profiles.forEach((p) => {
      profileMap[p.uid] = p;
    });

    const result = posts.map((p) => {
      const profile = profileMap[p.uid] || {};
      const createdAt =
        p.createdAt instanceof Date
          ? p.createdAt.getTime()
          : typeof p.createdAt === "number"
            ? p.createdAt
            : 0;
      return {
        _id: p._id.toString(),
        isPinned: p.isPinned || false,
        uid: p.uid || "",
        authorName: profile.displayName || p.uid || "Unknown",
        authorPhoto: profile.photoURL || "",
        authorBadgeTitle: p.authorBadgeTitle || profile.badgeTitle || "",
        content: p.content || "",
        imageURL: p.imageURL || null,
        likeCount: (p.likes || []).length,
        commentCount: (p.comments || []).length,
        reportCount: reportCountMap[p._id.toString()] || 0,
        createdAt,
        type: p.type || "post",
      };
    });

    res.json({ posts: result, total, page, pages: Math.ceil(total / limit) });
  } catch (e) {
    console.error("Admin get posts error:", e);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// DELETE /api/admin/posts/bulk-flagged — bulk delete posts with >= minReports
app.delete("/api/admin/posts/bulk-flagged", requireAdmin, async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const minReports = parseInt(req.query.minReports) || 3;
    const pendingReports = await db
      .collection("reports")
      .find({ status: "pending" })
      .toArray();
    const countMap = {};
    pendingReports.forEach((r) => {
      if (r.postId) countMap[r.postId] = (countMap[r.postId] || 0) + 1;
    });
    const postIdsToDelete = Object.entries(countMap)
      .filter(([, cnt]) => cnt >= minReports)
      .map(([id]) => id);
    if (postIdsToDelete.length === 0)
      return res.json({ success: true, deleted: 0 });
    const validIds = postIdsToDelete
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));
    await db.collection("posts").deleteMany({ _id: { $in: validIds } });
    await db
      .collection("reports")
      .deleteMany({ postId: { $in: postIdsToDelete } });
    res.json({ success: true, deleted: validIds.length });
  } catch (e) {
    res.status(500).json({ error: "Failed to bulk delete posts" });
  }
});

// DELETE /api/admin/posts/:postId — admin force-delete any post
app.delete("/api/admin/posts/:postId", requireAdmin, async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { postId } = req.params;
    if (!ObjectId.isValid(postId))
      return res.status(400).json({ error: "Invalid post id" });
    await db.collection("posts").deleteOne({ _id: new ObjectId(postId) });
    await db.collection("reports").deleteMany({ postId });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to delete post" });
  }
});

// PUT /api/admin/posts/:postId/pin — admin pin/unpin a post
app.put("/api/admin/posts/:postId/pin", requireAdmin, async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { postId } = req.params;
    let _id;
    try {
      _id = new ObjectId(postId);
    } catch {
      _id = postId;
    }
    const post = await db.collection("posts").findOne({ _id });
    if (!post) return res.status(404).json({ error: "Post not found" });

    const newPinnedStatus = !post.isPinned;
    await db.collection("posts").updateOne(
      { _id },
      { $set: { isPinned: newPinnedStatus } }
    );
    res.json({ success: true, isPinned: newPinnedStatus });
  } catch (error) {
    console.error("Admin pin post error:", error);
    res.status(500).json({ error: "Failed to pin post" });
  }
});

// PUT /api/admin/users/:uid/badge — admin assign badge to a user
app.put("/api/admin/users/:uid/badge", requireAdmin, async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { uid } = req.params;
    const { badgeTitle } = req.body;
    
    // Update profile
    await db.collection("profiles").updateOne(
      { uid },
      { $set: { badgeTitle: badgeTitle || "" } }
    );

    // Update denormalized posts
    await db.collection("posts").updateMany(
      { uid },
      { $set: { authorBadgeTitle: badgeTitle || "" } }
    );

    res.json({ success: true, badgeTitle });
  } catch (error) {
    console.error("Admin assign badge error:", error);
    res.status(500).json({ error: "Failed to assign badge" });
  }
});

// POST /api/admin/broadcast — send a system notification to a segment of users
app.post("/api/admin/broadcast", requireAdmin, async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { title, message, segment } = req.body; // segment: 'all' | 'new' | 'flagged' | 'suspended'
    if (!message || !message.trim())
      return res.status(400).json({ error: "Message is required" });
    let query = {};
    if (segment === "new") {
      query = { createdAt: { $gte: new Date(Date.now() - 7 * 86400000) } };
    }
    let allUsers = await db
      .collection("users")
      .find(query)
      .project({ _id: 1 })
      .toArray();
    if (segment === "flagged") {
      const reporterUids = await db
        .collection("reports")
        .distinct("targetUid", { status: "pending" });
      allUsers = allUsers.filter((u) =>
        reporterUids.includes(u._id.toString()),
      );
    } else if (segment === "suspended") {
      const suspendedProfiles = await db
        .collection("profiles")
        .find({ isSuspended: true })
        .project({ uid: 1 })
        .toArray();
      const suspendedUids = new Set(suspendedProfiles.map((p) => p.uid));
      allUsers = allUsers.filter((u) => suspendedUids.has(u._id.toString()));
    }
    const now = Date.now();
    const notifications = allUsers.map((u) => ({
      toUid: u._id.toString(),
      type: "announcement",
      title: (title || "Orbyt").trim(),
      message: message.trim(),
      createdAt: now,
      read: false,
    }));
    if (notifications.length > 0) {
      const result = await db
        .collection("notifications")
        .insertMany(notifications);
      // Push real-time WebSocket notification to every online user + Expo push for offline users
      notifications.forEach((notif, i) => {
        const insertedId = result.insertedIds[i];
        const fullNotif = { ...notif, _id: insertedId };
        // WebSocket for online users
        sendToUser(notif.toUid, {
          type: "notification",
          notification: fullNotif,
        });
        // Expo push notification for offline / background users
        sendPushNotification(notif.toUid, null, {
          title: notif.title || "Orbyt",
          body: notif.message,
          data: {
            url: "/notifications",
            notificationId: insertedId.toString(),
          },
        });
      });
    }
    res.json({ success: true, sent: notifications.length });
  } catch (e) {
    res.status(500).json({ error: "Failed to broadcast" });
  }
});

// GET /api/admin/communities — server-side search / sort / pagination
app.get("/api/admin/communities", requireAdmin, async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 200));
    const search = (req.query.search || "").trim().toLowerCase();
    const sortBy = req.query.sort || "reportCount"; // reportCount|memberCount|name|createdAt
    const sortDir = req.query.sortDir === "asc" ? 1 : -1;

    const allComms = await db.collection("communities").find({}).toArray();

    // Count pending community reports per community
    const communityReportAgg = await db
      .collection("reports")
      .aggregate([
        {
          $match: {
            type: "community",
            status: "pending",
            targetCommunityId: { $exists: true },
          },
        },
        { $group: { _id: "$targetCommunityId", count: { $sum: 1 } } },
      ])
      .toArray();
    const comReportMap = {};
    communityReportAgg.forEach((r) => {
      comReportMap[String(r._id)] = r.count;
    });

    let result = allComms.map((c) => ({
      id: c._id.toString(),
      name: c.name,
      description: c.description || "",
      createdBy: c.uid || c.createdBy || "",
      memberCount: (c.members || []).length,
      isPrivate: c.isPrivate || false,
      isFlagged: c.isFlagged || false,
      createdAt: c.createdAt || null,
      tags: c.tags || [],
      reportCount: comReportMap[c._id.toString()] || 0,
    }));

    if (search) {
      result = result.filter(
        (c) =>
          (c.name || "").toLowerCase().includes(search) ||
          (c.description || "").toLowerCase().includes(search),
      );
    }

    result.sort((a, b) => {
      let diff = 0;
      if (sortBy === "name") diff = (a.name || "").localeCompare(b.name || "");
      else if (sortBy === "createdAt")
        diff =
          (new Date(a.createdAt).getTime() || 0) -
          (new Date(b.createdAt).getTime() || 0);
      else if (sortBy === "memberCount") diff = a.memberCount - b.memberCount;
      else diff = a.reportCount - b.reportCount; // reportCount default
      return diff * sortDir;
    });

    const total = result.length;
    const pages = Math.max(1, Math.ceil(total / limit));
    res.json({
      communities: result.slice((page - 1) * limit, page * limit),
      total,
      page,
      pages,
    });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch communities" });
  }
});

// DELETE /api/admin/communities/:id — hard-delete a community
app.delete("/api/admin/communities/:id", requireAdmin, async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid id" });
    await db.collection("communities").deleteOne({ _id: new ObjectId(id) });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to delete community" });
  }
});

// PATCH /api/admin/communities/:id/flag — toggle admin-flag on a community
app.patch("/api/admin/communities/:id/flag", requireAdmin, async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid id" });
    const community = await db
      .collection("communities")
      .findOne({ _id: new ObjectId(id) });
    if (!community)
      return res.status(404).json({ error: "Community not found" });
    const isFlagged = !community.isFlagged;
    await db
      .collection("communities")
      .updateOne({ _id: new ObjectId(id) }, { $set: { isFlagged } });
    res.json({ success: true, isFlagged });
  } catch (e) {
    res.status(500).json({ error: "Failed to update flag" });
  }
});

// GET /api/admin/communities/:id/peek — admin read-only view of a community (messages + members)
app.get("/api/admin/communities/:id/peek", requireAdmin, async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid id" });
    const community = await db
      .collection("communities")
      .findOne({ _id: new ObjectId(id) });
    if (!community)
      return res.status(404).json({ error: "Community not found" });

    // Get messages (support both ObjectId and string groupId storage)
    const msgQuery = { $or: [{ groupId: id }, { groupId: new ObjectId(id) }] };
    const [messages, messageCount] = await Promise.all([
      db
        .collection("messages")
        .find(msgQuery)
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray(),
      db.collection("messages").countDocuments(msgQuery),
    ]);
    messages.reverse(); // oldest first for display

    // Enrich messages with sender profiles
    const senderUids = [
      ...new Set(messages.map((m) => m.fromUid || m.senderId).filter(Boolean)),
    ];
    const senderProfiles = await db
      .collection("profiles")
      .find({ uid: { $in: senderUids } })
      .project({ uid: 1, displayName: 1, photoURL: 1 })
      .toArray();
    const profileMap = {};
    senderProfiles.forEach((p) => {
      profileMap[p.uid] = p;
    });

    const enrichedMessages = messages.map((m) => {
      const uid = m.fromUid || m.senderId || "";
      const p = profileMap[uid] || {};
      return {
        _id: m._id.toString(),
        uid,
        senderName: p.displayName || "Unknown",
        senderPhoto: p.photoURL || null,
        text: m.text || m.content || m.message || "",
        mediaType: m.mediaType || null,
        mediaUrl: m.mediaUrl || m.imageURL || null,
        createdAt: m.createdAt,
      };
    });

    // Get member profiles
    const memberUids = community.members || [];
    const memberProfiles = await db
      .collection("profiles")
      .find({ uid: { $in: memberUids } })
      .project({
        uid: 1,
        displayName: 1,
        photoURL: 1,
        jobRole: 1,
        isSuspended: 1,
      })
      .toArray();

    // Community report count
    const reportCount = await db.collection("reports").countDocuments({
      type: "community",
      targetCommunityId: id,
      status: "pending",
    });

    res.json({
      community: {
        id: community._id.toString(),
        name: community.name,
        description: community.description || "",
        isPrivate: community.isPrivate || false,
        isFlagged: community.isFlagged || false,
        tags: community.tags || [],
        memberCount: memberUids.length,
        messageCount,
        ownerUid: community.ownerUid || community.uid || "",
        createdAt: community.createdAt,
        reportCount,
      },
      messages: enrichedMessages,
      members: memberProfiles,
    });
  } catch (e) {
    console.error("Admin community peek error:", e);
    res.status(500).json({ error: "Failed to peek community" });
  }
});

// POST /api/report-community — users report a community (kept for back-compat, delegates to /api/report)
app.post("/api/report-community", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { reporterUid, communityId, reason } = req.body;
    if (!reporterUid || !communityId || !reason) {
      return res
        .status(400)
        .json({ error: "reporterUid, communityId, and reason are required" });
    }
    await db.collection("reports").insertOne({
      type: "community",
      reporterUid,
      targetUid: null,
      communityId: String(communityId),
      reason,
      createdAt: Date.now(),
      status: "pending",
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to submit report" });
  }
});

// GET /api/config/lists — Fetch all dynamic static lists
app.get("/api/config/lists", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const config = await db.collection("app_config").findOne({ _id: "static_lists" });
    if (!config) return res.status(404).json({ error: "Config not found" });
    res.json(config);
  } catch (e) {
    console.error("Config fetch error:", e);
    res.status(500).json({ error: "Failed to fetch config" });
  }
});

// PUT /api/admin/config/lists — Admin update lists
app.put("/api/admin/config/lists", requireAdmin, async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const updates = req.body;
    // Remove _id from updates if present
    delete updates._id;

    await db.collection("app_config").updateOne(
      { _id: "static_lists" },
      { $set: updates },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (e) {
    console.error("Config update error:", e);
    res.status(500).json({ error: "Failed to update config" });
  }
});

// GET /api/admin/stats — dashboard overview numbers
app.get("/api/admin/stats", requireAdmin, async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const [users, posts, stories, reports, communities] = await Promise.all([
      db.collection("users").countDocuments(),
      db.collection("posts").countDocuments(),
      db.collection("stories").countDocuments(),
      db.collection("reports").countDocuments({ status: "pending" }),
      db.collection("communities").countDocuments(),
    ]);
    // New users in last 7 days
    const since7d = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const newUsers7d = await db
      .collection("users")
      .countDocuments({ createdAt: { $gte: new Date(since7d) } });

    const onlineUsers = clients.size;
    const pushSubscriptions = await db.collection("profiles").countDocuments({
      $or: [
        { webPushSubscription: { $exists: true, $ne: null } },
        { expoPushToken: { $exists: true, $ne: null } },
      ],
    });
    res.json({
      users,
      posts,
      stories,
      pendingReports: reports,
      communities,
      newUsers7d,
      onlineUsers,
      pushSubscriptions,
    });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// GET /api/admin/analytics — comprehensive analytics data
app.get("/api/admin/analytics", requireAdmin, async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const now = Date.now();
    const DAY = 86400000;
    const days30ago = now - 30 * DAY;
    const days7ago = now - 7 * DAY;
    const days60ago = now - 60 * DAY;

    const toMs = (v) => {
      if (!v) return 0;
      if (v instanceof Date) return v.getTime();
      if (typeof v === "number") return v;
      return new Date(v).getTime();
    };

    // Parallel fetch all collections we need
    const [
      allUsers,
      allPosts,
      allReports,
      allCommunities,
      allStories,
      allProfiles,
    ] = await Promise.all([
      db
        .collection("users")
        .find({})
        .project({ createdAt: 1, authType: 1, uid: 1 })
        .toArray(),
      db
        .collection("posts")
        .find({})
        .project({ createdAt: 1, uid: 1, type: 1 })
        .toArray(),
      db
        .collection("reports")
        .find({})
        .project({
          createdAt: 1,
          status: 1,
          type: 1,
          reporterUid: 1,
          targetUid: 1,
        })
        .toArray(),
      db
        .collection("communities")
        .find({})
        .project({ createdAt: 1, members: 1 })
        .toArray(),
      db
        .collection("stories")
        .find({})
        .project({ createdAt: 1, uid: 1 })
        .toArray(),
      db
        .collection("profiles")
        .find({})
        .project({ uid: 1, isSuspended: 1, displayName: 1, photoURL: 1 })
        .toArray(),
    ]);

    const profileMap = {};
    allProfiles.forEach((p) => {
      profileMap[p.uid] = p;
    });

    // ── 30-day daily buckets ──────────────────────────────────────────────
    const buckets = {};
    for (let i = 0; i < 30; i++) {
      const key = new Date(now - (29 - i) * DAY).toISOString().slice(0, 10);
      buckets[key] = {
        date: key,
        signups: 0,
        posts: 0,
        reports: 0,
        communities: 0,
        stories: 0,
      };
    }

    allUsers.forEach((u) => {
      const key = new Date(toMs(u.createdAt)).toISOString().slice(0, 10);
      if (buckets[key]) buckets[key].signups++;
    });
    allPosts.forEach((p) => {
      const key = new Date(toMs(p.createdAt)).toISOString().slice(0, 10);
      if (buckets[key]) buckets[key].posts++;
    });
    allReports.forEach((r) => {
      const key = new Date(toMs(r.createdAt)).toISOString().slice(0, 10);
      if (buckets[key]) buckets[key].reports++;
    });
    allCommunities.forEach((c) => {
      const key = new Date(toMs(c.createdAt)).toISOString().slice(0, 10);
      if (buckets[key]) buckets[key].communities++;
    });
    allStories.forEach((s) => {
      const key = new Date(toMs(s.createdAt)).toISOString().slice(0, 10);
      if (buckets[key]) buckets[key].stories++;
    });

    // ── DAU / WAU / MAU ───────────────────────────────────────────────────
    const activityByUid = [
      ...allPosts.map((p) => ({ uid: p.uid, ms: toMs(p.createdAt) })),
      ...allStories.map((s) => ({ uid: s.uid, ms: toMs(s.createdAt) })),
    ];
    const dauUids = new Set(
      activityByUid.filter((p) => p.ms >= now - DAY).map((p) => p.uid),
    );
    const wauUids = new Set(
      activityByUid.filter((p) => p.ms >= days7ago).map((p) => p.uid),
    );
    const mauUids = new Set(
      activityByUid.filter((p) => p.ms >= days30ago).map((p) => p.uid),
    );

    // ── Growth rate (last 30d vs prior 30d) ───────────────────────────────
    const usersLast30 = allUsers.filter(
      (u) => toMs(u.createdAt) >= days30ago,
    ).length;
    const usersPrior30 = allUsers.filter((u) => {
      const ms = toMs(u.createdAt);
      return ms >= days60ago && ms < days30ago;
    }).length;
    const postsLast30 = allPosts.filter(
      (p) => toMs(p.createdAt) >= days30ago,
    ).length;
    const postsPrior30 = allPosts.filter((p) => {
      const ms = toMs(p.createdAt);
      return ms >= days60ago && ms < days30ago;
    }).length;

    const growthRate = (curr, prev) =>
      prev === 0
        ? curr > 0
          ? 100
          : 0
        : Math.round(((curr - prev) / prev) * 100);

    // ── Auth type breakdown ───────────────────────────────────────────────
    const authTypes = { google: 0, email: 0 };
    allUsers.forEach((u) => {
      const t = u.authType === "google" ? "google" : "email";
      authTypes[t]++;
    });

    // ── Report breakdown ──────────────────────────────────────────────────
    const reportStatus = { pending: 0, resolved: 0, dismissed: 0 };
    allReports.forEach((r) => {
      if (reportStatus[r.status] !== undefined) reportStatus[r.status]++;
    });

    const reportTypes = { user: 0, post: 0, story: 0, meetup: 0, community: 0 };
    allReports.forEach((r) => {
      const t = r.type || "post";
      if (reportTypes[t] !== undefined) reportTypes[t]++;
      else reportTypes["post"]++;
    });

    // ── Content type breakdown ────────────────────────────────────────────
    const postTypes = { post: 0, meetup: 0 };
    allPosts.forEach((p) => {
      if (p.type === "meetup") postTypes.meetup++;
      else postTypes.post++;
    });
    const contentBreakdown = [
      { label: "Regular Posts", value: postTypes.post },
      { label: "Meetups", value: postTypes.meetup },
      { label: "Stories", value: allStories.length },
      { label: "Rooms", value: allCommunities.length },
    ];

    // ── Top reported users (by pending reports against them) ─────────────
    const targetCounts = {};
    allReports
      .filter((r) => r.status === "pending" && r.targetUid)
      .forEach((r) => {
        targetCounts[r.targetUid] = (targetCounts[r.targetUid] || 0) + 1;
      });
    const topReported = Object.entries(targetCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([uid, count]) => ({
        uid,
        count,
        displayName: profileMap[uid]?.displayName || uid.slice(0, 8),
        photoURL: profileMap[uid]?.photoURL || null,
        isSuspended: profileMap[uid]?.isSuspended || false,
      }));

    // ── Most active posters (last 30d) ────────────────────────────────────
    const posterCounts = {};
    allPosts
      .filter((p) => toMs(p.createdAt) >= days30ago)
      .forEach((p) => {
        posterCounts[p.uid] = (posterCounts[p.uid] || 0) + 1;
      });
    const topPosters = Object.entries(posterCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([uid, count]) => ({
        uid,
        count,
        displayName: profileMap[uid]?.displayName || uid.slice(0, 8),
        photoURL: profileMap[uid]?.photoURL || null,
      }));

    // ── Suspension stats ──────────────────────────────────────────────────
    const suspendedCount = allProfiles.filter((p) => p.isSuspended).length;
    const totalUserCount = allUsers.length;

    // ── Community sizes ───────────────────────────────────────────────────
    const communityActivity = allCommunities
      .sort((a, b) => (b.members?.length || 0) - (a.members?.length || 0))
      .slice(0, 5)
      .map((c) => ({
        members: c.members?.length || 0,
        id: c._id.toString(),
      }));

    res.json({
      chartData: Object.values(buckets),
      dau: dauUids.size,
      wau: wauUids.size,
      mau: mauUids.size,
      totalUsers: totalUserCount,
      totalPosts: allPosts.length,
      totalReports: allReports.length,
      totalCommunities: allCommunities.length,
      totalStories: allStories.length,
      suspendedCount,
      usersLast30,
      postsLast30,
      userGrowthRate: growthRate(usersLast30, usersPrior30),
      postGrowthRate: growthRate(postsLast30, postsPrior30),
      authTypes,
      reportStatus,
      reportTypes,
      contentBreakdown,
      topReported,
      topPosters,
    });
  } catch (e) {
    console.error("Analytics error:", e);
    res
      .status(500)
      .json({ error: "Failed to fetch analytics", detail: e.message });
  }
});

// GET /api/admin/settings — fetch global admin settings
app.get("/api/admin/settings", requireAdmin, async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const settings = await db
      .collection("admin_settings")
      .findOne({ _id: "global" });
    res.json({ autoSuspendThreshold: settings?.autoSuspendThreshold ?? 0 });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

// POST /api/admin/settings — save global admin settings
app.post("/api/admin/settings", requireAdmin, async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const threshold = parseInt(req.body.autoSuspendThreshold) || 0;
    await db
      .collection("admin_settings")
      .updateOne(
        { _id: "global" },
        { $set: { autoSuspendThreshold: threshold } },
        { upsert: true },
      );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to save settings" });
  }
});



// DELETE /api/admin/stories/all — delete every story
app.delete("/api/admin/stories/all", requireAdmin, async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const result = await db.collection("stories").deleteMany({});
    await db.collection("reports").deleteMany({ storyId: { $exists: true } });
    res.json({ success: true, deleted: result.deletedCount });
  } catch (e) {
    res.status(500).json({ error: "Failed to delete all stories" });
  }
});

// GET /api/admin/stories — paginated list of all stories
app.get("/api/admin/stories", requireAdmin, async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const search = (req.query.search || "").trim();

    const filter = {};
    if (search) filter.caption = { $regex: search, $options: "i" };

    const total = await db.collection("stories").countDocuments(filter);
    const stories = await db
      .collection("stories")
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    const uids = [...new Set(stories.map((s) => s.uid).filter(Boolean))];
    const profiles = await db
      .collection("profiles")
      .find({ uid: { $in: uids } })
      .project({ uid: 1, displayName: 1, photoURL: 1 })
      .toArray();
    const profileMap = {};
    profiles.forEach((p) => {
      profileMap[p.uid] = p;
    });

    // Report counts per story
    const storyIds = stories.map((s) => s._id.toString());
    const reportDocs = await db
      .collection("reports")
      .aggregate([
        { $match: { storyId: { $in: storyIds }, status: "pending" } },
        { $group: { _id: "$storyId", count: { $sum: 1 } } },
      ])
      .toArray();
    const reportMap = {};
    reportDocs.forEach((r) => {
      reportMap[r._id] = r.count;
    });

    const enriched = stories.map((s) => ({
      _id: s._id.toString(),
      uid: s.uid,
      authorName: profileMap[s.uid]?.displayName || "Unknown",
      authorPhoto: profileMap[s.uid]?.photoURL || null,
      imageURL: s.imageURL || null,
      videoURL: s.videoURL || null,
      caption: s.caption || s.text || null,
      createdAt: s.createdAt
        ? s.createdAt instanceof Date
          ? s.createdAt.getTime()
          : s.createdAt
        : 0,
      reportCount: reportMap[s._id.toString()] || 0,
    }));

    res.json({
      stories: enriched,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch stories" });
  }
});

// DELETE /api/admin/stories/:storyId — admin force-delete a story
app.delete("/api/admin/stories/:storyId", requireAdmin, async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { storyId } = req.params;
    if (!ObjectId.isValid(storyId))
      return res.status(400).json({ error: "Invalid story ID" });
    await db.collection("stories").deleteOne({ _id: new ObjectId(storyId) });
    await db.collection("reports").deleteMany({ storyId });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to delete story" });
  }
});

// DELETE /api/admin/events/bulk-flagged — bulk delete events with >= minReports
app.delete("/api/admin/events/bulk-flagged", requireAdmin, async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const minReports = parseInt(req.query.minReports) || 3;
    const pendingReports = await db
      .collection("reports")
      .find({ status: "pending", type: "meetup" })
      .toArray();
      
    const countMap = {};
    pendingReports.forEach((r) => {
      if (r.postId) countMap[r.postId] = (countMap[r.postId] || 0) + 1;
    });
    
    const eventIdsToDelete = Object.entries(countMap)
      .filter(([, cnt]) => cnt >= minReports)
      .map(([id]) => id);
      
    if (eventIdsToDelete.length === 0)
      return res.json({ success: true, deleted: 0 });
      
    const validIds = eventIdsToDelete
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));
      
    if (validIds.length === 0)
      return res.json({ success: true, deleted: 0 });

    const result = await db.collection("posts").deleteMany({
      _id: { $in: validIds },
      type: "meetup"
    });

    // Also remove associated reports
    await db.collection("reports").deleteMany({
      postId: { $in: eventIdsToDelete }
    });

    res.json({ success: true, deleted: result.deletedCount });
  } catch (error) {
    console.error("Error bulk deleting events:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/events — paginated list of all meetup posts
app.get("/api/admin/events", requireAdmin, async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const search = (req.query.search || "").trim();
    const filter = req.query.filter || "all"; // all | upcoming | past | flagged

    const now = Date.now();
    const query = { type: "meetup" };
    if (search)
      query["meetupDetails.title"] = { $regex: search, $options: "i" };

    const total = await db.collection("posts").countDocuments(query);
    let events = await db
      .collection("posts")
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    const uids = [...new Set(events.map((e) => e.uid).filter(Boolean))];
    const profiles = await db
      .collection("profiles")
      .find({ uid: { $in: uids } })
      .project({ uid: 1, displayName: 1, photoURL: 1 })
      .toArray();
    const profileMap = {};
    profiles.forEach((p) => {
      profileMap[p.uid] = p;
    });

    // Pending report counts
    const eventIds = events.map((e) => e._id.toString());
    const reportDocs = await db
      .collection("reports")
      .aggregate([
        {
          $match: {
            $or: [
              { postId: { $in: eventIds } },
              { type: "meetup", postId: { $in: eventIds } },
            ],
            status: "pending",
          },
        },
        { $group: { _id: "$postId", count: { $sum: 1 } } },
      ])
      .toArray();
    const reportMap = {};
    reportDocs.forEach((r) => {
      reportMap[r._id] = r.count;
    });

    const enriched = events.map((e) => {
      const toMs = (v) =>
        v instanceof Date
          ? v.getTime()
          : typeof v === "number"
            ? v
            : new Date(v).getTime();
      const md = e.meetupDetails || {};
      // Compute event date as ms from YYYY-MM-DD + startTime
      let eventMs = 0;
      try {
        if (md.date && md.startTime)
          eventMs = new Date(`${md.date}T${md.startTime}`).getTime();
      } catch (_) { }
      return {
        _id: e._id.toString(),
        uid: e.uid,
        authorName: profileMap[e.uid]?.displayName || "Unknown",
        authorPhoto: profileMap[e.uid]?.photoURL || null,
        title: md.title || e.content?.slice(0, 60) || "Untitled Event",
        activity: md.activity || null,
        date: md.date || null,
        startTime: md.startTime || null,
        venueName: md.venueName || null,
        feeType: md.feeType || null,
        maxGuests: md.maxGuests || null,
        attendeeCount: (e.attendees || []).length,
        pendingCount: (e.pendingRequests || []).length,
        imageURL: e.imageURL || null,
        createdAt: toMs(e.createdAt),
        eventMs,
        isPast: eventMs > 0 && eventMs < now,
        reportCount: reportMap[e._id.toString()] || 0,
      };
    });

    res.json({
      events: enriched,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// DELETE /api/admin/events/:eventId — admin force-delete a meetup post
app.delete("/api/admin/events/:eventId", requireAdmin, async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { eventId } = req.params;
    if (!ObjectId.isValid(eventId))
      return res.status(400).json({ error: "Invalid event ID" });
    await db
      .collection("posts")
      .deleteOne({ _id: new ObjectId(eventId), type: "meetup" });
    await db.collection("reports").deleteMany({ postId: eventId });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to delete event" });
  }
});

// --- Highlights/Today Highlights ---
app.get("/api/highlights", async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { uid, lat, lng, radius = 50 } = req.query;
    if (!uid) return res.status(400).json({ error: "UID required" });

    const profiles = db.collection("profiles");
    const communities = db.collection("communities");
    const posts = db.collection("posts");

    const user = await profiles.findOne({ uid });
    const latVal = parseFloat(lat);
    const lngVal = parseFloat(lng);

    // 1. Social Quest
    const quest = user?.quests?.[0] || {
      id: "greet_match",
      title: "Friendly Face",
      description: "Say hi to someone with a >80% match percentage.",
      reward: 40,
      progress: 0,
      goal: 1,
      completed: false,
    };

    // 2. Top Matches Nearby
    const OFFSET = 0.5;
    const nearby = await profiles
      .find({
        uid: { $ne: uid },
        lat: { $gte: latVal - OFFSET, $lte: latVal + OFFSET },
        lng: { $gte: lngVal - OFFSET, $lte: lngVal + OFFSET },
      })
      .limit(20)
      .toArray();

    const matches = nearby
      .map((u) => {
        const uInterests = u.interests || [];
        const myInterests = user?.interests || [];
        const overlap = uInterests.filter((i) => myInterests.includes(i)).length;
        const baseMatch = overlap * 15 + 65;
        return {
          uid: u.uid,
          displayName: u.displayName,
          photoURL: u.photoURL,
          matchPercentage: Math.min(98, baseMatch + (Math.floor(Math.random() * 5))),
          reputation: u.reputation?.[0] || "Friendly",
          lastActive: u.lastActiveText || "Nearby"
        };
      })
      .sort((a, b) => b.matchPercentage - a.matchPercentage)
      .slice(0, 3);

    // 3. One Featured Active Room
    const room = await communities
      .findOne({
        lat: { $gte: latVal - OFFSET, $lte: latVal + OFFSET },
        lng: { $gte: lngVal - OFFSET, $lte: lngVal + OFFSET },
      }, { sort: { memberCount: -1 } });

    // 4. One Hot Post
    const hotPost = await posts
      .findOne({
        lat: { $gte: latVal - OFFSET, $lte: latVal + OFFSET },
        lng: { $gte: lngVal - OFFSET, $lte: lngVal + OFFSET },
      }, { sort: { commentCount: -1, likeCount: -1 } });

    res.json({
      quest,
      matches,
      featuredRoom: room,
      featuredPost: hotPost
    });
  } catch (error) {
    console.error("Highlights error:", error);
    res.status(500).json({ error: "Failed to fetch highlights" });
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Server + WebSocket running on port ${port}`);
});

