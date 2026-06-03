import {
  Node,
  NodeServiceCreateRequest,
  NodeServiceClient,
  NodeServiceDefinition,
  NodeServiceUpdateConfigRequest,
  NodeServiceListResponse,
  NodeServiceListRequest,
  NodeSearch,
  NodeSort,
  NodeSortField,
  NodeServiceGetRequest,
  NodeServiceDeleteRequest,
  NodeServiceMigrationCandidatesResponse,
  NodeServiceMigrateResponse,
} from '../library/blockjoy/v1/node';
import { debugLog } from '@/lib/debug';
import {
  SearchOperator,
  SortOrder,
} from '../library/blockjoy/common/v1/search';
import {
  authClient,
  callWithTokenRefresh,
  createSearch,
  getOptions,
  getPaginationOffset,
  handleError,
} from '@modules/grpc';
import { createChannel, createClient } from 'nice-grpc-web';

export type UINodeFilterCriteria = {
  protocol?: string[];
  nodeType?: string[];
  nodeStatus?: string[];
  keyword?: string;
  orgIds?: string[];
  hostIds?: string[];
  userIds?: string[];
  regions?: string[];
  ips?: string[];
  semanticVersions?: string[];
  networks?: string[];
  versionKeys?: string[];
};

export type UIPagination = {
  currentPage: number;
  itemsPerPage: number;
};

export class NodeClient {
  private client: NodeServiceClient;

  constructor(client?: NodeServiceClient) {
    if (client) {
      this.client = client;
    } else {
      const channel = createChannel(process.env.NEXT_PUBLIC_API_URL!);
      this.client = createClient(NodeServiceDefinition, channel);
    }
  }

  async listNodes(
    orgId?: string,
    filter?: UINodeFilterCriteria,
    pagination?: UIPagination,
    sort?: NodeSort[],
  ): Promise<NodeServiceListResponse> {
    const request: NodeServiceListRequest = {
      orgIds: orgId ? [orgId!] : filter?.orgIds!,
      hostIds: filter?.hostIds!,
      ipAddresses: filter?.ips!,
      userIds: filter?.userIds!,
      semanticVersions: filter?.semanticVersions!,
      offset: getPaginationOffset(pagination!),
      limit: pagination?.itemsPerPage!,
      nodeStates: filter?.nodeStatus?.map((f) => +f)!,
      protocolIds: filter?.protocol!,
      nextStates: [],
      versionKeys:
        filter?.versionKeys?.map((versionKey) => ({
          protocolKey: versionKey.substring(0, versionKey.indexOf('|')),
          variantKey: versionKey.substring(
            versionKey.indexOf('|') + 1,
            versionKey.length,
          ),
        })) ?? [],
      sort: sort || [
        {
          field: NodeSortField.NODE_SORT_FIELD_CREATED_AT,
          order: SortOrder.SORT_ORDER_DESCENDING,
        },
      ],
    };

    if (filter?.keyword) {
      const { keyword } = filter;
      const search: NodeSearch = {
        nodeId: createSearch(keyword),
        ip: createSearch(keyword),
        nodeName: createSearch(keyword),
        displayName: createSearch(keyword),
        dnsName: createSearch(keyword),
        operator: SearchOperator.SEARCH_OPERATOR_OR,
      };
      request.search = search;
    }

    debugLog('listNodesRequest', request);

    try {
      const response = await callWithTokenRefresh(
        this.client.list.bind(this.client),
        request,
      );
      debugLog('listNodesResponse', response);
      return response;
    } catch (err) {
      return handleError(err);
    }
  }

  async listNodesByHost(
    hostId: string,
    pagination: UIPagination,
    orgId?: string,
  ): Promise<NodeServiceListResponse> {
    const request: NodeServiceListRequest = {
      offset: getPaginationOffset(pagination!),
      limit: pagination?.itemsPerPage!,
      orgIds: orgId ? [orgId!] : [],
      hostIds: [hostId],
      nodeStates: [],
      protocolIds: [],
      userIds: [],
      ipAddresses: [],
      semanticVersions: [],
      nextStates: [],
      versionKeys: [],
      sort: [
        {
          field: NodeSortField.NODE_SORT_FIELD_CREATED_AT,
          order: SortOrder.SORT_ORDER_DESCENDING,
        },
      ],
    };

    debugLog('listNodesByHostRequest', request);

    try {
      const response = await callWithTokenRefresh(
        this.client.list.bind(this.client),
        request,
      );
      debugLog('listNodesByHostResponse', response);
      return response;
    } catch (err) {
      return handleError(err);
    }
  }

  async getNode(nodeId: string): Promise<Node> {
    const request: NodeServiceGetRequest = { nodeId };
    debugLog('getNodeRequest', request);

    try {
      const response = await callWithTokenRefresh(
        this.client.get.bind(this.client),
        { nodeId },
      );

      debugLog('getNodeResponse', response.node);
      return response.node!;
    } catch (err) {
      return handleError(err);
    }
  }

  async createNode(node: NodeServiceCreateRequest): Promise<Node> {
    debugLog('createNodeRequest', node);
    try {
      await authClient.refreshToken();
      const response = await this.client.create(node, getOptions());
      debugLog('createNodeResponse', response.nodes);
      return response.nodes[0];
    } catch (err) {
      return handleError(err);
    }
  }

  async updateNode(node: NodeServiceUpdateConfigRequest): Promise<void> {
    debugLog('updateNodeRequest', node);
    try {
      await authClient.refreshToken();
      await this.client.updateConfig(node, getOptions());
    } catch (err) {
      return handleError(err);
    }
  }

  async deleteNode(nodeId: string): Promise<void> {
    const request: NodeServiceDeleteRequest = { nodeId };
    debugLog('deleteNodeRequest', request);
    try {
      await authClient.refreshToken();
      await this.client.delete(request, getOptions());
    } catch (err) {
      return handleError(err);
    }
  }

  async stopNode(nodeId: string): Promise<void> {
    try {
      await authClient.refreshToken();
      await this.client.stop({ nodeId }, getOptions());
    } catch (err) {
      return handleError(err);
    }
  }

  async startNode(nodeId: string): Promise<void> {
    try {
      await authClient.refreshToken();
      await this.client.start({ nodeId }, getOptions());
    } catch (err) {
      return handleError(err);
    }
  }

  async restartNode(nodeId: string): Promise<void> {
    try {
      await authClient.refreshToken();
      await this.client.restart({ nodeId }, getOptions());
    } catch (err) {
      return handleError(err);
    }
  }

  async upgradeNode(nodeIds: string[], imageId: string): Promise<void> {
    try {
      await authClient.refreshToken();
      await this.client.upgradeImage({ nodeIds, imageId }, getOptions());
    } catch (err) {
      debugLog('upgradeNodeError', err);
      return handleError(err);
    }
  }

  async listMigrationCandidates(
    nodeId: string,
  ): Promise<NodeServiceMigrationCandidatesResponse> {
    try {
      return await callWithTokenRefresh(
        this.client.migrationCandidates.bind(this.client),
        { nodeId },
      );
    } catch (err) {
      return handleError(err);
    }
  }

  async migrateNode(
    sourceNodeId: string,
    targetNodeId: string,
    destinationOrgId: string,
  ): Promise<NodeServiceMigrateResponse> {
    try {
      return await callWithTokenRefresh(
        this.client.migrate.bind(this.client),
        { sourceNodeId, targetNodeId, destinationOrgId },
      );
    } catch (err) {
      return handleError(err);
    }
  }
}

export const nodeClient = new NodeClient();
