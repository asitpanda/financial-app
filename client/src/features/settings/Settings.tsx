import { useEffect, useState } from "react";
import {
  Alert, Box, CircularProgress, Divider,
  Stack, ToggleButton, ToggleButtonGroup, Typography,
} from "@mui/material";
import Icon from "@mdi/react";
import { mdiContentSaveOutline, mdiUndoVariant, mdiWeatherNight, mdiWeatherSunny } from "@mdi/js";
import AppButton from "../../components/common/AppButton";
import LabeledSelectField from "../../components/common/LabeledSelectField";
import SectionCard from "../../components/common/SectionCard";
import { usePreferencesStore } from "../../store/preferencesStore";
import { formatCurrency } from "../../utils/currency";
import { DATE_FORMAT_PATTERNS, formatDate } from "../../utils/date";
import { usePreferences } from "./usePreferences";
import type { CurrencyDisplay, ThemeMode, DateFormat, UserPreferences } from "./preferences.types";

export default function Settings() {
  const sessionId = usePreferencesStore((state) => state.sessionId);
  const saved = usePreferencesStore((state) => state.preferences?.currencyDisplay ?? "symbol");
  const savedTheme = usePreferencesStore((state) => state.preferences?.themeMode ?? "light");
  const savedDateFormat = usePreferencesStore((state) => state.preferences?.dateFormat ?? "DD_MM_YYYY");
  const [currencyDraft, setCurrencyDraft] = useState<CurrencyDisplay>();
  const [themeDraft, setThemeDraft] = useState<ThemeMode>();
  const [dateDraft, setDateDraft] = useState<DateFormat>();
  const currencyDisplay = currencyDraft ?? saved;
  const themeMode = themeDraft ?? savedTheme;
  const dateFormat = dateDraft ?? savedDateFormat;
  const { query, mutation, isSaving } = usePreferences();
  const dirty = currencyDisplay !== saved || themeMode !== savedTheme || dateFormat !== savedDateFormat;
  const controlsDisabled = isSaving || mutation.isPending || query.isFetching || query.isError;
  const sectionSx = {
    display: "grid",
    gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "180px minmax(0, 1fr)" },
    gap: 2,
    px: { xs: 2, sm: 3 },
    py: 3,
  };

  useEffect(() => { setCurrencyDraft((current) => current === saved ? undefined : current); }, [saved]);
  useEffect(() => { setThemeDraft((current) => current === savedTheme ? undefined : current); }, [savedTheme]);
  useEffect(() => { setDateDraft((current) => current === savedDateFormat ? undefined : current); }, [savedDateFormat]);
  useEffect(() => {
    setCurrencyDraft(undefined);
    setThemeDraft(undefined);
    setDateDraft(undefined);
  }, [sessionId]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 960, mx: "auto", width: "100%", boxSizing: "border-box" }}>
      <Typography variant="h5" component="h1" sx={{ fontWeight: 600, mb: 2.5 }}>Settings</Typography>
      <SectionCard sx={{ p: 0, overflow: "hidden" }}>
      <Stack component="form" spacing={0} aria-busy={isSaving || mutation.isPending || query.isFetching} onSubmit={(event) => {
        event.preventDefault();
        if (dirty && !controlsDisabled) {
          const patch: Partial<UserPreferences> = {};
          if (currencyDisplay !== saved) patch.currencyDisplay = currencyDisplay;
          if (themeMode !== savedTheme) patch.themeMode = themeMode;
          if (dateFormat !== savedDateFormat) patch.dateFormat = dateFormat;
          mutation.mutate(patch);
        }
      }}>
        {query.isLoading && <Stack direction="row" spacing={1.5} sx={{ px: { xs: 2, sm: 3 }, pt: 2, alignItems: "center" }} role="status">
          <CircularProgress size={18} aria-label="Loading preferences" />
          <Typography variant="body2" color="text.secondary">Loading preferences...</Typography>
        </Stack>}
        {query.isError && <Alert severity="error" action={
          <AppButton color="inherit" onClick={() => { void query.refetch(); }}>Retry</AppButton>
        } sx={{ m: 2 }}>Unable to refresh your preferences.</Alert>}
        <Box component="section" aria-labelledby="appearance-heading" sx={{ ...sectionSx, alignItems: "center" }}>
          <Typography id="appearance-heading" variant="subtitle1" component="h2" sx={{ fontWeight: 600, color: "primary.main" }}>Appearance</Typography>
          <ToggleButtonGroup exclusive value={themeMode} aria-label="Theme mode"
            color="primary" disabled={controlsDisabled}
            sx={{
              justifySelf: "start",
              "& .MuiToggleButton-root": {
                gap: 1, px: 2.5, py: 1, minWidth: 108,
                "&.Mui-selected": {
                  bgcolor: "primary.main", color: "primary.contrastText",
                  "&:hover": { bgcolor: "primary.dark" },
                },
              },
            }}
            onChange={(_event, value: ThemeMode | null) => {
              if (!value) return;
              setThemeDraft(value === savedTheme ? undefined : value);
              mutation.reset();
            }}>
            <ToggleButton value="light" aria-label="Light theme">
              <Icon path={mdiWeatherSunny} size={0.75} /> Light
            </ToggleButton>
            <ToggleButton value="dark" aria-label="Dark theme">
              <Icon path={mdiWeatherNight} size={0.75} /> Dark
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <Divider />
        <Box component="section" aria-labelledby="money-display-heading" sx={sectionSx}>
          <Typography id="money-display-heading" variant="subtitle1" component="h2" sx={{ fontWeight: 600, color: "primary.main" }}>Money display</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 2, minWidth: 0, alignItems: "start" }}>
            <LabeledSelectField labelText="Currency display" inputProps={{ "aria-label": "Currency display" }}
              value={currencyDisplay} disabled={controlsDisabled}
              options={[{ value: "symbol", label: "Symbol" }, { value: "code", label: "Currency code" }]}
              onChange={(event) => {
                const value = event.target.value as CurrencyDisplay;
                setCurrencyDraft(value === saved ? undefined : value);
                mutation.reset();
              }} />
            <Box sx={{ borderLeft: "3px solid", borderColor: "primary.main", bgcolor: "action.hover", px: 2, py: 1.5, minWidth: 0, minHeight: 83, boxSizing: "border-box" }}>
              <Typography variant="caption" color="text.secondary">Preview</Typography>
              <Typography variant="h6" sx={{ fontWeight: 600, overflowWrap: "anywhere", mt: 0.5 }}>
                {formatCurrency(12345.67, "INR", {}, currencyDisplay)}
              </Typography>
            </Box>
          </Box>
        </Box>
        <Divider />
        <Box component="section" aria-labelledby="dates-heading" sx={sectionSx}>
          <Typography id="dates-heading" variant="subtitle1" component="h2" sx={{ fontWeight: 600, color: "primary.main" }}>Dates</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 2, minWidth: 0, alignItems: "start" }}>
            <LabeledSelectField labelText="Date format" inputProps={{ "aria-label": "Date format" }}
              value={dateFormat} disabled={controlsDisabled}
              options={Object.entries(DATE_FORMAT_PATTERNS).map(([value, pattern]) => ({
                value, label: `${pattern} (${formatDate("2026-10-30", value as DateFormat)})`,
              }))}
              onChange={(event) => {
                const value = event.target.value as DateFormat;
                setDateDraft(value === savedDateFormat ? undefined : value);
                mutation.reset();
              }} />
            <Box sx={{ borderLeft: "3px solid", borderColor: "primary.main", bgcolor: "action.hover", px: 2, py: 1.5, minWidth: 0, minHeight: 83, boxSizing: "border-box" }}>
              <Typography variant="caption" color="text.secondary">Preview</Typography>
              <Typography variant="h6" sx={{ fontWeight: 600, overflowWrap: "anywhere", mt: 0.5 }}>{formatDate("2026-10-30", dateFormat)}</Typography>
            </Box>
          </Box>
        </Box>
        {mutation.isError && <Alert severity="error" sx={{ mx: 2, mb: 2 }}>Unable to save. Your saved preference is unchanged.</Alert>}
        {mutation.isSuccess && !dirty && <Alert severity="success" sx={{ mx: 2, mb: 2 }}>Preferences saved.</Alert>}
        <Divider />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ px: { xs: 2, sm: 3 }, py: 2, bgcolor: "action.hover", alignItems: { xs: "stretch", sm: "center" }, justifyContent: "space-between" }}>
          <Typography variant="body2" color="text.secondary" role="status" aria-live="polite">
            {isSaving || mutation.isPending ? "Saving preferences..." : dirty ? "Unsaved changes" : "Up to date"}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end", flexWrap: "wrap", rowGap: 1 }}>
            <AppButton startIcon={<Icon path={mdiUndoVariant} size={0.75} />}
              disabled={!dirty || isSaving || mutation.isPending} onClick={() => {
                setCurrencyDraft(undefined);
                setThemeDraft(undefined);
                setDateDraft(undefined);
                mutation.reset();
              }}>Cancel</AppButton>
            <AppButton type="submit" variant="contained" color="primary" disableElevation
              startIcon={mutation.isPending ? <CircularProgress size={16} color="inherit" /> : <Icon path={mdiContentSaveOutline} size={0.75} />}
              disabled={!dirty || controlsDisabled}>
              {mutation.isPending ? "Saving..." : "Save"}
            </AppButton>
          </Stack>
        </Stack>
      </Stack>
      </SectionCard>
    </Box>
  );
}