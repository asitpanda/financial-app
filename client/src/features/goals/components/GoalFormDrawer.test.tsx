import { fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GoalFormDrawer from './GoalFormDrawer';
import { useDrawerStore } from '../../../store/drawerStore';
import { renderWithProviders, screen, userEvent, waitFor } from '../../../test/test-utils';

vi.mock('../../categories/useCategories', () => ({
  useCategories: () => ({
    data: [{ id: 4, name: 'Savings', type: 'expense', icon: 'gift' }],
  }),
}));

describe('GoalFormDrawer', () => {
  beforeEach(() => {
    useDrawerStore.setState({ open: true, type: 'goal', mode: 'create', step: 'form' });
  });

  it('renders goal fields and closes from the cancel action', () => {
    const onClose = vi.fn();
    renderWithProviders(<GoalFormDrawer open onClose={onClose} onSubmit={vi.fn()} />);

    expect(screen.getByText('Add Goal')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next: Review' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows validation errors before moving to review', async () => {
    renderWithProviders(<GoalFormDrawer open onClose={vi.fn()} onSubmit={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Next: Review' }));

    expect(await screen.findByText('Goal name is required')).toBeInTheDocument();
    expect(screen.getByText('Goal category is required')).toBeInTheDocument();
    expect(screen.getByText('Target amount must be greater than 0')).toBeInTheDocument();
  });

  it('reviews valid details and returns to the form when going back', async () => {
    const user = userEvent.setup();
    renderWithProviders(<GoalFormDrawer open onClose={vi.fn()} onSubmit={vi.fn()} />);

    await user.type(screen.getByPlaceholderText('Enter goal name'), 'Emergency fund');
    await user.click(screen.getByPlaceholderText('Select goal category'));
    await user.click(screen.getByRole('option', { name: 'Savings' }));
    await user.type(screen.getByPlaceholderText('Enter target amount'), '25000');
    await user.click(screen.getByRole('button', { name: 'Next: Review' }));

    expect(await screen.findByText('Review Goal Details')).toBeInTheDocument();
    expect(screen.getByText('Emergency fund')).toBeInTheDocument();
    expect(screen.getByText('Savings')).toBeInTheDocument();
    expect(screen.getByText('₹25,000')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByPlaceholderText('Enter goal name')).toHaveValue('Emergency fund');
    expect(screen.getByRole('button', { name: 'Next: Review' })).toBeInTheDocument();
  });

  it('submits trimmed values with the selected category metadata', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<GoalFormDrawer open onClose={vi.fn()} onSubmit={onSubmit} />);

    await user.type(screen.getByPlaceholderText('Enter goal name'), '  Emergency fund  ');
    await user.click(screen.getByPlaceholderText('Select goal category'));
    await user.click(screen.getByRole('option', { name: 'Savings' }));
    await user.type(screen.getByPlaceholderText('Enter target amount'), '25000');
    await user.type(screen.getByPlaceholderText('Add a short note for this goal'), '  Build a buffer  ');
    await user.click(screen.getByRole('button', { name: 'Next: Review' }));
    await user.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Emergency fund',
      category: 'Savings',
      categoryId: 4,
      description: 'Build a buffer',
      icon: 'gift',
      targetAmount: 25000,
      currentAmount: 0,
      deadline: undefined,
    });
  });

  it('shows an error returned by submit without losing the review state', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue('Unable to save goal');
    renderWithProviders(<GoalFormDrawer open onClose={vi.fn()} onSubmit={onSubmit} />);

    await user.type(screen.getByPlaceholderText('Enter goal name'), 'Emergency fund');
    await user.click(screen.getByPlaceholderText('Select goal category'));
    await user.click(screen.getByRole('option', { name: 'Savings' }));
    await user.type(screen.getByPlaceholderText('Enter target amount'), '25000');
    await user.click(screen.getByRole('button', { name: 'Next: Review' }));
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(await screen.findByText('Unable to save goal')).toBeInTheDocument();
    expect(screen.getByText('Review Goal Details')).toBeInTheDocument();
  });
});
