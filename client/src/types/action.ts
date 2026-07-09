export type ActionContract<TPayload = unknown> = {
  intent: string;
  payload?: TPayload;
  precheck?: () => boolean | Promise<boolean>;
  execute: () => Promise<void>;
  feedback?: {
    success?: string;
    error?: string;
    loading?: string;
  };
  rollback?: () => void | Promise<void>;
};
