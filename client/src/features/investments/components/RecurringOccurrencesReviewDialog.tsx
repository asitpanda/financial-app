// @ts-nocheck
import React from "react";
import {
  Box,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AppButton from "../../../components/common/AppButton";

const STATUS_OPTIONS = [
  { value: "EXPECTED", label: "Expected" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "SKIPPED", label: "Skipped" },
  { value: "FAILED", label: "Failed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function RecurringOccurrencesReviewDialog({
  open,
  loading,
  items,
  investmentName,
  historicalImportMode,
  onCancel,
  onConfirm,
  onChangeItem,
}) {
  const selectedCount = Array.isArray(items)
    ? items.filter((item) => item.selected).length
    : 0;

  const selectedItems = Array.isArray(items)
    ? items.filter((item) => item.selected)
    : [];

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

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onCancel}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>Review Historical Occurrences</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            {investmentName
              ? `Investment: ${investmentName}`
              : "Review generated occurrences before confirming recurring plan."}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Mode: {historicalImportMode || "TRACK_FROM_TODAY"} • Selected:{" "}
            {selectedCount}
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

          {!items.length ? (
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
                    <TableCell>Select</TableCell>
                    <TableCell>Due Date</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Event Type</TableCell>
                    <TableCell>Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow
                      key={`${item.dueDate}-${item.sequenceNumber || index}`}
                    >
                      <TableCell>
                        <Checkbox
                          checked={Boolean(item.selected)}
                          onChange={(event) =>
                            onChangeItem(index, {
                              selected: event.target.checked,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>{item.dueDate || "-"}</TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          size="small"
                          value={item.amount ?? ""}
                          inputProps={{ min: 0, step: "0.01" }}
                          onChange={(event) =>
                            onChangeItem(index, {
                              amount: Number(event.target.value || 0),
                            })
                          }
                          sx={{ width: 120 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          select
                          size="small"
                          value={item.status || "PENDING"}
                          onChange={(event) =>
                            onChangeItem(index, { status: event.target.value })
                          }
                          sx={{ width: 140 }}
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <MenuItem key={status.value} value={status.value}>
                              {status.label}
                            </MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell>{item.eventType || "CONTRIBUTION"}</TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={item.notes || ""}
                          onChange={(event) =>
                            onChangeItem(index, { notes: event.target.value })
                          }
                          placeholder="Optional note"
                          sx={{ minWidth: 200 }}
                        />
                      </TableCell>
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
          Cancel
        </AppButton>
        <AppButton variant="contained" onClick={onConfirm} disabled={loading}>
          {loading ? "Confirming..." : "Confirm Recurring Plan"}
        </AppButton>
      </DialogActions>
    </Dialog>
  );
}
