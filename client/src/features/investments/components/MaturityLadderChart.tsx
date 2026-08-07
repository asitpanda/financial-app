import { Box, Stack, Typography } from "@mui/material";
import type { InvestmentMaturityBucket } from "../investments.selectors";

interface MaturityLadderChartProps {
  data: InvestmentMaturityBucket[];
  formatValue: (value: number) => string;
  selectedLabel?: string | null;
  onSelectBucket?: (bucket: InvestmentMaturityBucket) => void;
}

export default function MaturityLadderChart({
  data,
  formatValue,
  selectedLabel,
  onSelectBucket,
}: MaturityLadderChartProps) {
  const maxAmount = Math.max(...data.map((item) => item.amount), 1);

  return (
    <Stack spacing={1.1}>
      {data.map((item) => (
        <Box
          key={item.label}
          onClick={() => onSelectBucket?.(item)}
          sx={{
            p: 1,
            borderRadius: 1,
            cursor: onSelectBucket ? "pointer" : "default",
            border:
              selectedLabel === item.label
                ? "1px solid rgba(15, 118, 110, 0.4)"
                : "1px solid transparent",
            backgroundColor:
              selectedLabel === item.label
                ? "rgba(15, 118, 110, 0.04)"
                : "transparent",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 1,
              mb: 0.45,
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {item.label}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {item.count > 0
                ? `${item.count} maturity${item.count === 1 ? "" : "ies"}`
                : "No maturities"}
            </Typography>
          </Box>
          <Box
            sx={{
              height: 36,
              borderRadius: 1,
              bgcolor: "rgba(148, 163, 184, 0.12)",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <Box
              sx={{
                width: `${(item.amount / maxAmount) * 100}%`,
                minWidth: item.amount > 0 ? 6 : 0,
                height: "100%",
                bgcolor: item.amount > 0 ? "#0f766e" : "transparent",
                opacity: item.amount > 0 ? 0.9 : 1,
              }}
            />
            <Typography
              variant="body2"
              sx={{
                position: "absolute",
                top: "50%",
                left: 12,
                transform: "translateY(-50%)",
                fontWeight: 800,
                color: item.amount > 0 ? "white" : "text.secondary",
              }}
            >
              {formatValue(item.amount)}
            </Typography>
          </Box>
        </Box>
      ))}
    </Stack>
  );
}