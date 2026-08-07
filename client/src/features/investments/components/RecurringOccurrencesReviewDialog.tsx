// @ts-nocheck
import React from "react";
import {
  Alert,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import AppButton from "../../../components/common/AppButton";

export default function RecurringOccurrencesReviewDialog({
  open,
  loading,
  items,
  investmentName,
  historicalImportMode,
  reviewSummary,
  dialogTitle = "Review Investment Setup",
  onCancel,
  onConfirm,
  confirmLabel = "Confirm",
}) {
  const reviewItems = Array.isArray(items) ? items : [];
  const selectedItems = reviewItems.filter((item) => item.selected !== false);
  const selectedCount = selectedItems.length;

  const isIncomeEvent = (eventType) =>
    String(eventType || "")
      .toUpperCase()
      .includes("INCOME");

  const principalEvents = selectedItems.filter(
    (item) => !isIncomeEvent(item.eventType),
  );
  const incomeEvents = selectedItems.filter((item) =>
    isIncomeEvent(item.eventType),
  );

  const principalTotal = principalEvents.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0,
  );
  const incomeTotal = incomeEvents.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0,
  );

  const summarySections = [
    {
      title: "Investment Details",
      items: reviewSummary?.investment || [],
    },
    {
      title: "Valuation Handling",
      items: reviewSummary?.valuation || [],
    },
    {
      title: "Recurring Plan",
      items: reviewSummary?.recurring || [],
    },
  ].filter((section) => section.items.length > 0);

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onCancel}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>{dialogTitle}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            {investmentName
              ? `Investment: ${investmentName}`
              : "Review the investment summary before confirming creation."}
          </Typography>

          <Alert severity="info">
            Review the investment summary below. If anything looks wrong, go
            back to the form and update it before confirming.
          </Alert>

          {summarySections.length ? (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
                gap: 1,
              }}
            >
              {summarySections.map((section) => (
                <Box
                  key={section.title}
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                    p: 1.25,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    {section.title}
                  </Typography>
                  <Stack spacing={0.75}>
                    {section.items.map((item) => (
                      <Box key={item.label}>
                        <Typography variant="caption" color="text.secondary">
                          {item.label}
                        </Typography>
                        <Typography variant="body2">{item.value}</Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              ))}
            </Box>
          ) : null}

          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Historical Import Summary
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Mode: {historicalImportMode || "TRACK_FROM_TODAY"} • Selected events: {selectedCount}
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 1,
            }}
          >
            <Box
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                p: 1.25,
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Principal Events
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {principalEvents.length} selected
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total: {principalTotal.toFixed(2)}
              </Typography>
            </Box>
            <Box
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                p: 1.25,
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Income Events
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {incomeEvents.length} selected
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total: {incomeTotal.toFixed(2)}
              </Typography>
            </Box>
          </Box>

          {!selectedItems.length ? (
            <Typography variant="body2" color="text.secondary">
              No historical occurrences generated for this plan.
            </Typography>
          ) : (
            <Box
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                overflowX: "auto",
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Due Date</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Event Type</TableCell>
                    <TableCell>Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedItems.map((item, index) => (
                    <TableRow key={`${item.dueDate}-${item.sequenceNumber || index}`}>
                      <TableCell>{item.dueDate || "-"}</TableCell>
                      <TableCell>{Number(item.amount || 0).toFixed(2)}</TableCell>
                      <TableCell>{item.status || "PENDING"}</TableCell>
                      <TableCell>{item.eventType || "CONTRIBUTION"}</TableCell>
                      <TableCell>{item.notes || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <AppButton variant="outlined" onClick={onCancel} disabled={loading}>
          Back
        </AppButton>
        <AppButton variant="contained" onClick={onConfirm} disabled={loading}>
          {loading ? "Confirming..." : confirmLabel}
        </AppButton>
      </DialogActions>
    </Dialog>
  );
}
