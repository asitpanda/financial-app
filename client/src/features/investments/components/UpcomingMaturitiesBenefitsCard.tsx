import { Fragment, useMemo, useState } from "react";
import Icon from "@mdi/react";
import {
  mdiAlertCircleOutline,
  mdiCalendarClock,
  mdiCashCheck,
  mdiCashMarker,
  mdiClockFast,
  mdiInformationOutline,
} from "@mdi/js";
import {
  Box,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import AppButton from "../../../components/common/AppButton";
import { SectionCard } from "../../../components/common";
import {
  formatInvestmentDate,
  getInvestmentTypeLabel,
} from "../../../utils/investmentHelpers";
import {
  getUpcomingMaturitiesAndBenefits,
  type InvestmentUpcomingBenefitItem,
} from "../investments.selectors";
import type { Investment } from "../types/investment.types";
import dayjs from "dayjs";

export type MaturityPlanningBucket = "30d" | "90d" | "180d";

interface UpcomingMaturitiesBenefitsCardProps {
  investments: Investment[];
  formatCurrency: (value: number) => string;
  onSelectInvestment?: (investmentId: string | number, name: string) => void;
  sx?: Record<string, unknown>;
  contentSx?: Record<string, unknown>;
}

const BUCKET_CONFIG: Record<
  MaturityPlanningBucket,
  { label: string; rangeDescription: string; emptyDescription: string; rangeLabel: string }
> = {
  "30d": {
    label: "30 Days",
    rangeLabel: "0-30 Days",
    rangeDescription: "Due from today through day 30",
    emptyDescription: "No maturities or benefits due in the next 30 days.",
  },
  "90d": {
    label: "90 Days",
    rangeLabel: "31-90 Days",
    rangeDescription: "Due from day 31 through day 90",
    emptyDescription: "No maturities or benefits due in the 31–90 day horizon.",
  },
  "180d": {
    label: "180 Days",
    rangeLabel: "91-180 Days",
    rangeDescription: "Due from day 91 through day 180",
    emptyDescription: "No maturities or benefits due in the 91–180 day horizon.",
  },
};

const getBenefitTypeStyles = (
  benefitType: string,
): { color: "primary" | "secondary" | "success" | "info" | "warning" | "default"; icon: string } => {
  const type = String(benefitType || "").toUpperCase();
  switch (type) {
    case "MATURITY":
      return { color: "primary", icon: mdiCashCheck };
    case "MONEY_BACK":
    case "SURVIVAL":
      return { color: "success", icon: mdiCashMarker };
    case "BONUS":
      return { color: "secondary", icon: mdiCashMarker };
    case "RETURN_OF_PREMIUM":
      return { color: "info", icon: mdiCashMarker };
    default:
      return { color: "default", icon: mdiInformationOutline };
  }
};

const groupItemsByTime = (items: InvestmentUpcomingBenefitItem[]) => {
  const groups: Record<string, InvestmentUpcomingBenefitItem[]> = {};

  items.forEach((item) => {
    let group = "Later";
    if (item.daysUntil <= 1) {
      group = "Today & Tomorrow";
    } else if (item.daysUntil <= 7) {
      group = "This Week";
    } else if (item.daysUntil <= 14) {
      group = "Next Week";
    } else {
      group = dayjs(item.dueDate).format("MMMM YYYY");
    }

    if (!groups[group]) groups[group] = [];
    groups[group].push(item);
  });

  return groups;
};

export default function UpcomingMaturitiesBenefitsCard({
  investments,
  formatCurrency,
  onSelectInvestment,
  sx,
  contentSx,
}: UpcomingMaturitiesBenefitsCardProps) {
  const [activeBucket, setActiveBucket] = useState<MaturityPlanningBucket>("30d");

  const bucketItems: InvestmentUpcomingBenefitItem[] = useMemo(() => {
    return getUpcomingMaturitiesAndBenefits(investments, activeBucket);
  }, [investments, activeBucket]);

  const stats = useMemo(() => {
    return bucketItems.reduce(
      (acc, item) => {
        const amount = Number(item.amount || 0);
        acc.total += amount;
        if (item.benefitType === "MATURITY") {
          acc.maturityAmount += amount;
        } else {
          acc.benefitAmount += amount;
        }
        return acc;
      },
      { total: 0, maturityAmount: 0, benefitAmount: 0 },
    );
  }, [bucketItems]);

  const groupedItems = useMemo(() => groupItemsByTime(bucketItems), [bucketItems]);
  const currentConfig = BUCKET_CONFIG[activeBucket];

  return (
    <SectionCard
      title="Upcoming Maturities & Benefits"
      subtitle={`${currentConfig.rangeDescription}.`}
      sx={sx}
      contentSx={contentSx}
      action={
        <Box
          sx={{
            display: "inline-flex",
            gap: 0.5,
            p: 0.25,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            backgroundColor: "background.paper",
          }}
        >
          {(["30d", "90d", "180d"] as MaturityPlanningBucket[]).map((bucket) => (
            <AppButton
              key={bucket}
              size="small"
              variant={activeBucket === bucket ? "contained" : "text"}
              onClick={() => setActiveBucket(bucket)}
              sx={{
                minWidth: 70,
                height: 26,
                fontSize: "10px",
                px: 1,
                fontWeight: activeBucket === bucket ? 700 : 500,
              }}
            >
              {BUCKET_CONFIG[bucket].rangeLabel}
            </AppButton>
          ))}
        </Box>
      }
      empty={bucketItems.length === 0}
      emptyState={{
        title: `No items in ${currentConfig.label} window`,
        description: currentConfig.emptyDescription,
      }}
    >
      <Stack spacing={2}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 1.5,
            py: 1,
            backgroundColor: "action.hover",
            borderRadius: 1.5,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: "block" }}>
              {bucketItems.length} {bucketItems.length === 1 ? "Event" : "Events"} Scheduled
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              {formatCurrency(stats.total)}
            </Typography>
          </Box>
          <Stack direction="row" spacing={2} sx={{ textAlign: "right" }}>
            {stats.maturityAmount > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Principal
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main" }}>
                  {formatCurrency(stats.maturityAmount)}
                </Typography>
              </Box>
            )}
            {stats.benefitAmount > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Benefits
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: "success.main" }}>
                  {formatCurrency(stats.benefitAmount)}
                </Typography>
              </Box>
            )}
          </Stack>
        </Box>

        <Box>
          {Object.entries(groupedItems).map(([groupName, items]) => (
            <Box key={groupName} sx={{ mb: 3, "&:last-child": { mb: 0 } }}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "text.secondary",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mb: 1,
                  px: 0.5,
                }}
              >
                <Icon path={mdiCalendarClock} size={0.6} />
                {groupName}
              </Typography>

              <List disablePadding>
                {items.map((item, index) => {
                  const isUrgent = item.daysUntil <= 3;
                  const styles = getBenefitTypeStyles(item.benefitType);
                  const isMaturity = item.benefitType === "MATURITY";

                  return (
                    <Fragment key={item.id}>
                      {index > 0 ? <Divider sx={{ opacity: 0.5, mx: 1 }} /> : null}
                      <ListItem
                        disableGutters
                        onClick={() =>
                          onSelectInvestment?.(
                            item.investmentId,
                            `${item.productName} (${item.benefitLabel})`,
                          )
                        }
                        sx={{
                          py: 1.5,
                          px: 1,
                          cursor: onSelectInvestment ? "pointer" : "default",
                          borderRadius: 1,
                          transition: "all 0.2s",
                          position: "relative",
                          overflow: "hidden",
                          "&:hover": {
                            backgroundColor: "action.hover",
                            transform: "translateX(4px)",
                          },
                          ...(isUrgent && {
                            backgroundColor: "warning.lighter",
                            borderLeft: "3px solid",
                            borderLeftColor: "warning.main",
                            "&:hover": {
                              backgroundColor: "warning.light",
                            },
                          }),
                          ...(isMaturity && !isUrgent && {
                            borderLeft: "3px solid",
                            borderLeftColor: "primary.main",
                          }),
                        }}
                      >
                        <Box
                          sx={{
                            mr: 2,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            backgroundColor: isUrgent ? "warning.light" : `${styles.color}.lighter`,
                            color: isUrgent ? "warning.dark" : `${styles.color}.main`,
                            flexShrink: 0,
                          }}
                        >
                          <Icon path={styles.icon} size={0.8} />
                        </Box>

                        <ListItemText
                          disableTypography
                          primary={
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                              <Typography sx={{ fontWeight: 700, fontSize: "14px" }}>
                                {item.productName}
                              </Typography>
                              {isUrgent && (
                                <Tooltip title="Due very soon">
                                  <Box sx={{ color: "warning.main", display: "flex" }}>
                                    <Icon path={mdiAlertCircleOutline} size={0.6} />
                                  </Box>
                                </Tooltip>
                              )}
                            </Box>
                          }
                          secondary={
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.75,
                                mt: 0.25,
                                flexWrap: "wrap",
                              }}
                            >
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                                {item.institutionName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                •
                              </Typography>
                              <Chip
                                size="small"
                                label={item.benefitLabel}
                                color={styles.color}
                                variant="outlined"
                                sx={{ height: 16, fontSize: "9px", fontWeight: 700, textTransform: "uppercase" }}
                              />
                            </Box>
                          }
                        />

                        <Box sx={{ textAlign: "right", ml: 1, flexShrink: 0 }}>
                          <Typography
                            variant="body1"
                            sx={{
                              fontWeight: 800,
                              color: isMaturity ? "primary.main" : "text.primary",
                            }}
                          >
                            {formatCurrency(item.amount)}
                          </Typography>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, justifyContent: "flex-end" }}>
                            {isUrgent && <Icon path={mdiClockFast} size={0.5} color="var(--mui-palette-warning-main)" />}
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: isUrgent ? 700 : 500,
                                color: isUrgent ? "warning.main" : "text.secondary",
                              }}
                            >
                              {item.daysUntil === 0
                                ? "Today"
                                : item.daysUntil === 1
                                  ? "Tomorrow"
                                  : `in ${item.daysUntil} days`}
                            </Typography>
                          </Box>
                        </Box>
                      </ListItem>
                    </Fragment>
                  );
                })}
              </List>
            </Box>
          ))}
        </Box>
      </Stack>
    </SectionCard>
  );
}

