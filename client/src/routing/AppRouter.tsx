import { useEffect } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import AppLayout from "../layout/AppLayout";
import { useAppStore } from "../store/appStore";
import {
  getScreenConfig,
  SCREEN_CONFIGS,
  type Screen,
  type ScreenRenderContext,
} from "./screenRegistry";

interface AppRouterProps {
  context: ScreenRenderContext;
}

const getScreenFromPath = (pathname: string): Screen | null =>
  Object.values(SCREEN_CONFIGS).find((config) => config.path === pathname)?.key ??
  null;

export default function AppRouter({ context }: AppRouterProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const activeScreen = getScreenFromPath(location.pathname);

  useEffect(() => {
    if (!activeScreen) return;

    if (useAppStore.getState().activeScreen !== activeScreen) {
      useAppStore.getState().navigateTo(activeScreen);
    }
  }, [activeScreen]);

  const handleNavigate = (screen: Screen) => {
    navigate(getScreenConfig(screen).path);
  };

  return (
    <AppLayout
      activeScreen={activeScreen ?? "dashboard"}
      onNavigate={handleNavigate}
    >
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        {Object.values(SCREEN_CONFIGS).map((config) => (
          <Route
            key={config.key}
            path={config.path}
            element={config.render(context)}
          />
        ))}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppLayout>
  );
}