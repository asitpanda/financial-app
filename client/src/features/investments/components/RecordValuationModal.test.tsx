import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, userEvent } from '../../../test/test-utils';
import { useNotificationStore } from '../../../store/notificationStore';
import RecordValuationModal from './RecordValuationModal';
import { useSaveInvestmentSnapshot } from '../hooks/useInvestmentSnapshots';

vi.mock('../hooks/useInvestmentSnapshots', () => ({
  useSaveInvestmentSnapshot: vi.fn(),
}));

const mockedSave = vi.mocked(useSaveInvestmentSnapshot);

const renderModal = (overrides = {}) =>
  renderWithProviders(
    <RecordValuationModal
      open
      onClose={vi.fn()}
      investmentId="investment-1"
      investmentName="Index Fund"
      snapshot={undefined}
      onSnapshotAdded={vi.fn()}
      onSnapshotSaved={vi.fn()}
      totalInvested={1000}
      currentValue={1200}
      {...overrides}
    />,
  );

beforeEach(() => {
  mockedSave.mockReturnValue({
    isPending: false,
    mutateAsync: vi.fn().mockResolvedValue({ id: 'snapshot-1' }),
  } as never);
});

describe('RecordValuationModal', () => {
  it('renders create mode and rejects an empty market value', async () => {
    const user = userEvent.setup();
    const pushNotification = vi.spyOn(useNotificationStore.getState(), 'pushNotification');
    renderModal();

    expect(screen.getByRole('heading', { name: 'Record Valuation' })).toBeInTheDocument();
    expect(screen.getByText('Index Fund')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Record Valuation' }));
    expect(pushNotification).toHaveBeenCalledWith({
      message: 'Market value must be greater than 0',
      type: 'error',
    });
  });

  it('submits numeric values, optional unit details, and closes after success', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSnapshotAdded = vi.fn();
    const mutateAsync = vi.fn().mockResolvedValue({ id: 'snapshot-1' });
    mockedSave.mockReturnValue({ isPending: false, mutateAsync } as never);
    renderModal({ onClose, onSnapshotAdded });

    await user.type(screen.getByPlaceholderText('e.g., 458000'), '1500');
    await user.click(screen.getByRole('button', { name: 'Add unit and price details (optional)' }));
    await user.type(screen.getByPlaceholderText('e.g., 100'), '3');
    await user.type(screen.getByPlaceholderText('e.g., 4580'), '500');
    await user.click(screen.getByRole('button', { name: 'Record Valuation' }));

    expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({
      snapshotId: undefined,
      payload: expect.objectContaining({ investmentId: 'investment-1', marketValue: 1500, units: 3, price: 500, source: 'manual' }),
    }));
    expect(onSnapshotAdded).toHaveBeenCalledWith({ id: 'snapshot-1' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('preserves edit mode and reports API failures', async () => {
    const user = userEvent.setup();
    const pushNotification = vi.spyOn(useNotificationStore.getState(), 'pushNotification');
    const failure = new Error('Save failed');
    mockedSave.mockReturnValue({ isPending: false, mutateAsync: vi.fn().mockRejectedValue(failure) } as never);
    renderModal({ snapshot: { id: 'snapshot-1', snapshotDate: '2026-01-01', marketValue: 100 } });

    expect(screen.getByText('Edit Valuation')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(pushNotification).toHaveBeenCalledWith({ message: 'Save failed', type: 'error' });
  });
});