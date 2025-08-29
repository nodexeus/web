import { AdminNodes } from './AdminNodes/AdminNodes';
import { AdminUsers } from './AdminUsers/AdminUsers';
import { AdminHosts } from './AdminHosts/AdminHosts';
import { AdminOrgs } from './AdminOrgs/AdminOrgs';
import { AdminProtocols } from './AdminProtocols/AdminProtocols';
import { AdminImages } from './AdminImages/AdminImages';
import { styles } from './AdminLists.styles';
import { useRouter } from 'next/router';

export type AdminGetList = {
  list: IAdminItem[];
  total: number;
};

const views = [
  { name: 'users', component: <AdminUsers /> },
  { name: 'nodes', component: <AdminNodes /> },
  { name: 'hosts', component: <AdminHosts /> },
  { name: 'orgs', component: <AdminOrgs /> },
  { name: 'protocols', component: <AdminProtocols /> },
  { name: 'images', component: <AdminImages /> },
];

export const AdminLists = () => {
  const router = useRouter();
  const { name } = router.query;
  return (
    <section css={styles.grid}>
      {views.find((v) => v.name === (name as string))?.component}
    </section>
  );
};
