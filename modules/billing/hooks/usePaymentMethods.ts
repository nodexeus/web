import { useRecoilState, useRecoilValue } from 'recoil';
import { PaymentMethod } from '@modules/grpc/library/blockjoy/v1/org';
import { billingAtoms } from '@modules/billing';
import { organizationClient } from '@modules/grpc';
import { organizationSelectors } from '@modules/organization';
import { authSelectors } from '@modules/auth';

interface IPaymentMethodsHook {
  paymentMethods: PaymentMethod[];
  paymentMethodsLoadingState: LoadingState;
  getPaymentMethods: () => Promise<PaymentMethod[]>;
  deletePaymentMethod: (id: string) => Promise<void>;
  setDefaultPaymentMethod: (id: string) => Promise<void>;
}

export const usePaymentMethods = (): IPaymentMethodsHook => {
  const defaultOrganization = useRecoilValue(
    organizationSelectors.defaultOrganization,
  );

  const [paymentMethods, setPaymentMethods] = useRecoilState(
    billingAtoms.paymentMethods,
  );
  const [paymentMethodsLoadingState, setPaymentMethodsLoadingState] =
    useRecoilState(billingAtoms.paymentMethodsLoadingState);

  const canListPaymentMethods = useRecoilValue(
    authSelectors.hasPermission('org-billing-list-payment-methods'),
  );

  const getPaymentMethods = async () => {
    if (!canListPaymentMethods) return [];

    setPaymentMethodsLoadingState('initializing');

    try {
      const data = await organizationClient.listPaymentMethods(
        defaultOrganization?.orgId!,
      );

      console.log('%cGetPaymentMethods', 'color: #e84326', data);
      setPaymentMethods(data);

      return data;
    } catch (error) {
      console.log('Failed to fetch Payment method', error);
      return [];
    } finally {
      setPaymentMethodsLoadingState('finished');
    }
  };

  const deletePaymentMethod = async (id: string) => {
    setPaymentMethodsLoadingState('loading');

    try {
    } catch (error) {
      console.log('Failed to delete Payment method', error);
    } finally {
      setPaymentMethodsLoadingState('finished');
    }
  };

  const setDefaultPaymentMethod = async (id: string) => {
    setPaymentMethodsLoadingState('loading');

    try {
    } catch (error) {
      console.log('Failed to set default Payment method', error);
    } finally {
      setPaymentMethodsLoadingState('finished');
    }
  };

  return {
    paymentMethods,
    paymentMethodsLoadingState,

    getPaymentMethods,
    deletePaymentMethod,
    setDefaultPaymentMethod,
  };
};
