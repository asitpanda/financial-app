import type { ActionContract } from '../types/action';

interface ExecuteActionContractOptions {
  notify?: (notification: {
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    autoHideMs?: number;
  }) => string;
}

export async function executeActionContract<TPayload>(
  contract: ActionContract<TPayload>,
  options: ExecuteActionContractOptions = {}
): Promise<boolean> {
  const { notify } = options;

  if (contract.feedback?.loading && notify) {
    notify({ type: 'info', message: contract.feedback.loading, autoHideMs: 1200 });
  }

  try {
    const canRun = contract.precheck ? await contract.precheck() : true;
    if (!canRun) {
      if (contract.feedback?.error && notify) {
        notify({ type: 'error', message: contract.feedback.error });
      }
      return false;
    }

    await contract.execute();

    if (contract.feedback?.success && notify) {
      notify({ type: 'success', message: contract.feedback.success });
    }

    return true;
  } catch (error) {
    if (contract.rollback) {
      await contract.rollback();
    }

    const runtimeMessage =
      (error as any)?.response?.data?.message ||
      (error as any)?.message;

    if (notify) {
      if (typeof runtimeMessage === 'string' && runtimeMessage.trim()) {
        notify({ type: 'error', message: runtimeMessage });
      } else if (Array.isArray(runtimeMessage) && runtimeMessage.length > 0) {
        notify({ type: 'error', message: String(runtimeMessage[0]) });
      } else if (contract.feedback?.error) {
        notify({ type: 'error', message: contract.feedback.error });
      }
    }

    return false;
  }
}

export async function executeDrawerActionContract<TPayload>(
  contract: ActionContract<TPayload>,
  options: ExecuteActionContractOptions = {}
): Promise<string | null> {
  let errorMessage = '';

  const ok = await executeActionContract(contract, {
    notify: (notification) => {
      if (notification.type === 'error') {
        errorMessage = notification.message;
        return 'drawer-error';
      }

      if (notification.type === 'info') {
        return 'drawer-info';
      }

      if (!options.notify) return 'drawer-notify';
      return options.notify(notification);
    },
  });

  if (ok) return null;
  if (errorMessage.trim()) return errorMessage;
  return contract.feedback?.error || 'Action failed';
}
