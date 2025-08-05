import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { styles } from './AdminDashboardCard.styles';
import { Search, Skeleton, SvgIcon } from '@shared/components';
import { AdminQuery } from '@modules/admin/types/AdminQuery';

type Props = {
  name: string;
  icon: React.ReactNode;
  getTotal: () => Promise<number>;
};

export const AdminDashboardCard = ({ name, icon, getTotal }: Props) => {
  const router = useRouter();
  const [total, setTotal] = useState<number>();

  const query: AdminQuery = {
    name: name?.toLowerCase(),
    page: 1,
  };

  const handleSearch = (keyword: string) => {
    if (keyword) query.search = keyword.trim();

    router.push({
      pathname: '/admin',
      query,
    });
  };

  const handleTotalClick = () => {
    router.push({
      pathname: '/admin',
      query,
    });
  };

  useEffect(() => {
    (async () => {
      const response = await getTotal();
      setTotal(response);
    })();
  }, []);

  return (
    <article css={styles.card}>
      <div css={styles.cardTitle}>
        <span css={styles.cardIcon}>
          <SvgIcon size="22px"> {icon}</SvgIcon>
        </span>
        {total! >= 0 ? (
          <a onClick={handleTotalClick} css={styles.cardTotal}>
            <label css={styles.cardLabel}>{name}</label>
            <var css={styles.cardValue}>{total}</var>
          </a>
        ) : (
          <div>
            <Skeleton height="16px" margin="7px 0 10px" width="60px" />
            <Skeleton height="27px" width="30px" />
          </div>
        )}
      </div>

      <Search version="submit" onSearch={handleSearch} placeholder="Keyword" />
    </article>
  );
};
