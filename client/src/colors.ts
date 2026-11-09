// Core application color tokens.
export const colors = {
  primary: "#2563eb",
  secondary: "#c026d3",
  background: "#f6f8fc",
  surface: "#ffffff",
  error: "#dc2626",
  success: "#059669",
  warning: "#d97706",
  info: "#0284c7",
  text: {
    primary: "#172033",
    secondary: "#5b667a",
  },
  // Sidebar colors.
  sidebarBg: "#1e293b",
  sidebarText: "#cbd5e1",
  sidebarActiveBg: "#3b82f6",
  sidebarActiveText: "#ffffff",
  sidebarHoverBg: "#334155",
} as const;

export const CHIP_COLORS = {
  light: {
    default: { backgroundColor: "#eef2f7", color: "#344054" },
    primary: { backgroundColor: "#dbeafe", color: "#1e40af" },
    secondary: { backgroundColor: "#fae8ff", color: "#86198f" },
    success: { backgroundColor: "#d1fae5", color: "#065f46" },
    error: { backgroundColor: "#fee2e2", color: "#991b1b" },
    warning: { backgroundColor: "#fef3c7", color: "#92400e" },
    info: { backgroundColor: "#e0f2fe", color: "#075985" },
    transfer: { backgroundColor: "#e2e8f0", color: "#334155" },
    investment: { backgroundColor: "#cffafe", color: "#155e75" },
  },
  dark: {
    default: { backgroundColor: "#293548", color: "#e2e8f0" },
    primary: { backgroundColor: "#1e3a5f", color: "#bfdbfe" },
    secondary: { backgroundColor: "#4a2054", color: "#f5d0fe" },
    success: { backgroundColor: "#064e3b", color: "#a7f3d0" },
    error: { backgroundColor: "#641e25", color: "#fecaca" },
    warning: { backgroundColor: "#563910", color: "#fde68a" },
    info: { backgroundColor: "#0c4a6e", color: "#bae6fd" },
    transfer: { backgroundColor: "#334155", color: "#e2e8f0" },
    investment: { backgroundColor: "#164e63", color: "#a5f3fc" },
  },
} as const;

export type ChipTone = keyof typeof CHIP_COLORS.light;

export const getChipColors = (
  mode: "light" | "dark",
  tone: ChipTone = "default",
) => CHIP_COLORS[mode][tone];

export const themeColors = {
  light: {
    primary: colors.primary,
    secondary: colors.secondary,
    error: colors.error,
    warning: colors.warning,
    success: colors.success,
    info: colors.info,
    background: colors.background,
    surface: colors.surface,
    textPrimary: colors.text.primary,
    textSecondary: colors.text.secondary,
    textDisabled: "#9aa5b5",
    divider: "rgba(23, 32, 51, 0.12)",
    actionActive: "#344054",
    actionHover: "rgba(37, 99, 235, 0.07)",
    actionSelected: "rgba(37, 99, 235, 0.12)",
    actionSelectedOpacity: 0.12,
    movementTransfer: "#64748b",
    movementInvestment: "#0ea5e9",
    actionDisabled: "rgba(23, 32, 51, 0.34)",
    actionDisabledBackground: "rgba(23, 32, 51, 0.06)",
    tableHeader: "#eef2f7",
  },
  dark: {
    primary: "#60a5fa",
    secondary: "#e879f9",
    error: "#f87171",
    warning: "#fbbf24",
    success: "#34d399",
    info: "#38bdf8",
    background: "#0b1220",
    surface: "#121a2a",
    textPrimary: "#f8fafc",
    textSecondary: "#aab7ca",
    textDisabled: "#718096",
    divider: "rgba(226, 232, 240, 0.16)",
    actionActive: "#dbeafe",
    actionHover: "rgba(96, 165, 250, 0.12)",
    actionSelected: "rgba(96, 165, 250, 0.18)",
    actionSelectedOpacity: 0.18,
    movementTransfer: "#94a3b8",
    movementInvestment: "#38bdf8",
    actionDisabled: "rgba(226, 232, 240, 0.34)",
    actionDisabledBackground: "rgba(226, 232, 240, 0.08)",
    tableHeader: "#182235",
  },
} as const;

