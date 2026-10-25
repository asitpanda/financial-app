import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/test-utils';
import { useAuth } from '../useAuth';
import PrivateRoute from './PrivateRoute';

const user = { id: 'user-1', email: 'user@example.com', name: 'Test User' };

describe('PrivateRoute', () => {
  beforeEach(() => {
    useAuth.setState({ user: null, token: null, isAuthenticated: false, loading: false });
  });

  it('renders the login screen for an unauthenticated user', () => {
    renderWithProviders(
      <PrivateRoute>
        <div>Protected dashboard</div>
      </PrivateRoute>,
    );

    expect(screen.getByRole('heading', { name: 'My Financial' })).toBeInTheDocument();
    expect(screen.queryByText('Protected dashboard')).not.toBeInTheDocument();
  });

  it('renders protected content for an authenticated user', () => {
    useAuth.setState({ user, token: 'token-123', isAuthenticated: true });

    renderWithProviders(
      <PrivateRoute>
        <div>Protected dashboard</div>
      </PrivateRoute>,
    );

    expect(screen.getByText('Protected dashboard')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'My Financial' })).not.toBeInTheDocument();
  });
});