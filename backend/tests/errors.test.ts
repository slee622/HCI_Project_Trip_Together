import { describe, expect, it } from 'vitest';

import { AppError, mapSupabaseError } from '../src/utils/errors.js';

describe('mapSupabaseError', () => {
  it('maps RLS violation (42501) to 403', () => {
    const error = mapSupabaseError(
      { code: '42501', message: 'permission denied', details: 'blocked by policy' },
      'fallback'
    );

    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(403);
    expect(error.message).toBe('Forbidden by row-level security policy');
    expect(error.details).toBe('blocked by policy');
  });

  it('maps unique constraint violation (23505) to 409', () => {
    const error = mapSupabaseError(
      { code: '23505', message: 'duplicate key value violates unique constraint' },
      'fallback'
    );

    expect(error.statusCode).toBe(409);
    expect(error.message).toBe('Unique constraint violation');
  });

  it('maps foreign key violation (23503) to 400', () => {
    const error = mapSupabaseError(
      { code: '23503', message: 'insert or update violates foreign key' },
      'fallback'
    );

    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('Foreign key constraint violation');
  });

  it('falls back to provided message for unknown code', () => {
    const error = mapSupabaseError({ code: '99999', message: 'weird failure' }, 'custom fallback');

    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('custom fallback');
    expect(error.details).toBe('weird failure');
  });

  it('uses details when present for unknown code', () => {
    const error = mapSupabaseError(
      { code: 'XX000', message: 'some failure', details: 'specific details' },
      'fallback message'
    );

    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('fallback message');
    expect(error.details).toBe('specific details');
  });
});
