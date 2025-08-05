import { AdminList } from '../AdminList/AdminList';
import { protocolClient, nodeClient, userClient } from '@modules/grpc';
import { DateTime, NodeItems } from '@shared/components';
import {
  AdminNodesFilterProtocol,
  AdminNodesFilterOrg,
  AdminNodesFilterUser,
  AdminNodesFilterHost,
  AdminNodesFilterIp,
  AdminNodesFilterVariant,
  AdminNodesFilterVersion,
  AdminNodesFilterStatus,
} from '@modules/admin/components';
import { AdminNodesUpgrade } from './AdminNodesUpgrade/AdminNodesUpgrade';
import { AdminNodesOrgAssign } from './AdminNodesOrgAssign/AdminNodesOrgAssign';
import { AdminNodesActions } from './AdminNodesActions/AdminNodesActions';
import { pageSize as defaultPageSize } from '@modules/admin/constants/constants';
import { Node, NodeSortField } from '@modules/grpc/library/blockjoy/v1/node';
import { SortOrder } from '@modules/grpc/library/blockjoy/common/v1/search';
import { capitalized, createAdminNodeFilters } from '@modules/admin';
import { AdminListColumn } from '@modules/admin/types/AdminListColumn';
import { useState, useCallback } from 'react';
import { Protocol } from '@modules/grpc/library/blockjoy/v1/protocol';
import { AdminListEditCost } from '../AdminListEditCost/AdminListEditCost';
import { BillingAmount } from '@modules/grpc/library/blockjoy/common/v1/currency';
import { User } from '@modules/grpc/library/blockjoy/v1/user';
import { ResourceType } from '@modules/grpc/library/blockjoy/common/v1/resource';
import { toast } from 'react-toastify';

const columns: AdminListColumn[] = [
  {
    name: 'sqd_name',
    displayName: 'Sqd Name',
    width: '200px',
    sortField: NodeSortField.NODE_SORT_FIELD_SQD_NAME,
    isVisible: true,
  },
  {
    name: 'displayName',
    width: '200px',
    sortField: NodeSortField.NODE_SORT_FIELD_DISPLAY_NAME,
    isVisible: true,
  },
  {
    name: 'nodeName',
    width: '200px',
    sortField: NodeSortField.NODE_SORT_FIELD_NODE_NAME,
    isVisible: false,
  },
  {
    name: 'dnsName',
    width: '200px',
    sortField: NodeSortField.NODE_SORT_FIELD_DNS_NAME,
    isVisible: false,
  },
  {
    name: 'nodeState',
    displayName: 'Node State',
    width: '200px',
    sortField: NodeSortField.NODE_SORT_FIELD_NODE_STATE,
    isVisible: true,
    filterComponent: AdminNodesFilterStatus,
    filterDropdownMinWidth: 160,
  },
  {
    name: 'protocolHealth',
    displayName: 'Protocol Health',
    width: '160px',
    sortField: NodeSortField.NODE_SORT_FIELD_PROTOCOL_HEALTH,
    isVisible: true,
  },
  {
    name: 'protocolState',
    displayName: 'Protocol State',
    width: '160px',
    sortField: NodeSortField.NODE_SORT_FIELD_PROTOCOL_STATE,
    isVisible: true,
  },
  {
    name: 'apr',
    displayName: 'Apr',
    width: '160px',
    sortField: NodeSortField.NODE_SORT_FIELD_APR,
    isVisible: true,
  },
  {
    name: 'jailed',
    displayName: 'Jailed',
    width: '160px',
    sortField: NodeSortField.NODE_SORT_FIELD_JAILED,
    isVisible: true,
  },
  {
    name: 'jailedReason',
    displayName: 'Jailed Reason',
    width: '160px',
    isVisible: true,
  },
  {
    name: 'cost',
    width: '100px',
    isRowClickDisabled: true,
  },
  {
    name: 'host',
    width: '200px',
    // sortField: NodeSortField.NODE_SORT_FIELD_HOST_NAME,
    isVisible: true,
    filterComponent: AdminNodesFilterHost,
    filterDropdownMaxWidth: 250,
    filterDropdownMinWidth: 220,
  },
  {
    name: 'blockHeight',
    width: '190px',
    isVisible: false,
    sortField: NodeSortField.NODE_SORT_FIELD_BLOCK_HEIGHT,
  },
  {
    name: 'protocolName',
    displayName: 'protocol',
    width: '140px',
    isVisible: true,
    filterComponent: AdminNodesFilterProtocol,
    filterDropdownMinWidth: 200,
  },
  {
    name: 'versionKeys',
    displayName: 'variant',
    width: '140px',
    isVisible: true,
    filterComponent: AdminNodesFilterVariant,
    filterDropdownMinWidth: 160,
    filterDropdownMaxWidth: 200,
  },
  {
    name: 'semanticVersion',
    displayName: 'Version',
    width: '100px',
    isVisible: true,
    filterComponent: AdminNodesFilterVersion,
    filterDropdownMinWidth: 190,
    filterDropdownMaxWidth: 220,
  },
  {
    name: 'ipAddress',
    width: '140px',
    isVisible: false,
    filterComponent: AdminNodesFilterIp,
    filterDropdownMinWidth: 170,
  },
  {
    name: 'ipGateway',
    width: '140px',
    isVisible: false,
  },
  {
    name: 'region',
    width: '140px',
    isVisible: true,
  },
  {
    name: 'p2pAddress',
    width: '140px',
    displayName: 'Peer Id',
    isVisible: true,
  },
  {
    name: 'orgName',
    displayName: 'Org',
    width: '100px',
    isVisible: true,
    filterComponent: AdminNodesFilterOrg,
    filterDropdownMinWidth: 200,
  },
  {
    name: 'createdAt',
    displayName: 'Launched On',
    width: '180px',
    sortField: NodeSortField.NODE_SORT_FIELD_CREATED_AT,
    isVisible: true,
  },
  {
    name: 'createdBy',
    displayName: 'Launched By',
    width: '140px',
    isVisible: true,
    filterComponent: AdminNodesFilterUser,
    filterDropdownMaxWidth: 200,
    filterDropdownMinWidth: 160,
  },
];

