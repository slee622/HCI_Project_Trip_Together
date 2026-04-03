export class AppError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

interface SupabaseLikeError {
  message: string;
  code?: string;
  details?: string;
}

export function mapSupabaseError(error: SupabaseLikeError, fallbackMessage: string): AppError {
  if (error.code === '42501') {
    return new AppError(403, 'Forbidden by row-level security policy', error.details ?? error.message);
  }

  if (error.code === '23505') {
    return new AppError(409, 'Unique constraint violation', error.details ?? error.message);
  }

  if (error.code === '23503') {
    return new AppError(400, 'Foreign key constraint violation', error.details ?? error.message);
  }

  return new AppError(400, fallbackMessage, error.details ?? error.message);
}
