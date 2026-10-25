import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../test/test-utils';
import { useNotificationStore } from '../../../store/notificationStore';
import LockerRecordFormDrawer from './LockerRecordFormDrawer';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
}));

vi.mock('../useLocker', () => ({
  useCreateLockerRecord: () => ({ mutateAsync: mocks.create, isPending: false }),
  useUpdateLockerRecord: () => ({ mutateAsync: mocks.update, isPending: false }),
}));

const entity = {
  uid: 'entity-1',
  userId: 1,
  label: 'Bank Details',
  fields: [
    { uid: 'account', label: 'Account Number', type: 'text' as const, masked: false },
    { uid: 'password', label: 'PIN', type: 'password' as const, masked: true },
    {
      uid: 'kind',
      label: 'Kind',
      type: 'select' as const,
      masked: false,
      options: [{ uid: 'savings', label: 'Savings', value: 'savings' }],
    },
  ],
};

describe('LockerRecordFormDrawer', () => {
  beforeEach(() => {
    mocks.create.mockReset();
    mocks.update.mockReset();
  });

  it('requires a record name before saving', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LockerRecordFormDrawer entities={[entity]} onClose={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Save information' }));
    expect(await screen.findByText('Enter a record name.')).toBeInTheDocument();
  });

  it('creates a record with entered and selected values', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const pushNotification = vi.spyOn(useNotificationStore.getState(), 'pushNotification');
    mocks.create.mockResolvedValue({ uid: 'record-1' });
    renderWithProviders(<LockerRecordFormDrawer entities={[entity]} onClose={onClose} />);

    await user.type(screen.getByPlaceholderText('Primary Savings Account'), 'Primary account');
    await user.type(screen.getByLabelText('Account Number'), '12345');
    await user.click(screen.getAllByRole('combobox')[1]);
    await user.click(screen.getByRole('option', { name: 'Savings' }));
    await user.click(screen.getByRole('button', { name: 'Save information' }));

    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith({
      entityUid: 'entity-1',
      label: 'Primary account',
      values: { account: '12345', kind: 'savings' },
    }));
    expect(pushNotification).toHaveBeenCalledWith({ type: 'success', message: 'Stored information created' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('reveals masked values and reports save errors', async () => {
    const user = userEvent.setup();
    mocks.create.mockRejectedValue({ response: { data: { message: ['Vault unavailable'] } } });
    renderWithProviders(<LockerRecordFormDrawer entities={[entity]} onClose={vi.fn()} />);

    const pin = screen.getByLabelText('PIN');
    expect(pin).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: 'Show PIN' }));
    expect(screen.getByLabelText('PIN')).toHaveAttribute('type', 'text');
    await user.type(screen.getByPlaceholderText('Primary Savings Account'), 'Primary account');
    await user.click(screen.getByRole('button', { name: 'Save information' }));

    expect(await screen.findByText('Vault unavailable')).toBeInTheDocument();
  });

  it('updates an existing record without changing its entity', async () => {
    const user = userEvent.setup();
    const record = { uid: 'record-1', entityUid: 'entity-1', label: 'Old name', values: { account: '123' } };
    mocks.update.mockResolvedValue({ uid: 'record-1' });
    renderWithProviders(<LockerRecordFormDrawer record={record} entities={[entity]} onClose={vi.fn()} />);

    const label = screen.getByPlaceholderText('Primary Savings Account');
    await user.clear(label);
    await user.type(label, 'Updated name');
    await user.click(screen.getByRole('button', { name: 'Save information' }));

    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith({
      uid: 'record-1',
      data: { label: 'Updated name', values: { account: '123' } },
    }));
  });
});
