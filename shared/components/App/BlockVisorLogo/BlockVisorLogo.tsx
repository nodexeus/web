import { styles } from './BlockVisorLogo.styles';
import { SvgIcon } from '@shared/components';
import BlockVisor from '@public/assets/icons/app/BlockVisorLogoSmall.svg';

type Props = {
  scale?: number;
};

export const BlockVisorLogo = ({ scale = 0.8 }: Props) => (
  <span css={[styles.wrapper]}>
    <span css={styles.icon} style={{ transform: `scale(${scale})` }}>
      <SvgIcon size="64px">
        <BlockVisor />
      </SvgIcon>
    </span>
  </span>
);
