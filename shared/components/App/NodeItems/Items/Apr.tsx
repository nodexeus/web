import { css } from '@emotion/react';
import { Node } from '@modules/grpc/library/blockjoy/v1/node';
import { ITheme } from 'types/theme';
import { NodePartials } from '@shared/components';
import { NodeStatePresentationOptions } from '@modules/node';
import IconPercent from '@public/assets/icons/common/Percent.svg';
import IconChartTrendingUp from '@public/assets/icons/common/ChartTrendingUp.svg';
import IconChartTrendingDown from '@public/assets/icons/common/ChartTrendingDown.svg';

type Props = Partial<Pick<Node, 'apr'>> & {
  view?: NodeStatusView;
};

export const Apr = ({ apr, view = 'default' }: Props) => {
  const Icon = apr! > 0 ? IconChartTrendingUp : IconChartTrendingDown;
  const options: NodeStatePresentationOptions =
    apr! > -1 ? {} : { iconSpining: false };

  return (
    <NodePartials.NodeStatusTextWIcon
      Icon={Icon}
      color={apr! < 0 ? 'colorDanger' : 'colorSuccess'}
      options={options}
      view={view}
      {...(view === 'default' && {
        iconSize: '14px',
      })}
      additionalTextStyles={[styles.text(view, apr)]}
    >
      {apr !== undefined ? `${apr.toLocaleString('en-US')}%` : 'Calculating'}
    </NodePartials.NodeStatusTextWIcon>
  );
};

export const AdminApr = ({ apr, view = 'default' }: Props) => {
  const Icon = apr! > 0 ? IconPercent : IconPercent;
  const options: NodeStatePresentationOptions =
    apr! > 0 ? {} : { iconSpining: false };

  return (
    <NodePartials.NodeStatusTextWIcon
      Icon={Icon}
      options={options}
      view={view}
      {...(view === 'default' && {
        iconSize: '14px',
      })}
      additionalTextStyles={[styles.text(view, apr)]}
    >
      {apr?.toLocaleString('en-US') ?? 'Calculating'}
    </NodePartials.NodeStatusTextWIcon>
  );
};

const styles = {
  text: (view?: NodeStatusView, apr?: number) => (theme: ITheme) =>
    css`
      text-transform: capitalize;
      color: ${apr! < 0 ? theme.colorDanger : theme.colorSuccess};
      ${view === 'default' &&
      `
        font-size: 14px;
        
        `}
      letter-spacing: 0;
    `,
};
