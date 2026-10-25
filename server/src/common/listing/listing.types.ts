export interface ListQuery {
  page: number;
  limit: number;
}

export interface ListResult<T> {
  items: T[];
  total: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
}

export interface Page<T> {
  data: T[];
  pagination: PaginationMeta;
}