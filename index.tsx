import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { Buffer } from "buffer";
import { showGlobalToast } from './context/NotificationContext';

(window as any).Buffer = Buffer;

// Global error toasts for failed API calls.
// Previously every non-OK response (from any URL) raised a toast: background polls,
// expected 404s, logged-out visitors on public pages (401) and third-party fetches all
// showed red errors, and an offline phone got a toast every few seconds. Now:
//  - only our own /api/ calls are considered,
//  - 401s are left to the session handling in services/api.ts,
//  - GET failures are background loads; each screen shows its own empty/error state,
//  - user actions (POST/PUT/PATCH/DELETE) that fail show the server's message,
//  - identical toasts are de-duplicated and "offline" shows at most every 30s.
let lastToast = { msg: "", at: 0 };
const toastOnce = (msg: string, windowMs = 4000) => {
  const now = Date.now();
  if (msg === lastToast.msg && now - lastToast.at < windowMs) return;
  lastToast = { msg, at: now };
  showGlobalToast(msg, 'error');
};

const originalFetch = window.fetch.bind(window);
window.fetch = async (...args: Parameters<typeof fetch>) => {
  const [input, init] = args;
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
  const isApi = url.includes("/api/");
  const isUserAction = isApi && method !== "GET" && method !== "HEAD";
  try {
    const response = await originalFetch(...args);
    if (!response.ok && isUserAction && response.status !== 401) {
      response
        .clone()
        .json()
        .then((data) => toastOnce(data?.error || data?.message || "Something went wrong. Please try again."))
        .catch(() => toastOnce("Something went wrong. Please try again."));
    }
    return response;
  } catch (error: any) {
    if (isApi && error?.name !== "AbortError") {
      toastOnce("You're offline or the server can't be reached. Please try again.", 30000);
    }
    throw error;
  }
};

// Remove stale service workers from older builds, but keep /sw.js: it receives web
// push. Unregistering every worker on each load (as before) also deleted the
// browser's push subscription, so web push notifications could never work reliably.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        const scriptUrl =
          registration.active?.scriptURL ||
          registration.waiting?.scriptURL ||
          registration.installing?.scriptURL ||
          "";
        if (!scriptUrl.endsWith("/sw.js")) registration.unregister();
      });
    }).catch(() => {});
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);