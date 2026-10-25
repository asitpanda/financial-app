import { beforeEach, describe, expect, it } from 'vitest';
import { useDialogStore } from './dialogStore';

describe('useDialogStore', () => {
  beforeEach(() => useDialogStore.setState({ open: false, type: null, payload: undefined }));

  it('opens a dialog with an optional payload', () => {
    const payload = { accountId: 'account-1' };
    useDialogStore.getState().openDialog('confirmDelete', payload);

    expect(useDialogStore.getState()).toMatchObject({ open: true, type: 'confirmDelete', payload });
  });

  it('opens a dialog without a payload', () => {
    useDialogStore.getState().openDialog('importCsv');

    expect(useDialogStore.getState()).toMatchObject({ open: true, type: 'importCsv', payload: undefined });
  });

  it('closes the dialog and clears its payload', () => {
    useDialogStore.getState().openDialog('markPaid', { transactionId: 'transaction-1' });
    useDialogStore.getState().closeDialog();

    expect(useDialogStore.getState()).toMatchObject({ open: false, type: null, payload: undefined });
  });
});