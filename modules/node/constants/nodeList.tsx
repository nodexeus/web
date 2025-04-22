import { Node } from '@modules/grpc/library/blockjoy/v1/node';
import { SortOrder } from '@modules/grpc/library/blockjoy/common/v1/search';
import { NodeSortField } from '@modules/grpc/library/blockjoy/v1/node';
import { SortingItem, NodeItems, NodeGroups } from '@shared/components';
import { checkIfNodeInProgress, NodeTags } from '@modules/node';
import { NodeListLayoutGroupItem, NodeListItem } from '../types/common';

const SORT_ACTIONS: TableHeaderAction[] = ['sort_asc', 'sort_desc'];
const LAYOUT_ACTIONS: TableHeaderAction[] = [
  'move_to_start',
  'move_to_left',
  'move_to_right',
  'move_to_end',
  'hide',
];
const ALL_ACTIONS: TableHeaderAction[] = [...SORT_ACTIONS, ...LAYOUT_ACTIONS];

export const NODE_LIST_ITEMS: NodeListItem[] = [
  {
    key: 'customNodeInfo',
    label: 'Node Info',
    minWidth: '200px',
    width: '300px',
    dataField: NodeSortField.NODE_SORT_FIELD_DISPLAY_NAME,
    isVisible: true,
    alwaysVisible: true,
    component: (node: Node) => (
      <NodeGroups.Info
        displayName={node.displayName}
        versionKey={node.versionKey}
        createdAt={node.createdAt}
      />
    ),
    actions: ALL_ACTIONS,
  },
  {
    key: 'versionKey',
    label: 'Type',
    minWidth: '110px',
    width: '180px',
    isVisible: false,
    component: (node: Node) => (
      <NodeItems.ProtocolName
        versionKey={node.versionKey}
        versionMetadata={node.versionMetadata}
        showName={true}
      />
    ),
    actions: LAYOUT_ACTIONS,
  },
  {
    key: 'customProtocolStatus',
    label: 'Protocol Status',
    width: '200px',
    dataField: NodeSortField.NODE_SORT_FIELD_PROTOCOL_STATE,
    isVisible: false,
    component: (node: Node) => {
      const inProgress = checkIfNodeInProgress(node.nodeStatus);

      return (
        <NodeItems.ProtocolStatus
          nodeStatus={!inProgress ? node.nodeStatus : undefined}
          jobs={node.jobs}
        />
      );
    },
    actions: ALL_ACTIONS,
  },
  {
    key: 'displayName',
    label: 'Name',
    minWidth: '140px',
    width: '300px',
    dataField: NodeSortField.NODE_SORT_FIELD_DISPLAY_NAME,
    isVisible: false,
    component: (node: Node) => (
      <NodeItems.DisplayName
        displayName={node.displayName}
        nodeName={node.nodeName}
      />
    ),
    actions: ALL_ACTIONS,
  },
  {
    key: 'tags',
    label: 'Tags',
    minWidth: '140px',
    width: '200px',
    isVisible: true,
    component: (node: Node) => <NodeTags node={node} type="list" />,
    actions: LAYOUT_ACTIONS,
  },
  {
    key: 'createdAt',
    label: 'Launched On',
    minWidth: '135px',
    width: '180px',
    dataField: NodeSortField.NODE_SORT_FIELD_CREATED_AT,
    isVisible: false,
    component: (node: Node) => (
      <NodeItems.CreatedAt createdAt={node.createdAt} />
    ),
    actions: ALL_ACTIONS,
  },
  {
    key: 'nodeStatus',
    label: 'Status',
    width: '200px',
    dataField: NodeSortField.NODE_SORT_FIELD_NODE_STATE,
    isVisible: true,
    component: (node: Node) => {
      const inProgress = checkIfNodeInProgress(node.nodeStatus);

      return inProgress ? (
        <NodeItems.ProtocolStatus
          nodeStatus={node.nodeStatus}
          jobs={node.jobs}
        />
      ) : (
        <NodeItems.NodeStatus nodeStatus={node.nodeStatus} />
      );
    },
    actions: ALL_ACTIONS,
  },
  {
    key: 'customNodeHealth',
    label: 'Protocol Health',
    minWidth: '170px',
    width: '170px',
    dataField: NodeSortField.NODE_SORT_FIELD_PROTOCOL_HEALTH,
    isVisible: true,
    component: (node: Node) => (
      <NodeItems.ProtocolHealth nodeStatus={node.nodeStatus} />
    ),
    actions: LAYOUT_ACTIONS,
  },
  {
    key: 'semanticVersion',
    label: 'Version',
    width: '160px',
    isVisible: false,
    component: (node: Node) => (
      <NodeItems.Version semanticVersion={node.semanticVersion} />
    ),
    actions: LAYOUT_ACTIONS,
  },
  {
    key: 'blockHeight',
    label: 'Block Height',
    minWidth: '140px',
    width: '250px',
    dataField: NodeSortField.NODE_SORT_FIELD_BLOCK_HEIGHT,
    isVisible: true,
    component: (node: Node) => (
      <NodeItems.BlockHeight blockHeight={node.blockHeight} />
    ),
    actions: ALL_ACTIONS,
  },
  {
    key: 'regionName',
    label: 'Region',
    width: '160px',
    isVisible: true,
    component: (node: Node) => (
      <NodeItems.Region regionName={node.regionName} />
    ),
    actions: LAYOUT_ACTIONS,
  },
  {
    key: 'createdBy',
    label: 'Launched By',
    minWidth: '110px',
    width: '160px',
    isVisible: true,
    component: (node: Node) => (
      <NodeItems.CreatedBy
        createdBy={node.createdBy}
        hostId={node.hostId}
        hostDisplayName={node.hostDisplayName}
        hostNetworkName={node.hostNetworkName}
      />
    ),
    actions: LAYOUT_ACTIONS,
  },
  {
    key: 'dnsName',
    label: 'RPC Url',
    minWidth: '130px',
    width: '160px',
    isVisible: true,
    component: (node: Node) => <NodeItems.RPCUrl dnsName={node.dnsName} />,
    actions: LAYOUT_ACTIONS,
  },
];

