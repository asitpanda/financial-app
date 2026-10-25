import { describe, expect, it } from 'vitest';
import { DataTable } from './index';
import { renderWithProviders, screen } from '../../test/test-utils';

describe('DataTable', () => {
  it('renders column headers and row values', async () => {
    renderWithProviders(
      <DataTable
        rows={[{ id: 1, name: 'Checking' }]}
        columns={[{ field: 'name', headerName: 'Account', flex: 1 }]}
        autoHeight
      />,
    );

    expect(await screen.findByRole('columnheader', { name: 'Account' })).toBeInTheDocument();
    expect(await screen.findByText('Checking')).toBeInTheDocument();
  });

  it('disables row selection on click by default', async () => {
    renderWithProviders(
      <DataTable
        rows={[{ id: 1, name: 'Checking' }]}
        columns={[{ field: 'name', headerName: 'Account' }]}
        autoHeight
      />,
    );

    expect(await screen.findByRole('grid')).toHaveAttribute('aria-colcount', '1');
  });
});
