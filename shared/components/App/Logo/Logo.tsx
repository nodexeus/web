import LogoLarge from '@public/assets/icons/app/BlockVisorLogoLarge.svg';
import LogoSmall from '@public/assets/icons/app/BlockVisorLogoSmall.svg';
import { logo, logoPrimary, logoLinkCentered, logoFaded } from './Logo.styles';
import { display } from 'styles/utils.display.styles';

type IconType = 'blockvisor-small' | 'faded' | 'blockvisor-large';

type Props = {
  type?: IconType;
  centered?: boolean;
};

export function Logo({ type = 'blockvisor-small', centered = false }: Props) {
  const renderIcon = (type: IconType) => {
    switch (type) {
      case 'blockvisor-large':
        return (
          <>
            <span css={[display.visuallyHidden]}>BlockVisor</span>
            <LogoLarge />
          </>
        );
      case 'faded':
        return (
          <span css={[logoFaded]}>
            <LogoSmall />
          </span>
        );

      default:
        return (
          <span css={[logoPrimary]}>
            <span css={[display.visuallyHidden]}>BlockVisor</span>
            <LogoSmall />
          </span>
        );
    }
  };
  return (
    <h1 css={[logo, centered ? logoLinkCentered : '']}>{renderIcon(type)}</h1>
  );
}