// Finance semantic colors and palettes.
export const CATEGORY_DEFAULT_COLOR = "#111827";
export const CHART_SERIES_FALLBACK_COLOR = "#94a3b8";
export const CATEGORY_FALLBACK_COLORS = [
  "#22c55e",
  "#ef4444",
  "#3b82f6",
  "#f59e0b",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
];

export const GOAL_PROGRESS_COLORS = {
  completed: themeColors.light.success,
  onTrack: themeColors.light.primary,
  atRisk: themeColors.light.warning,
  notStarted: themeColors.light.secondary,
};

export const INSURANCE_CATEGORY_COLORS: Record<string, string> = {
  TERM_LIFE: "#0284c7",
  LIFE_INSURANCE: "#0284c7",
  HEALTH: "#8b5cf6",
  HEALTH_INSURANCE: "#8b5cf6",
  SAVINGS: "#10b981",
  INSURANCE_SAVINGS: "#10b981",
  ENDOWMENT: "#10b981",
  ULIP: "#10b981",
  MOTOR: "#f59e0b",
  GENERAL: "#f59e0b",
  OTHER: "#64748b",
};

type ZeroColorMode = "neutral" | "gain" | "loss";

const resolveZeroMode = (zeroMode: ZeroColorMode) => {
  if (zeroMode === "gain") return "gain";
  if (zeroMode === "loss") return "loss";
  return "neutral";
};

export const PROFIT_LOSS_COLORS = {
  gainHex: "#10b981",
  lossHex: "#ef4444",
  gainDeepHex: "#15803d",
  lossDeepHex: "#be123c",
  gainSoftHex: "#86efac",
  lossSoftHex: "#fca5a5",
  gainFillSoft: "rgba(16, 185, 129, 0.14)",
  gainFillStrong: "rgba(16, 185, 129, 0.22)",
  lossFillSoft: "rgba(239, 68, 68, 0.14)",
  lossFillStrong: "rgba(239, 68, 68, 0.24)",
} as const;

export const INVESTMENT_CHART_SERIES_COLORS = {
  currentValueHex: "#0f766e",
  investedHex: "#f59e0b",
  investedAltHex: "#3b82f6",
} as const;

export const CHART_TOOLTIP_COLORS = {
  backgroundHex: "#0b1220",
  borderHex: "#64748b",
  titleHex: "#f8fafc",
  labelHex: "#f1f5f9",
  mutedHex: "#cbd5e1",
  investedHex: "#bfdbfe",
  currentValueHex: "#5eead4",
  positiveHex: "#86efac",
  negativeHex: "#fda4af",
  neutralHex: "#e2e8f0",
} as const;

export const PROFIT_RETURN_PALETTE = [
  "#0f766e",
  PROFIT_LOSS_COLORS.gainHex,
  "#14b8a6",
  "#22c55e",
  "#06b6d4",
] as const;

export const LOSS_RETURN_PALETTE = [
  PROFIT_LOSS_COLORS.lossHex,
  "#f97316",
  "#fb7185",
  "#dc2626",
  "#f59e0b",
] as const;

export const PROFIT_HEATMAP_PALETTE = [
  "#ecfdf5",
  "#bbf7d0",
  "#4ade80",
  PROFIT_LOSS_COLORS.gainDeepHex,
] as const;

export const LOSS_HEATMAP_PALETTE = [
  "#fff1f2",
  "#fecdd3",
  "#fb7185",
  PROFIT_LOSS_COLORS.lossDeepHex,
] as const;

export const COUNT_HEATMAP_PALETTE = [
  "#eff6ff",
  "#bfdbfe",
  "#60a5fa",
  "#2563eb",
  "#1d4ed8",
] as const;

export const AMOUNT_HEATMAP_PALETTE = [
  "#ecfeff",
  "#99f6e4",
  "#2dd4bf",
  INVESTMENT_CHART_SERIES_COLORS.currentValueHex,
  "#115e59",
] as const;

export const getProfitLossMuiColor = (
  value: number,
  zeroMode: ZeroColorMode = "neutral",
) => {
  if (value > 0) return "success.main";
  if (value < 0) return "error.main";

  const resolvedZero = resolveZeroMode(zeroMode);
  if (resolvedZero === "gain") return "success.main";
  if (resolvedZero === "loss") return "error.main";
  return "text.primary";
};

