import { AdminListColumn } from '../types/AdminListColumn';

export const loadAdminColumns = (
  columns: AdminListColumn[],
  settingsColumns: AdminListColumn[],
): AdminListColumn[] => {
  // Deep clone columns to avoid mutating the module-level constant
  const columnsCopy: AdminListColumn[] = columns.map((col) => ({
    ...col,
    filterSettings: col.filterSettings ? { ...col.filterSettings } : undefined,
  }));

  if (settingsColumns?.length) {
    columnsCopy.forEach((column) => {
      const foundSettingsColumn = settingsColumns.find(
        (c) => c?.name === column?.name,
      );

      if (foundSettingsColumn) {
        column.width = foundSettingsColumn.width;

        if (foundSettingsColumn.isVisible !== undefined) {
          column.isVisible = foundSettingsColumn.isVisible;
        }

        if (column.filterComponent) {
          if (!column.filterSettings) column.filterSettings = {};

          column.filterSettings.values =
            foundSettingsColumn.filterSettings?.values ?? [];
        }
      } else if (column.filterComponent) {
        // Column exists in defaults but not in saved settings —
        // initialize with empty filter values instead of wiping filterSettings
        if (!column.filterSettings) column.filterSettings = {};
        column.filterSettings.values = [];
      }
    });
  }

  return columnsCopy;
};
