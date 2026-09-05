// Core application color tokens.
export const colors = {
  primary: "#1976d2",
  secondary: "#dc004e",
  background: "#f5f5f5",
  surface: "#ffffff",
  error: "#f44336",
  success: "#4caf50",
  warning: "#ff9800",
  info: "#2196f3",
  text: {
    primary: "#000000",
    secondary: "#757575",
  },
  // Sidebar colors.
  sidebarBg: "#1e293b",
  sidebarText: "#cbd5e1",
  sidebarActiveBg: "#3b82f6",
  sidebarActiveText: "#ffffff",
  sidebarHoverBg: "#334155",
} as const;

// Finance semantic colors and palettes.
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

export const getSignedValuePrefix = (value: number, includeZero = false) => {
  if (value > 0) return "+";
  if (value < 0) return "-";
  return includeZero ? "+" : "";
};

// Non-P&L account movement colors (money moved between own accounts, not a gain/loss).
export const TRANSACTION_MOVEMENT_COLORS = {
  transferHex: "#64748b",
  investmentHex: "#0ea5e9",
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
