import { useEffect } from 'react';
import type { Screen } from '../store/appStore';
import {
  useHeaderActionStore,
  type HeaderActionConfig,
} from '../store/headerActionStore';

export function useHeaderAction(screen: Screen, action: HeaderActionConfig | null) {
  const setAction = useHeaderActionStore((state) => state.setAction);
  const clearAction = useHeaderActionStore((state) => state.clearAction);

  useEffect(() => {
    if (!action) {
      clearAction(screen);
      return undefined;
    }

    setAction(screen, action);

    return () => {
      clearAction(screen);
    };
  }, [action, clearAction, screen, setAction]);
}