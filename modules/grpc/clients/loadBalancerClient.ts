import {
  LbEngineOffering,
  LoadBalancer,
  LoadBalancerServiceClient,
  LoadBalancerServiceDefinition,
  LoadBalancerServiceCreateRequest,
  LoadBalancerServiceListRequest,
  LoadBalancerServiceListResponse,
  LoadBalancerServiceUpdateRequest,
  NewLbMember,
} from '../library/blockjoy/v1/load_balancer';
import {
  callWithTokenRefresh,
  getPaginationOffset,
  handleError,
  UIPagination,
} from '@modules/grpc';
import { createChannel, createClient } from 'nice-grpc-web';

export class LoadBalancerClient {
  private client: LoadBalancerServiceClient;

  constructor(client?: LoadBalancerServiceClient) {
    if (client) {
      this.client = client;
    } else {
      const channel = createChannel(process.env.NEXT_PUBLIC_API_URL!);
      this.client = createClient(LoadBalancerServiceDefinition, channel);
    }
  }

  async listLoadBalancers(
    orgId: string,
    pagination?: UIPagination,
  ): Promise<LoadBalancerServiceListResponse> {
    const request: LoadBalancerServiceListRequest = {
      orgId,
      offset: getPaginationOffset(pagination),
      limit: pagination?.itemsPerPage ?? 50,
    };
    try {
      return await callWithTokenRefresh(
        this.client.list.bind(this.client),
        request,
      );
    } catch (err) {
      return handleError(err);
    }
  }

  async listEngines(orgId: string): Promise<LbEngineOffering[]> {
    try {
      const response = await callWithTokenRefresh(
        this.client.listEngines.bind(this.client),
        { orgId },
      );
      return response.offerings;
    } catch (err) {
      return handleError(err);
    }
  }

  async getLoadBalancer(lbId: string): Promise<LoadBalancer> {
    try {
      const response = await callWithTokenRefresh(
        this.client.get.bind(this.client),
        { lbId },
      );
      return response.loadBalancer!;
    } catch (err) {
      return handleError(err);
    }
  }

  async createLoadBalancer(
    request: LoadBalancerServiceCreateRequest,
  ): Promise<LoadBalancer> {
    try {
      const response = await callWithTokenRefresh(
        this.client.create.bind(this.client),
        request,
      );
      return response.loadBalancer!;
    } catch (err) {
      return handleError(err);
    }
  }

  async updateLoadBalancer(
    request: LoadBalancerServiceUpdateRequest,
  ): Promise<LoadBalancer> {
    try {
      const response = await callWithTokenRefresh(
        this.client.update.bind(this.client),
        request,
      );
      return response.loadBalancer!;
    } catch (err) {
      return handleError(err);
    }
  }

  async deleteLoadBalancer(lbId: string): Promise<void> {
    try {
      await callWithTokenRefresh(this.client.delete.bind(this.client), {
        lbId,
      });
    } catch (err) {
      return handleError(err);
    }
  }

  async addMember(lbId: string, member: NewLbMember): Promise<LoadBalancer> {
    try {
      const response = await callWithTokenRefresh(
        this.client.addMember.bind(this.client),
        { lbId, member },
      );
      return response.loadBalancer!;
    } catch (err) {
      return handleError(err);
    }
  }

  async removeMember(lbId: string, memberId: string): Promise<LoadBalancer> {
    try {
      const response = await callWithTokenRefresh(
        this.client.removeMember.bind(this.client),
        { lbId, memberId },
      );
      return response.loadBalancer!;
    } catch (err) {
      return handleError(err);
    }
  }
}

export const loadBalancerClient = new LoadBalancerClient();
