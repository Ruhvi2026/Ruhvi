export class ApiError extends Error {
  public statusCode: number;
  public userMessage: string;

  constructor(message: string, statusCode: number = 500, userMessage?: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.userMessage = userMessage || mapStatusCodeToUserMessage(statusCode);
  }
}

function mapStatusCodeToUserMessage(statusCode: number): string {
  switch (statusCode) {
    case 400:
    case 422:
      return 'The information provided was invalid. Please check and try again.';
    case 401:
      return 'Your session has expired. Please log in again.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 408:
    case 504:
      return 'The request timed out. Please check your network and try again.';
    case 500:
    case 502:
    case 503:
      return 'Something went wrong on our end. Please try again later.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Standardizes fetch or Supabase errors into an ApiError format.
 */
export function parseApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  // Handle Supabase PostgrestError (or similar)
  if (typeof error === 'object' && error !== null && 'code' in error && 'message' in error) {
    const supabaseError = error as { code: string; message: string; details?: string };
    
    // Attempt to map common Postgres/Supabase codes
    // 23505: unique_violation
    if (supabaseError.code === '23505') {
      return new ApiError(supabaseError.message, 400, 'This record already exists.');
    }
    // P0001: custom raise exception (often from RLS or custom functions)
    if (supabaseError.code === 'P0001') {
      return new ApiError(supabaseError.message, 400, supabaseError.message);
    }
    
    // Auth errors often don't have HTTP status codes attached directly in all object types
    if (supabaseError.message.toLowerCase().includes('invalid login credentials')) {
       return new ApiError(supabaseError.message, 401, 'Invalid login credentials. Please check your phone number and OTP.');
    }
     if (supabaseError.message.toLowerCase().includes('token expired')) {
       return new ApiError(supabaseError.message, 401, 'Your session has expired. Please log in again.');
    }

    return new ApiError(supabaseError.message, 500);
  }

  // Handle Fetch Errors / Network failures
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return new ApiError(error.message, 0, 'No internet connection. Please check your network.');
  }

  if (error instanceof Error) {
    return new ApiError(error.message, 500);
  }

  return new ApiError('Unknown error', 500);
}

/**
 * Safely logs errors in development mode only to prevent leaking traces in production.
 */
export function logDevError(message: string, error?: unknown) {
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[DEV ERROR] ${message}:`, error);
  }
}
