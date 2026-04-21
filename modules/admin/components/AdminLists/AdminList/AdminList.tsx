import {
  Dispatch,
  FunctionComponent,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/router';
import { useRecoilValue } from 'recoil';
import { useSettings } from '@modules/settings';
import { useUpdateQueryString } from '@modules/admin/hooks';
import { adminSelectors, loadAdminColumns } from '@modules/admin';
import { AdminListColumn } from '@modules/admin/types/AdminListColumn';
import { SortOrder } from '@modules/grpc/library/blockjoy/common/v1/search';
import { styles } from './AdminList.styles';
import { AdminListHeader } from './AdminListHeader/AdminListHeader';
import { AdminListTable } from './AdminListTable/AdminListTable';
import { Protocol } from '@modules/grpc/library/blockjoy/v1/protocol';
import { User } from '@modules/grpc/library/blockjoy/v1/user';
import { pageSize as defaultPageSize } from '@modules/admin/constants/constants';

type Props = {
  name: keyof AdminSettings;
  idPropertyName: string;
  columns: AdminListColumn[];
  hidePagination?: boolean;
  defaultSortField: number;
  defaultSortOrder: SortOrder;
  additionalHeaderButtons?: FunctionComponent<{
    selectedIds: string[];
    list: any[];
    setList: Dispatch<SetStateAction<any[]>>;
  }>[];
  selectedIds?: string[];
  tagsAdded?: AdminTags[];
  tagsRemoved?: AdminTags[];
  protocols?: Protocol[];
  users?: User[];
  setTagsAdded?: Dispatch<SetStateAction<AdminTags[]>>;
  setTagsRemoved?: Dispatch<SetStateAction<AdminTags[]>>;
  onIdSelected?: (id: string, isSelected: boolean) => void;
  onIdAllSelected?: (ids: string[]) => void;
  listMap: (list: any[]) => any[];
  getList: (
    keyword?: string,
    page?: number,
    sortField?: number,
    sortOrder?: number,
    filters?: AdminListColumn[],
    pageSize?: number,
  ) => Promise<{
    total: number;
    list: any[];
  }>;
};

type ListSettings = {
  listSearch: string;
  listPage: number;
  sortField: number;
  sortOrder: number;
  filters: AdminListColumn[];
  pageSize: number;
};

export const AdminList = ({
  name,
  idPropertyName,
  columns,
  hidePagination,
  defaultSortField,
  defaultSortOrder,
  selectedIds,
  additionalHeaderButtons,
  tagsAdded,
  tagsRemoved,
  protocols,
  users,
  setTagsAdded,
  setTagsRemoved,
  onIdSelected,
  onIdAllSelected,
  listMap,
  getList,
}: Props) => {
  const router = useRouter();

  const { search, page } = router.query;

  const [isLoading, setIsLoading] = useState(true);
  const [list, setList] = useState<any[]>([]);
  const [listAll, setListAll] = useState<any[]>([]);
  const [listTotal, setListTotal] = useState<number>();

  const { updateQueryString } = useUpdateQueryString(name);

  const settings = useRecoilValue(adminSelectors.settings);
  const settingsColumns = settings[name]?.columns ?? [];

  const [columnsState, setColumnsState] = useState<AdminListColumn[]>([]);

  const [listSettings, setListSettings] = useState<ListSettings>({
    listSearch: (search as string) || '',
    listPage: page ? +page?.toString()! : 1,
    sortField: settings[name]?.sort?.field || defaultSortField,
    sortOrder: settings[name]?.sort?.order || defaultSortOrder,
    filters: [],
    pageSize: settings[name]?.pageSize || defaultPageSize,
  });

  const { listSearch, listPage, sortField, sortOrder, filters, pageSize } =
    listSettings;

  const { updateSettings } = useSettings();

  // Fetch counter: incremented before every fetch. When the async call
  // resolves we check whether the counter still matches — if it doesn't,
  // a newer fetch was started and we discard the stale result.
  const fetchCounter = useRef(0);

  // Whether the initialisation effect has already triggered the first fetch.
  // While this is false the [listSettings] watcher will not fetch, because
  // the init effect is responsible for the first load (it has the correct
  // merged filters, whereas listSettings.filters starts as []).
  const initFetchDone = useRef(false);

  const handleGetList = async (
    keyword: string,
    page: number,
    sortField: number,
    sortOrder: SortOrder,
    filtersToApply?: AdminListColumn[],
    pageSizeToApply?: number,
  ) => {
    const thisFetch = ++fetchCounter.current;

    const response = await getList(
      keyword,
      page - 1,
      sortField,
      sortOrder,
      filtersToApply,
      pageSizeToApply,
    );

    // Another fetch was started after this one — discard stale results.
    if (thisFetch !== fetchCounter.current) return;

    setList(response.list);
    setListTotal(response.total);
    setIsLoading(false);

    if (columns.some((column) => !!column.filterComponent)) {
      const everythingResponse = await getList(
        keyword,
        -1,
        undefined,
        undefined,
        undefined,
        pageSizeToApply,
      );

      // Check again after the second await.
      if (thisFetch !== fetchCounter.current) return;

      setListAll(everythingResponse.list);
    }
  };

  const handleSearch = async (nextSearch: string) => {
    if (nextSearch === undefined) return;

    updateQueryString(1, nextSearch);

    setListSettings((prev) => ({
      ...prev,
      listSearch: nextSearch,
      listPage: 1,
    }));

    handleGetList(nextSearch, 1, sortField, sortOrder, filters, pageSize);
  };

  const handleSortChanged = (nextSortField: number) => {
    const nextSortOrder =
      sortField !== nextSortField
        ? SortOrder.SORT_ORDER_ASCENDING
        : sortOrder === SortOrder.SORT_ORDER_ASCENDING
          ? SortOrder.SORT_ORDER_DESCENDING
          : SortOrder.SORT_ORDER_ASCENDING!;

    setListSettings((prev) => ({
      ...prev,
      sortField: nextSortField,
      sortOrder: nextSortOrder,
    }));

    const nextColumns = [...columnsState];
    const foundColumn = nextColumns.find(
      (column) => column.sortField === nextSortField,
    );

    updateSettings('admin', {
      [name]: {
        columns: foundColumn ? nextColumns : settings[name]?.columns,
        sort: {
          field: nextSortField,
          order: nextSortOrder,
        },
      },
    });

    if (!foundColumn) return;

    setColumnsState(nextColumns);
  };

  const handlePageChanged = (nextPage: number) => {
    setListSettings((prev) => ({
      ...prev,
      listPage: nextPage,
    }));

    updateQueryString(nextPage, search as string);

    handleGetList(
      listSearch,
      nextPage,
      sortField,
      sortOrder,
      filters,
      pageSize,
    );
  };

  const handlePageSizeChanged = (nextPageSize: number) => {
    setListSettings((prev) => ({
      ...prev,
      pageSize: nextPageSize,
      listPage: 1,
    }));

    updateQueryString(1, search as string);

    updateSettings('admin', {
      [name]: {
        ...settings[name],
        pageSize: nextPageSize,
      },
    });

    handleGetList(listSearch, 1, sortField, sortOrder, filters, nextPageSize);
  };

  const handleColumnsChanged = (nextColumns: AdminListColumn[]) => {
    updateSettings('admin', {
      [name]: {
        ...settings[name],
        columns: nextColumns,
      },
    });
    setColumnsState(nextColumns);
  };

  const handleFiltersChanged = (nextFilters: AdminListColumn[]) => {
    // Build updated columns by immutably merging filter values from nextFilters
    const nextColumns = columnsState.map((col) => {
      const updatedFilter = nextFilters.find((f) => f.name === col.name);
      if (updatedFilter) {
        return {
          ...col,
          filterSettings: updatedFilter.filterSettings
            ? { ...updatedFilter.filterSettings }
            : col.filterSettings,
        };
      }
      return col;
    });

    updateSettings('admin', {
      [name]: {
        ...settings[name],
        columns: nextColumns,
      },
    });

    setColumnsState(nextColumns);

    // Only include columns that actually have active filter values
    const updatedFilters = nextColumns.filter(
      (col) => !!col.filterComponent && col.filterSettings?.values?.length,
    );

    setListSettings((prev) => ({
      ...prev,
      filters: updatedFilters,
      listPage: 1,
    }));

    updateQueryString(1, search as string);
  };

  const initSettingsColumns = () => {
    if (!!settings[name]) return;

    updateSettings('admin', {
      [name]: {
        ...settings[name],
        columns,
      },
    });
  };

  // ---------------------------------------------------------------
  // Initialisation effect.
  //
  // Merges the static column definitions with any saved settings
  // (which may include persisted filter values) and triggers the
  // very first data fetch with the correct filters.
  //
  // When the component mounts during client-side navigation, Recoil
  // already has the settings so settingsColumns is populated
  // immediately. On a hard refresh the Recoil atom may still be
  // loading, so settingsColumns starts as []. We re-run once more
  // when the real settings arrive.
  // ---------------------------------------------------------------
  const prevSettingsKey = useRef<string | null>(null);

  useEffect(() => {
    const key = JSON.stringify(settingsColumns);

    // If we already initialised with this exact settings payload, skip.
    if (prevSettingsKey.current === key) return;
    prevSettingsKey.current = key;

    initSettingsColumns();

    const adminColumns = loadAdminColumns(columns, settingsColumns);
    setColumnsState(adminColumns);

    const activeFilters = adminColumns.filter(
      (col) => !!col.filterComponent && col.filterSettings?.values?.length,
    );

    // Compute the full set of list settings for the initial fetch so
    // there is a single source of truth — no reliance on the
    // [listSettings] watcher for the first load.
    const initSearch = (search as string) || '';
    const initPage = page ? +page.toString()! : 1;
    const initSortField = settings[name]?.sort?.field || defaultSortField;
    const initSortOrder = settings[name]?.sort?.order || defaultSortOrder;
    const initPageSize = settings[name]?.pageSize || defaultPageSize;

    setListSettings((prev) => ({
      ...prev,
      listSearch: initSearch,
      listPage: initPage,
      sortField: initSortField,
      sortOrder: initSortOrder,
      filters: activeFilters,
      pageSize: initPageSize,
    }));

    // Trigger the first fetch directly with the values we just
    // computed so we don't depend on React scheduling the
    // [listSettings] effect at the right time.
    handleGetList(
      initSearch,
      initPage,
      initSortField,
      initSortOrder,
      activeFilters,
      initPageSize,
    );

    initFetchDone.current = true;

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(settingsColumns)]);

  // ---------------------------------------------------------------
  // Subsequent-change watcher.
  //
  // After initialisation, any user-driven change (filter toggle,
  // sort click, page change, search) updates listSettings and this
  // effect re-fetches. The init effect already handled the very
  // first fetch, so we skip until that's done.
  // ---------------------------------------------------------------
  const prevListSettings = useRef(listSettings);

  useEffect(() => {
    // Don't fetch until the init effect has run at least once.
    if (!initFetchDone.current) return;

    // Don't re-fetch if listSettings hasn't actually changed
    // (avoids the double-fire from the init effect setting state).
    if (prevListSettings.current === listSettings) return;
    prevListSettings.current = listSettings;

    if (columnsState.length) {
      handleGetList(
        listSearch,
        listPage,
        sortField,
        sortOrder,
        filters,
        pageSize,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listSettings]);

  useEffect(() => {
    if (tagsAdded?.length) {
      const listCopy = [...list];

      tagsAdded?.forEach((tag) => {
        const foundListItem = listCopy.find(
          (item) => item[idPropertyName] === tag.id,
        );

        if (foundListItem) {
          foundListItem.tags = {
            tags: [
              ...foundListItem.tags.tags,
              ...tag.tags.map((t) => ({
                name: t,
              })),
            ],
          };
        }
      });

      setList(listCopy);
      setTagsAdded?.([]);
    }
  }, [tagsAdded]);

  useEffect(() => {
    if (tagsRemoved?.length) {
      const listCopy = [...list];

      tagsRemoved?.forEach((tag) => {
        const foundListItem = listCopy.find(
          (item) => item[idPropertyName] === tag.id,
        );

        if (foundListItem) {
          foundListItem.tags = {
            tags: tag.tags.map((t) => ({
              name: t,
            })),
          };
        }
      });

      setList(listCopy);
      setTagsRemoved?.([]);
    }
  }, [tagsRemoved]);

  return (
    <article key={name} id={name} css={styles.card}>
      <AdminListHeader
        name={name}
        onSearch={handleSearch}
        columns={columnsState}
        onColumnsChanged={handleColumnsChanged}
        onFiltersChanged={handleFiltersChanged}
        additionalHeaderButtons={additionalHeaderButtons}
        selectedIds={selectedIds!}
        list={list}
        setList={setList}
      />
      <AdminListTable
        name={name}
        idPropertyName={idPropertyName}
        isLoading={isLoading}
        list={listMap(list)}
        listTotal={listTotal}
        listPage={listPage!}
        listAll={listAll}
        columns={columnsState}
        hidePagination={hidePagination}
        activeSortField={sortField}
        activeSortOrder={sortOrder}
        selectedIds={selectedIds}
        protocols={protocols}
        users={users}
        onIdSelected={onIdSelected}
        onIdAllSelected={onIdAllSelected}
        onPageChanged={handlePageChanged}
        onSortChanged={handleSortChanged}
        onFiltersChanged={handleFiltersChanged}
        onColumnsChanged={handleColumnsChanged}
        onPageSizeChanged={handlePageSizeChanged}
      />
    </article>
  );
};
