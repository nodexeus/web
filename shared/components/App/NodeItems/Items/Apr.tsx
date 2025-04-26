import { css } from '@emotion/react';
import { Node } from '@modules/grpc/library/blockjoy/v1/node';
import { ITheme } from 'types/theme';
import { NodePartials } from '@shared/components';
import { NodeStatePresentationOptions } from '@modules/node';
import IconBlockHeight from '@public/assets/icons/app/BlockHeight.svg';
import IconCog from '@public/assets/icons/common/Cog.svg';
import IconPercent from '@public/assets/icons/common/Percent.svg';

type Props = Partial<Pick<Node, 'apr'>> & {
  view?: NodeStatusView;
};

export const Apr = ({ apr, view = 'default' }: Props) => {
  const Icon = apr! > -1 ? IconPercent : IconPercent;
  const options: NodeStatePresentationOptions =
    apr! > -1 ? {} : { iconSpining: false };

  return (
    <NodePartials.NodeStatusTextWIcon
      // Icon={Icon}
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
  const Icon = apr! > -1 ? IconPercent : IconPercent;
  const options: NodeStatePresentationOptions =
    apr! > -1 ? {} : { iconSpining: false };

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
      ${view === 'default' &&
      `
        font-size: 14px;
        color: ${apr! > -1 ? theme.colorText : theme.colorDefault};
        `}
      letter-spacing: 0;
    `,
};
