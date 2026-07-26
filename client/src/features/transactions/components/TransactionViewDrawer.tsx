import { Box, Divider, Stack, Typography } from "@mui/material";
import Button from "../../../components/common/AppButton";
import { SectionCard, StatusChip } from "../../../components/common";
import AppDrawer from "../../../components/drawers/AppDrawer";
import type { TransactionRecord } from "../transaction.types";

interface TransactionViewDrawerProps {
  open: boolean;
  onClose: () => void;
  transaction: TransactionRecord | null;
  goalName: string;
  onDelete?: (transaction: TransactionRecord) => void;
  onEdit?: (transaction: TransactionRecord) => void;
}

const formatCurrency = (value: number | string | null | undefined) =>
  `₹${Number(value || 0).toLocaleString()}`;

export function TransactionViewDrawer({
  open,
  onClose,
  transaction,
  goalName,
  onDelete,
  onEdit,
}: TransactionViewDrawerProps) {
  const footer = (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 1.5,
      }}
    >
      <Button type="button" variant="outlined" onClick={onClose}>
        Close
      </Button>
      {transaction ? (
        <Box sx={{ display: "flex", gap: 1 }}>
          {onDelete ? (
            <Button
              type="button"
              color="error"
              variant="outlined"
              onClick={() => onDelete(transaction)}
            >
              Delete
            </Button>
          ) : null}
          {onEdit ? (
            <Button
              type="button"
              variant="contained"
              onClick={() => onEdit(transaction)}
            >
              Edit Transaction
            </Button>
          ) : null}
        </Box>
      ) : null}
    </Box>
  );

  const amountTone = transaction?.type === "expense" ? "error" : "success";

  return (
    <AppDrawer
      open={open}
      onClose={onClose}
      title={transaction ? "Transaction Details" : "Transaction Not Found"}
      subtitle="Review linked goal, category, bank source, amount, and notes"
      footer={footer}
    >
      {!transaction ? (
        <SectionCard>
          <Typography variant="body2" color="text.secondary">
            This transaction no longer exists or the list changed.
          </Typography>
        </SectionCard>
      ) : (
        <Stack spacing={2}>
          <SectionCard>
            <Box
              sx={{
                borderRadius: 1.5,
                px: 2,
                py: 2.5,
                background:
                  transaction.type === "expense"
                    ? "linear-gradient(180deg, #fff7f7 0%, #ffffff 100%)"
                    : "linear-gradient(180deg, #f5fff8 0%, #ffffff 100%)",
                border: "1px solid",
                borderColor: "divider",
                display: "grid",
                gap: 1.5,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 1.5,
                }}
              >
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 600 }}
                  >
                    Transaction Amount
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{
                      mt: 0.5,
                      fontWeight: 800,
                      color: `${amountTone}.main`,
                    }}
                  >
                    {transaction.type === "expense" ? "-" : "+"}{" "}
                    {formatCurrency(transaction.amount)}
                  </Typography>
                </Box>
                <StatusChip
                  label={transaction.type || "Unknown"}
                  tone={amountTone}
                />
              </Box>

              <Divider />

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 1.5,
                }}
              >
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Category
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 600 }}>
                    {transaction.category || "Uncategorized"}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Bank / Source
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 600 }}>
                    {transaction.source || "Not provided"}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Goal
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 600 }}>
                    {goalName || "No linked goal"}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Date
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 600 }}>
                    {new Date(
                      transaction.date || transaction.createdAt || Date.now(),
                    ).toLocaleDateString()}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Created
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 600 }}>
                    {new Date(
                      transaction.createdAt || transaction.date || Date.now(),
                    ).toLocaleDateString()}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </SectionCard>

          <SectionCard title="Notes">
            <Typography
              variant="body2"
              color={transaction.notes ? "text.primary" : "text.secondary"}
            >
              {transaction.notes || "No notes added for this transaction."}
            </Typography>
          </SectionCard>
        </Stack>
      )}
    </AppDrawer>
  );
}

export default TransactionViewDrawer;
