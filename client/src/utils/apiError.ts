type ErrorMessage = string | string[];

interface ApiErrorData {
  message?: ErrorMessage;
  error?: string;
  statusCode?: number;
}

interface ApiErrorShape {
  response?: {
    data?: ApiErrorData;
  };
  message?: string;
}

export function parseApiErrorMessages(error: unknown, fallback: string): string[] {
  const err = error as ApiErrorShape;
  const data = err.response?.data;

  if (Array.isArray(data?.message)) {
    return data.message.filter((msg): msg is string => typeof msg === 'string' && msg.trim().length > 0);
  }

  if (typeof data?.message === 'string' && data.message.trim().length > 0) {
    return [data.message];
  }

  if (typeof err.message === 'string' && err.message.trim().length > 0) {
    return [err.message];
  }

  return [fallback];
}
