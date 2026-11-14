import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../test/test-utils';
import { useNotificationStore } from '../../../store/notificationStore';
import type { LockerEntity } from '../locker.types';
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

  it('requires at least one field before saving', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LockerEntityFormDrawer onClose={vi.fn()} />);

    await user.type(screen.getByPlaceholderText('Bank Details'), 'Bank Details');
    await user.click(screen.getByRole('button', { name: 'Remove field' }));
    await user.click(screen.getByRole('button', { name: 'Save type' }));

    expect(await screen.findByText('Add at least one field.')).toBeInTheDocument();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('rejects duplicate field labels regardless of case or surrounding whitespace', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LockerEntityFormDrawer onClose={vi.fn()} />);

    await user.type(screen.getByPlaceholderText('Bank Details'), 'Bank Details');
    await user.type(screen.getByLabelText('Field label'), 'Access Code');
    await user.click(screen.getByRole('button', { name: 'Add field' }));
    await user.type(screen.getAllByLabelText('Field label')[1], ' access code ');
    await user.click(screen.getByRole('button', { name: 'Save type' }));

    expect(await screen.findByText('Field labels must be unique.')).toBeInTheDocument();
    expect(mocks.create).not.toHaveBeenCalled();
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

  it('rejects duplicate select option values after trimming', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LockerEntityFormDrawer onClose={vi.fn()} />);

    await user.type(screen.getByPlaceholderText('Bank Details'), 'Bank Details');
    await user.type(screen.getByPlaceholderText('Account Number'), 'Account Type');
    await user.click(screen.getAllByRole('combobox')[0]);
    await user.click(screen.getByRole('option', { name: 'Select' }));
    await user.type(screen.getByLabelText('Label'), 'Checking');
    await user.type(screen.getByLabelText('Value'), 'shared');
    await user.click(screen.getByRole('button', { name: 'Add select option' }));
    await user.type(screen.getAllByLabelText('Label')[1], 'Savings');
    await user.type(screen.getAllByLabelText('Value')[1], ' shared ');
    await user.click(screen.getByRole('button', { name: 'Save type' }));

    expect(await screen.findByText('Option values must be unique for Account Type.')).toBeInTheDocument();
    expect(mocks.create).not.toHaveBeenCalled();
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

  it('updates an existing type and keeps password fields masked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const pushNotification = vi.spyOn(useNotificationStore.getState(), 'pushNotification');
    const entity: LockerEntity = {
      uid: 'entity-1',
      userId: 1,
      label: 'Bank Details',
      fields: [{ uid: 'pin', label: 'PIN', type: 'password', masked: false }],
    };
    mocks.update.mockResolvedValue({ uid: 'entity-1' });

    renderWithProviders(<LockerEntityFormDrawer entity={entity} onClose={onClose} />);

    expect(screen.getByRole('checkbox', { name: 'Mask values in records' })).toBeChecked();
    await user.clear(screen.getByPlaceholderText('Bank Details'));
    await user.type(screen.getByPlaceholderText('Bank Details'), '  Secure Access  ');
    await user.click(screen.getByRole('button', { name: 'Save type' }));

    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith({
      uid: 'entity-1',
      data: {
        label: 'Secure Access',
        fields: [{ uid: 'pin', label: 'PIN', type: 'password', masked: true, options: undefined }],
      },
    }));
    expect(pushNotification).toHaveBeenCalledWith({ type: 'success', message: 'Information type updated' });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
