import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import EmptyState from './EmptyState';
import { renderWithProviders, screen } from '../../test/test-utils';

describe('EmptyState', () => {
  it('uses fallback content when no title or description is provided', () => {
    renderWithProviders(<EmptyState />);

    expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
  });

  it('renders the description and invokes the primary action', () => {
    const onAction = vi.fn();
    renderWithProviders(
      <EmptyState title="No accounts" description="Add an account to get started." actionLabel="Add account" onAction={onAction} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add account' }));

    expect(screen.getByText('Add an account to get started.')).toBeInTheDocument();
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
