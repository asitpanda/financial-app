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
  } catch {
    if (contract.rollback) {
      await contract.rollback();
    }

    if (contract.feedback?.error && notify) {
      notify({ type: 'error', message: contract.feedback.error });
    }

    return false;
  }
}
