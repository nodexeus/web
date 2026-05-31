import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock nice-grpc-web so the module-level singleton doesn't blow up without API_URL
vi.mock('nice-grpc-web', () => ({
  createChannel: vi.fn(() => ({})),
  createClient: vi.fn(() => ({})),
  Metadata: vi.fn(() => ({})),
}));

// Mock @modules/grpc entirely inline — avoids pulling in transitive deps
// (utils.ts → @/lib/friendly-error, authClient, etc.) that aren't resolvable
// in the vitest config. Only the helpers actually used by loadBalancerClient
// need to be provided.
vi.mock('@modules/grpc', () => ({
  callWithTokenRefresh: vi.fn(
    (method: (...args: any[]) => Promise<any>, ...args: any[]) =>
      method(...args),
  ),
  getPaginationOffset: (pagination?: { currentPage: number; itemsPerPage: number }) => {
    if (!pagination) return 0;
    return pagination.currentPage === 0
      ? 0
      : pagination.currentPage * pagination.itemsPerPage;
  },
  handleError: (e: any) => {
    throw e;
  },
}));

import { LoadBalancerClient } from './loadBalancerClient';

// ---------------------------------------------------------------------------
// Helper: build a mock LoadBalancerServiceClient
// ---------------------------------------------------------------------------
function mockSvc(overrides: Record<string, any> = {}) {
  return {
    list: vi.fn().mockResolvedValue({
      loadBalancers: [{ lbId: 'lb1', name: 'reth-lb' }],
      total: 1,
    }),
    get: vi.fn().mockResolvedValue({
      loadBalancer: { lbId: 'lb1', name: 'reth-lb' },
    }),
    create: vi.fn().mockResolvedValue({
      loadBalancer: { lbId: 'lb1', name: 'reth-lb' },
    }),
    update: vi.fn().mockResolvedValue({
      loadBalancer: { lbId: 'lb1', name: 'reth-updated' },
    }),
    delete: vi.fn().mockResolvedValue({}),
    addMember: vi.fn().mockResolvedValue({
      loadBalancer: { lbId: 'lb1', name: 'reth-lb' },
    }),
    removeMember: vi.fn().mockResolvedValue({
      loadBalancer: { lbId: 'lb1', name: 'reth-lb' },
    }),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('LoadBalancerClient', () => {
  describe('listLoadBalancers', () => {
    it('passes orgId and default offset/limit when no pagination provided', async () => {
      const svc = mockSvc();
      const client = new LoadBalancerClient(svc as any);

      const res = await client.listLoadBalancers('org1');

      expect(svc.list).toHaveBeenCalledOnce();
      expect(svc.list).toHaveBeenCalledWith(
        expect.objectContaining({ orgId: 'org1', offset: 0, limit: 50 }),
      );
      expect(res.total).toBe(1);
      expect(res.loadBalancers).toHaveLength(1);
    });

    it('passes orgId + pagination offset and limit correctly', async () => {
      const svc = mockSvc();
      const client = new LoadBalancerClient(svc as any);

      await client.listLoadBalancers('org2', { currentPage: 2, itemsPerPage: 25 });

      expect(svc.list).toHaveBeenCalledWith(
        expect.objectContaining({ orgId: 'org2', offset: 50, limit: 25 }),
      );
    });

    it('uses offset 0 when currentPage is 0', async () => {
      const svc = mockSvc();
      const client = new LoadBalancerClient(svc as any);

      await client.listLoadBalancers('org1', { currentPage: 0, itemsPerPage: 50 });

      expect(svc.list).toHaveBeenCalledWith(
        expect.objectContaining({ orgId: 'org1', offset: 0, limit: 50 }),
      );
    });
  });

  describe('getLoadBalancer', () => {
    it('calls get with lbId and returns the loadBalancer field', async () => {
      const svc = mockSvc();
      const client = new LoadBalancerClient(svc as any);

      const lb = await client.getLoadBalancer('lb1');

      expect(svc.get).toHaveBeenCalledOnce();
      expect(svc.get).toHaveBeenCalledWith({ lbId: 'lb1' });
      expect(lb.lbId).toBe('lb1');
    });
  });

  describe('createLoadBalancer', () => {
    it('calls create with the request and returns the loadBalancer field', async () => {
      const svc = mockSvc();
      const client = new LoadBalancerClient(svc as any);
      const request = { orgId: 'org1', name: 'reth-lb' } as any;

      const lb = await client.createLoadBalancer(request);

      expect(svc.create).toHaveBeenCalledOnce();
      expect(svc.create).toHaveBeenCalledWith(request);
      expect(lb.lbId).toBe('lb1');
    });
  });

  describe('updateLoadBalancer', () => {
    it('calls update with the request and returns the loadBalancer field', async () => {
      const svc = mockSvc();
      const client = new LoadBalancerClient(svc as any);
      const request = { lbId: 'lb1', name: 'reth-updated' } as any;

      const lb = await client.updateLoadBalancer(request);

      expect(svc.update).toHaveBeenCalledOnce();
      expect(svc.update).toHaveBeenCalledWith(request);
      expect(lb.name).toBe('reth-updated');
    });
  });

  describe('deleteLoadBalancer', () => {
    it('calls delete with lbId', async () => {
      const svc = mockSvc();
      const client = new LoadBalancerClient(svc as any);

      await client.deleteLoadBalancer('lb1');

      expect(svc.delete).toHaveBeenCalledOnce();
      expect(svc.delete).toHaveBeenCalledWith({ lbId: 'lb1' });
    });
  });

  describe('addMember', () => {
    it('calls addMember with lbId and member, returns loadBalancer', async () => {
      const svc = mockSvc();
      const client = new LoadBalancerClient(svc as any);
      const member = { kind: 1, nodeId: 'n1', port: 8545, scheme: 1 } as any;

      const lb = await client.addMember('lb1', member);

      expect(svc.addMember).toHaveBeenCalledOnce();
      expect(svc.addMember).toHaveBeenCalledWith({ lbId: 'lb1', member });
      expect(lb.lbId).toBe('lb1');
    });
  });

  describe('removeMember', () => {
    it('calls removeMember with lbId and memberId, returns loadBalancer', async () => {
      const svc = mockSvc();
      const client = new LoadBalancerClient(svc as any);

      const lb = await client.removeMember('lb1', 'm1');

      expect(svc.removeMember).toHaveBeenCalledOnce();
      expect(svc.removeMember).toHaveBeenCalledWith({ lbId: 'lb1', memberId: 'm1' });
      expect(lb.lbId).toBe('lb1');
    });
  });

  describe('error handling', () => {
    it('propagates errors from list', async () => {
      const svc = mockSvc({
        list: vi.fn().mockRejectedValue(new Error('network error')),
      });
      const client = new LoadBalancerClient(svc as any);

      await expect(client.listLoadBalancers('org1')).rejects.toThrow('network error');
    });

    it('propagates errors from get', async () => {
      const svc = mockSvc({
        get: vi.fn().mockRejectedValue(new Error('not found')),
      });
      const client = new LoadBalancerClient(svc as any);

      await expect(client.getLoadBalancer('lb-missing')).rejects.toThrow('not found');
    });
  });
});
