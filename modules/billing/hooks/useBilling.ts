import { useEffect, useRef } from 'react';
import { useRecoilValue } from 'recoil';
import {
  useBillingAddress,
  // useEstimates,
  useInvoices,
  usePaymentMethods,
  useSubscription,
} from '@modules/billing';
import { organizationSelectors } from '@modules/organization';
import { authAtoms } from '@modules/auth';
import { env } from '@shared/constants/env';

export const useBilling = () => {
  const defaultOrganization = useRecoilValue(
    organizationSelectors.defaultOrganization,
  );
  const permissionsLoadingState = useRecoilValue(
    authAtoms.permissionsLoadingState,
  );

  const { getPaymentMethods } = usePaymentMethods();
  const { getBillingAddress } = useBillingAddress();
  const { getSubscription } = useSubscription();
  const { getInvoices } = useInvoices();
  // const { getEstimates } = useEstimates();

  const currentOrgId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (
      currentOrgId.current !== defaultOrganization?.orgId &&
      permissionsLoadingState === 'finished' &&
      env.stripeKey
    ) {
      getPaymentMethods();
      getBillingAddress();
      getInvoices();
      getSubscription();
      // getEstimates();

      currentOrgId.current = defaultOrganization?.orgId;
    }
  }, [defaultOrganization?.orgId, permissionsLoadingState]);
};