export const NODE_LIST_TAGS_PER_VIEW = 3;

export const NODE_LIST_LAYOUT_GROUPED_FIELDS: NodeListLayoutGroupItem[] = [
  {
    key: 'customNodeInfo',
    name: 'group-node-info',
    label: 'Group Node Info',
    dependencies: ['displayName', 'versionKey', 'createdAt'],
    isGrouped: true,
  },
];

export const NODE_LIST_SORTING: SortingItem<NodeSortField>[] = [
  {
    id: 'name-asc',
    name: 'Name: A-Z',
    field: NodeSortField.NODE_SORT_FIELD_DISPLAY_NAME,
    order: SortOrder.SORT_ORDER_ASCENDING,
  },
  {
    id: 'name-desc',
    name: 'Name: Z-A',
    field: NodeSortField.NODE_SORT_FIELD_DISPLAY_NAME,
    order: SortOrder.SORT_ORDER_DESCENDING,
  },
  {
    id: 'date-desc',
    name: 'Newest first',
    field: NodeSortField.NODE_SORT_FIELD_CREATED_AT,
    order: SortOrder.SORT_ORDER_DESCENDING,
  },
  {
    id: 'date-asc',
    name: 'Oldest first',
    field: NodeSortField.NODE_SORT_FIELD_CREATED_AT,
    order: SortOrder.SORT_ORDER_ASCENDING,
  },
  {
    id: 'status-asc',
    name: 'Status: A-Z',
    field: NodeSortField.NODE_SORT_FIELD_NODE_STATE,
    order: SortOrder.SORT_ORDER_ASCENDING,
  },
  {
    id: 'status-desc',
    name: 'Status: Z-A',
    field: NodeSortField.NODE_SORT_FIELD_NODE_STATE,
    order: SortOrder.SORT_ORDER_DESCENDING,
  },
];
