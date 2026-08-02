export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_REFERENCE'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'BAD_REQUEST'
  | 'INTERNAL_ERROR';

export interface ApiErrorResponse {
  requestId: string;
  timestamp: string;
  path: string;
  method: string;
  statusCode: number;
  code: ApiErrorCode;
  message: string;
  field?: string;
  details?: unknown;
}
