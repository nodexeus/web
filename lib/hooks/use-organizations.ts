import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationClient } from '@modules/grpc/clients/organizationClient';
import { userClient } from '@modules/grpc/clients/userClient';
import { useAuth } from './use-auth';

type DefaultOrg = {
  orgId: string;
  name: string;
};

export function useOrganizations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all organizations the user belongs to
  const { data: organizations = [], isLoading: isLoadingOrgs } = useQuery({
    queryKey: ['organizations', user?.userId],
    queryFn: async () => {
      const response = await organizationClient.listOrganizations();
      return response.orgs ?? [];
    },
    enabled: Boolean(user?.userId),
  });

  // Fetch the user's default org from settings
  const { data: defaultOrg, isLoading: isLoadingDefault } = useQuery({
    queryKey: ['defaultOrganization', user?.userId],
    queryFn: async () => {
      const allSettings = await userClient.getSettings(user!.userId);
      const orgSettingsRaw = allSettings?.['organization'];
      if (orgSettingsRaw) {
        try {
          const parsed = JSON.parse(orgSettingsRaw);
          if (parsed?.default?.orgId) {
            return parsed.default as DefaultOrg;
          }
        } catch {
          // fall through
        }
      }

      // Fallback: use the first org
      if (organizations.length > 0) {
        return {
          orgId: organizations[0].orgId,
          name: organizations[0].name,
        };
      }

      return null;
    },
    enabled: Boolean(user?.userId),
  });

  // Switch org mutation — persists the new default to user settings
  const switchOrgMutation = useMutation({
    mutationFn: async (org: DefaultOrg) => {
      // Read current org settings, merge in the new default
      const allSettings = await userClient.getSettings(user!.userId);
      const orgSettingsRaw = allSettings?.['organization'] ?? '{}';
      const parsed = JSON.parse(orgSettingsRaw);
      const updated = { ...parsed, default: org };

      await userClient.updateSettings(
        user!.userId,
        'organization',
        JSON.stringify(updated),
      );

      return org;
    },
    onSuccess: (org) => {
      // Update the cached default org
      queryClient.setQueryData(
        ['defaultOrganization', user?.userId],
        org,
      );
      // Invalidate data that depends on the org
      queryClient.invalidateQueries({ queryKey: ['nodes'] });
      queryClient.invalidateQueries({ queryKey: ['hosts'] });
    },
  });

  return {
    organizations,
    defaultOrg: defaultOrg ?? null,
    isLoading: isLoadingOrgs || isLoadingDefault,
    switchOrg: switchOrgMutation.mutate,
    isSwitching: switchOrgMutation.isPending,
  };
}