export const AdminNodes = () => {
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Enhanced data fetching with better error handling and caching
  const getList = useCallback(
    async (
      keyword?: string,
      page?: number,
      sortField?: NodeSortField,
      sortOrder?: SortOrder,
      filters?: AdminListColumn[],
      pageSize?: number,
    ) => {
      try {
        // Fetch users and protocols if not already loaded
        if (!users.length) {
          try {
            const usersResponse = await userClient.listUsers();
            setUsers(usersResponse.users);
          } catch (error) {
            console.error('Failed to fetch users:', error);
            toast.error('Failed to load user data');
          }
        }

        if (!protocols?.length) {
          try {
            const protocolsResponse = await protocolClient.listProtocols();
            setProtocols(protocolsResponse.protocols);
          } catch (error) {
            console.error('Failed to fetch protocols:', error);
            toast.error('Failed to load protocol data');
          }
        }

        // Prepare sort parameters
        const sort =
          page === -1
            ? undefined
            : [
                {
                  field: sortField!,
                  order: sortOrder!,
                },
              ];

        // Prepare pagination parameters with proper defaults
        const paginationParams = {
          currentPage: page === -1 ? 0 : page!,
          itemsPerPage: page === -1 ? 50000 : pageSize || defaultPageSize,
        };

        // Prepare filter parameters
        const filterParams = {
          keyword: keyword || '',
          ...createAdminNodeFilters(filters || []),
        };

        // Make the API call with enhanced error handling
        const response = await nodeClient.listNodes(
          keyword || '',
          filterParams,
          paginationParams,
          sort,
        );

        return {
          list: response.nodes || [],
          total: response.total || 0,
        };
      } catch (error) {
        console.error('Failed to fetch nodes:', error);
        toast.error('Failed to load node data. Please try again.');

        // Return empty result on error to prevent crashes
        return {
          list: [],
          total: 0,
        };
      }
    },
    [users.length, protocols?.length],
  );

  // Enhanced node update with error handling
  const handleUpdate = useCallback(
    async (nodeId: string, cost: BillingAmount) => {
      try {
        await nodeClient.updateNode({
          nodeId,
          cost,
          newValues: [],
        });
        toast.success('Node cost updated successfully');
      } catch (error) {
        console.error('Failed to update node:', error);
        toast.error('Failed to update node cost. Please try again.');
        throw error; // Re-throw to allow the component to handle it
      }
    },
    [],
  );

  // Memoized list mapping for better performance
  const listMap = useCallback(
    (list: Node[]) =>
      list.map((node) => {
        const user = users.find((u) => u.userId === node.createdBy?.resourceId);
        const createdBy =
          node.createdBy?.resourceType === ResourceType.RESOURCE_TYPE_HOST
            ? node.hostDisplayName || node.hostNetworkName
            : `${user?.firstName} ${user?.lastName}`;
        return {
          ...node,
          versionKeys: node.versionKey?.variantKey,
          nodeState: <NodeItems.NodeStatus nodeStatus={node.nodeStatus} />,
          protocolHealth: (
            <NodeItems.ProtocolHealth nodeStatus={node.nodeStatus} />
          ),
          protocolState: (
            <NodeItems.ProtocolStatus
              nodeStatus={node.nodeStatus}
              jobs={node.jobs}
            />
          ),
          region: node.regionName,
          createdAt: <DateTime date={node.createdAt!} />,
          createdBy,
          host: node.hostDisplayName || node.hostNetworkName,
          apr:
            node.apr !== undefined
              ? `${Number(node.apr).toFixed(2)}%`
              : 'Calculating',
          jailed: node.jailed ? 'Yes' : 'No',
          jailedReason: node.jailedReason,
          sqd_name: node.sqd_name,
          cost: (
            <AdminListEditCost
              id={node.nodeId}
              defaultValue={node.cost?.amount?.amountMinorUnits}
              onUpdate={handleUpdate}
            />
          ),
          protocolName: capitalized(node.protocolName),
        };
      }),
    [users, handleUpdate],
  );

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Optimized selection handlers
  const handleIdAllSelected = useCallback((ids: string[]) => {
    setSelectedIds(ids);
  }, []);

  const handleIdSelected = useCallback(
    (nodeId: string, isSelected: boolean) => {
      setSelectedIds((prevIds) => {
        if (!isSelected) {
          return prevIds.filter((id) => id !== nodeId);
        } else if (!prevIds.includes(nodeId)) {
          return [...prevIds, nodeId];
        }
        return prevIds;
      });
    },
    [],
  );

  return (
    <AdminList
      name="nodes"
      idPropertyName="nodeId"
      defaultSortField={NodeSortField.NODE_SORT_FIELD_CREATED_AT}
      defaultSortOrder={SortOrder.SORT_ORDER_DESCENDING}
      columns={columns}
      getList={getList}
      listMap={listMap}
      selectedIds={selectedIds}
      protocols={protocols}
      users={users}
      onIdSelected={handleIdSelected}
      onIdAllSelected={handleIdAllSelected}
      additionalHeaderButtons={[
        AdminNodesUpgrade,
        AdminNodesOrgAssign,
        AdminNodesActions,
      ]}
    />
  );
};
