import { beforeEach, describe, expect, it } from 'vitest';
import { useNotificationStore } from './notificationStore';

describe('useNotificationStore', () => {
  beforeEach(() => useNotificationStore.setState({ notifications: [] }));

  it('adds a notification with a generated id and returns that id', () => {
    const id = useNotificationStore.getState().pushNotification({ type: 'success', message: 'Account saved', autoHideMs: 1200 });

    expect(id).toEqual(expect.any(String));
    expect(useNotificationStore.getState().notifications).toEqual([
      { id, type: 'success', message: 'Account saved', autoHideMs: 1200 },
    ]);
  });

  it('preserves insertion order for multiple notifications', () => {
    const firstId = useNotificationStore.getState().pushNotification({ type: 'info', message: 'Loading' });
    const secondId = useNotificationStore.getState().pushNotification({ type: 'warning', message: 'Review required' });

    expect(useNotificationStore.getState().notifications.map(({ id }) => id)).toEqual([firstId, secondId]);
  });

  it('removes only the requested notification and ignores unknown ids', () => {
    const firstId = useNotificationStore.getState().pushNotification({ type: 'info', message: 'First' });
    const secondId = useNotificationStore.getState().pushNotification({ type: 'info', message: 'Second' });

    useNotificationStore.getState().removeNotification('missing-id');
    expect(useNotificationStore.getState().notifications).toHaveLength(2);

    useNotificationStore.getState().removeNotification(firstId);
    expect(useNotificationStore.getState().notifications.map(({ id }) => id)).toEqual([secondId]);
  });

  it('clears all notifications', () => {
    useNotificationStore.getState().pushNotification({ type: 'error', message: 'Failed' });
    useNotificationStore.getState().clearNotifications();

    expect(useNotificationStore.getState().notifications).toEqual([]);
  });
});