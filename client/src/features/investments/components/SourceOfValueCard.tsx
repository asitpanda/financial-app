import { Box, Chip, Stack, Typography } from "@mui/material";
import type { InvestmentValueSourceSummary } from "../investments.selectors";

interface SourceOfValueCardProps {
  summary: InvestmentValueSourceSummary;
  formatValue: (value: number) => string;
  onSelectSource?: (payload: {
    key: "snapshotBackedIds" | "estimatedIds" | "investedOnlyIds";
    label: string;
    investmentIds: Array<string | number>;
  }) => void;
  onSelectStaleValuations?: (investmentIds: Array<string | number>) => void;
}

const sourceRows = [
  {
    idKey: "snapshotBackedIds",
    key: "snapshotBackedValue",
    countKey: "snapshotBackedCount",
    label: "Snapshot-backed",
    color: "#0f766e",
    bg: "rgba(15, 118, 110, 0.1)",
  },
  {
    idKey: "estimatedIds",
    key: "estimatedValue",
    countKey: "estimatedCount",
    label: "Stored current value",
    color: "#b45309",
    bg: "rgba(245, 158, 11, 0.12)",
  },
  {
    idKey: "investedOnlyIds",
    key: "investedOnlyValue",
    countKey: "investedOnlyCount",
    label: "Invested-only fallback",
    color: "#475569",
    bg: "rgba(148, 163, 184, 0.14)",
  },
] as const;

export default function SourceOfValueCard({
  summary,
  formatValue,
  onSelectSource,
  onSelectStaleValuations,
}: SourceOfValueCardProps) {
  const totalTrackedValue =
    summary.snapshotBackedValue +
    summary.estimatedValue +
    summary.investedOnlyValue;

  return (
    <Stack spacing={1.25}>
      <Typography variant="caption" color="text.secondary">
        Shows how today&apos;s portfolio value is derived. Click a row to review the matching holdings.
      </Typography>

      {sourceRows.map((row) => {
        const value = summary[row.key];
        const count = summary[row.countKey];
        const share = totalTrackedValue > 0 ? (value / totalTrackedValue) * 100 : 0;

        return (
          <Box
            key={row.label}
            onClick={() =>
              count > 0
                ? onSelectSource?.({
                    key: row.idKey,
                    label: row.label,
                    investmentIds: summary[row.idKey],
                  })
                : undefined
            }
            sx={{
              p: 1.25,
              borderRadius: 1,
              border: "1px solid",
              borderColor: "divider",
              cursor: count > 0 && onSelectSource ? "pointer" : "default",
              transition: "border-color 0.15s, background-color 0.15s",
              '&:hover':
                count > 0 && onSelectSource
                  ? {
                      borderColor: row.color,
                      backgroundColor: row.bg,
                    }
                  : undefined,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {row.label}
              </Typography>
              <Chip
                size="small"
                label={`${count} holding${count === 1 ? "" : "s"}`}
                sx={{
                  height: 22,
                  fontSize: 11,
                  bgcolor: row.bg,
                  color: row.color,
                  fontWeight: 700,
                }}
              />
            </Box>
            <Typography sx={{ mt: 0.75, fontWeight: 800, color: row.color }}>
              {formatValue(value)}
            </Typography>
            <Box sx={{ mt: 0.9 }}>
              <Box
                sx={{
                  height: 7,
                  borderRadius: 999,
                  bgcolor: "rgba(148, 163, 184, 0.14)",
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    width: `${Math.max(Math.min(share, 100), value > 0 ? 6 : 0)}%`,
                    height: "100%",
                    bgcolor: row.color,
                    borderRadius: 999,
                  }}
                />
              </Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 0.5 }}
              >
                {share.toFixed(1)}% of tracked current value
              </Typography>
            </Box>
          </Box>
        );
      })}

      <Box
        onClick={() =>
          summary.staleValuationCount > 0
            ? onSelectStaleValuations?.(summary.staleValuationIds)
            : undefined
        }
        sx={{
          p: 1.25,
          borderRadius: 1,
          bgcolor:
            summary.staleValuationCount > 0
              ? "rgba(245, 158, 11, 0.08)"
              : "rgba(16, 185, 129, 0.08)",
          border: "1px solid",
          borderColor:
            summary.staleValuationCount > 0
              ? "rgba(245, 158, 11, 0.26)"
              : "rgba(16, 185, 129, 0.24)",
          cursor:
            summary.staleValuationCount > 0 && onSelectStaleValuations
              ? "pointer"
              : "default",
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          Valuation freshness
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.4 }}>
          {summary.staleValuationCount > 0
            ? `${summary.staleValuationCount} active holdings may need valuation review, covering ${formatValue(summary.staleValuationValue)}.`
            : "All active holdings have a recent valuation basis in the last 90 days."}
        </Typography>
      </Box>
    </Stack>
  );
}