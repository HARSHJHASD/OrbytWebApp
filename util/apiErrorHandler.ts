/**
 * API ERROR HANDLER UTILITY
 *
 * Provides consistent error handling and response parsing across the application.
 */

import { API_ERROR_MESSAGES } from '../constants/config';

/**
 * Standard API Response Type
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode: number;
}

/**
 * Standard API Error Type
 */
export interface ApiError {
  message: string;
  statusCode: number;
  details?: unknown;
}

/**
 * Parse API response and handle errors consistently
 *
 * Backend returns errors in format: { error: "message" }
 * This function ensures consistent error handling
 */
export async function parseApiResponse<T>(
  response: Response,
): Promise<ApiResponse<T>> {
  let data: Record<string, unknown> = {};

  try {
    data = await response.json();
  } catch {
    return {
      success: false,
      error: API_ERROR_MESSAGES.NETWORK_ERROR,
      statusCode: response.status,
    };
  }

  // Backend returns errors in the 'error' field
  if (!response.ok) {
    const errorMessage = typeof data.error === 'string'
      ? data.error
      : API_ERROR_MESSAGES.GENERIC_ERROR;

    return {
      success: false,
      error: errorMessage,
      statusCode: response.status,
    };
  }

  return {
    success: true,
    data: data as T,
    statusCode: response.status,
  };
}

/**
 * Create a consistent error object
 */
export function createApiError(
  message: string,
  statusCode: number = 500,
  details?: unknown,
): ApiError {
  return {
    message,
    statusCode,
    details,
  };
}

/**
 * Extract user-friendly error message from response
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;
    if (typeof err.error === 'string') return err.error;
    if (typeof err.message === 'string') return err.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return API_ERROR_MESSAGES.GENERIC_ERROR;
}

/**
 * Handle network errors gracefully
 */
export function handleNetworkError(error: unknown): ApiError {
  const message = error instanceof TypeError && error.message.includes('fetch')
    ? API_ERROR_MESSAGES.NETWORK_ERROR
    : getErrorMessage(error);

  return createApiError(message, 0);
}

/**
 * Validate HTTP status and return appropriate error
 */
export function getStatusCodeError(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return API_ERROR_MESSAGES.VALIDATION_ERROR;
    case 401:
      return API_ERROR_MESSAGES.UNAUTHORIZED;
    case 403:
      return API_ERROR_MESSAGES.FORBIDDEN;
    case 404:
      return API_ERROR_MESSAGES.NOT_FOUND;
    case 500:
    case 502:
    case 503:
    case 504:
      return API_ERROR_MESSAGES.SERVER_ERROR;
    default:
      return API_ERROR_MESSAGES.GENERIC_ERROR;
  }
}
