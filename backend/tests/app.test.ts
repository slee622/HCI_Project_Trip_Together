import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app.js';
import { AuthProvider } from '../src/services/auth-provider.js';
import {
  CreateGroupInput,
  CreateSessionInput,
  InviteToGroupInput,
  RecommendationInput,
  SelectionInput,
  TripService,
  VoteInput
} from '../src/services/trip-service.js';
import { AppError } from '../src/utils/errors.js';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_USER_ID = '22222222-2222-4222-8222-222222222222';
const GROUP_ID = '33333333-3333-4333-8333-333333333333';
const SESSION_ID = '44444444-4444-4444-8444-444444444444';

function createMockService(overrides: Partial<TripService> = {}): TripService {
  const service: TripService = {
    createGroup: vi.fn(async (_token: string, _userId: string, input: CreateGroupInput) => ({
      id: GROUP_ID,
      name: input.name,
      description: input.description ?? null,
      createdBy: USER_ID,
      createdAt: new Date().toISOString()
    })),
    inviteToGroup: vi.fn(
      async (_token: string, actorId: string, groupId: string, input: InviteToGroupInput) => ({
        id: '55555555-5555-4555-8555-555555555555',
        groupId,
        userId: input.userId,
        role: input.role,
        joinStatus: 'invited',
        invitedBy: actorId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    ),
    joinGroup: vi.fn(async (_token: string, joiningUserId: string, groupId: string) => ({
      id: '66666666-6666-4666-8666-666666666666',
      groupId,
      userId: joiningUserId,
      role: 'member',
      joinStatus: 'accepted',
      invitedBy: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })),
    createSession: vi.fn(async (_token: string, _creatorId: string, input: CreateSessionInput) => ({
      id: SESSION_ID,
      groupId: input.groupId,
      name: input.name,
      stage: 'planning',
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      sourceLocation: input.sourceLocation ?? null,
      createdBy: USER_ID,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })),
    getSession: vi.fn(async () => null),
    upsertPreference: vi.fn(async (_token: string, ownerId: string, sessionId: string, vector) => ({
      id: '77777777-7777-4777-8777-777777777777',
      sessionId,
      userId: ownerId,
      preferenceVector: vector,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })),
    listPreferences: vi.fn(async () => []),
    castVote: vi.fn(async (_token: string, voterId: string, sessionId: string, vote: VoteInput) => ({
      id: '88888888-8888-4888-8888-888888888888',
      sessionId,
      userId: voterId,
      destinationCode: vote.destinationCode,
      destinationName: vote.destinationName ?? null,
      voteValue: vote.voteValue,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })),
    listVotes: vi.fn(async () => []),
    setRecommendations: vi.fn(async (_token: string, sessionId: string, recs: RecommendationInput[]) =>
      recs.map((rec, idx) => ({
        id: `00000000-0000-4000-8000-${String(idx + 1).padStart(12, '0')}`,
        sessionId,
        destinationCode: rec.destinationCode,
        destinationName: rec.destinationName,
        score: rec.score,
        explanation: rec.explanation,
        metadata: rec.metadata ?? {},
        rank: rec.rank ?? null,
        createdAt: new Date().toISOString()
      }))
    ),
    listRecommendations: vi.fn(async () => []),
    setSelection: vi.fn(async (_token: string, selectorId: string, sessionId: string, input: SelectionInput) => ({
      sessionId,
      destinationCode: input.destinationCode,
      selectedBy: selectorId,
      selectedAt: new Date().toISOString(),
      reasoning: input.reasoning ?? null
    })),
    getSelection: vi.fn(async () => null)
  };

  return { ...service, ...overrides };
}

function createMockAuthProvider(overrides: Partial<AuthProvider> = {}): AuthProvider {
  const provider: AuthProvider = {
    verifyAccessToken: vi.fn(async (accessToken: string) => {
      if (accessToken !== 'valid-token') {
        throw new AppError(401, 'Invalid or expired token');
      }

      return { id: USER_ID };
    })
  };

  return { ...provider, ...overrides };
}

function createTestApp(options: { authProvider?: AuthProvider; service?: TripService } = {}) {
  return createApp({
    authProvider: options.authProvider ?? createMockAuthProvider(),
    tripService: options.service ?? createMockService()
  });
}

function bearer(value: string) {
  return `Bearer ${value}`;
}

describe('backend api: top-level and auth behavior', () => {
  it('returns health status', async () => {
    const app = createTestApp();

    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('returns 404 for unknown route', async () => {
    const app = createTestApp();
    const res = await request(app).get('/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not found');
  });

  it('rejects missing authorization header', async () => {
    const app = createTestApp();

    const res = await request(app).post('/api/groups').send({ name: 'Demo Group' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Missing Bearer token');
  });

  it('rejects malformed authorization header', async () => {
    const app = createTestApp();

    const res = await request(app).post('/api/groups').set('Authorization', 'Token abc');
    expect(res.status).toBe(401);
  });

  it('rejects invalid token', async () => {
    const app = createTestApp();

    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', bearer('wrong-token'))
      .send({ name: 'Demo Group' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid or expired token');
  });

  it('trims token and passes clean value to service', async () => {
    const service = createMockService();
    const app = createTestApp({ service });

    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', 'Bearer   valid-token   ')
      .send({ name: 'Demo Group' });

    expect(res.status).toBe(201);
    expect((service.createGroup as any)).toHaveBeenCalledWith(
      'valid-token',
      USER_ID,
      expect.objectContaining({ name: 'Demo Group' })
    );
  });
});

describe('backend api: groups routes', () => {
  it('creates group successfully', async () => {
    const service = createMockService();
    const app = createTestApp({ service });

    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', bearer('valid-token'))
      .send({ name: 'Friends Spring Trip', description: 'May planning' });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Friends Spring Trip');
    expect((service.createGroup as any)).toHaveBeenCalledTimes(1);
  });

  it('validates group payload', async () => {
    const service = createMockService();
    const app = createTestApp({ service });

    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', bearer('valid-token'))
      .send({ name: '   ' });

    expect(res.status).toBe(400);
    expect((service.createGroup as any)).not.toHaveBeenCalled();
  });

  it('invites user with explicit role', async () => {
    const service = createMockService();
    const app = createTestApp({ service });

    const res = await request(app)
      .post(`/api/groups/${GROUP_ID}/invite`)
      .set('Authorization', bearer('valid-token'))
      .send({ userId: OTHER_USER_ID, role: 'member' });

    expect(res.status).toBe(200);
    expect((service.inviteToGroup as any)).toHaveBeenCalledWith('valid-token', USER_ID, GROUP_ID, {
      userId: OTHER_USER_ID,
      role: 'member'
    });
  });

  it('defaults invite role to member', async () => {
    const service = createMockService();
    const app = createTestApp({ service });

    const res = await request(app)
      .post(`/api/groups/${GROUP_ID}/invite`)
      .set('Authorization', bearer('valid-token'))
      .send({ userId: OTHER_USER_ID });

    expect(res.status).toBe(200);
    expect((service.inviteToGroup as any)).toHaveBeenCalledWith('valid-token', USER_ID, GROUP_ID, {
      userId: OTHER_USER_ID,
      role: 'member'
    });
  });

  it('validates invite path and body uuids', async () => {
    const app = createTestApp();

    const badGroup = await request(app)
      .post('/api/groups/not-a-uuid/invite')
      .set('Authorization', bearer('valid-token'))
      .send({ userId: OTHER_USER_ID });
    expect(badGroup.status).toBe(400);

    const badUser = await request(app)
      .post(`/api/groups/${GROUP_ID}/invite`)
      .set('Authorization', bearer('valid-token'))
      .send({ userId: 'invalid-user-id' });
    expect(badUser.status).toBe(400);
  });

  it('joins group successfully', async () => {
    const service = createMockService();
    const app = createTestApp({ service });

    const res = await request(app)
      .post(`/api/groups/${GROUP_ID}/join`)
      .set('Authorization', bearer('valid-token'));

    expect(res.status).toBe(200);
    expect((service.joinGroup as any)).toHaveBeenCalledWith('valid-token', USER_ID, GROUP_ID);
  });

  it('validates join path uuid', async () => {
    const app = createTestApp();

    const res = await request(app)
      .post('/api/groups/not-a-uuid/join')
      .set('Authorization', bearer('valid-token'));

    expect(res.status).toBe(400);
  });
});

describe('backend api: sessions routes', () => {
  it('creates session with optional fields', async () => {
    const service = createMockService();
    const app = createTestApp({ service });

    const payload = {
      groupId: GROUP_ID,
      name: 'Summer 2026',
      startDate: '2026-06-10',
      endDate: '2026-06-17',
      sourceLocation: 'NYC'
    };

    const res = await request(app)
      .post('/api/sessions')
      .set('Authorization', bearer('valid-token'))
      .send(payload);

    expect(res.status).toBe(201);
    expect((service.createSession as any)).toHaveBeenCalledWith('valid-token', USER_ID, payload);
  });

  it('validates session create payload date format', async () => {
    const app = createTestApp();

    const res = await request(app)
      .post('/api/sessions')
      .set('Authorization', bearer('valid-token'))
      .send({ groupId: GROUP_ID, name: 'Trip', startDate: '06-10-2026' });

    expect(res.status).toBe(400);
  });

  it('loads full session payload when found', async () => {
    const service = createMockService({
      getSession: vi.fn(async () => ({
        session: {
          id: SESSION_ID,
          groupId: GROUP_ID,
          name: 'Summer 2026',
          stage: 'planning',
          startDate: null,
          endDate: null,
          sourceLocation: null,
          createdBy: USER_ID,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        preferences: [],
        votes: [],
        recommendations: [],
        selection: null
      }))
    });
    const app = createTestApp({ service });

    const res = await request(app)
      .get(`/api/sessions/${SESSION_ID}`)
      .set('Authorization', bearer('valid-token'));

    expect(res.status).toBe(200);
    expect(res.body.data.session.id).toBe(SESSION_ID);
    expect((service.getSession as any)).toHaveBeenCalledWith('valid-token', SESSION_ID);
  });

  it('returns 404 when session does not exist', async () => {
    const app = createTestApp();

    const res = await request(app)
      .get(`/api/sessions/${SESSION_ID}`)
      .set('Authorization', bearer('valid-token'));

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Session not found');
  });
});

describe('backend api: preferences routes', () => {
  it('upserts preferences successfully', async () => {
    const service = createMockService();
    const app = createTestApp({ service });

    const vector = { budget: 0.8, food: 0.6, weather: 0.7 };
    const res = await request(app)
      .put(`/api/sessions/${SESSION_ID}/preferences`)
      .set('Authorization', bearer('valid-token'))
      .send({ preferenceVector: vector });

    expect(res.status).toBe(200);
    expect((service.upsertPreference as any)).toHaveBeenCalledWith(
      'valid-token',
      USER_ID,
      SESSION_ID,
      vector
    );
  });

  it('validates preferences payload shape', async () => {
    const app = createTestApp();
    const res = await request(app)
      .put(`/api/sessions/${SESSION_ID}/preferences`)
      .set('Authorization', bearer('valid-token'))
      .send({ preferenceVector: 'not-an-object' });

    expect(res.status).toBe(400);
  });

  it('lists preferences successfully', async () => {
    const service = createMockService({
      listPreferences: vi.fn(async () => [
        {
          id: '99999999-9999-4999-8999-999999999999',
          sessionId: SESSION_ID,
          userId: USER_ID,
          preferenceVector: { budget: 0.5 },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ])
    });
    const app = createTestApp({ service });

    const res = await request(app)
      .get(`/api/sessions/${SESSION_ID}/preferences`)
      .set('Authorization', bearer('valid-token'));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect((service.listPreferences as any)).toHaveBeenCalledWith('valid-token', SESSION_ID);
  });

  it('validates preferences session id path', async () => {
    const app = createTestApp();
    const res = await request(app)
      .get('/api/sessions/not-a-uuid/preferences')
      .set('Authorization', bearer('valid-token'));

    expect(res.status).toBe(400);
  });
});

describe('backend api: votes routes', () => {
  it('casts vote successfully', async () => {
    const service = createMockService();
    const app = createTestApp({ service });

    const payload = { destinationCode: 'MIA', destinationName: 'Miami', voteValue: 1 };
    const res = await request(app)
      .put(`/api/sessions/${SESSION_ID}/vote`)
      .set('Authorization', bearer('valid-token'))
      .send(payload);

    expect(res.status).toBe(200);
    expect((service.castVote as any)).toHaveBeenCalledWith('valid-token', USER_ID, SESSION_ID, payload);
  });

  it('defaults vote value to 1 when omitted', async () => {
    const service = createMockService();
    const app = createTestApp({ service });

    const res = await request(app)
      .put(`/api/sessions/${SESSION_ID}/vote`)
      .set('Authorization', bearer('valid-token'))
      .send({ destinationCode: 'SFO' });

    expect(res.status).toBe(200);
    expect((service.castVote as any)).toHaveBeenCalledWith('valid-token', USER_ID, SESSION_ID, {
      destinationCode: 'SFO',
      voteValue: 1
    });
  });

  it('rejects vote value out of range', async () => {
    const app = createTestApp();
    const res = await request(app)
      .put(`/api/sessions/${SESSION_ID}/vote`)
      .set('Authorization', bearer('valid-token'))
      .send({ destinationCode: 'SFO', voteValue: 2 });

    expect(res.status).toBe(400);
  });

  it('lists votes successfully', async () => {
    const service = createMockService({
      listVotes: vi.fn(async () => [
        {
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          sessionId: SESSION_ID,
          userId: USER_ID,
          destinationCode: 'SFO',
          destinationName: 'San Francisco',
          voteValue: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ])
    });
    const app = createTestApp({ service });

    const res = await request(app)
      .get(`/api/sessions/${SESSION_ID}/votes`)
      .set('Authorization', bearer('valid-token'));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect((service.listVotes as any)).toHaveBeenCalledWith('valid-token', SESSION_ID);
  });
});

describe('backend api: recommendations routes', () => {
  it('sets recommendations successfully', async () => {
    const service = createMockService();
    const app = createTestApp({ service });

    const recommendations = [
      {
        destinationCode: 'MIA',
        destinationName: 'Miami',
        score: 0.9,
        explanation: 'Great weather and beaches',
        metadata: { weather: 'warm' },
        rank: 1
      },
      {
        destinationCode: 'SFO',
        destinationName: 'San Francisco',
        score: 0.8,
        explanation: 'Excellent food scene',
        metadata: { food: 'high' },
        rank: 2
      }
    ];

    const res = await request(app)
      .put(`/api/sessions/${SESSION_ID}/recommendations`)
      .set('Authorization', bearer('valid-token'))
      .send({ recommendations });

    expect(res.status).toBe(200);
    expect((service.setRecommendations as any)).toHaveBeenCalledWith(
      'valid-token',
      SESSION_ID,
      recommendations
    );
  });

  it('accepts empty recommendations array', async () => {
    const service = createMockService();
    const app = createTestApp({ service });

    const res = await request(app)
      .put(`/api/sessions/${SESSION_ID}/recommendations`)
      .set('Authorization', bearer('valid-token'))
      .send({ recommendations: [] });

    expect(res.status).toBe(200);
    expect((service.setRecommendations as any)).toHaveBeenCalledWith('valid-token', SESSION_ID, []);
  });

  it('validates recommendation rank and explanation', async () => {
    const app = createTestApp();
    const badRank = await request(app)
      .put(`/api/sessions/${SESSION_ID}/recommendations`)
      .set('Authorization', bearer('valid-token'))
      .send({
        recommendations: [
          {
            destinationCode: 'MIA',
            destinationName: 'Miami',
            score: 0.9,
            explanation: 'good',
            rank: 0
          }
        ]
      });
    expect(badRank.status).toBe(400);

    const badExplanation = await request(app)
      .put(`/api/sessions/${SESSION_ID}/recommendations`)
      .set('Authorization', bearer('valid-token'))
      .send({
        recommendations: [
          {
            destinationCode: 'MIA',
            destinationName: 'Miami',
            score: 0.9,
            explanation: '   ',
            rank: 1
          }
        ]
      });
    expect(badExplanation.status).toBe(400);
  });

  it('lists recommendations successfully', async () => {
    const service = createMockService({
      listRecommendations: vi.fn(async () => [
        {
          id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          sessionId: SESSION_ID,
          destinationCode: 'MIA',
          destinationName: 'Miami',
          score: 0.9,
          explanation: 'great fit',
          metadata: {},
          rank: 1,
          createdAt: new Date().toISOString()
        }
      ])
    });
    const app = createTestApp({ service });

    const res = await request(app)
      .get(`/api/sessions/${SESSION_ID}/recommendations`)
      .set('Authorization', bearer('valid-token'));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect((service.listRecommendations as any)).toHaveBeenCalledWith('valid-token', SESSION_ID);
  });
});

describe('backend api: selection routes', () => {
  it('sets selected destination successfully', async () => {
    const service = createMockService();
    const app = createTestApp({ service });

    const payload = { destinationCode: 'SFO', reasoning: 'Best group overlap' };
    const res = await request(app)
      .put(`/api/sessions/${SESSION_ID}/selection`)
      .set('Authorization', bearer('valid-token'))
      .send(payload);

    expect(res.status).toBe(200);
    expect((service.setSelection as any)).toHaveBeenCalledWith('valid-token', USER_ID, SESSION_ID, payload);
  });

  it('validates selection payload', async () => {
    const app = createTestApp();

    const res = await request(app)
      .put(`/api/sessions/${SESSION_ID}/selection`)
      .set('Authorization', bearer('valid-token'))
      .send({ destinationCode: '   ' });

    expect(res.status).toBe(400);
  });

  it('loads selected destination successfully', async () => {
    const service = createMockService({
      getSelection: vi.fn(async () => ({
        sessionId: SESSION_ID,
        destinationCode: 'SFO',
        selectedBy: USER_ID,
        selectedAt: new Date().toISOString(),
        reasoning: 'Best score'
      }))
    });
    const app = createTestApp({ service });

    const res = await request(app)
      .get(`/api/sessions/${SESSION_ID}/selection`)
      .set('Authorization', bearer('valid-token'));

    expect(res.status).toBe(200);
    expect(res.body.data.destinationCode).toBe('SFO');
    expect((service.getSelection as any)).toHaveBeenCalledWith('valid-token', SESSION_ID);
  });

  it('returns 404 when selected destination is not set', async () => {
    const app = createTestApp();

    const res = await request(app)
      .get(`/api/sessions/${SESSION_ID}/selection`)
      .set('Authorization', bearer('valid-token'));

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Selected destination not set');
  });
});

describe('backend api: error mapping from handlers', () => {
  it('returns app error status and details from service', async () => {
    const service = createMockService({
      createGroup: vi.fn(async () => {
        throw new AppError(409, 'Duplicate group', { code: 'DUPLICATE_NAME' });
      })
    });
    const app = createTestApp({ service });

    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', bearer('valid-token'))
      .send({ name: 'Existing Group' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Duplicate group');
    expect(res.body.details).toEqual({ code: 'DUPLICATE_NAME' });
  });

  it('returns 500 for unexpected service errors', async () => {
    const service = createMockService({
      createGroup: vi.fn(async () => {
        throw new Error('Unexpected failure');
      })
    });
    const app = createTestApp({ service });

    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', bearer('valid-token'))
      .send({ name: 'Group Name' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal server error');
  });
});
