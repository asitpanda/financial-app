type Listener = () => void;

const listeners = new Set<Listener>();

// Decouples the axios client from the auth store to avoid a circular import.
export const authEvents = {
  onUnauthorized(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  emitUnauthorized(): void {
    listeners.forEach((listener) => listener());
  },
};
