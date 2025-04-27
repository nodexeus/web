import { ReactNode, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRecoilValue } from 'recoil';
import { Elements } from '@stripe/react-stripe-js';
import Sidebar from './sidebar/Sidebar';
import { Burger } from './burger/Burger';
import Page from './page/Page';
import { useIdentityRepository } from '@modules/auth';
import {
  organizationAtoms,
  organizationSelectors,
  useInvitations,
  useProvisionToken,
} from '@modules/organization';
import { useGetProtocols, useNodeList } from '@modules/node';
import { useMqtt } from '@modules/mqtt';
import { useHostList } from '@modules/host';
import { useBilling, useStripeSetup } from '@modules/billing';
import { MasterLayout } from '@modules/layout';
import { ProgressBar } from '@shared/components';

export type LayoutProps = {
  children: ReactNode;
  isPageFlex?: boolean;
  pageTitle?: string;
};

const Layout = ({ children, isPageFlex, pageTitle }: LayoutProps) => {
  const repository = useIdentityRepository();
  const user = repository?.getIdentity();

  const currentOrg = useRef<string | undefined>(undefined);

  const defaultOrganization = useRecoilValue(
    organizationSelectors.defaultOrganization,
  );
  const allOrganizations = useRecoilValue(organizationAtoms.allOrganizations);

  const {
    client: mqttClient,
    connect: mqttConnect,
    reconnect: mqttReconnect,
    updateSubscription: updateMqttSubscription,
  } = useMqtt();
  const { getReceivedInvitations } = useInvitations();
  const { loadNodes, loadGlobalNodes } = useNodeList();
  const { loadHosts, loadGlobalHosts } = useHostList();
  const { getProvisionToken, provisionToken } = useProvisionToken();

  useBilling();
  useGetProtocols();

  useEffect(() => {
    (async () => {
      await getReceivedInvitations(user?.email!);
    })();
  }, []);

  useEffect(() => {
    if (!mqttClient) mqttConnect();
    else mqttReconnect();
  }, [user?.accessToken]);

  useEffect(() => {
    if (!provisionToken && defaultOrganization?.orgId) {
      getProvisionToken(defaultOrganization?.orgId);
    }
    if (
      defaultOrganization?.orgId !== currentOrg.current &&
      defaultOrganization?.orgId
    ) {
      currentOrg.current = defaultOrganization!.orgId;
      loadNodes();
      loadHosts();
      if (mqttClient?.connected) updateMqttSubscription();
    }
  }, [defaultOrganization?.orgId]);

  useEffect(() => {
    if (allOrganizations.length) {
      loadGlobalNodes();
      loadGlobalHosts();
    }
  }, [allOrganizations]);

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
      </Head>
      <ProgressBar />
      <Burger />
      <Sidebar />
      <Page isFlex={isPageFlex}>{children}</Page>
    </>
  );
};

const LayoutWrapper = ({ children }: React.PropsWithChildren) => {
  const { stripe } = useStripeSetup();

  if (stripe) return <Elements stripe={stripe}>{children}</Elements>;

  return <>{children}</>;
};

export const AppLayout = (props: LayoutProps) => {
  return (
    <MasterLayout>
      <LayoutWrapper>
        <Layout {...props} />
      </LayoutWrapper>
    </MasterLayout>
  );
};
