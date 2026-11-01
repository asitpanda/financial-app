import { useCallback } from "react";
import dayjs from "dayjs";
import type { ConfigType } from "dayjs";
import type { DateFormat } from "../features/settings/preferences.types";
import { usePreferencesStore } from "../store/preferencesStore";

export const DATE_FORMAT_PATTERNS: Record<DateFormat, string> = {
  DD_MM_YYYY: "DD/MM/YYYY",
  MM_DD_YYYY: "MM/DD/YYYY",
  YYYY_MM_DD: "YYYY-MM-DD",
  DD_MMM_YYYY: "DD MMM YYYY",
};

export function formatDate(
  value: ConfigType,
  dateFormat: DateFormat = "DD_MM_YYYY",
  fallback = "-",
): string {
  if (value == null || value === "") return fallback;
  const date = dayjs(value);
  return date.isValid() ? date.locale("en").format(DATE_FORMAT_PATTERNS[dateFormat]) : fallback;
}

export function useDatePattern() {
  return usePreferencesStore((state) =>
    DATE_FORMAT_PATTERNS[state.preferences?.dateFormat ?? "DD_MM_YYYY"],
  );
}

export function useDateFormatter(defaultFallback = "-") {
  const dateFormat = usePreferencesStore((state) => state.preferences?.dateFormat ?? "DD_MM_YYYY");
  return useCallback((value: ConfigType, fallback = defaultFallback) =>
    formatDate(value, dateFormat, fallback), [dateFormat, defaultFallback]);
}