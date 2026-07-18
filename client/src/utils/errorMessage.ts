export function getRuntimeErrorMessage(error: unknown, fallbackMessage: string): string {
  const runtimeMessage =
    (error as any)?.response?.data?.message ??
    (error as any)?.message;

  if (typeof runtimeMessage === "string" && runtimeMessage.trim()) {
    return runtimeMessage;
  }

  if (Array.isArray(runtimeMessage) && runtimeMessage.length > 0) {
    return String(runtimeMessage[0]);
  }

  return fallbackMessage;
}