export const getProfitLossHexColor = (
  value: number,
  zeroMode: ZeroColorMode = "neutral",
) => {
  if (value > 0) return PROFIT_LOSS_COLORS.gainHex;
  if (value < 0) return PROFIT_LOSS_COLORS.lossHex;

  const resolvedZero = resolveZeroMode(zeroMode);
  if (resolvedZero === "gain") return PROFIT_LOSS_COLORS.gainHex;
  if (resolvedZero === "loss") return PROFIT_LOSS_COLORS.lossHex;
  return "#0f172a";
};

export const getProfitLossReadableHexColor = (
  value: number,
  zeroMode: ZeroColorMode = "neutral",
) => {
  if (value > 0) return PROFIT_LOSS_COLORS.gainDeepHex;
  if (value < 0) return PROFIT_LOSS_COLORS.lossDeepHex;

  const resolvedZero = resolveZeroMode(zeroMode);
  if (resolvedZero === "gain") return PROFIT_LOSS_COLORS.gainDeepHex;
  if (resolvedZero === "loss") return PROFIT_LOSS_COLORS.lossDeepHex;
  return "#0f172a";
};

export const getProfitLossTooltipHexColor = (
  value: number,
  zeroMode: ZeroColorMode = "neutral",
) => {
  if (value > 0) return CHART_TOOLTIP_COLORS.positiveHex;
  if (value < 0) return CHART_TOOLTIP_COLORS.negativeHex;

  const resolvedZero = resolveZeroMode(zeroMode);
  if (resolvedZero === "gain") return CHART_TOOLTIP_COLORS.positiveHex;
  if (resolvedZero === "loss") return CHART_TOOLTIP_COLORS.negativeHex;
  return CHART_TOOLTIP_COLORS.neutralHex;
};

export const getSignedValuePrefix = (value: number, includeZero = false) => {
  if (value > 0) return "+";
  if (value < 0) return "-";
  return includeZero ? "+" : "";
};

// Non-P&L account movement colors (money moved between own accounts, not a gain/loss).
export const TRANSACTION_MOVEMENT_COLORS = {
  transferHex: themeColors.light.movementTransfer,
  investmentHex: themeColors.light.movementInvestment,
} as const;

export const getTransactionMovementHexColor = (
  type: "TRANSFER" | "INVESTMENT",
) =>
  type === "INVESTMENT"
    ? TRANSACTION_MOVEMENT_COLORS.investmentHex
    : TRANSACTION_MOVEMENT_COLORS.transferHex;

// Generic deterministic chart series colors.
const GOLDEN_ANGLE = 137.508;

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
};

export const getStableSeriesColor = (
  seriesKey: string,
  namespace = "global",
): string => {
  const stableKey = `${namespace}:${seriesKey}`;

  // Deterministic hash keeps the same key bound to the same color.
  const hash = hashString(stableKey);

  const hue = Math.round((hash * GOLDEN_ANGLE) % 360);
  const saturation = 62 + (hash % 16); // 62-77
  const lightness = 42 + ((hash >>> 5) % 14); // 42-55
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
};

export const getStableSeriesColorMap = (
  seriesKeys: string[],
  namespace = "global",
) => {
  const uniqueKeys = [...new Set(seriesKeys)];
  const namespaceHash = hashString(namespace);
  const baseHue = Math.round((namespaceHash * GOLDEN_ANGLE) % 360);

  const ordered = [...uniqueKeys].sort((left, right) => {
    const leftHash = hashString(`${namespace}:${left}`);
    const rightHash = hashString(`${namespace}:${right}`);
    return leftHash - rightHash;
  });

  return new Map(
    ordered.map((key, index) => {
      const keyHash = hashString(`${namespace}:${key}`);
      const hue = Math.round((baseHue + index * GOLDEN_ANGLE) % 360);
      const saturation = 64 + (keyHash % 14); // 64-77
      const lightness = 43 + ((keyHash >>> 5) % 12); // 43-54
      return [key, `hsl(${hue} ${saturation}% ${lightness}%)`];
    }),
  );
};
