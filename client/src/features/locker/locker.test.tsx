import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../test/test-utils';
import { useNotificationStore } from '../../store/notificationStore';
import Locker from './locker';

const mocks = vi.hoisted(() => ({
  entities: [] as Array<Record<string, unknown>>,
  records: [] as Array<Record<string, unknown>>,
  entitiesError: null as Error | null,
  recordsError: null as Error | null,
  deleteEntity: vi.fn(),
  deleteRecord: vi.fn(),
}));

vi.mock('./useLocker', () => ({
  useLockerEntities: () => ({ data: mocks.entities, error: mocks.entitiesError, isLoading: false }),
  useLockerRecords: () => ({ data: mocks.records, error: mocks.recordsError, isLoading: false }),
  useDeleteLockerEntity: () => ({ mutateAsync: mocks.deleteEntity, isPending: false }),
  useDeleteLockerRecord: () => ({ mutateAsync: mocks.deleteRecord, isPending: false }),
}));

vi.mock('../../hooks/useHeaderAction', () => ({ useHeaderAction: vi.fn() }));

vi.mock('../../components/common', async () => {
  const actual = await vi.importActual<typeof import('../../components/common')>('../../components/common');
  return {
    ...actual,
    DataTable: ({ rows, columns }: { rows: Array<Record<string, unknown>>; columns: Array<{ field: string; renderCell?: (params: { row: Record<string, unknown> }) => React.ReactNode }> }) => (
      <div>
        {rows.map((row) => (
          <div key={String(row.id)}>
            <span>{String(row.label)}</span>
            {columns.find((column) => column.field === 'actions')?.renderCell?.({ row })}
          </div>
        ))}
      </div>
    ),
  };
});

vi.mock('./components/LockerEntityFormDrawer', () => ({ default: ({ onClose }: { onClose: () => void }) => <section aria-label="Entity drawer"><button onClick={onClose}>Close entity drawer</button></section> }));
vi.mock('./components/LockerRecordFormDrawer', () => ({ default: ({ onClose }: { onClose: () => void }) => <section aria-label="Record drawer"><button onClick={onClose}>Close record drawer</button></section> }));
vi.mock('../../components/dialogs/ConfirmDialog', () => ({
  default: ({ open, onCancel, onConfirm }: { open: boolean; onCancel: () => void; onConfirm: () => void }) => open ? (
    <section aria-label="Delete locker item">
      <button onClick={onCancel}>Cancel delete</button>
      <button onClick={() => void onConfirm()}>Confirm delete</button>
    </section>
  ) : null,
}));

const entity = { uid: 'entity-1', userId: 1, label: 'Bank Details', fields: [{ uid: 'account', label: 'Account', type: 'text', masked: false }] };
const record = { uid: 'record-1', entityUid: 'entity-1', label: 'Primary account', values: { account: '123' } };

const reset = () => {
  mocks.entities = [];
  mocks.records = [];
  mocks.entitiesError = null;
  mocks.recordsError = null;
  mocks.deleteEntity.mockReset();
  mocks.deleteRecord.mockReset();
};

describe('Locker page', () => {
  beforeEach(reset);

  it('shows the empty entity state and opens the entity drawer', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Locker />);

    expect(screen.getByText('No entities yet')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Create entity' }));
    expect(screen.getByRole('region', { name: 'Entity drawer' })).toBeInTheDocument();
  });

  it('switches to records and shows the empty record action', async () => {
    const user = userEvent.setup();
    mocks.entities = [entity];
    renderWithProviders(<Locker />);

    await user.click(screen.getByRole('tab', { name: /Records/ }));
    expect(screen.getByText('No records yet')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Create record' }));
    expect(screen.getByRole('region', { name: 'Record drawer' })).toBeInTheDocument();
  });

  it('deletes an entity after confirmation and reports success', async () => {
    const user = userEvent.setup();
    const pushNotification = vi.spyOn(useNotificationStore.getState(), 'pushNotification');
    mocks.entities = [entity];
    mocks.deleteEntity.mockResolvedValue(undefined);
    renderWithProviders(<Locker />);

    await user.click(screen.getByRole('button', { name: 'Delete Bank Details' }));
    await user.click(screen.getByRole('button', { name: 'Confirm delete' }));

    await waitFor(() => expect(mocks.deleteEntity).toHaveBeenCalledWith('entity-1'));
    expect(pushNotification).toHaveBeenCalledWith({ type: 'success', message: 'Entity deleted' });
  });

  it('reports query and delete errors', async () => {
    const user = userEvent.setup();
    const pushNotification = vi.spyOn(useNotificationStore.getState(), 'pushNotification');
    mocks.entities = [entity];
    mocks.entitiesError = new Error('Unavailable');
    renderWithProviders(<Locker />);
    expect(screen.getByText('Unable to load Locker data. Check your connection and try again.')).toBeInTheDocument();

    mocks.entitiesError = null;
    mocks.deleteEntity.mockRejectedValue({ response: { data: { message: 'Entity is in use' } } });
    await user.click(screen.getByRole('button', { name: 'Delete Bank Details' }));
    await user.click(screen.getByRole('button', { name: 'Confirm delete' }));
    await waitFor(() => expect(pushNotification).toHaveBeenCalledWith({ type: 'error', message: 'Entity is in use' }));
  });

  it('renders record rows with their entity label', async () => {
    const user = userEvent.setup();
    mocks.entities = [entity];
    mocks.records = [record];
    renderWithProviders(<Locker />);
    await user.click(screen.getByRole('tab', { name: /Records/ }));
    expect(screen.getByText('Primary account')).toBeInTheDocument();
  });
});
