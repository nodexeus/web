import {
  authClient,
  invitationClient,
  setTokenValue,
  userClient,
} from '@modules/grpc';
import { useSetRecoilState } from 'recoil';
import { authAtoms } from '../store/authAtoms';
import { ApplicationError } from '../utils/Errors';
import { useIdentityRepository } from './useIdentityRepository';
import {
  isStatusResponse,
  useDefaultOrganization,
  useGetOrganizations,
  useInvitations,
} from '@modules/organization';
import { readToken } from '@shared/utils/readToken';
import { toast } from 'react-toastify';

type SignInParams = {
  email: string;
  password: string;
};

export function useSignIn() {
  const setUser = useSetRecoilState(authAtoms.user);
  const repository = useIdentityRepository();

  const { acceptInvitation, declineInvitation } = useInvitations();

  const { getOrganizations } = useGetOrganizations();

  const { setDefaultOrganization } = useDefaultOrganization();

  const handleSuccess = async (
    accessToken: string,
    refreshToken?: string,
    invitationId?: string,
    isInvited?: boolean,
  ) => {
    setTokenValue(accessToken, refreshToken); // for grpc

    repository?.saveIdentity({
      accessToken,
      refreshToken,
    });

    const tokenObject: any = readToken(accessToken);
    const userId = tokenObject.resource_id;

    try {
      const userData = await userClient.getUser(userId);

      repository?.updateIdentity(userData);
      setUser((current: any) => ({
        ...current,
        ...userData,
        accessToken,
        refreshToken,
      }));

      if (invitationId && isInvited) {
        const receivedInvitations = await invitationClient.receivedInvitations(
          userData?.email!,
        );

        const activeInvitation = receivedInvitations.find(
          (i) => i.invitationId === invitationId,
        );

        await acceptInvitation(invitationId);

        await getOrganizations(true);

        await setDefaultOrganization(
          { orgId: activeInvitation?.orgId!, name: activeInvitation?.orgName! },
          userId,
        );

        toast.success('Joined Organization');
      } else if (invitationId && !isInvited) {
        await declineInvitation(invitationId, () => null);
      }
    } catch (err) {
      console.log('loginError', err);
    }
  };

  const signIn = async (
    params?: SignInParams,
    token?: string,
    invitationId?: string,
    isInvited?: boolean,
  ) => {
    if (token) {
      await handleSuccess(token);
      return;
    }

    if (params) {
      const response = await authClient.login(params.email, params.password);

      if (!isStatusResponse(response)) {
        await handleSuccess(response.token, response.refresh, invitationId, isInvited);
      } else {
        throw new ApplicationError('LoginError', 'Login Error');
      }
    } else {
      throw new ApplicationError('LoginError', 'Error signing in');
    }
  };

  return signIn;
}
