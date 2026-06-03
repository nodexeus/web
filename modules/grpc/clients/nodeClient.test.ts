import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @/lib/debug (alias not wired in vitest.config.ts)
vi.mock('@/lib/debug', () => ({
  debugLog: vi.fn(),
}));

// Mock nice-grpc-web so the module-level singleton doesn't blow up without API_URL
vi.mock('nice-grpc-web', () => ({
  createChannel: vi.fn(() => ({})),
  createClient: vi.fn(() => ({})),
  Metadata: vi.fn(() => ({})),
}));

// Mock @modules/grpc entirely inline — avoids pulling in transitive deps
// (utils.ts → @/lib/friendly-error, authClient, etc.) that aren't resolvable
// in the vitest config. Only the helpers actually used by nodeClient need
// to be provided.
vi.mock('@modules/grpc', () => ({
  callWithTokenRefresh: vi.fn(
    (method: (...args: any[]) => Promise<any>, ...args: any[]) =>
      method(...args),
  ),
  authClient: {
    refreshToken: vi.fn().mockResolvedValue(undefined),
  },
  getOptions: vi.fn(() => ({})),
  getPaginationOffset: (pagination?: { currentPage: number; itemsPerPage: number }) => {
    if (!pagination) return 0;
    return pagination.currentPage === 0
      ? 0
      : pagination.currentPage * pagination.itemsPerPage;
  },
  handleError: (e: any) => {
    throw e;
  },
  createSearch: vi.fn((keyword: string) => ({ value: keyword, operator: 0 })),
}));

import { NodeClient } from './nodeClient';

// ---------------------------------------------------------------------------
// Helper: build a mock NodeServiceClient
// ---------------------------------------------------------------------------
function mockSvc(overrides: Record<string, any> = {}) {
  return {
    list: vi.fn().mockResolvedValue({ nodes: [], total: 0 }),
    get: vi.fn().mockResolvedValue({ node: { nodeId: 'node-1' } }),
    create: vi.fn().mockResolvedValue({ nodes: [{ nodeId: 'node-1' }] }),
    updateConfig: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    stop: vi.fn().mockResolvedValue({}),
    start: vi.fn().mockResolvedValue({}),
    restart: vi.fn().mockResolvedValue({}),
    upgradeImage: vi.fn().mockResolvedValue({}),
    migrationCandidates: vi.fn().mockResolvedValue({
      candidates: [
        {
          node: { nodeId: 'candidate-1', nodeName: 'eth-staging-01' },
          isRunning: false,
          inUse: false,
        },
      ],
    }),
    migrate: vi.fn().mockResolvedValue({
      source: { nodeId: 'a', nodeName: 'source-migrated' },
      target: { nodeId: 'b', nodeName: 'target-live' },
    }),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('NodeClient', () => {
  describe('listMigrationCandidates', () => {
    it('calls migrationCandidates with the nodeId and returns candidates', async () => {
      const svc = mockSvc();
      const client = new NodeClient(svc as any);

      const res = await client.listMigrationCandidates('node-1');

      expect(svc.migrationCandidates).toHaveBeenCalledOnce();
      expect(svc.migrationCandidates).toHaveBeenCalledWith(
        expect.objectContaining({ nodeId: 'node-1' }),
      );
      expect(res.candidates).toHaveLength(1);
      expect(res.candidates[0].node?.nodeId).toBe('candidate-1');
    });

    it('propagates errors from migrationCandidates', async () => {
      const svc = mockSvc({
        migrationCandidates: vi.fn().mockRejectedValue(new Error('not found')),
      });
      const client = new NodeClient(svc as any);

      await expect(client.listMigrationCandidates('node-missing')).rejects.toThrow('not found');
    });
  });

  describe('migrateNode', () => {
    it('calls migrate with sourceNodeId, targetNodeId, destinationOrgId and returns the response', async () => {
      const svc = mockSvc();
      const client = new NodeClient(svc as any);

      const res = await client.migrateNode('a', 'b', 'org-dest');

      expect(svc.migrate).toHaveBeenCalledOnce();
      expect(svc.migrate).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceNodeId: 'a',
          targetNodeId: 'b',
          destinationOrgId: 'org-dest',
        }),
      );
      expect(res.source?.nodeId).toBe('a');
      expect(res.target?.nodeId).toBe('b');
    });

    it('propagates errors from migrate', async () => {
      const svc = mockSvc({
        migrate: vi.fn().mockRejectedValue(new Error('migration failed')),
      });
      const client = new NodeClient(svc as any);

      await expect(client.migrateNode('a', 'b', 'org-dest')).rejects.toThrow('migration failed');
    });
  });
});
