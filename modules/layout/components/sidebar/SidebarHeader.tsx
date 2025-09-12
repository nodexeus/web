import { useRecoilValue } from 'recoil';
import { layoutAtoms, layoutSelectors } from '@modules/layout';
import { styles } from './SidebarHeader.styles';
import { Burger } from '../burger/Burger';
import Logo from '@public/assets/icons/app/BlockVisorLogoLarge.svg';

export const SidebarHeader = () => {
  const isSidebarOpen = useRecoilValue(layoutSelectors.isSidebarOpen);
  const isSidebarOpenMobile = useRecoilValue(layoutAtoms.isSidebarOpenMobile);

  return (
    <header css={[styles.wrapper, isSidebarOpen && styles.wrapperSidebarOpen]}>
      <div css={styles.leftSection}>
        <Burger />
        {(window.innerWidth >= 1200 && isSidebarOpen) ||
        (window.innerWidth < 1200 && isSidebarOpenMobile) ? (
          <Logo />
        ) : null}
      </div>
    </header>
  );
};
