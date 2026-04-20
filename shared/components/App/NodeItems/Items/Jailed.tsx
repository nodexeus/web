import { css } from '@emotion/react';
import { ITheme } from 'types/theme';
import { NodePartials } from '@shared/components';
import IconWarning from '@public/assets/icons/common/Warning.svg';
import IconCheck from '@public/assets/icons/common/Check.svg';

type Props = {
  jailed?: boolean;
  view?: NodeStatusView;
};

export const Jailed = ({ jailed, view = 'default' }: Props) => {
  const Icon = jailed ? IconWarning : IconCheck;

  return (
    <NodePartials.NodeStatusTextWIcon
      Icon={Icon}
      view={view}
      {...(view === 'default' && {
        iconSize: '14px',
      })}
      additionalTextStyles={[styles.text(view, jailed)]}
    >
      {jailed ? 'Yes' : 'No'}
    </NodePartials.NodeStatusTextWIcon>
  );
};

const styles = {
  text: (view?: NodeStatusView, jailed?: boolean) => (theme: ITheme) =>
    css`
      text-transform: capitalize;
      ${view === 'default' &&
      `
        font-size: 14px;
        color: ${jailed ? theme.colorDanger : theme.colorText};
        `}
      letter-spacing: 0;
    `,
};
