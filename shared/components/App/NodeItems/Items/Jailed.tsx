import { css } from '@emotion/react';
import { Node } from '@modules/grpc/library/blockjoy/v1/node';
import { ITheme } from 'types/theme';
import { NodePartials } from '@shared/components';
import { NodeStatePresentationOptions } from '@modules/node';
import IconJailed from '@public/assets/icons/nodeStatus/Jailed.svg';

type Props = Partial<Pick<Node, 'jailed'>> & {
  view?: NodeStatusView;
};

export const Jailed = ({ jailed, view = 'default' }: Props) => {
  const Icon = jailed ? IconJailed : IconJailed;
  const options: NodeStatePresentationOptions =
    jailed ? {} : { iconSpining: false };

  return (
    <NodePartials.NodeStatusTextWIcon
      Icon={Icon}
      options={options}
      color={jailed ? 'colorDanger' : 'colorSuccess'}
      view={view}
      {...(view === 'default' && {
        iconSize: '14px',
      })}
      additionalTextStyles={[styles.text(view, jailed)]}
    >
      {jailed ? 'Jailed' : 'Not Jailed'}
    </NodePartials.NodeStatusTextWIcon>
  );
};

const styles = {
  text: (view?: NodeStatusView, jailed?: boolean) => (theme: ITheme) =>
    css`
      text-transform: capitalize;
      color: ${jailed ? theme.colorDanger : theme.colorSuccess};
      ${view === 'default' &&
      `
        font-size: 14px;
        `}
      letter-spacing: 0;
    `,
};
