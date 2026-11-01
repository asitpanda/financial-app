import { fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen, waitFor } from '../../../test/test-utils';
import IdleTimeoutDialog from './IdleTimeoutDialog';

describe('IdleTimeoutDialog', () => {
  it('shows the remaining time, focuses continuation, and requires an explicit action', async () => {
    const interaction = userEvent.setup();
    const onStayActive = vi.fn();
    const onLogout = vi.fn();
    renderWithProviders(<IdleTimeoutDialog open secondsLeft={60} onStayActive={onStayActive} onLogout={onLogout} />);

    const dialog = screen.getByRole('alertdialog', { name: 'Are you still there?' });
    expect(screen.getByText('Signing out in 60 seconds', { selector: '[aria-hidden="true"]' })).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('Signing out in 60 seconds');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Stay signed in' })).toHaveFocus());
    await interaction.keyboard('{Escape}');
    if (!dialog.parentElement) throw new Error('Expected dialog backdrop container');
    fireEvent.mouseDown(dialog.parentElement);
    fireEvent.click(dialog.parentElement);
    expect(dialog).toBeVisible();
    expect(onStayActive).not.toHaveBeenCalled();
    expect(onLogout).not.toHaveBeenCalled();

    await interaction.click(screen.getByRole('button', { name: 'Stay signed in' }));
    expect(onStayActive).toHaveBeenCalledOnce();
    await interaction.click(screen.getByRole('button', { name: 'Sign out now' }));
    expect(onLogout).toHaveBeenCalledOnce();
  });

  it('updates the tab title during the warning and restores it on unmount', () => {
    const originalTitle = document.title;
    const { rerender, unmount } = renderWithProviders(
      <IdleTimeoutDialog open secondsLeft={60} onStayActive={vi.fn()} onLogout={vi.fn()} />,
    );
    expect(document.title).toBe('Signing out in 60s - My Financial');
    rerender(<IdleTimeoutDialog open secondsLeft={59} onStayActive={vi.fn()} onLogout={vi.fn()} />);
    expect(document.title).toBe('Signing out in 59s - My Financial');
    unmount();
    expect(document.title).toBe(originalTitle);
  });
});