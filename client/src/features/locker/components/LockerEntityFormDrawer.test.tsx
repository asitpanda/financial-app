import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../test/test-utils';
import { useNotificationStore } from '../../../store/notificationStore';
import LockerEntityFormDrawer from './LockerEntityFormDrawer';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
}));

vi.mock('../useLocker', () => ({
  useCreateLockerEntity: () => ({ mutateAsync: mocks.create, isPending: false }),
  useUpdateLockerEntity: () => ({ mutateAsync: mocks.update, isPending: false }),
}));

describe('LockerEntityFormDrawer', () => {
  beforeEach(() => {
    mocks.create.mockReset();
    mocks.update.mockReset();
  });

  it('validates the type name and field labels before saving', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LockerEntityFormDrawer onClose={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Save type' }));
    expect(await screen.findByText('Enter an information type name.')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Bank Details'), 'Bank Details');
    await user.click(screen.getByRole('button', { name: 'Save type' }));
    expect(await screen.findByText('Every field needs a label.')).toBeInTheDocument();
  });

  it('creates a trimmed entity and closes after success', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const pushNotification = vi.spyOn(useNotificationStore.getState(), 'pushNotification');
    mocks.create.mockResolvedValue({ uid: 'entity-1' });
    renderWithProviders(<LockerEntityFormDrawer onClose={onClose} />);

    await user.type(screen.getByPlaceholderText('Bank Details'), '  Bank Details  ');
    await user.type(screen.getByPlaceholderText('Account Number'), '  Account Number  ');
    await user.click(screen.getByRole('button', { name: 'Save type' }));

    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith({
      label: 'Bank Details',
      fields: [{ label: 'Account Number', type: 'text', masked: false, options: undefined }],
    }));
    expect(pushNotification).toHaveBeenCalledWith({ type: 'success', message: 'Information type created' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('requires complete unique options for select fields', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LockerEntityFormDrawer onClose={vi.fn()} />);

    await user.type(screen.getByPlaceholderText('Bank Details'), 'Bank Details');
    await user.type(screen.getByPlaceholderText('Account Number'), 'Account Type');
    await user.click(screen.getAllByRole('combobox')[0]);
    await user.click(screen.getByRole('option', { name: 'Select' }));
    await user.click(screen.getByRole('button', { name: 'Save type' }));

    expect(await screen.findByText('Complete every option for Account Type.')).toBeInTheDocument();
  });

  it('shows API errors and preserves the drawer', async () => {
    const user = userEvent.setup();
    mocks.create.mockRejectedValue({ response: { data: { message: 'Type already exists' } } });
    renderWithProviders(<LockerEntityFormDrawer onClose={vi.fn()} />);

    await user.type(screen.getByPlaceholderText('Bank Details'), 'Bank Details');
    await user.type(screen.getByPlaceholderText('Account Number'), 'Account Number');
    await user.click(screen.getByRole('button', { name: 'Save type' }));

    expect(await screen.findByText('Type already exists')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save type' })).toBeInTheDocument();
  });
});
