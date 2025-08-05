import { SortOrder } from '../../../generated/blockjoy/common/v1/search';

type AdminQuery = {
  name: string;
  page?: number;
  pageSize?: number;
  search?: string;
  sortField?: number;
  sortOrder?: SortOrder;
  /** Dynamic filter parameters in format filter_columnName */
  [key: string]: string | number | SortOrder | undefined;
};
