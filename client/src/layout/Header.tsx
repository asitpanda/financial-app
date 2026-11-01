import Icon from "@mdi/react";
import {
  mdiPlus,
  mdiWeatherNight,
  mdiWeatherSunny,
} from "@mdi/js";
import {
  Box,
  Paper,
  Typography,
} from "@mui/material";
import AppButton from "../components/common/AppButton";
import type { Screen } from "../store/appStore";
import { getScreenConfig } from "../routing/screenRegistry";
import { useAuth } from "../features/auth/useAuth";
import { useHeaderActionStore } from "../store/headerActionStore";
import { usePreferencesStore } from "../store/preferencesStore";
import { useSavePreferences } from "../features/settings/usePreferences";
import { useNotificationStore } from "../store/notificationStore";

interface HeaderProps {
  activeScreen: Screen;
}

export default function Header({ activeScreen }: HeaderProps) {
  const screenConfig = getScreenConfig(activeScreen);
  const headerAction = useHeaderActionStore(
    (state) => state.actions[activeScreen],
  );
  const user = useAuth((state) => state.user);
  const mode = usePreferencesStore((state) => state.preferences?.themeMode ?? "light");
  const sessionId = usePreferencesStore((state) => state.sessionId);
  const isSaving = usePreferencesStore((state) => state.isSaving);
  const savePreferences = useSavePreferences();
  const pushNotification = useNotificationStore((state) => state.pushNotification);
  return (
    <Paper
      variant="outlined"
      sx={{
        px: 2,
        py: 1.25,
        mb: 2,
        border: 0,
        ml: -2,
        mr: -2,
        borderRadius: 0,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "flex-start", lg: "center" },
          justifyContent: "space-between",
          gap: 1.5,
          flexWrap: "wrap",
        }}
      >
        <Box>
          {user ? (
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{ fontWeight: 700, lineHeight: 1.2 }}
            >
              Welcome {user.name || user.email}
            </Typography>
          ) : null}
          <Typography
            variant="caption"
            sx={{ display: "block", mt: 0.5, lineHeight: 1.2 }}
          >
            You are on - {screenConfig.label}
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          {headerAction ? (
            <AppButton
              variant="contained"
              onClick={headerAction.onClick}
              disabled={headerAction.disabled}
            >
              <Icon path={mdiPlus} size={0.8} style={{ marginRight: 8 }} />
              {headerAction.label}
            </AppButton>
          ) : null}

          <AppButton
            variant="text"
            onClick={() => savePreferences.mutate({ themeMode: mode === "dark" ? "light" : "dark" }, {
              onError: () => {
                if (usePreferencesStore.getState().sessionId !== sessionId) return;
                pushNotification({ type: "error", message: "Unable to save theme. Your previous theme is unchanged." });
              },
            })}
            disabled={isSaving}
            aria-busy={isSaving}
            aria-label="Toggle theme mode"
            title={
              mode === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
            sx={{ minWidth: 40, width: 40, height: 40, p: 0 }}
          >
            <Icon
              path={mode === "dark" ? mdiWeatherSunny : mdiWeatherNight}
              size={0.95}
            />
          </AppButton>
        </Box>
      </Box>
    </Paper>
  );
}
