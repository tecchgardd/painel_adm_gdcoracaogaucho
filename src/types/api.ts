export type ApiResponse<T> = {
  data: T;
  message?: string;
  success?: boolean;
};

export type PaginatedResponse<T> = {
  data: T[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};

export type ApiError = {
  status?: number;
  message: string;
  code?: string;
};

export type RequestState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};
