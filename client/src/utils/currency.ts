import { useCallback } from "react";
import { DEFAULT_CURRENCY_CONFIG } from "../constants/currency";
import type { CurrencyDisplay } from "../features/settings/preferences.types";
import { usePreferencesStore } from "../store/preferencesStore";

export function formatCurrency(
  value: number | string | null | undefined,
  currency: string = DEFAULT_CURRENCY_CONFIG.code,
  options: Intl.NumberFormatOptions = {},
  currencyDisplay: CurrencyDisplay = "symbol",
): string {
  return new Intl.NumberFormat(DEFAULT_CURRENCY_CONFIG.locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
    ...options,
    style: "currency",
    currency,
    currencyDisplay,
  }).format(Number(value) || 0);
}

export function useCurrencyFormatter() {
  const currencyDisplay = usePreferencesStore((state) =>
    state.preferences?.currencyDisplay ?? "symbol",
  );
  return useCallback((
    value: number | string | null | undefined,
    currency?: string,
    options?: Intl.NumberFormatOptions,
  ) => formatCurrency(value, currency, options, currencyDisplay), [currencyDisplay]);
}