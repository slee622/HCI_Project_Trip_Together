import { SupabaseClient } from '@supabase/supabase-js';

import { AppError } from '../utils/errors.js';

export interface AuthUser {
  id: string;
  email?: string;
}

export interface AuthProvider {
  verifyAccessToken(accessToken: string): Promise<AuthUser>;
}

export class SupabaseAuthProvider implements AuthProvider {
  private readonly adminClient: SupabaseClient;

  constructor(adminClient: SupabaseClient) {
    this.adminClient = adminClient;
  }

  async verifyAccessToken(accessToken: string): Promise<AuthUser> {
    const { data, error } = await this.adminClient.auth.getUser(accessToken);

    if (error || !data.user) {
      throw new AppError(401, 'Invalid or expired token');
    }

    return {
      id: data.user.id,
      email: data.user.email ?? undefined
    };
  }
}
