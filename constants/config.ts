/**
 * APPLICATION CONFIGURATION
 *
 * Centralized configuration for hardcoded values, environment URLs,
 * and application constants.
 */

// ============================================================================
// API CONFIGURATION
// ============================================================================

export const API_CONFIG = {
  // Server port for local development
  PORT: 5000,

  // Production & development domains
  DOMAINS: {
    LOCAL: 'localhost',
    NETWORK: '192.168.',
    PRIVATE: '10.',
    VERCEL: 'vercel.app',
  },

  // Backend URLs for different environments
  BACKEND: {
    LOCAL: (hostname: string, port: number) =>
      `http://${hostname}:${port}/api`,
    VERCEL: 'https://orbyt.strangerchat.space/api',
    PRODUCTION: (protocol: string, hostname: string) =>
      `${protocol}//${hostname}/api`,
  },

  // WebSocket URLs for different environments
  WEBSOCKET: {
    LOCAL: (hostname: string, port: number) =>
      `ws://${hostname}:${port}`,
    VERCEL: 'wss://backend.strangerchat.space',
    PRODUCTION: (protocol: string, hostname: string) =>
      protocol === 'https:' ? `wss://${hostname}` : `ws://${hostname}`,
  },
} as const;

// ============================================================================
// ERROR RESPONSE CONFIGURATION
// ============================================================================

/**
 * Standardized API Error Response Format
 * All API errors from backend use the 'error' field
 */
export const API_ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error occurred. Please check your connection.',
  GENERIC_ERROR: 'An error occurred. Please try again.',
  UNAUTHORIZED: 'Unauthorized. Please log in again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'Resource not found.',
  VALIDATION_ERROR: 'Invalid input. Please check your data.',
  SERVER_ERROR: 'Server error occurred. Please try again later.',
} as const;

// ============================================================================
// PUSH NOTIFICATION CONFIGURATION
// ============================================================================

export const PUSH_NOTIFICATION_CONFIG = {
  // Max retry attempts for failed notifications
  MAX_RETRIES: 2,

  // Retry delay in milliseconds
  RETRY_DELAY_MS: 2000,

  // TTL (time to live) for Expo push notifications in seconds (4 weeks)
  EXPO_TTL_SECONDS: 2419200,

  // Maximum log entries to keep in memory
  MAX_LOG_ENTRIES: 1000,
} as const;

// ============================================================================
// PROFILE & USER CONFIGURATION
// ============================================================================

export const USER_CONFIG = {
  // Minimum age requirement
  MIN_AGE: 18,

  // Default discovery radius in kilometers
  DEFAULT_DISCOVERY_RADIUS_KM: 10,

  // Location precision (decimal places for privacy)
  LOCATION_PRECISION_DECIMALS: 3,

  // Maximum profile views to fetch
  MAX_PROFILE_VIEWS: 20,

  // Maximum profiles per batch request
  MAX_BATCH_PROFILES: 100,
} as const;

// ============================================================================
// POST & CONTENT CONFIGURATION
// ============================================================================

export const CONTENT_CONFIG = {
  // Maximum posts to load in a single request
  POSTS_PER_PAGE: 10,

  // Maximum notification history items
  MAX_NOTIFICATIONS: 50,

  // Maximum chat history items
  MAX_CHAT_HISTORY: 50,

  // Maximum stories to display
  MAX_STORIES: 20,

  // Story expiration time in milliseconds (24 hours)
  STORY_EXPIRATION_MS: 24 * 60 * 60 * 1000,

  // Maximum file upload size in MB
  MAX_FILE_SIZE_MB: 50,
} as const;

// ============================================================================
// GEOLOCATION CONFIGURATION
// ============================================================================

export const GEOLOCATION_CONFIG = {
  // Earth's radius in kilometers (for distance calculations)
  EARTH_RADIUS_KM: 6371,

  // Default coordinates (fallback)
  DEFAULT_LAT: 0,
  DEFAULT_LNG: 0,

  // Geolocation accuracy threshold in meters
  ACCURACY_THRESHOLD_METERS: 1000,
} as const;

// ============================================================================
// RATE LIMITING CONFIGURATION
// ============================================================================

export const RATE_LIMITING_CONFIG = {
  // Auth endpoints: max requests per window
  AUTH_MAX_REQUESTS: 5,

  // Auth endpoints: time window in milliseconds (15 minutes)
  AUTH_WINDOW_MS: 15 * 60 * 1000,

  // General API: max requests per minute
  API_MAX_REQUESTS: 100,

  // General API: time window in milliseconds (1 minute)
  API_WINDOW_MS: 1 * 60 * 1000,
} as const;

// ============================================================================
// PAGINATION CONFIGURATION
// ============================================================================

export const PAGINATION_CONFIG = {
  // Default items per page
  DEFAULT_PAGE_SIZE: 10,

  // Maximum items per page
  MAX_PAGE_SIZE: 100,

  // Minimum items per page
  MIN_PAGE_SIZE: 1,
} as const;

// ============================================================================
// TIMEOUT CONFIGURATION
// ============================================================================

export const TIMEOUT_CONFIG = {
  // General fetch timeout in milliseconds
  FETCH_TIMEOUT_MS: 30000,

  // WebSocket cleanup timeout in milliseconds (30 seconds)
  WEBSOCKET_CLEANUP_MS: 30000,

  // Keep-alive interval for WebSocket in milliseconds
  WEBSOCKET_KEEPALIVE_MS: 30000,
} as const;

// ============================================================================
// LOGGING CONFIGURATION
// ============================================================================

export const LOGGING_CONFIG = {
  // Log prefix for audit logs
  AUDIT_LOG_PREFIX: '[AUDIT]',

  // Log prefix for push notifications
  PUSH_LOG_PREFIX: '[PUSH]',

  // Enable detailed logging in development
  VERBOSE_MODE: import.meta.env.DEV,

  // Maximum log entries stored in memory
  MAX_LOG_ENTRIES: 1000,
} as const;

// ============================================================================
// UI CONFIGURATION
// ============================================================================

export const UI_CONFIG = {
  // Toast notification duration in milliseconds
  TOAST_DURATION_MS: 3000,

  // Animation duration in milliseconds
  ANIMATION_DURATION_MS: 300,

  // Debounce delay for search inputs in milliseconds
  SEARCH_DEBOUNCE_MS: 500,

  // Intersection Observer threshold for infinite scroll
  SCROLL_THRESHOLD: 0.1,

  // Margin for triggering scroll in pixels
  SCROLL_MARGIN_PX: 100,
} as const;

export default {
  API_CONFIG,
  API_ERROR_MESSAGES,
  PUSH_NOTIFICATION_CONFIG,
  USER_CONFIG,
  CONTENT_CONFIG,
  GEOLOCATION_CONFIG,
  RATE_LIMITING_CONFIG,
  PAGINATION_CONFIG,
  TIMEOUT_CONFIG,
  LOGGING_CONFIG,
  UI_CONFIG,
};
