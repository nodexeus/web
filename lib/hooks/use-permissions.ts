import { useQuery } from '@tanstack/react-query';
import { authClient } from '@modules/grpc/clients/authClient';
import { useAuth } from './use-auth';
import { useOrganizations } from './use-organizations';

export function usePermissions() {
  const { user } = useAuth();
  const { defaultOrg, isLoading: isLoadingOrgs } = useOrganizations();

  const { data: permissions = [], isLoading: isLoadingPermissions } = useQuery({
    queryKey: ['permissions', user?.userId, defaultOrg?.orgId],
    queryFn: async () => {
      const perms = await authClient.listPermissions(
        user!.userId,
        defaultOrg!.orgId,
      );
      return perms;
    },
    enabled: Boolean(user?.userId && defaultOrg?.orgId),
    staleTime: 60 * 1000, // permissions don't change often
  });

  // A disabled query (waiting for org to load) reports isLoading: false in
  // TanStack Query v5 (isLoading = isPending && isFetching). We need to
  // include the upstream org loading state so consumers show a loading
  // skeleton instead of "Access Denied" while the chain resolves.
  const isLoading = isLoadingOrgs || isLoadingPermissions || !defaultOrg?.orgId;

  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission);
  };

  const isSuperUser = hasPermission('auth-admin-list-permissions');

  const canDeleteNode =
    hasPermission('node-delete') || hasPermission('node-admin-delete');
  const canStartNode =
    hasPermission('node-start') || hasPermission('node-admin-start');
  const canStopNode =
    hasPermission('node-stop') || hasPermission('node-admin-stop');
  const canRestartNode =
    hasPermission('node-restart') || hasPermission('node-admin-restart');
  const canCreateNode = hasPermission('node-create');
  const canReportNode = hasPermission('node-report');

  return {
    permissions,
    isLoading,
    hasPermission,
    isSuperUser,
    canDeleteNode,
    canStartNode,
    canStopNode,
    canRestartNode,
    canCreateNode,
    canReportNode,
  };
}
