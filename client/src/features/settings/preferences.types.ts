export type CurrencyDisplay = "symbol" | "code";
export type ThemeMode = "light" | "dark";
export type DateFormat = "DD_MM_YYYY" | "MM_DD_YYYY" | "YYYY_MM_DD" | "DD_MMM_YYYY";

export interface UserPreferences {
  currencyDisplay: CurrencyDisplay;
  themeMode?: ThemeMode;
  dateFormat?: DateFormat;
}