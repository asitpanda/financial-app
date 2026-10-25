import { describe, expect, it } from 'vitest';
import AuthTabPanel from './AuthTabPanel';
import { renderWithProviders, screen } from '../../../test/test-utils';

describe('AuthTabPanel', () => {
  it('renders its children when the panel index is active', () => {
    renderWithProviders(
      <AuthTabPanel value={1} index={1}>
        <p>Register form</p>
      </AuthTabPanel>,
    );

    expect(screen.getByRole('tabpanel')).toBeVisible();
    expect(screen.getByText('Register form')).toBeInTheDocument();
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'auth-tabpanel-1');
  });

  it('hides children when the panel index is inactive', () => {
    renderWithProviders(
      <AuthTabPanel value={0} index={1}>
        <p>Register form</p>
      </AuthTabPanel>,
    );

    expect(screen.getByRole('tabpanel', { hidden: true })).toHaveAttribute('hidden');
    expect(screen.queryByText('Register form')).not.toBeInTheDocument();
  });
});
