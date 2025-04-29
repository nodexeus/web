import { useRouter } from 'next/router';
import { ROUTES } from '@shared/constants/routes';
import { TabNavigation } from '@shared/components';
import { wrapper } from 'styles/wrapper.styles';
import { useRecoilValue } from 'recoil';
import { authSelectors } from '@modules/auth';

export const NodeViewTabs = () => {
  const { query, asPath } = useRouter();
  const { id } = query;

  const isSuperUser = useRecoilValue(authSelectors.isSuperUser);

  const createPath = (path: string) =>
    `${ROUTES.NODE(id as string)}${path ? `/${path}` : ''}`;

  const tabs: { href: string; name: string; className?: string }[] = [
    { href: createPath(''), name: 'Details' },
    // isSuperUser ? { href: createPath('config'), name: 'Config' } : null,
    // isSuperUser ? { href: createPath('jobs'), name: 'Jobs' } : null,
    // isSuperUser ? { href: createPath('commands'), name: 'Commands' } : null,
  ];

  const isActive = (href: string) => {
    const routerPath = asPath
      .substring(
        asPath.lastIndexOf(id as string) + id?.length! + 1,
        asPath.length,
      )
      .trim();

    const buttonPath = href
      .substring(href.lastIndexOf(id as string) + id?.length! + 1, href.length)
      .trim();

    return buttonPath === ''
      ? buttonPath === routerPath
      : routerPath.includes(buttonPath);
  };

  const tabItems = tabs.map((tab) => ({
    ...tab,
    isActive: isActive(tab.href),
  }));

  return (
    <div css={wrapper.main}>
      <TabNavigation items={tabItems} />
    </div>
  );
};
