import { fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import NotificationCenter from './NotificationCenter';
import { useNotificationStore } from '../../store/notificationStore';
import { renderWithProviders, screen } from '../../test/test-utils';

describe('NotificationCenter', () => {
  beforeEach(() => useNotificationStore.setState({ notifications: [] }));

  it('renders notifications from the store', () => {
    useNotificationStore.getState().pushNotification({ type: 'success', message: 'Account saved' });

    renderWithProviders(<NotificationCenter />);

    expect(screen.getByText('Account saved')).toBeInTheDocument();
  });

  it('removes a notification when its close button is clicked', () => {
    useNotificationStore.getState().pushNotification({ type: 'error', message: 'Save failed' });
    renderWithProviders(<NotificationCenter />);

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByText('Save failed')).not.toBeInTheDocument();
    expect(useNotificationStore.getState().notifications).toHaveLength(0);
  });
});
