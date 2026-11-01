import { IDLE_TIMEOUT_MS, IDLE_WARNING_MS } from '../../../constants/appConstants';
import useIdleTimeout from '../../../hooks/useIdleTimeout';
import { useAuth, useLogout } from '../useAuth';
import IdleTimeoutDialog from './IdleTimeoutDialog';

export default function IdleTimeoutGuard() {
  const isAuthenticated = useAuth((state) => state.isAuthenticated);
  const logout = useAuth((state) => state.logout);
  const manualLogout = useLogout();
  const { isWarning, secondsLeft, stayActive } = useIdleTimeout({
    enabled: isAuthenticated,
    idleMs: IDLE_TIMEOUT_MS,
    warningMs: IDLE_WARNING_MS,
    onTimeout: () => logout('idle'),
  });

  return <IdleTimeoutDialog open={isWarning} secondsLeft={secondsLeft} onStayActive={stayActive} onLogout={manualLogout} />;
}