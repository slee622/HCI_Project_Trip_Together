import fs from 'node:fs';
import path from 'node:path';

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';

function loadEnv() {
  const cwd = process.cwd();
  const envPath = path.join(cwd, '.env');
  const envExamplePath = path.join(cwd, '.env.example');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  } else if (fs.existsSync(envExamplePath)) {
    dotenv.config({ path: envExamplePath });
  }
}

loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const HAS_REAL_KEYS =
  !!SUPABASE_URL &&
  !!SUPABASE_SERVICE_ROLE_KEY &&
  !SUPABASE_URL.includes('your-project-ref') &&
  !SUPABASE_SERVICE_ROLE_KEY.includes('your-service-role-key');

const describeIfIntegration = HAS_REAL_KEYS ? describe : describe.skip;

function randomEmail(prefix: string) {
  return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`;
}

function requireData<T>(data: T | null, message: string): T {
  if (!data) {
    throw new Error(message);
  }
  return data;
}

describeIfIntegration('supabase schema integration', () => {
  let admin: SupabaseClient;
  let ownerId: string;
  let memberId: string;
  let groupId: string;
  let sessionId: string;

  beforeAll(async () => {
    admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const owner = await admin.auth.admin.createUser({
      email: randomEmail('owner'),
      password: 'Password123!',
      email_confirm: true
    });
    expect(owner.error).toBeNull();
    ownerId = requireData(owner.data.user?.id ?? null, 'owner user id missing');

    const member = await admin.auth.admin.createUser({
      email: randomEmail('member'),
      password: 'Password123!',
      email_confirm: true
    });
    expect(member.error).toBeNull();
    memberId = requireData(member.data.user?.id ?? null, 'member user id missing');

    const usersUpsert = await admin.from('users').upsert(
      [
        { id: ownerId, display_name: 'Owner' },
        { id: memberId, display_name: 'Member' }
      ],
      { onConflict: 'id' }
    );
    expect(usersUpsert.error).toBeNull();
  });

  afterAll(async () => {
    if (!admin || !ownerId || !memberId) return;

    if (sessionId) {
      await admin.from('trip_sessions').delete().eq('id', sessionId);
    }

    if (groupId) {
      await admin.from('trip_groups').delete().eq('id', groupId);
    }

    await admin.from('users').delete().in('id', [ownerId, memberId]);

    await admin.auth.admin.deleteUser(ownerId);
    await admin.auth.admin.deleteUser(memberId);
  });

  it('has all expected public tables', async () => {
    const expectedTables = [
      'users',
      'trip_groups',
      'group_memberships',
      'trip_sessions',
      'user_preferences',
      'destination_recommendations',
      'votes',
      'selected_destination'
    ];

    for (const table of expectedTables) {
      const { error } = await admin.from(table).select('*', { head: true, count: 'exact' });
      expect(error, `table missing or inaccessible: ${table}`).toBeNull();
    }
  });

  it('creates and retrieves group + membership rows', async () => {
    const createdGroup = await admin
      .from('trip_groups')
      .insert({ name: 'DB Integration Group', created_by: ownerId, description: 'integration test' })
      .select('*')
      .single();
    expect(createdGroup.error).toBeNull();
    groupId = requireData(createdGroup.data?.id ?? null, 'group id missing');

    const ownerMembership = await admin
      .from('group_memberships')
      .insert({
        group_id: groupId,
        user_id: ownerId,
        role: 'owner',
        join_status: 'accepted',
        invited_by: null
      })
      .select('*')
      .single();
    expect(ownerMembership.error).toBeNull();

    const memberMembership = await admin
      .from('group_memberships')
      .insert({
        group_id: groupId,
        user_id: memberId,
        role: 'member',
        join_status: 'invited',
        invited_by: ownerId
      })
      .select('*')
      .single();
    expect(memberMembership.error).toBeNull();

    const memberships = await admin
      .from('group_memberships')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });
    expect(memberships.error).toBeNull();
    expect(memberships.data?.length).toBe(2);
  });

  it('enforces unique membership by (group_id, user_id)', async () => {
    const duplicate = await admin.from('group_memberships').insert({
      group_id: groupId,
      user_id: memberId,
      role: 'member',
      join_status: 'accepted',
      invited_by: ownerId
    });

    expect(duplicate.error).not.toBeNull();
    expect(duplicate.error?.code).toBe('23505');
  });

  it('creates, updates, and retrieves a trip session', async () => {
    const createdSession = await admin
      .from('trip_sessions')
      .insert({
        group_id: groupId,
        name: 'Summer Session',
        created_by: ownerId,
        stage: 'planning',
        source_location: 'NYC'
      })
      .select('*')
      .single();
    expect(createdSession.error).toBeNull();
    sessionId = requireData(createdSession.data?.id ?? null, 'session id missing');

    const updated = await admin
      .from('trip_sessions')
      .update({ stage: 'voting' })
      .eq('id', sessionId)
      .select('*')
      .single();
    expect(updated.error).toBeNull();
    expect(updated.data?.stage).toBe('voting');

    const retrieved = await admin.from('trip_sessions').select('*').eq('id', sessionId).single();
    expect(retrieved.error).toBeNull();
    expect(retrieved.data?.source_location).toBe('NYC');
  });

  it('upserts preferences and verifies modified values', async () => {
    const first = await admin
      .from('user_preferences')
      .upsert(
        {
          session_id: sessionId,
          user_id: ownerId,
          preference_vector: { budget: 0.2, food: 0.9 }
        },
        { onConflict: 'session_id,user_id' }
      )
      .select('*')
      .single();
    expect(first.error).toBeNull();
    expect(first.data?.preference_vector.food).toBe(0.9);

    const second = await admin
      .from('user_preferences')
      .upsert(
        {
          session_id: sessionId,
          user_id: ownerId,
          preference_vector: { budget: 0.8, food: 0.1 }
        },
        { onConflict: 'session_id,user_id' }
      )
      .select('*')
      .single();
    expect(second.error).toBeNull();
    expect(second.data?.preference_vector.budget).toBe(0.8);
  });

  it('enforces unique vote constraint and allows updates', async () => {
    const firstVote = await admin.from('votes').insert({
      session_id: sessionId,
      user_id: ownerId,
      destination_code: 'SFO',
      destination_name: 'San Francisco',
      vote_value: 1
    });
    expect(firstVote.error).toBeNull();

    const duplicateVote = await admin.from('votes').insert({
      session_id: sessionId,
      user_id: ownerId,
      destination_code: 'MIA',
      destination_name: 'Miami',
      vote_value: -1
    });
    expect(duplicateVote.error).not.toBeNull();
    expect(duplicateVote.error?.code).toBe('23505');

    const updateVote = await admin
      .from('votes')
      .update({ destination_code: 'MIA', destination_name: 'Miami', vote_value: -1 })
      .eq('session_id', sessionId)
      .eq('user_id', ownerId)
      .select('*')
      .single();
    expect(updateVote.error).toBeNull();
    expect(updateVote.data?.destination_code).toBe('MIA');
    expect(updateVote.data?.vote_value).toBe(-1);
  });

  it('inserts and retrieves ranked recommendations', async () => {
    const inserted = await admin.from('destination_recommendations').insert([
      {
        session_id: sessionId,
        destination_code: 'MIA',
        destination_name: 'Miami',
        score: 0.91,
        explanation: 'Warm weather',
        rank: 1
      },
      {
        session_id: sessionId,
        destination_code: 'SFO',
        destination_name: 'San Francisco',
        score: 0.89,
        explanation: 'Food scene',
        rank: 2
      }
    ]);
    expect(inserted.error).toBeNull();

    const retrieved = await admin
      .from('destination_recommendations')
      .select('*')
      .eq('session_id', sessionId)
      .order('rank', { ascending: true });
    expect(retrieved.error).toBeNull();
    expect(retrieved.data?.length).toBe(2);
    expect(retrieved.data?.[0].destination_code).toBe('MIA');
  });

  it('upserts selected destination and retrieves modified row', async () => {
    const first = await admin
      .from('selected_destination')
      .upsert({
        session_id: sessionId,
        destination_code: 'MIA',
        selected_by: ownerId,
        reasoning: 'Initial pick'
      })
      .select('*')
      .single();
    expect(first.error).toBeNull();
    expect(first.data?.destination_code).toBe('MIA');

    const second = await admin
      .from('selected_destination')
      .upsert({
        session_id: sessionId,
        destination_code: 'SFO',
        selected_by: ownerId,
        reasoning: 'Updated pick'
      })
      .select('*')
      .single();
    expect(second.error).toBeNull();
    expect(second.data?.destination_code).toBe('SFO');
    expect(second.data?.reasoning).toBe('Updated pick');
  });

  it('removes dependent rows when session is deleted (cascade)', async () => {
    const session = await admin
      .from('trip_sessions')
      .insert({
        group_id: groupId,
        name: 'Cascade Session',
        created_by: ownerId
      })
      .select('*')
      .single();
    expect(session.error).toBeNull();
    const cascadeSessionId = requireData(session.data?.id ?? null, 'cascade session id missing');

    expect(
      (
        await admin.from('user_preferences').insert({
          session_id: cascadeSessionId,
          user_id: ownerId,
          preference_vector: { budget: 0.5 }
        })
      ).error
    ).toBeNull();
    expect(
      (
        await admin.from('votes').insert({
          session_id: cascadeSessionId,
          user_id: ownerId,
          destination_code: 'MIA',
          vote_value: 1
        })
      ).error
    ).toBeNull();
    expect(
      (
        await admin.from('destination_recommendations').insert({
          session_id: cascadeSessionId,
          destination_code: 'MIA',
          destination_name: 'Miami',
          score: 0.9,
          explanation: 'Best'
        })
      ).error
    ).toBeNull();
    expect(
      (
        await admin.from('selected_destination').insert({
          session_id: cascadeSessionId,
          destination_code: 'MIA',
          selected_by: ownerId
        })
      ).error
    ).toBeNull();

    expect((await admin.from('trip_sessions').delete().eq('id', cascadeSessionId)).error).toBeNull();

    const prefs = await admin.from('user_preferences').select('*').eq('session_id', cascadeSessionId);
    const votes = await admin.from('votes').select('*').eq('session_id', cascadeSessionId);
    const recs = await admin.from('destination_recommendations').select('*').eq('session_id', cascadeSessionId);
    const selection = await admin.from('selected_destination').select('*').eq('session_id', cascadeSessionId);

    expect(prefs.error).toBeNull();
    expect(votes.error).toBeNull();
    expect(recs.error).toBeNull();
    expect(selection.error).toBeNull();

    expect(prefs.data).toHaveLength(0);
    expect(votes.data).toHaveLength(0);
    expect(recs.data).toHaveLength(0);
    expect(selection.data).toHaveLength(0);
  });
});
