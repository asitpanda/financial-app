import { Alert, AlertTitle, Box, Divider, Stack, Tooltip, Typography } from "@mui/material";
import Icon from "@mdi/react";
import { mdiOpenInNew } from "@mdi/js";
import Button from "../../../components/common/AppButton";
import { SectionCard, StatusChip } from "../../../components/common";
import AppDrawer from "../../../components/drawers/AppDrawer";
import type { TransactionRecord } from "../transaction.types";

interface TransactionViewDrawerProps {
  open: boolean;
  onClose: () => void;
  transaction: TransactionRecord | null;
  goalName: string;
  accountNameById?: Record<number, string>;
  onDelete?: (transaction: TransactionRecord) => void;
  onEdit?: (transaction: TransactionRecord) => void;
  onViewInvestment?: (investmentId: string) => void;
}

import { useCurrencyFormatter } from "../../../utils/currency";
import { useDateFormatter } from "../../../utils/date";

export function TransactionViewDrawer({
  open,
  onClose,
  transaction,
  goalName,
  accountNameById = {},
  onDelete,
  onEdit,
  onViewInvestment,
}: TransactionViewDrawerProps) {
  const formatCurrency = useCurrencyFormatter();
  const formatDate = useDateFormatter();
  const isInvestmentLinked = transaction?.investment?.id != null;
  const restriction = "Linked investment activity cannot be edited or deleted separately.";
  const footer = (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 1.5,
      }}
    >
      <Button type="button" variant="outlined" onClick={onClose}>
        Close
      </Button>
      {transaction ? (
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {onDelete ? (
            <Tooltip title={isInvestmentLinked ? restriction : ""}>
              <span>
                <Button
                  type="button"
                  color="error"
                  variant="outlined"
                  disabled={isInvestmentLinked}
                  onClick={() => onDelete(transaction)}
                >
                  Delete
                </Button>
              </span>
            </Tooltip>
          ) : null}
          {onEdit ? (
            <Tooltip title={isInvestmentLinked ? restriction : ""}>
              <span>
                <Button
                  type="button"
                  variant="contained"
                  disabled={isInvestmentLinked}
                  onClick={() => onEdit(transaction)}
                >
                  Edit Transaction
                </Button>
              </span>
            </Tooltip>
          ) : null}
        </Box>
      ) : null}
    </Box>
  );

  const isMovementType =
    transaction?.type === "TRANSFER" || transaction?.type === "INVESTMENT";
  const movementTone = transaction?.type === "TRANSFER"
    ? "transfer"
    : transaction?.type === "INVESTMENT"
    ? "investment"
    : undefined;
  const amountTone = transaction?.type === "EXPENSE" ? "error" : "success";
  const sourceLabel = transaction?.sourceAccountId != null
    ? accountNameById[Number(transaction.sourceAccountId)] || String(transaction.sourceAccountId)
    : "Not provided";
  const destinationLabel = transaction?.destinationAccountId != null
    ? accountNameById[Number(transaction.destinationAccountId)] || String(transaction.destinationAccountId)
    : "Not provided";

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
          {isInvestmentLinked ? (
            <Alert severity="info" sx={{ overflowWrap: "anywhere" }}>
              <AlertTitle>Linked investment transaction</AlertTitle>
              This transaction was recorded as part of investment activity for{" "}
              <strong>{transaction.investment?.name}</strong> and cannot be edited or deleted separately.
              {onViewInvestment && transaction.investment ? (
                <Box sx={{ mt: 1 }}>
                  <Button
                    size="small"
                    startIcon={<Icon path={mdiOpenInNew} size={0.7} />}
                    onClick={() => onViewInvestment(String(transaction.investment!.id))}
                  >
                    View Investment
                  </Button>
                </Box>
              ) : null}
            </Alert>
          ) : null}
          <SectionCard>
            <Box
              sx={{
                borderRadius: 1.5,
                px: 2,
                py: 2.5,
                background: (theme) => {
                  const tone =
                    transaction.type === "EXPENSE"
                      ? theme.palette.error.main
                      : theme.palette.success.main;
                  return `linear-gradient(180deg, ${tone}18 0%, ${theme.palette.background.paper} 100%)`;
                },
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
                      color: movementTone ? `movement.${movementTone}` : `${amountTone}.main`,
                    }}
                  >
                    {transaction.type === "EXPENSE" ? "-" : isMovementType ? "" : "+"}{" "}
                    {formatCurrency(transaction.amount)}
                  </Typography>
                </Box>
                <StatusChip
                  label={transaction.type || "Unknown"}
                  tone={movementTone || amountTone}
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
                    {sourceLabel}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Destination account
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 600 }}>
                    {destinationLabel}
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
                    Investment
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 600 }}>
                    {transaction.investment?.name || "No linked investment"}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Investment event
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 600 }}>
                    {transaction.investmentEventType || "Not applicable"}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Date
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 600 }}>
                    {formatDate(
                      transaction.date || transaction.createdAt || Date.now(),
                    )}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Created
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 600 }}>
                    {formatDate(
                      transaction.createdAt || transaction.date || Date.now(),
                    )}
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
