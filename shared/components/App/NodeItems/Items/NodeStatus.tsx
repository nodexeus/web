import { NodeState } from '@modules/grpc/library/blockjoy/common/v1/node';
import { Node } from '@modules/grpc/library/blockjoy/v1/node';
import { NODE_STATE_PRESENTATION } from '@modules/node';
import { NodePartials } from '@shared/components';
import { css } from '@emotion/react';
import { ITheme } from 'types/theme';

type Props = Partial<Pick<Node, 'nodeStatus'>> & {
  view?: NodeStatusView;
};

export const NodeStatus = ({ nodeStatus, view = 'default' }: Props) => {
  if (!nodeStatus?.state) return <span>-</span>;

  const nodeState = [NodeState[nodeStatus.state]]?.[0]
    .replace('NODE_STATE_', '')
    ?.toLowerCase();

  const { color, Icon, options } = NODE_STATE_PRESENTATION[nodeState];

  return (
    <NodePartials.NodeStatusTextWIcon
      // color={color}
      color={nodeState === 'RUNNING' ? 'colorDanger' : 'colorSuccess'}
      Icon={Icon}
      options={options}
      view={view}
      {...(view === 'default' && {
        iconSize: '14px',
      })}
      additionalTextStyles={[styles.text(view, nodeState)]}
    >
      {nodeState.replaceAll('_', ' ') ?? ''}
    </NodePartials.NodeStatusTextWIcon>
  );
};

const styles = {
  text: (view?: NodeStatusView, nodeState?: string) => (theme: ITheme) =>
    css`
      text-transform: capitalize;
      color: ${nodeState === 'RUNNING' ? theme.colorDanger : theme.colorSuccess};
      ${view === 'default' &&
      `
        font-size: 14px;
        `}
      letter-spacing: 0;
    `,
};

