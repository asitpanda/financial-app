import { Fragment } from "react";
import { Box, Chip, Divider, Paper, Stack, Typography } from "@mui/material";
import { SectionCard } from "../../../components/common";
import {
  formatInvestmentCurrency,
  formatInvestmentDate,
} from "../../../utils/investmentHelpers";
import type {
  InvestmentCalendarItem,
  InvestmentCalendarGroups,
} from "../investments.selectors";

interface InvestmentsCalendarViewProps {
  calendarGroups: InvestmentCalendarGroups;
}

export default function InvestmentsCalendarView({
  calendarGroups,
}: InvestmentsCalendarViewProps) {
  const monthKeys = Object.keys(calendarGroups);

  return (
    <Stack spacing={2}>
      <SectionCard
        title="Investment Calendar"
        subtitle="A forward-looking agenda of contributions, maturity events, and policy dates."
        empty={monthKeys.length === 0}
        emptyState={{
          title: "No upcoming calendar actions",
          description:
            "Assets with future maturity dates and scheduled contributions will appear in this agenda view.",
        }}
      >
        <Stack spacing={2}>
          {monthKeys.map((monthKey) => (
            <Paper
              key={monthKey}
              variant="outlined"
              sx={{ p: 2, borderRadius: 1 }}
            >
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>
                {monthKey}
              </Typography>
              <Stack spacing={1.25}>
                {calendarGroups[monthKey].map(
                  (item: InvestmentCalendarItem, index: number) => (
                    <Fragment key={item.id}>
                      {index > 0 ? <Divider /> : null}
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 2,
                          p: 1.5,
                          borderRadius: 1,
                          backgroundColor: "background.default",
                          border: "1px solid",
                          borderColor: "divider",
                        }}
                      >
                        <Box>
                          <Typography sx={{ fontWeight: 700 }}>
                            {item.title}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mt: 0.25 }}
                          >
                            {item.subtitle}
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: "right" }}>
                          <Chip
                            size="small"
                            color={
                              item.type === "Maturity" ? "warning" : "info"
                            }
                            label={item.type}
                            sx={{ mb: 0.75 }}
                          />
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {formatInvestmentDate(item.date)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatInvestmentCurrency(item.amount)}
                          </Typography>
                        </Box>
                      </Box>
                    </Fragment>
                  ),
                )}
              </Stack>
            </Paper>
          ))}
        </Stack>
      </SectionCard>
    </Stack>
  );
}
