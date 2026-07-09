import React, { useMemo } from "react";
import { Box, Typography } from "@mui/material";
import Icon from "@mdi/react";
import { mdiCheckBold } from "@mdi/js";
import dayjs from "dayjs";
import Button from "../common/AppButton";
import { EmptyState, ProgressBar, SectionCard, StatusChip } from "../common";
import AppDrawer from "./AppDrawer";

const getGoalId = (goal) => goal?._id || goal?.id;

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString()}`;

const formatGoalDate = (value) => (value ? dayjs(value).format("MMM D, YYYY") : "Not set");

const getGoalStartDate = (goal) => goal?.startDate || goal?.createdAt;

const getProgress = (goal) => {
  const target = Number(goal?.targetAmount || 0);
  const current = Number(goal?.currentAmount || 0);
  if (!target) return 0;
  return Math.min(100, Math.round((current / target) * 100));
};

const getGoalHealth = (goal) => {
  const progress = getProgress(goal);
  const deadline = goal?.deadline ? dayjs(goal.deadline) : null;
  const today = dayjs().startOf("day");

  if (progress >= 100) {
    return { label: "Completed", tone: "success" };
  }

  if (deadline) {
    const deadlineDay = deadline.startOf("day");
    if (deadlineDay.isBefore(today)) {
      return { label: "Overdue", tone: "negative" };
    }
    const daysLeft = deadlineDay.diff(today, "day");
    if (daysLeft <= 7) {
      return { label: "Due Soon", tone: "warning" };
    }
  }

  if (progress > 0 && progress < 40) {
    return { label: "At Risk", tone: "warning" };
  }
  if (progress >= 40) {
    return { label: "On Track", tone: "info" };
  }
  return { label: "Not Started", tone: "neutral" };
};

export default function GoalViewDrawer({
  open,
  onClose,
  goal,
  transactions = [],
  transactionsLoading = false,
  onDelete,
  onEdit,
  onAddTransaction,
  onCreateGoal,
  onViewAllTransactions,
}) {
  const contributionSummary = useMemo(() => {
    if (!goal) {
      return { items: [], totalAmount: 0, totalCount: 0 };
    }

    const selectedGoalId = getGoalId(goal);
    const linkedTransactions = [...transactions]
      .filter((tx) => tx.goalId && tx.goalId === selectedGoalId)
      .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

    return {
      items: linkedTransactions.slice(0, 5),
      totalCount: linkedTransactions.length,
      totalAmount: linkedTransactions.reduce((sum, tx) => {
        const amount = Number(tx.amount || 0);
        return sum + (tx.type === "expense" ? -amount : amount);
      }, 0),
    };
  }, [goal, transactions]);

  const health = goal ? getGoalHealth(goal) : null;
  const progress = goal ? getProgress(goal) : 0;
  const isCompleted = progress >= 100;

  const footer = (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1.5 }}>
      <Button type="button" variant="outlined" onClick={onClose}>
        Close
      </Button>
      {goal ? (
        <Box sx={{ display: "flex", gap: 1 }}>
          {onDelete ? (
            <Button type="button" color="error" variant="outlined" onClick={() => onDelete(goal)}>
              Delete
            </Button>
          ) : null}
          {onEdit ? (
            <Button type="button" variant="contained" onClick={() => onEdit(goal)}>
              Edit Goal
            </Button>
          ) : null}
        </Box>
      ) : null}
    </Box>
  );

  return (
    <AppDrawer
      open={open}
      onClose={onClose}
      title={goal?.name || "Goal Details"}
      subtitle="View progress and next actions"
      footer={footer}
    >
      {!goal ? (
        <EmptyState 
          title="Goal not found"
          description="This goal no longer exists or the list changed."
          actionLabel="Close"
          onAction={onClose}
        />
      ) : (
        <Box sx={{ display: "grid", gap: 2 }}>
          {isCompleted ? (
            <SectionCard>
              <Box
                sx={{
                  position: "relative",
                  overflow: "hidden",
                  borderRadius: 2,
                  px: { xs: 2, sm: 3 },
                  py: 3,
                  textAlign: "center",
                  background: "linear-gradient(180deg, #f8fffb 0%, #ffffff 100%)",
                }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage:
                      "radial-gradient(circle at 12% 22%, rgba(96, 165, 250, 0.4) 0, rgba(96, 165, 250, 0.4) 3px, transparent 4px), radial-gradient(circle at 84% 18%, rgba(251, 191, 36, 0.45) 0, rgba(251, 191, 36, 0.45) 3px, transparent 4px), radial-gradient(circle at 20% 78%, rgba(248, 113, 113, 0.35) 0, rgba(248, 113, 113, 0.35) 3px, transparent 4px), radial-gradient(circle at 76% 74%, rgba(167, 139, 250, 0.35) 0, rgba(167, 139, 250, 0.35) 3px, transparent 4px), radial-gradient(circle at 92% 58%, rgba(74, 222, 128, 0.35) 0, rgba(74, 222, 128, 0.35) 3px, transparent 4px), radial-gradient(circle at 36% 14%, rgba(244, 114, 182, 0.3) 0, rgba(244, 114, 182, 0.3) 3px, transparent 4px)",
                    opacity: 0.9,
                    pointerEvents: "none",
                  }}
                />

                <Box sx={{ position: "relative", display: "grid", justifyItems: "center", gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 104,
                      height: 104,
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      backgroundColor: "rgba(34, 197, 94, 0.12)",
                    }}
                  >
                    <Box
                      sx={{
                        width: 72,
                        height: 72,
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        background: "linear-gradient(180deg, #22c55e 0%, #16a34a 100%)",
                        boxShadow: "0 14px 32px rgba(34, 197, 94, 0.28)",
                      }}
                    >
                      <Icon path={mdiCheckBold} size={1.2} color="#ffffff" />
                    </Box>
                  </Box>

                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    Congratulations!
                  </Typography>
                  <Typography variant="body1" sx={{ color: "text.secondary" }}>
                    You have completed your goal
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {goal.name || "Untitled Goal"}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Great job on achieving your target.
                  </Typography>

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
                      gap: 1.5,
                      width: "100%",
                      maxWidth: 360,
                      mt: 1,
                    }}
                  >
                    <Button variant="contained" onClick={onClose}>
                      Back to Goals
                    </Button>
                    {onCreateGoal ? (
                      <Button variant="outlined" onClick={onCreateGoal}>
                        Add New Goal
                      </Button>
                    ) : null}
                  </Box>
                </Box>
              </Box>
            </SectionCard>
          ) : null}

          <SectionCard
            title="Progress Ratio"
            action={(
              <Typography variant="h3" sx={{ fontWeight: 800, lineHeight: 1, textAlign: "right" }}>
                {progress}%
              </Typography>
            )}
          >
            <Box sx={{ display: "grid", gap: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {formatCurrency(goal.currentAmount)} saved of {formatCurrency(goal.targetAmount)}
              </Typography>

              <ProgressBar label="Completion" value={progress} color={isCompleted ? "success" : "info"} />
            </Box>
          </SectionCard>

          <SectionCard title="Summary">
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
                gap: 1.5,
              }}
            >
              <Box>
                <Typography variant="caption" color="text.secondary">Target Amount</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 500, fontSize: 18, lineHeight: 1.2 }}>
                  {formatCurrency(goal.targetAmount)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Saved Amount</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 500, fontSize: 18, lineHeight: 1.2 }}>
                  {formatCurrency(goal.currentAmount)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Start Date</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 500, fontSize: 18, lineHeight: 1.2 }}>
                  {formatGoalDate(getGoalStartDate(goal))}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Deadline</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 500, fontSize: 18, lineHeight: 1.2 }}>
                  {formatGoalDate(goal.deadline)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Category</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 500, fontSize: 18, lineHeight: 1.2 }}>
                  {goal.category || "Uncategorized"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Health</Typography>
                <Box sx={{ mt: 1 }}>
                  <StatusChip label={health.label} tone={health.tone} />
                </Box>
              </Box>
            </Box>

            {goal.description ? (
              <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.5, p: 1.5, mt: 1.5 }}>
                <Typography variant="caption" color="text.secondary">About This Goal</Typography>
                <Typography variant="body2" sx={{ mt: 0.75, color: "text.primary" }}>
                  {goal.description}
                </Typography>
              </Box>
            ) : null}
          </SectionCard>

          <SectionCard
            title="Transaction Contributions"
            action={onAddTransaction ? (
              <Button size="small" variant="outlined" onClick={() => onAddTransaction(goal)}>
                Add Transaction
              </Button>
            ) : null}
          >
            <Box sx={{ display: "grid", gap: 1.25 }}>
              {transactionsLoading ? (
                <Typography variant="body2" color="text.secondary">Loading contribution transactions...</Typography>
              ) : contributionSummary.items.length === 0 ? (
                <EmptyState
                  text="No linked contributions yet"
                  subText="This goal will show only transactions explicitly linked to it. Add a mapped transaction when you want contribution history to appear here."
                  linkLabel={onViewAllTransactions ? "Map Transactions" : undefined}
                  onLinkAction={onViewAllTransactions ? () => onViewAllTransactions(goal) : undefined}
                  sx={{ mt: 1.5 }}
                  icon={(
                    <Box
                      sx={{
                        width: 26,
                        height: 26,
                        display: "grid",
                        placeItems: "center",
                        fontSize: 18,
                        fontWeight: 700,
                      }}
                    >
                      +
                    </Box>
                  )}
                />
              ) : (
                <Box sx={{ display: "grid", gap: 1.5 }}>
                  <Box sx={{ overflowX: "auto" }}>
                    <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                      <Box component="thead">
                        <Box component="tr">
                          <Box component="th" sx={{ py: 1, pr: 2, fontSize: 13, fontWeight: 600, color: "text.secondary" }}>
                            Date
                          </Box>
                          <Box component="th" sx={{ py: 1, pr: 2, fontSize: 13, fontWeight: 600, color: "text.secondary" }}>
                            Category
                          </Box>
                          <Box component="th" sx={{ py: 1, fontSize: 13, fontWeight: 600, color: "text.secondary", textAlign: "right" }}>
                            Amount
                          </Box>
                        </Box>
                      </Box>
                      <Box component="tbody">
                        {contributionSummary.items.map((tx) => (
                          <Box key={tx._id || tx.id} component="tr" sx={{ borderTop: "1px solid", borderColor: "divider" }}>
                            <Box component="td" sx={{ py: 1.5, pr: 2, fontSize: 14 }}>
                              {formatGoalDate(tx.date || tx.createdAt)}
                            </Box>
                            <Box component="td" sx={{ py: 1.5, pr: 2 }}>
                              <Typography variant="body2">
                                {tx.category || "Income"}
                              </Typography>
                            </Box>
                            <Box component="td" sx={{ py: 1.5, fontSize: 14, fontWeight: 700, color: "success.main", textAlign: "right" }}>
                              +{formatCurrency(tx.amount)}
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1.5,
                      px: 1.5,
                      py: 1.25,
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1.5,
                      backgroundColor: "background.default",
                    }}
                  >
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Total Contributions <Box component="span" sx={{ fontWeight: 600 }}>{contributionSummary.totalCount}</Box>
                      </Typography>
                    </Box>
                    {onViewAllTransactions ? (
                      <Button size="small" variant="text" onClick={() => onViewAllTransactions(goal)}>
                        View All
                      </Button>
                    ) : null}
                  </Box>
                </Box>
              )}
            </Box>
          </SectionCard>
        </Box>
      )}
    </AppDrawer>
  );
}