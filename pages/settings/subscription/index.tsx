import { ReactNode } from 'react';
import { AppLayout } from '@modules/layout';
import { Subscription } from '@modules/billing';
import { SettingsWrapper } from '@modules/settings';

const Component = () => <Subscription />;

Component.getLayout = function getLayout(page: ReactNode) {
  return (
    <AppLayout isPageFlex>
      <SettingsWrapper scope="org">{page}</SettingsWrapper>
    </AppLayout>
  );
};

export async function getServerSideProps() {
  if (!process.env.NEXT_PUBLIC_STRIPE_KEY) {
    return {
      notFound: true,
    };
  }
  return { props: {} };
}

export default Component;
