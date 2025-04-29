import { NodeHealth } from '@modules/grpc/library/blockjoy/common/v1/node';
import { Node } from '@modules/grpc/library/blockjoy/v1/node';
import { NodePartials } from '@shared/components';
import { PROTOCOL_HEALTH_PRESENTATION } from '@modules/node';
import { ITheme } from 'types/theme';
import { css } from '@emotion/react';

type Props = Partial<Pick<Node, 'nodeStatus'>> & {
  view?: NodeStatusView;
};

export const ProtocolHealth = ({ nodeStatus, view }: Props) => {
  if (!nodeStatus?.protocol?.health) return <>-</>;

  const protocolHealth = [NodeHealth[nodeStatus?.protocol?.health]]?.[0]
    .replace('NODE_HEALTH_', '')
    ?.toLowerCase();

  const { color, Icon, options } = PROTOCOL_HEALTH_PRESENTATION[protocolHealth];

  return (
    <NodePartials.NodeStatusTextWIcon
      color={protocolHealth === 'HEALTHY' ? 'colorDanger' : 'colorSuccess'}
      Icon={Icon}
      options={options}
      view={view}
      {...(view === 'default' && {
        iconSize: '14px',
      })}
      additionalTextStyles={[styles.text(view, protocolHealth)]} 
    >
      {protocolHealth?.replaceAll('_', ' ') ?? ''}
    </NodePartials.NodeStatusTextWIcon>
  );
};

const styles = {
  text: (view?: NodeStatusView, protocolHealth?: string) => (theme: ITheme) =>
    css`
      text-transform: capitalize;
      color: ${protocolHealth === 'RUNNING' ? theme.colorDanger : theme.colorSuccess};
      ${view === 'default' &&
      `
        font-size: 14px;
        `}
      letter-spacing: 0;
    `,
};
