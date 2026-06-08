import bcrypt from 'bcrypt';
import cors from "cors";
import dotenv from "dotenv";
import { Expo } from 'expo-server-sdk';
import express from "express";
import rateLimit from 'express-rate-limit';
import http from "http";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import path from "path";
import { fileURLToPath } from "url";
import webpush from "web-push";
import WebSocket, { WebSocketServer } from "ws";
import { z } from 'zod';

const expo = new Expo();

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// --- Web Push Configuration ---
const publicVapidKey = process.env.VITE_VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;
const vapidEmail = process.env.VAPID_EMAIL || "orbytapp@gmail.com";
webpush.setVapidDetails(
  vapidEmail,
  publicVapidKey,
  privateVapidKey
);
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
  const playStoreUrl = "https://play.google.com/store/apps/details?id=com.orbyt.official.app";
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
  "https://sociall-sigma.vercel.app"
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
  })
);

// Rate Limiting - Prevent brute force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many authentication attempts, please try again later'
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests, please try again later'
});

const mapProfilesLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // map refresh abuse guard
  message: 'Too many map refresh requests, please try again shortly'
});

app.use('/api/', apiLimiter);

// --- AUDIT LOGGING MIDDLEWARE ---
const auditLogs = [];
function createAuditLog(req, res, next) {
  const startTime = Date.now();
  const originalJson = res.json;
  
  res.json = function(data) {
    const duration = Date.now() - startTime;
    const logEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      path: req.path,
      uid: req.body?.uid || req.query?.uid || req.params?.uid || 'anonymous',
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent')
    };
    
    // Log to console for real-time monitoring
    if (res.statusCode >= 400) {
      console.warn(`[AUDIT] ${res.statusCode} ${req.method} ${req.path} - UID: ${logEntry.uid} - ${duration}ms`);
    } else {
      console.log(`[AUDIT] ${res.statusCode} ${req.method} ${req.path} - UID: ${logEntry.uid} - ${duration}ms`);
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
app.get('/api/admin/audit-logs', (req, res) => {
  // Note: In production, add proper authentication before exposing logs
  res.json({ logs: auditLogs, total: auditLogs.length });
});

// Input Validation Schemas
const signupSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
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
wss.on('connection', (ws, req) => {
  const urlParams = new URLSearchParams(req.url.split('?')[1]);
  const uid = urlParams.get('uid');

  if (uid) {
    if (!clients.has(uid)) {
      clients.set(uid, new Set());
    }
    clients.get(uid).add(ws);

    // Add cleanup timeout to prevent memory leaks
    let disconnectTimeout = null;

    ws.on('close', () => {
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

    ws.on('error', (error) => {
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

async function createNotification(type, fromUid, toUid, postId = null, extra = {}) {
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
      groupId: extra.groupId || null,
      message: extra.message || null,
      read: false,
      createdAt: Date.now()
    };
    const notifResult = await notifications.insertOne(notifDoc);
    // Push real-time in-app notification over WebSocket
    sendToUser(toUid, {
      type: 'notification',
      notification: { ...notifDoc, _id: notifResult.insertedId }
    });

    let title = "New Notification";
    let body = "You have a new notification on Orbyt.";
    const name = sender.displayName;

    switch (type) {
      case 'like':
        title = "❤️ New Like!";
        body = `${name} liked your post.`;
        break;
      case 'comment':
        title = "💬 New Comment!";
        body = `${name} commented on your post.`;
        break;
      case 'friend_request':
        title = "💛 Someone likes you!";
        body = `${name} wants to connect with you.`;
        break;
      case 'friend_accept':
        title = "🎉 It's a match!";
        body = `${name} connected with you! You're now connected.`;
        break;
      case 'meetup_request':
        title = "🙋 Meetup Request";
        body = `${name} wants to join your meetup. Accept them?`;
        break;
      case 'meetup_accept':
        title = "✅ You're in!";
        body = `${name} accepted your request. See you at the meetup!`;
        break;
      case 'friend_post':
        title = `📸 ${name} just dropped something!`;
        body = `New post from your connection. Don't miss the vibe 🔥`;
        break;
      case 'friend_event':
        title = `🎉 ${name} is planning something fun!`;
        body = extra.eventTitle
          ? `"${extra.eventTitle}" just dropped. Grab your spot before it fills up!`
          : `A new event just dropped. Grab your spot before it fills up!`;
        break;
      case 'new_event':
        title = `🔥 Hot new event near you!`;
        body = extra.eventTitle
          ? `${name} is hosting "${extra.eventTitle}". Don't sleep on this one!`
          : `${name} just created a new event. Check it out!`;
        break;
      case 'room_message':
        title = `💬 ${extra.groupTitle || 'Room Activity'}`;
        body = `${name}: ${extra.message || 'sent a message'}`;
        break;
    }

    const notifUrl = extra.groupId
      ? `/communities/${extra.groupId}`
      : postId ? `/post/${postId}` : `/profile/${fromUid}`;

    const payload = JSON.stringify({
      title,
      body,
      icon: sender.photoURL || "/pwa-192x192.png",
      data: { url: notifUrl }
    });

    const expoPayload = {
      title,
      body,
      data: { url: notifUrl }
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

async function createIndexes() {
  if (!db) return;
  try {
    const collections = {
      users: ['email'],
      profiles: ['uid', 'email'],
      posts: ['uid', 'createdAt', 'type'],
      messages: ['fromUid', 'toUid', 'groupId', 'createdAt'],
      notifications: ['toUid', 'createdAt'],
      stories: ['uid', 'expiresAt'],
      profile_views: ['viewerUid', 'targetUid'],
      communities: ['ownerUid', 'lastActivity'],
    };

    for (const [collName, fields] of Object.entries(collections)) {
      const collection = db.collection(collName);
      for (const field of fields) {
        const index = {};
        index[field] = 1;
        await collection.createIndex(index).catch(() => {}); // Ignore if exists
      }
    }
    console.log('Database indexes created successfully');
  } catch (e) {
    console.error('Error creating indexes:', e);
  }
}

async function run() {
  try {
    await client.connect();
    db = client.db(DB_NAME);

    // Create indexes for performance
    await createIndexes();

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
  if (typeof value !== 'number' || Number.isNaN(value)) return value;
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function hashString(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function addCoordinateJitter(lat, lng, maxMeters, seed) {
  const seedA = hashString(`${seed}:a`);
  const seedB = hashString(`${seed}:b`);
  const angle = (seedA % 360) * (Math.PI / 180);
  const radius = (seedB % Math.max(1, maxMeters));
  const dLat = (radius / 111320) * Math.cos(angle);
  const safeCos = Math.max(0.1, Math.cos(lat * Math.PI / 180));
  const dLng = (radius / (111320 * safeCos)) * Math.sin(angle);
  return {
    lat: lat + dLat,
    lng: lng + dLng,
  };
}

function getLocationTimestamp(profile) {
  if (typeof profile?.locationUpdatedAt === 'number') return profile.locationUpdatedAt;
  if (typeof profile?.updatedAt === 'number') return profile.updatedAt;
  if (profile?.updatedAt) {
    const parsed = new Date(profile.updatedAt).getTime();
    if (!Number.isNaN(parsed)) return parsed;
  }
  return typeof profile?.createdAt === 'number' ? profile.createdAt : 0;
}

function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371e3;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toDistanceBand(distanceMeters) {
  if (typeof distanceMeters !== 'number' || Number.isNaN(distanceMeters)) return null;
  if (distanceMeters < 500) return '< 0.5 km';
  if (distanceMeters < 1000) return '0.5 - 1 km';
  if (distanceMeters < 2000) return '1 - 2 km';
  if (distanceMeters < 5000) return '2 - 5 km';
  if (distanceMeters < 10000) return '5 - 10 km';
  if (distanceMeters < 20000) return '10 - 20 km';
  return '20+ km';
}

function getPublicCellKey(lat, lng) {
  return `${roundCoord(lat, LOCATION_PRIVACY.PUBLIC_K_ANON_DECIMALS)}:${roundCoord(lng, LOCATION_PRIVACY.PUBLIC_K_ANON_DECIMALS)}`;
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
  minAppVersion: "1.1.9",
  updateUrl: "https://play.google.com/store/apps/details?id=com.orbyt.official.app"
};

app.get('/api/config/version', (req, res) => {
  res.json(APP_CONFIG);
});

app.post('/api/push/subscribe', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { uid, subscription, platform } = req.body;
    if (!uid || !subscription) {
      return res.status(400).json({ error: "Missing uid or subscription" });
    }

    const isExpoToken = typeof subscription === 'string' && Expo.isExpoPushToken(subscription);
    const resolvedPlatform = platform || (isExpoToken ? 'expo' : 'web');

    if (resolvedPlatform !== 'expo' && resolvedPlatform !== 'web') {
      return res.status(400).json({ error: "Invalid platform. Use 'expo' or 'web'." });
    }

    const profiles = db.collection('profiles');
    const update = resolvedPlatform === 'expo'
      ? { $set: { expoPushToken: subscription } }
      : { $set: { webPushSubscription: subscription } };

    await profiles.updateOne(
      { uid },
      update
    );

    // Keep backwards compatibility while migrating old clients.
    if (resolvedPlatform === 'expo') {
      await profiles.updateOne({ uid }, { $set: { pushSubscription: subscription } });
    }

    res.json({ success: true, message: `${resolvedPlatform} push subscription saved` });
  } catch (error) {
    console.error("Save subscription error:", error);
    res.status(500).json({ error: "Failed to save push subscription" });
  }
});

app.post('/api/auth/signup', authLimiter, async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    // Validate input
    const validated = signupSchema.parse(req.body);
    const { email, password } = validated;
    
    const users = db.collection('users');
    const profiles = db.collection('profiles');

    const existing = await users.findOne({ email });
    if (existing) return res.status(400).json({ error: "Email already in use" });

    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const newUser = { email, password: hashedPassword, createdAt: new Date() };
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
      isDiscoverable: false,
      discoveryRadius: 10,
      createdAt: Date.now()
    });

    res.json({ user: { uid, email } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Signup error:', error);
    res.status(500).json({ error: "Signup failed" });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    // Validate input
    const validated = loginSchema.parse(req.body);
    const { email, password } = validated;
    
    const users = db.collection('users');
    const user = await users.findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid email or password" });
    
    // Compare password with hashed password using bcrypt
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) return res.status(401).json({ error: "Invalid email or password" });
    
    res.json({ user: { uid: user._id.toString(), email } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Login error:', error);
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
        isDiscoverable: false,
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
    let { viewerUid } = req.query;
    if (viewerUid === 'undefined' || viewerUid === 'null') viewerUid = undefined;

    const profiles = db.collection('profiles');
    const profile = await profiles.findOne({ uid: req.params.uid });
    if (!profile) return res.json(null);

    // Hide precise coordinates unless this is the owner's own profile request.
    if (profile?.lastLocation) {
      const isSelf = !!viewerUid && viewerUid === profile.uid;
      let isFriend = false;

      if (!isSelf && viewerUid) {
        const viewerProfile = await profiles.findOne({ uid: viewerUid }, { projection: { friends: 1 } });
        isFriend = (viewerProfile?.friends || []).includes(profile.uid);
      }

      if (isSelf) {
        // keep as-is
      } else if (isFriend) {
        profile.lastLocation = {
          ...profile.lastLocation,
          lat: roundCoord(profile.lastLocation.lat, LOCATION_PRIVACY.FRIEND_COORD_DECIMALS),
          lng: roundCoord(profile.lastLocation.lng, LOCATION_PRIVACY.FRIEND_COORD_DECIMALS),
        };
      } else {
        profile.lastLocation = {
          name: profile?.lastLocation?.name || 'Nearby area',
        };
      }
    }

    res.json(profile);
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

app.get('/api/profiles', mapProfilesLimiter, async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    let { viewerUid } = req.query;
    // Fix: Handle 'undefined' or 'null' passed as strings
    if (viewerUid === 'undefined' || viewerUid === 'null') viewerUid = undefined;

    const profiles = db.collection('profiles');
    const viewerProfile = viewerUid ? await profiles.findOne({ uid: viewerUid }) : null;
    const viewerFriends = new Set(viewerProfile?.friends || []);
    const viewerLocation = viewerProfile?.lastLocation;
    const now = Date.now();

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

    const rawUsers = await profiles.find(filter).project({
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
    }).limit(500).toArray();

    const safeUsers = [];
    for (const user of rawUsers) {
      if (viewerUid && user.uid === viewerUid) continue;

      const lat = user?.lastLocation?.lat;
      const lng = user?.lastLocation?.lng;
      if (typeof lat !== 'number' || typeof lng !== 'number') continue;

      const isFriend = viewerFriends.has(user.uid);
      const relation = isFriend ? 'friend' : 'public';

      // Apply jitter so exact location is never revealed
      const jitterMeters = isFriend
        ? LOCATION_PRIVACY.FRIEND_JITTER_METERS
        : LOCATION_PRIVACY.PUBLIC_JITTER_METERS;
      const coordDecimals = isFriend
        ? LOCATION_PRIVACY.FRIEND_COORD_DECIMALS
        : LOCATION_PRIVACY.PUBLIC_COORD_DECIMALS;

      const roundedLat = roundCoord(lat, coordDecimals);
      const roundedLng = roundCoord(lng, coordDecimals);
      const jitterBucket = Math.floor(now / LOCATION_PRIVACY.JITTER_ROTATION_MS);
      const jitterSeed = `${viewerUid || 'anon'}:${user.uid}:${jitterBucket}:${relation}`;
      const jittered = addCoordinateJitter(roundedLat, roundedLng, jitterMeters, jitterSeed);

      const distanceMeters = viewerLocation
        ? getDistanceMeters(viewerLocation.lat, viewerLocation.lng, lat, lng)
        : null;

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
          name: isFriend ? user?.lastLocation?.name : 'Nearby area',
        },
      });
    }

    res.json(safeUsers);
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
    if (typeof data?.lastLocation?.lat === 'number' && typeof data?.lastLocation?.lng === 'number') {
      updateFields.locationUpdatedAt = Date.now();
    }
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

    const postIdStr = result.insertedId.toString();
    const isMeetup = postData.type === 'meetup';
    const notifType = isMeetup ? 'friend_event' : 'friend_post';
    const extra = isMeetup ? { eventTitle: postData.meetupDetails?.title } : {};

    // Notify all friends about the new post/event (fire-and-forget)
    setImmediate(async () => {
      try {
        const poster = await db.collection('profiles').findOne({ uid: postData.uid });
        if (poster?.friends?.length) {
          for (const friendUid of poster.friends) {
            await createNotification(notifType, postData.uid, friendUid, postIdStr, extra).catch(() => {});
          }
        }
        // For meetup posts: also notify all other discoverable users (new_event)
        if (isMeetup) {
          const allProfiles = await db.collection('profiles').find({
            uid: { $ne: postData.uid, $nin: poster?.friends || [] },
            isDiscoverable: true
          }).limit(80).toArray();
          for (const p of allProfiles) {
            await createNotification('new_event', postData.uid, p.uid, postIdStr, extra).catch(() => {});
          }
        }
      } catch (e) {
        console.error('Post notification error:', e);
      }
    });

    res.json({ success: true, id: result.insertedId });
  } catch (error) {
    res.status(500).json({ error: "Failed to create post" });
  }
});

app.get('/api/posts', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    let { viewerUid, page = 1, limit = 10 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    
    // Fix: Handle 'undefined' or 'null' passed as strings
    if (viewerUid === 'undefined' || viewerUid === 'null') viewerUid = undefined;

    const posts = db.collection('posts');
    let filter = {};
    if (viewerUid) {
      const excludedUids = await getMutualBlockedUids(viewerUid);
      if (excludedUids.length > 0) filter.uid = { $nin: excludedUids };
    }
    const allPosts = await posts.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();
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

// --- HELPER: Send Push Notification (Expo & Web) with Retry Logic ---
async function sendPushNotification(receiverUid, payloadStr, expoPayload, retryCount = 0, maxRetries = 2) {
  if (!db) return;
  try {
    const profiles = db.collection('profiles');
    const receiver = await profiles.findOne({ uid: receiverUid });
    if (!receiver) {
      console.log(`[PUSH] Receiver profile not found: ${receiverUid}`);
      return;
    }

    const expoPushToken =
      (typeof receiver.expoPushToken === 'string' && receiver.expoPushToken) ||
      (typeof receiver.pushSubscription === 'string' && Expo.isExpoPushToken(receiver.pushSubscription)
        ? receiver.pushSubscription
        : null);

    const webPushSubscription = receiver.webPushSubscription ||
      (receiver.pushSubscription && typeof receiver.pushSubscription === 'object'
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
          db.collection('messages').countDocuments({ toUid: receiverUid, read: false }),
          db.collection('notifications').countDocuments({ toUid: receiverUid, read: false })
        ]);
        const totalBadge = msgCount + notifCount;

        const tickets = await expo.sendPushNotificationsAsync([{
          to: expoPushToken,
          sound: 'default',
          priority: 'high',
          channelId: 'default',
          badge: totalBadge,
          ttl: 2419200, // 4 weeks
          _displayInForeground: true,
          ...expoPayload
        }]);

        const receiptIds = [];
        for (const ticket of tickets || []) {
          if (ticket?.status === 'error') {
            const errorCode = ticket?.details?.error;
            console.error(`[PUSH] Expo Push Ticket Error for ${receiverUid}:`, ticket);
            if (errorCode === 'DeviceNotRegistered') {
              console.log(`[PUSH] Removing invalid Expo token for ${receiverUid}`);
              await profiles.updateOne(
                { uid: receiverUid },
                {
                  $unset: { expoPushToken: "" },
                  $set: { pushSubscription: null },
                }
              );
            }
          } else if (ticket?.status === 'ok') {
            expoSuccess = true;
          }
          if (ticket?.id) receiptIds.push(ticket.id);
        }

        if (receiptIds.length) {
          try {
            const receipts = await expo.getPushNotificationReceiptsAsync(receiptIds);
            for (const receiptId of Object.keys(receipts || {})) {
              const receipt = receipts[receiptId];
              if (receipt?.status === 'error') {
                console.error(`[PUSH] Expo Receipt Error for ${receiverUid}:`, receiptId, receipt);
              }
            }
          } catch (receiptErr) {
            console.error(`[PUSH] Expo receipt fetch failed for ${receiverUid}:`, receiptErr);
            if (retryCount < maxRetries) {
              console.log(`[PUSH] Retrying Expo push for ${receiverUid} (attempt ${retryCount + 1}/${maxRetries})`);
              setTimeout(() => sendPushNotification(receiverUid, payloadStr, expoPayload, retryCount + 1, maxRetries), 2000);
            }
          }
        }
        console.log(`[PUSH] Expo notification sent successfully to ${receiverUid}`);
      } catch (err) {
        console.error(`[PUSH] Expo Push failed for ${receiverUid}:`, err.message);
        if (retryCount < maxRetries) {
          console.log(`[PUSH] Retrying Expo push for ${receiverUid} (attempt ${retryCount + 1}/${maxRetries})`);
          setTimeout(() => sendPushNotification(receiverUid, payloadStr, expoPayload, retryCount + 1, maxRetries), 2000);
        }
      }
    }

    if (webPushSubscription) {
      try {
        await webpush.sendNotification(webPushSubscription, payloadStr);
        webSuccess = true;
        console.log(`[PUSH] Web push notification sent successfully to ${receiverUid}`);
      } catch (err) {
        console.error(`[PUSH] Web Push failed for ${receiverUid}:`, err.message);
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log(`[PUSH] Removing invalid web push subscription for ${receiverUid}`);
          await profiles.updateOne(
            { uid: receiverUid },
            {
              $unset: { webPushSubscription: "" },
              $set: { pushSubscription: null },
            }
          );
        } else if (retryCount < maxRetries && err.statusCode !== 410 && err.statusCode !== 404) {
          console.log(`[PUSH] Retrying web push for ${receiverUid} (attempt ${retryCount + 1}/${maxRetries})`);
          setTimeout(() => sendPushNotification(receiverUid, payloadStr, expoPayload, retryCount + 1, maxRetries), 2000);
        }
      }
    }

    if (!expoSuccess && !webSuccess) {
      console.warn(`[PUSH] Both push methods failed for ${receiverUid}`);
    }
  } catch (e) {
    console.error(`[PUSH] Error in sendPushNotification helper for ${receiverUid}:`, e);
  }
}

app.post('/api/chat/send', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { fromUid, toUid, groupId, text, mediaType, mediaUrl, replyTo } = req.body;
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

    let newMessage = { fromUid, text, read: false, createdAt: Date.now(), authorName, authorPhoto, mediaType, mediaUrl, ...(replyTo ? { replyTo } : {}) };

    if (groupId) {
      // --- 1. Try community rooms first ---
      let community = null;
      if (ObjectId.isValid(groupId)) {
        community = await db.collection('communities').findOne({ _id: new ObjectId(groupId) });
      }
      if (!community) {
        community = await db.collection('communities').findOne({ _id: groupId });
      }

      let groupTitle, recipients;

      if (community) {
        // Community room
        if (!community.members.includes(fromUid)) {
          return res.status(403).json({ error: 'You are not a member of this room' });
        }
        groupTitle = community.name;
        newMessage.groupId = community._id.toString();
        newMessage.groupTitle = groupTitle;
        recipients = new Set(community.members);
        // Keep lastActivity fresh
        await db.collection('communities').updateOne(
          { _id: community._id },
          { $set: { lastActivity: Date.now() } }
        );
      } else {
        // --- 2. Fall back to meetup posts ---
        const posts = db.collection('posts');
        let query = {};
        if (ObjectId.isValid(groupId)) {
          query = { _id: new ObjectId(groupId) };
        } else {
          query = { _id: groupId };
        }
        const post = await posts.findOne(query);
        if (!post) return res.status(404).json({ error: 'Group not found' });

        const isHost = post.uid === fromUid;
        const isAttendee = post.attendees && post.attendees.includes(fromUid);
        if (!isHost && !isAttendee) {
          return res.status(403).json({ error: 'You are not a member of this group' });
        }
        groupTitle = post.meetupDetails?.title || 'Meetup Group';
        newMessage.groupId = String(post._id);
        newMessage.groupTitle = groupTitle;
        recipients = new Set([...(post.attendees || []), post.uid]);
      }

      const result = await messages.insertOne(newMessage);
      const fullMessage = { ...newMessage, _id: result.insertedId };

      const notifUrl = community
        ? { expo: `/community/${community._id}`, web: `/app/rooms/${community._id}` }
        : { expo: `/chat/group/${groupId}`, web: `/chat/group/${groupId}` };

      const expoPayload = { title: `💬 ${groupTitle}`, body: `${authorName}: ${displayBody}`, data: { url: notifUrl.expo } };
      const webPayloadStr = JSON.stringify({ title: `💬 ${groupTitle}`, body: `${authorName}: ${displayBody}`, icon: authorPhoto || '/pwa-192x192.png', data: { url: notifUrl.web } });

      for (const uid of recipients) {
        sendToUser(uid, fullMessage);
        // Push only — no notification document, badge is driven client-side from the WS message
        if (uid !== fromUid) sendPushNotification(uid, webPayloadStr, expoPayload).catch(() => {});
      }

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
      await sendPushNotification(toUid, webPayloadStr, expoPayload);

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

// Delete (unsend) a single message — only the sender can do this
app.delete('/api/chat/message/:messageId', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { messageId } = req.params;
    const { fromUid } = req.body;
    if (!fromUid) return res.status(400).json({ error: "fromUid required" });

    const messages = db.collection('messages');
    const { ObjectId } = require('mongodb');
    let query;
    try { query = { _id: new ObjectId(messageId), fromUid }; }
    catch { return res.status(400).json({ error: "Invalid message ID" }); }

    const result = await messages.updateOne(query, { $set: { deleted: true, text: '', mediaUrl: null } });
    if (result.matchedCount === 0) return res.status(403).json({ error: "Not found or not your message" });

    // Broadcast deletion to WebSocket clients
    const broadcastDelete = (uid) => {
      if (clients.has(uid)) {
        clients.get(uid).forEach(ws => {
          if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'message_deleted', messageId }));
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

// --- Chat Expiration Logic ---
const CHAT_EXPIRATION_DAYS = 7;
const CHAT_EXPIRATION_MS = CHAT_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;

async function expireInactiveChats() {
  if (!db) return;
  try {
    const chats = db.collection('chats');
    const now = Date.now();

    // Mark chats as expired if inactive for 7 days
    await chats.updateMany(
      { lastActivity: { $lt: now - CHAT_EXPIRATION_MS }, expired: { $ne: true } },
      { $set: { expired: true } }
    );
  } catch (e) {
    console.error('Error expiring inactive chats:', e);
  }
}

// Schedule chat expiration job
setInterval(expireInactiveChats, 24 * 60 * 60 * 1000); // Run daily

// --- Revive Chat API ---
app.post('/api/chats/:chatId/revive', requireAuth, async (req, res) => {
  const { chatId } = req.params;
  const uid = req.body.uid;

  if (!db) return res.status(500).json({ error: 'Database not initialized' });

  try {
    const chats = db.collection('chats');
    const chat = await chats.findOne({ _id: new ObjectId(chatId) });

    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    if (chat.expired !== true) return res.status(400).json({ error: 'Chat is not expired' });

    // Revive the chat
    await chats.updateOne(
      { _id: new ObjectId(chatId) },
      { $set: { expired: false, lastActivity: Date.now() } }
    );

    res.json({ message: 'Chat revived successfully' });
  } catch (e) {
    console.error('Error reviving chat:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// --- COMMUNITY ROOMS ---
// ============================================================

// Create a community room
app.post('/api/communities', async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not connected' });
  try {
    const { uid, name, description, tags, isPrivate } = req.body;
    if (!uid || !name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'uid and name are required' });
    }
    const trimmedName = name.trim().slice(0, 80);
    if (trimmedName.length < 2) return res.status(400).json({ error: 'Name must be at least 2 characters' });
    const communities = db.collection('communities');
    const result = await communities.insertOne({
      name: trimmedName,
      description: (description || '').trim().slice(0, 300),
      ownerUid: uid,
      members: [uid],
      createdAt: Date.now(),
      lastActivity: Date.now(),
      tags: Array.isArray(tags) ? tags.slice(0, 5).map(t => String(t).slice(0, 30)) : [],
      isPrivate: isPrivate === true,
      pinnedMessageId: null,
      pinnedMessageText: null,
    });
    res.json({ success: true, id: result.insertedId.toString() });
  } catch (e) {
    console.error('Create community error:', e);
    res.status(500).json({ error: 'Failed to create community' });
  }
});

// List all public communities
app.get('/api/communities', async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not connected' });
  try {
    const communities = db.collection('communities');
    const list = await communities.find({})
      .sort({ lastActivity: -1 })
      .limit(100)
      .toArray();
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch communities' });
  }
});

// Get a single community
app.get('/api/communities/:id', async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not connected' });
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid ID' });
    const communities = db.collection('communities');
    const community = await communities.findOne({ _id: new ObjectId(id) });
    if (!community) return res.status(404).json({ error: 'Community not found' });
    res.json(community);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch community' });
  }
});

// Join a community
app.post('/api/communities/:id/join', async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not connected' });
  try {
    const { id } = req.params;
    const { uid } = req.body;
    if (!uid || !ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid request' });
    const communities = db.collection('communities');
    const community = await communities.findOne({ _id: new ObjectId(id) });
    if (!community) return res.status(404).json({ error: 'Community not found' });
    await communities.updateOne(
      { _id: new ObjectId(id) },
      { $addToSet: { members: uid }, $set: { lastActivity: Date.now() } }
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to join community' });
  }
});

// Leave a community
app.post('/api/communities/:id/leave', async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not connected' });
  try {
    const { id } = req.params;
    const { uid } = req.body;
    if (!uid || !ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid request' });
    const communities = db.collection('communities');
    const community = await communities.findOne({ _id: new ObjectId(id) });
    if (!community) return res.status(404).json({ error: 'Community not found' });
    if (community.ownerUid === uid) return res.status(400).json({ error: 'Owner cannot leave. Delete the room instead.' });
    await communities.updateOne(
      { _id: new ObjectId(id) },
      { $pull: { members: uid } }
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to leave community' });
  }
});

// Update a community (owner only)
app.put('/api/communities/:id', async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not connected' });
  try {
    const { id } = req.params;
    const { uid, name, description } = req.body;
    if (!uid || !ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid request' });
    const communities = db.collection('communities');
    const community = await communities.findOne({ _id: new ObjectId(id) });
    if (!community) return res.status(404).json({ error: 'Community not found' });
    if (community.ownerUid !== uid) return res.status(403).json({ error: 'Only the owner can edit this room' });
    const updates = {};
    if (name && name.trim().length >= 2) updates.name = name.trim().slice(0, 80);
    if (description !== undefined) updates.description = (description || '').trim().slice(0, 300);
    if (Array.isArray(req.body.tags)) updates.tags = req.body.tags.slice(0, 5).map(t => String(t).slice(0, 30));
    if (typeof req.body.isPrivate === 'boolean') updates.isPrivate = req.body.isPrivate;
    await communities.updateOne({ _id: new ObjectId(id) }, { $set: updates });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update community' });
  }
});

// Delete a community (owner only)
app.delete('/api/communities/:id', async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not connected' });
  try {
    const { id } = req.params;
    const { uid } = req.body;
    if (!uid || !ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid request' });
    const communities = db.collection('communities');
    const community = await communities.findOne({ _id: new ObjectId(id) });
    if (!community) return res.status(404).json({ error: 'Community not found' });
    if (community.ownerUid !== uid) return res.status(403).json({ error: 'Only the owner can delete this room' });
    await communities.deleteOne({ _id: new ObjectId(id) });
    // Remove all messages for this room
    await db.collection('messages').deleteMany({ groupId: id });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete community' });
  }
});

// Delete a single group message (sender or room owner)
app.delete('/api/communities/:id/messages/:msgId', async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not connected' });
  try {
    const { id, msgId } = req.params;
    const { uid } = req.body;
    if (!uid || !ObjectId.isValid(msgId) || !ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid request' });
    const messages = db.collection('messages');
    const msg = await messages.findOne({ _id: new ObjectId(msgId) });
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    const community = await db.collection('communities').findOne({ _id: new ObjectId(id) });
    const isOwner = community?.ownerUid === uid;
    if (msg.fromUid !== uid && !isOwner) return res.status(403).json({ error: 'Not authorized' });
    await messages.updateOne({ _id: new ObjectId(msgId) }, { $set: { deleted: true, text: '', mediaUrl: null } });
    // Broadcast deletion to room subscribers
    const roomWs = rooms?.get(id);
    if (roomWs) {
      const payload = JSON.stringify({ type: 'message_deleted', messageId: msgId });
      roomWs.forEach(ws => { try { ws.send(payload); } catch {} });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Pin a message (room owner only)
app.put('/api/communities/:id/pin', async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not connected' });
  try {
    const { id } = req.params;
    const { uid, messageId, messageText } = req.body;
    if (!uid || !ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid request' });
    const community = await db.collection('communities').findOne({ _id: new ObjectId(id) });
    if (!community) return res.status(404).json({ error: 'Community not found' });
    if (community.ownerUid !== uid) return res.status(403).json({ error: 'Only the owner can pin messages' });
    await db.collection('communities').updateOne(
      { _id: new ObjectId(id) },
      { $set: { pinnedMessageId: messageId || null, pinnedMessageText: messageText || null } }
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to pin message' });
  }
});

// ============================================================
// SUPER ADMIN ROUTES
// All routes require the X-Admin-Secret header to match
// SUPER_ADMIN_SECRET in the environment.
// ============================================================
const SUPER_ADMIN_SECRET = process.env.SUPER_ADMIN_SECRET || 'orbyt_super_admin_secret_change_me';

function requireAdmin(req, res, next) {
  const provided = req.headers['x-admin-secret'];
  if (!provided || provided !== SUPER_ADMIN_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

// Admin login — just validates the secret and returns a session token
app.post('/api/admin/login', authLimiter, (req, res) => {
  const { secret } = req.body;
  if (!secret || secret !== SUPER_ADMIN_SECRET) {
    return res.status(403).json({ error: 'Invalid admin credentials' });
  }
  // Return the secret itself as the "token" — the client stores it
  // and sends it back as X-Admin-Secret on every subsequent request.
  res.json({ success: true, token: SUPER_ADMIN_SECRET });
});

// GET /api/admin/users — list all users with basic profile info
app.get('/api/admin/users', requireAdmin, async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not connected' });
  try {
    const users = db.collection('users');
    const profiles = db.collection('profiles');
    const posts = db.collection('posts');
    const stories = db.collection('stories');
    const reports = db.collection('reports');

    const allUsers = await users.find({}).project({ _id: 1, email: 1, createdAt: 1, authType: 1 }).toArray();
    const allProfiles = await profiles.find({}).project({
      uid: 1, displayName: 1, photoURL: 1, email: 1,
      createdAt: 1, dob: 1, jobRole: 1, bio: 1, interests: 1, friends: 1, isSuspended: 1
    }).toArray();
    const profileMap = {};
    allProfiles.forEach(p => { profileMap[p.uid] = p; });

    // Get post/story/report counts per user in one pass
    const [postCounts, storyCounts, reportCounts] = await Promise.all([
      posts.aggregate([{ $group: { _id: '$uid', count: { $sum: 1 } } }]).toArray(),
      stories.aggregate([{ $group: { _id: '$uid', count: { $sum: 1 } } }]).toArray(),
      reports.aggregate([{ $group: { _id: '$targetUid', count: { $sum: 1 } } }]).toArray(),
    ]);
    const postCountMap = {};
    postCounts.forEach(r => { postCountMap[r._id] = r.count; });
    const storyCountMap = {};
    storyCounts.forEach(r => { storyCountMap[r._id] = r.count; });
    const reportCountMap = {};
    reportCounts.forEach(r => { reportCountMap[r._id] = r.count; });

    const result = allUsers.map(u => {
      const uid = u._id.toString();
      const profile = profileMap[uid] || {};
      return {
        uid,
        email: u.email,
        authType: u.authType || 'email',
        displayName: profile.displayName || u.email?.split('@')[0] || 'Unknown',
        photoURL: profile.photoURL || '',
        bio: profile.bio || '',
        jobRole: profile.jobRole || '',
        createdAt: u.createdAt,
        postCount: postCountMap[uid] || 0,
        storyCount: storyCountMap[uid] || 0,
        reportCount: reportCountMap[uid] || 0,
        friendCount: (profile.friends || []).length,
        isSuspended: profile.isSuspended || false,
      };
    });

    // Sort: most reported first, then newest
    result.sort((a, b) => (b.reportCount - a.reportCount) || (new Date(b.createdAt) - new Date(a.createdAt)));

    res.json({ users: result, total: result.length });
  } catch (e) {
    console.error('Admin get users error:', e);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// DELETE /api/admin/users/:uid — permanently delete a user and ALL their data
app.delete('/api/admin/users/:uid', requireAdmin, async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not connected' });
  try {
    const { uid } = req.params;
    if (!uid) return res.status(400).json({ error: 'Missing uid' });

    const collections = {
      users: db.collection('users'),
      profiles: db.collection('profiles'),
      posts: db.collection('posts'),
      stories: db.collection('stories'),
      messages: db.collection('messages'),
      notifications: db.collection('notifications'),
      reports: db.collection('reports'),
      profile_views: db.collection('profile_views'),
      communities: db.collection('communities'),
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
    await collections.messages.deleteMany({ $or: [{ fromUid: uid }, { toUid: uid }] });

    // 6. Delete all notifications involving this user
    await collections.notifications.deleteMany({ $or: [{ fromUid: uid }, { toUid: uid }] });

    // 7. Delete all reports by or against this user
    await collections.reports.deleteMany({ $or: [{ reporterUid: uid }, { targetUid: uid }] });

    // 8. Delete profile views
    await collections.profile_views.deleteMany({ $or: [{ viewerUid: uid }, { targetUid: uid }] });

    // 9. Remove this user from all friend/block lists
    await collections.profiles.updateMany({}, {
      $pull: { friends: uid, incomingRequests: uid, outgoingRequests: uid, blockedUsers: uid, passedUsers: uid }
    });

    // 10. Remove from community member lists
    await collections.communities.updateMany({}, {
      $pull: { members: uid }
    });

    // 11. Remove comments & likes left by this user on posts
    await collections.posts.updateMany({}, {
      $pull: { comments: { uid }, likedBy: uid }
    });
    // Re-calculate like counts
    const affectedPosts = await collections.posts.find({ likedBy: { $exists: true } }).toArray();
    for (const post of affectedPosts) {
      await collections.posts.updateOne({ _id: post._id }, { $set: { likes: (post.likedBy || []).length } });
    }

    // Log admin action
    auditLogs.push({
      timestamp: new Date().toISOString(),
      action: 'admin_delete_user',
      targetUid: uid,
      ip: req.ip,
    });

    res.json({ success: true, message: `User ${uid} and all their data have been permanently deleted.` });
  } catch (e) {
    console.error('Admin delete user error:', e);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// GET /api/admin/reports — list all pending reports
app.get('/api/admin/reports', requireAdmin, async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not connected' });
  try {
    const reports = await db.collection('reports').find({}).sort({ createdAt: -1 }).limit(200).toArray();
    const profiles = db.collection('profiles');

    // Enrich with reporter/target display names
    const uids = [...new Set(reports.flatMap(r => [r.reporterUid, r.targetUid].filter(Boolean)))];
    const profileDocs = await profiles.find({ uid: { $in: uids } }).project({ uid: 1, displayName: 1, photoURL: 1 }).toArray();
    const profileMap = {};
    profileDocs.forEach(p => { profileMap[p.uid] = p; });

    const enriched = reports.map(r => ({
      ...r,
      reporterName: profileMap[r.reporterUid]?.displayName || 'Unknown',
      targetName: profileMap[r.targetUid]?.displayName || 'Unknown',
    }));

    res.json({ reports: enriched, total: enriched.length });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// PATCH /api/admin/reports/:id — update report status (resolve / dismiss)
app.patch('/api/admin/reports/:id', requireAdmin, async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not connected' });
  try {
    const { id } = req.params;
    const { status } = req.body; // 'resolved' | 'dismissed'
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid id' });
    await db.collection('reports').updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, resolvedAt: Date.now() } }
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update report' });
  }
});

// PATCH /api/admin/users/:uid/suspend — toggle user suspension
app.patch('/api/admin/users/:uid/suspend', requireAdmin, async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not connected' });
  try {
    const { uid } = req.params;
    if (!uid) return res.status(400).json({ error: 'Missing uid' });
    const profile = await db.collection('profiles').findOne({ uid });
    const current = profile?.isSuspended || false;
    await db.collection('profiles').updateOne({ uid }, { $set: { isSuspended: !current } }, { upsert: true });
    res.json({ success: true, isSuspended: !current });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update suspension' });
  }
});

// GET /api/admin/posts — paginated list of all posts with author + report counts
app.get('/api/admin/posts', requireAdmin, async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not connected' });
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const flaggedOnly = req.query.flagged === 'true';

    let pipeline = [];
    if (flaggedOnly) {
      // Only posts that have at least one pending report
      const reportedPostIds = await db.collection('reports')
        .distinct('postId', { status: 'pending', postId: { $exists: true, $ne: null } });
      pipeline.push({ $match: { _id: { $in: reportedPostIds.filter(Boolean).map(id => { try { return new ObjectId(id); } catch { return null; } }).filter(Boolean) } } });
    }
    pipeline.push({ $sort: { createdAt: -1 } });
    pipeline.push({ $skip: (page - 1) * limit });
    pipeline.push({ $limit: limit });

    const posts = await db.collection('posts').aggregate(pipeline).toArray();
    const total = flaggedOnly
      ? posts.length
      : await db.collection('posts').countDocuments();

    const postIds = posts.map(p => p._id.toString());
    const reportCounts = await db.collection('reports')
      .aggregate([
        { $match: { postId: { $in: postIds }, status: 'pending' } },
        { $group: { _id: '$postId', count: { $sum: 1 } } },
      ]).toArray();
    const reportCountMap = {};
    reportCounts.forEach(r => { reportCountMap[r._id] = r.count; });

    const uids = [...new Set(posts.map(p => p.uid).filter(Boolean))];
    const profiles = await db.collection('profiles').find({ uid: { $in: uids } }).project({ uid: 1, displayName: 1, photoURL: 1 }).toArray();
    const profileMap = {};
    profiles.forEach(p => { profileMap[p.uid] = p; });

    const result = posts.map(p => {
      const profile = profileMap[p.uid] || {};
      const createdAt = p.createdAt instanceof Date ? p.createdAt.getTime() : (typeof p.createdAt === 'number' ? p.createdAt : 0);
      return {
        _id: p._id.toString(),
        uid: p.uid || '',
        authorName: profile.displayName || p.uid || 'Unknown',
        authorPhoto: profile.photoURL || '',
        content: p.content || '',
        imageURL: p.imageURL || null,
        likeCount: (p.likes || []).length,
        commentCount: (p.comments || []).length,
        reportCount: reportCountMap[p._id.toString()] || 0,
        createdAt,
        type: p.type || 'post',
      };
    });

    res.json({ posts: result, total, page, pages: Math.ceil(total / limit) });
  } catch (e) {
    console.error('Admin get posts error:', e);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// DELETE /api/admin/posts/:postId — admin force-delete any post
app.delete('/api/admin/posts/:postId', requireAdmin, async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not connected' });
  try {
    const { postId } = req.params;
    if (!ObjectId.isValid(postId)) return res.status(400).json({ error: 'Invalid post id' });
    await db.collection('posts').deleteOne({ _id: new ObjectId(postId) });
    await db.collection('reports').deleteMany({ postId });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// POST /api/admin/broadcast — send a system notification to all users
app.post('/api/admin/broadcast', requireAdmin, async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not connected' });
  try {
    const { title, message } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ error: 'Message is required' });
    const allUsers = await db.collection('users').find({}).project({ _id: 1 }).toArray();
    const now = Date.now();
    const notifications = allUsers.map(u => ({
      uid: u._id.toString(),
      type: 'announcement',
      title: (title || 'Orbyt').trim(),
      message: message.trim(),
      createdAt: now,
      read: false,
    }));
    if (notifications.length > 0) {
      await db.collection('notifications').insertMany(notifications);
    }
    res.json({ success: true, sent: notifications.length });
  } catch (e) {
    res.status(500).json({ error: 'Failed to broadcast' });
  }
});

// GET /api/admin/communities — list all communities with member/message counts
app.get('/api/admin/communities', requireAdmin, async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not connected' });
  try {
    const communities = await db.collection('communities').find({}).toArray();
    const result = communities.map(c => ({
      id: c._id.toString(),
      name: c.name,
      description: c.description || '',
      createdBy: c.uid || c.createdBy || '',
      memberCount: (c.members || []).length,
      isPrivate: c.isPrivate || false,
      createdAt: c.createdAt || null,
      tags: c.tags || [],
    }));
    result.sort((a, b) => b.memberCount - a.memberCount);
    res.json({ communities: result, total: result.length });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch communities' });
  }
});

// DELETE /api/admin/communities/:id — hard-delete a community
app.delete('/api/admin/communities/:id', requireAdmin, async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not connected' });
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid id' });
    await db.collection('communities').deleteOne({ _id: new ObjectId(id) });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete community' });
  }
});

// GET /api/admin/stats — dashboard overview numbers
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database not connected' });
  try {
    const [users, posts, stories, reports, communities] = await Promise.all([
      db.collection('users').countDocuments(),
      db.collection('posts').countDocuments(),
      db.collection('stories').countDocuments(),
      db.collection('reports').countDocuments({ status: 'pending' }),
      db.collection('communities').countDocuments(),
    ]);
    // New users in last 7 days
    const since7d = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const newUsers7d = await db.collection('users').countDocuments({ createdAt: { $gte: new Date(since7d) } });

    res.json({ users, posts, stories, pendingReports: reports, communities, newUsers7d });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Server + WebSocket running on port ${port}`);
});

