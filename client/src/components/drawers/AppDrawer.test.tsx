import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AppDrawer from './AppDrawer';
import { renderWithProviders, screen } from '../../test/test-utils';

describe('AppDrawer', () => {
  it('renders the title, subtitle, content, title extra, and footer when open', () => {
    renderWithProviders(
      <AppDrawer
        open
        title="Edit account"
        subtitle="Update account details"
        titleExtra={<span>Active</span>}
        footer={<button type="button">Save</button>}
        onClose={() => undefined}
      >
        <p>Account form</p>
      </AppDrawer>,
    );

    expect(screen.getByText('Edit account')).toBeInTheDocument();
    expect(screen.getByText('Update account details')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Account form')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('calls onClose from the close button and backdrop interaction', () => {
    const onClose = vi.fn();
    renderWithProviders(
      <AppDrawer open title="Edit account" onClose={onClose}>
        <p>Account form</p>
      </AppDrawer>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close drawer' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('does not render drawer content while closed', () => {
    renderWithProviders(
      <AppDrawer open={false} title="Edit account" onClose={() => undefined}>
        <p>Account form</p>
      </AppDrawer>,
    );

    expect(screen.queryByText('Account form')).not.toBeInTheDocument();
  });
});
