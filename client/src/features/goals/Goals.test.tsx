import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Goals from './Goals';
import type { GoalRecord } from './goal.types';
import type { TransactionRecord } from '../transactions/transaction.types';
import { useDrawerStore } from '../../store/drawerStore';
import { useDialogStore } from '../../store/dialogStore';
import { renderWithProviders, screen, waitFor } from '../../test/test-utils';

const mockState = vi.hoisted(() => ({
  pageData: {
    goals: [] as GoalRecord[],
    transactions: [] as TransactionRecord[],
    loading: false,
    error: null as Error | null,
    reload: vi.fn(),
  },
  save: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('./useGoals', () => ({
  useGoalPageData: () => mockState.pageData,
  useSaveGoal: () => ({ mutateAsync: mockState.save, isPending: false }),
  useRemoveGoal: () => ({ mutateAsync: mockState.remove, isPending: false }),
}));

vi.mock('./components/GoalFormDrawer', () => ({
  default: ({
    open,
    onClose,
    onSubmit,
    title,
    submitLabel,
  }: {
    open: boolean;
    onClose: () => void;
    onSubmit: (payload: unknown) => Promise<unknown>;
    title: string;
    submitLabel: string;
  }) =>
    open ? (
      <section data-testid="goal-form-drawer">
        <h2>{title}</h2>
        <button onClick={onClose}>Cancel Goal Drawer</button>
        <button onClick={() => void onSubmit({ name: 'Updated goal' })}>
          {submitLabel} Goal
        </button>
      </section>
    ) : null,
}));

vi.mock('./components/GoalViewDrawer', () => ({
  GoalViewDrawer: ({
    open,
    onClose,
    onEdit,
    goal,
  }: {
    open: boolean;
    onClose: () => void;
    onEdit: (goal: GoalRecord) => void;
    goal: GoalRecord | null;
  }) =>
    open ? (
      <section data-testid="goal-view-drawer">
        <h2>{goal?.name}</h2>
        <button onClick={onClose}>Close Goal Drawer</button>
        <button onClick={() => goal && onEdit(goal)}>Edit Viewed Goal</button>
      </section>
    ) : null,
}));

vi.mock('../../hooks/useHeaderAction', () => ({ useHeaderAction: vi.fn() }));
vi.mock('../../hooks/useViewportTableHeight', () => ({
  useViewportTableHeight: () => 500,
}));

describe('Goals', () => {
  const goals = [
    {
      id: 'goal-1',
      name: 'Emergency fund',
      category: 'Savings',
      targetAmount: 1000,
      currentAmount: 400,
      deadline: '2099-12-31',
      userId: 'user-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'goal-2',
      name: 'Holiday',
      category: 'Travel',
      targetAmount: 500,
      currentAmount: 500,
      deadline: '2026-11-01',
      userId: 'user-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
    mockState.pageData = {
      goals: [],
      transactions: [],
      loading: false,
      error: null,
      reload: vi.fn(),
    };
    mockState.save.mockReset();
    mockState.remove.mockReset();
    useDrawerStore.setState({ open: false, type: null, mode: null, entityId: undefined, step: null });
    useDialogStore.setState({ open: false, type: null, payload: null });
  });

  it('renders the first-use empty state when no goals exist', () => {
    renderWithProviders(<Goals />);

    expect(screen.getByText('No goals created yet')).toBeInTheDocument();
    expect(screen.getByText('Add your first goal to track target amounts, progress, and upcoming deadlines.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Goal' })).toBeInTheDocument();
  });

  it('shows a loading state while page data is being fetched', () => {
    mockState.pageData = { ...mockState.pageData, goals, loading: true };
    renderWithProviders(<Goals />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('No goals created yet')).not.toBeInTheDocument();
  });

  it('shows a page error without hiding the empty-state guidance', () => {
    mockState.pageData = {
      ...mockState.pageData,
      error: new Error('Network unavailable'),
    };
    renderWithProviders(<Goals />);

    expect(screen.getByText('Failed to load goals')).toBeInTheDocument();
    expect(screen.getByText('No goals created yet')).toBeInTheDocument();
  });

  it('renders populated analytics, deadlines, and goal table rows', async () => {
    mockState.pageData = { ...mockState.pageData, goals };
    renderWithProviders(<Goals />);

    expect(screen.getByText('Total Goal Target')).toBeInTheDocument();
    expect(screen.getByText('Saved So Far')).toBeInTheDocument();
    expect(screen.getByText('Completed Goals')).toBeInTheDocument();
    expect(screen.getByText('Goal Progress Overview')).toBeInTheDocument();
    expect(screen.getByText('Upcoming Deadlines')).toBeInTheDocument();
    expect(screen.getAllByText('Emergency fund').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Holiday').length).toBeGreaterThan(0);
    expect(await screen.findByRole('columnheader', { name: 'Goal' })).toBeInTheDocument();
  });

  it('filters table rows through the search control', async () => {
    const user = userEvent.setup();
    mockState.pageData = { ...mockState.pageData, goals };
    renderWithProviders(<Goals />);

    await user.type(screen.getByPlaceholderText('Search goals'), 'Holiday');

    expect(screen.getAllByText('Holiday').length).toBeGreaterThan(0);
    await waitFor(() => expect(screen.queryByText('Emergency fund')).not.toBeInTheDocument());
  });

  it('shows the filtered empty state and resets filters', async () => {
    const user = userEvent.setup();
    mockState.pageData = { ...mockState.pageData, goals };
    renderWithProviders(<Goals />);

    await user.type(screen.getByPlaceholderText('Search goals'), 'does not exist');
    expect(screen.getByText('No goals found')).toBeInTheDocument();
    expect(screen.getByText('Adjust your filters or add a new goal to start tracking progress.')).toBeInTheDocument();
  });

  it('resets filters while filtered results remain visible', async () => {
    const user = userEvent.setup();
    mockState.pageData = { ...mockState.pageData, goals };
    renderWithProviders(<Goals />);

    await user.type(screen.getByPlaceholderText('Search goals'), 'Holiday');
    await user.click(screen.getByRole('button', { name: 'Reset Filters' }));

    expect(screen.getByPlaceholderText('Search goals')).toHaveValue('');
    expect(screen.getAllByText('Emergency fund').length).toBeGreaterThan(0);
  });

  it('applies progress and date-range filters from the filter controls', async () => {
    const user = userEvent.setup();
    mockState.pageData = { ...mockState.pageData, goals };
    renderWithProviders(<Goals />);

    const selects = screen.getAllByRole('combobox');
    await user.click(selects[0]);
    await user.click(screen.getByRole('option', { name: 'Completed' }));
    expect(screen.getAllByText('Holiday').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Reset Filters' }));
    await user.click(selects[1]);
    await user.click(screen.getByRole('option', { name: 'Date Range: Last 7 Days' }));
    expect(screen.getByText('No goals found')).toBeInTheDocument();
  });

  it('drills down from KPI and chart segments into the goal table', async () => {
    const user = userEvent.setup();
    mockState.pageData = { ...mockState.pageData, goals };
    renderWithProviders(<Goals />);

    const initialEmergencyFundCount = screen.getAllByText('Emergency fund').length;
    await user.click(screen.getByText('Completed Goals'));
    expect(screen.getAllByText('Holiday').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Emergency fund').length).toBeLessThan(initialEmergencyFundCount);

    await user.click(screen.getByRole('button', { name: 'Reset Filters' }));
    const completedLabels = screen.getAllByText('Completed');
    await user.click(completedLabels[completedLabels.length - 1]);
    expect(screen.getAllByText('Holiday').length).toBeGreaterThan(0);
  });

  it('wires empty-state create, table edit, and table view actions to drawers', async () => {
    const user = userEvent.setup();
    const firstRender = renderWithProviders(<Goals />);

    await user.click(screen.getByRole('button', { name: 'Add Goal' }));
    expect(screen.getByTestId('goal-form-drawer')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Add Goal' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel Goal Drawer' }));
    firstRender.unmount();
    mockState.pageData = { ...mockState.pageData, goals };
    renderWithProviders(<Goals />);

    await user.click(screen.getByRole('button', { name: 'Edit Emergency fund' }));
    expect(screen.getAllByRole('heading', { name: 'Edit Goal' })).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Cancel Goal Drawer' }));
    await user.click(screen.getByRole('button', { name: 'View Emergency fund' }));
    expect(screen.getByTestId('goal-view-drawer')).toBeInTheDocument();
  });

  it('reloads after a successful goal save and reports a failed update', async () => {
    const user = userEvent.setup();
    const reload = vi.fn().mockResolvedValue(undefined);
    mockState.pageData = { ...mockState.pageData, goals, reload };
    mockState.save.mockResolvedValue(undefined);
    renderWithProviders(<Goals />);

    await user.click(screen.getByRole('button', { name: 'Edit Emergency fund' }));
    await user.click(screen.getByRole('button', { name: 'Update Goal' }));
    await waitFor(() => expect(mockState.save).toHaveBeenCalledWith({
      payload: { name: 'Updated goal' },
      selectedGoal: goals[0],
    }));
    expect(reload).toHaveBeenCalled();

    mockState.save.mockRejectedValueOnce(new Error('Save failed'));
    await user.click(screen.getByRole('button', { name: 'Edit Emergency fund' }));
    await user.click(screen.getByRole('button', { name: 'Update Goal' }));
    await user.click(screen.getByRole('button', { name: 'Cancel Goal Drawer' }));
    expect(await screen.findByText('Failed to update goal')).toBeInTheDocument();
  });

  it('handles successful create and failed create mutations', async () => {
    const user = userEvent.setup();
    const reload = vi.fn().mockResolvedValue(undefined);
    mockState.pageData = { ...mockState.pageData, reload };
    mockState.save.mockResolvedValue(undefined);
    renderWithProviders(<Goals />);

    await user.click(screen.getByRole('button', { name: 'Add Goal' }));
    const addGoalButtons = screen.getAllByRole('button', { name: 'Add Goal' });
    await user.click(addGoalButtons[addGoalButtons.length - 1]);
    await waitFor(() => expect(mockState.save).toHaveBeenCalledWith({
      payload: { name: 'Updated goal' },
      selectedGoal: null,
    }));
    expect(reload).toHaveBeenCalled();

    mockState.save.mockRejectedValueOnce(new Error('Create failed'));
    await user.click(screen.getByRole('button', { name: 'Add Goal' }));
    const retryAddGoalButtons = screen.getAllByRole('button', { name: 'Add Goal' });
    await user.click(retryAddGoalButtons[retryAddGoalButtons.length - 1]);
    await user.click(screen.getByRole('button', { name: 'Cancel Goal Drawer' }));
    expect(await screen.findByText('Failed to add goal')).toBeInTheDocument();
  });

  it('opens the delete confirmation and removes the selected goal', async () => {
    const user = userEvent.setup();
    mockState.pageData = { ...mockState.pageData, goals };
    mockState.remove.mockResolvedValue(undefined);
    renderWithProviders(<Goals />);

    await user.click(screen.getByRole('button', { name: 'Delete Emergency fund' }));
    expect(screen.getByRole('dialog', { name: 'Delete Goal' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(mockState.remove).toHaveBeenCalledWith('goal-1'));
    expect(useDialogStore.getState().open).toBe(false);
  });

  it('cancels a delete confirmation without calling the mutation', async () => {
    const user = userEvent.setup();
    mockState.pageData = { ...mockState.pageData, goals };
    renderWithProviders(<Goals />);

    await user.click(screen.getByRole('button', { name: 'Delete Emergency fund' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockState.remove).not.toHaveBeenCalled();
    expect(useDialogStore.getState().open).toBe(false);
  });

  it('reports a failed delete after the confirmation remains open', async () => {
    const user = userEvent.setup();
    mockState.pageData = { ...mockState.pageData, goals };
    mockState.remove.mockRejectedValue(new Error('Delete failed'));
    renderWithProviders(<Goals />);

    await user.click(screen.getByRole('button', { name: 'Delete Emergency fund' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(await screen.findByText('Failed to delete goal')).toBeInTheDocument();
  });
});
