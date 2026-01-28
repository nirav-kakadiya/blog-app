export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  pagination?: PaginationInfo;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  pagination?: PaginationInfo;
};

export type ApiErrorResponse = {
  success: false;
  error: ApiError;
};
