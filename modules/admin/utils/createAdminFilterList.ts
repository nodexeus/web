import { AdminListColumn } from '../types/AdminListColumn';

export const createAdminFilterList = (
  filters: AdminListColumn[],
  name: string,
): string[] | undefined => {
  const values = filters?.find((filter) => filter.name === name)?.filterSettings
    ?.values;

  // Return undefined only if the column has no filter at all (not filterable).
  // Return [] when the column is filterable but no values are selected,
  // so the API consistently receives an array rather than undefined.
  if (values === undefined) return undefined;
  return values;
};
