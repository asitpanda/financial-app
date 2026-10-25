import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ConfirmDialog from './ConfirmDialog';
import { renderWithProviders, screen } from '../../test/test-utils';

describe('ConfirmDialog', () => {
  it('renders the dialog content and invokes cancel and confirm actions', () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    renderWithProviders(
      <ConfirmDialog
        open
        title="Delete account"
        description="This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Keep account"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Delete account' })).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Keep account' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));

    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('uses default action labels', () => {
    renderWithProviders(
      <ConfirmDialog
        open
        title="Confirm change"
        description="Continue with this change?"
        onCancel={() => undefined}
        onConfirm={() => undefined}
      />,
    );

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
  });

  it('disables actions and close behavior while loading', () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    renderWithProviders(
      <ConfirmDialog
        open
        title="Deleting account"
        description="Please wait."
        loading
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Close dialog' })).toBeDisabled();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onCancel).not.toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('does not render when closed', () => {
    renderWithProviders(
      <ConfirmDialog
        open={false}
        title="Hidden confirmation"
        description="Hidden description"
        onCancel={() => undefined}
        onConfirm={() => undefined}
      />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
