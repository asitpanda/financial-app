type RuntimeErrorLike = {
  message?: unknown;
  response?: {
    data?: {
      message?: unknown;
    };
  };
};

const isRuntimeErrorLike = (error: unknown): error is RuntimeErrorLike =>
  typeof error === "object" && error !== null;

export function getRuntimeErrorMessage(error: unknown, fallbackMessage: string): string {
  const runtimeMessage = isRuntimeErrorLike(error)
    ? error.response?.data?.message ?? error.message
    : undefined;

  if (typeof runtimeMessage === "string" && runtimeMessage.trim()) {
    return runtimeMessage;
  }

  if (Array.isArray(runtimeMessage) && runtimeMessage.length > 0) {
    return String(runtimeMessage[0]);
  }

  return fallbackMessage;
}
