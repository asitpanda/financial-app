// @ts-nocheck
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Modal,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import AppButton from '../../../components/common/AppButton';
import {
  LabelCurrencyField,
  LabeledDateField,
  LabeledSelectField,
  LabeledTextField,
  LabeledTextareaField,
} from '../../../components/common';
import { getProfitLossHexColor } from '../../../colors';
import { INVESTMENT_BENEFIT_OPTIONS } from '../../../utils/investmentHelpers';
import {
  useRecordInvestmentContribution,
  useRecordInvestmentIncomeCredit,
  useRecordInvestmentWithdrawal,
  useSkipCurrentInvestmentContribution,
  useUpdateInvestmentEvent,
} from '../hooks/useContributionPlans';
import { useCreateInvestmentBenefit, useUpdateInvestmentBenefit } from '../hooks/useInvestmentBenefits';
import { useNotificationStore } from '../../../store/notificationStore';
import { INVESTMENT_EVENT_TYPES } from '../../../types/investmentEventTypes';

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: 'calc(100% - 32px)', sm: 520 },
  maxHeight: 'calc(100vh - 32px)',
  overflowY: 'auto',
  bgcolor: 'background.paper',
  borderRadius: 2,
  boxShadow: 24,
  p: 3,
};

const MODES = {
  contribution: {
    label: 'Contribution',
    title: 'Record Contribution',
    submitLabel: 'Record Contribution',
    dateLabel: 'Contribution date',
    helperText: 'Moves money from the linked funding account and increases invested principal.',
  },
  withdrawal: {
    label: 'Principal Withdrawal',
    title: 'Record Principal Withdrawal',
    submitLabel: 'Record Withdrawal',
    dateLabel: 'Withdrawal date',
    helperText: 'Moves principal back to the linked receiving account and reduces invested principal.',
  },
  income_credit: {
    label: 'Income Credit',
    title: 'Capture Income Credit',
    submitLabel: 'Capture Income Credit',
    dateLabel: 'Credit date',
    helperText: 'Records income retained inside this investment. No money enters a financial account.',
  },
  benefit: {
    label: 'Benefit',
    title: 'Add Investment Benefit',
    submitLabel: 'Add Benefit',
    dateLabel: 'Expected benefit date',
    helperText: 'Adds a future contractual payout to this investment.',
  },
};

const formatCurrency = (value) => {
  const amount = Number(value) || 0;
  return `₹${Math.abs(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

export default function RecordInvestmentActivityModal({
  open,
  onClose,
  investment,
  contributionPlan,
  accounts = [],
  initialMode = 'contribution',
  editingEvent = null,
  editingBenefit = null,
}) {
  const isEditing = Boolean(editingEvent?.id);
  const isEditingBenefit = Boolean(editingBenefit?.id);
  const [mode, setMode] = useState(isEditingBenefit ? 'benefit' : isEditing ? 'income_credit' : initialMode);
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [amount, setAmount] = useState('');
  const [benefitType, setBenefitType] = useState('MATURITY');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [action, setAction] = useState(null);
  const recordContribution = useRecordInvestmentContribution();
  const recordWithdrawal = useRecordInvestmentWithdrawal();
  const recordIncomeCredit = useRecordInvestmentIncomeCredit();
  const updateInvestmentEvent = useUpdateInvestmentEvent();
  const createInvestmentBenefit = useCreateInvestmentBenefit();
  const updateInvestmentBenefit = useUpdateInvestmentBenefit();
  const skipContribution = useSkipCurrentInvestmentContribution();
  const pushNotification = useNotificationStore((state) => state.pushNotification);
  const pending = Boolean(action);
  const modeConfig = MODES[mode];
  const resolvedAccountId =
    investment?.accountId != null && investment?.accountId !== ''
      ? String(investment.accountId)
      : '';
  const linkedAccount = accounts.find(
    (account) => String(account.id) === resolvedAccountId,
  );
  const accountLabel =
    linkedAccount?.displayName ||
    linkedAccount?.name ||
    linkedAccount?.institutionName ||
    (resolvedAccountId ? `Account ${resolvedAccountId}` : 'No linked account');
  const availableBalance = Number(linkedAccount?.currentBalance ?? 0);
  const hasLinkedAccount = Boolean(resolvedAccountId);
  const currentValue = Number(investment?.currentValue ?? investment?.totalInvested ?? 0);
  const totalInvested = Number(investment?.totalInvested ?? 0);

  useEffect(() => {
    if (!open) return;
    if (isEditingBenefit) {
      setMode('benefit');
      setDate(editingBenefit?.benefitDate ? dayjs(editingBenefit.benefitDate).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'));
      setAmount(editingBenefit?.amount != null ? String(editingBenefit.amount) : '');
      setBenefitType(editingBenefit?.benefitType || 'MATURITY');
      setNotes(editingBenefit?.notes || '');
      setError('');
      setAction(null);
      return;
    }
    if (isEditing) {
      setMode('income_credit');
      setDate(editingEvent?.eventDate ? dayjs(editingEvent.eventDate).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'));
      setAmount(editingEvent?.amount != null ? String(editingEvent.amount) : '');
      setNotes(editingEvent?.notes || '');
      setError('');
      setAction(null);
      return;
    }
    setMode(initialMode);
    setDate(dayjs().format('YYYY-MM-DD'));
    setAmount(contributionPlan?.amount && initialMode === 'contribution' ? String(contributionPlan.amount) : '');
    setBenefitType('MATURITY');
    setNotes('');
    setError('');
    setAction(null);
  }, [open, investment?.id, contributionPlan?.id, contributionPlan?.amount, initialMode, isEditing, editingEvent, isEditingBenefit, editingBenefit]);

  const handleModeChange = (_event, nextMode) => {
    if (!nextMode || pending || isEditing) return;
    setMode(nextMode);
    setAmount(nextMode === 'contribution' && contributionPlan?.amount ? String(contributionPlan.amount) : '');
    setError('');
  };

  const submit = async () => {
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      setError('Enter a positive amount.');
      return;
    }

    if (mode === 'withdrawal' && numericAmount > Number(investment?.totalInvested || 0)) {
      setError('Withdrawal cannot exceed invested principal.');
      return;
    }

    setAction('record');
    setError('');
    try {
      if (isEditingBenefit) {
        await updateInvestmentBenefit.mutateAsync({
          investmentId: String(investment.id),
          benefitId: editingBenefit.id,
          payload: {
            benefitType,
            amount: numericAmount,
            benefitDate: date,
            notes: notes || undefined,
          },
        });
      } else if (isEditing) {
        await updateInvestmentEvent.mutateAsync({
          investmentId: String(investment.id),
          eventId: editingEvent.id,
          payload: {
            eventDate: date,
            amount: numericAmount,
            netAmount: numericAmount,
            notes: notes || undefined,
          },
        });
      } else if (mode === 'contribution') {
        await recordContribution.mutateAsync({
          investmentId: String(investment.id),
          ...(contributionPlan?.id ? { contributionPlanId: String(contributionPlan.id) } : {}),
          amount: numericAmount,
          transactionDate: date,
          notes: notes || `Contribution for ${investment.name}`,
        });
      } else if (mode === 'withdrawal') {
        await recordWithdrawal.mutateAsync({
          investmentId: String(investment.id),
          amount: numericAmount,
          transactionDate: date,
          notes: notes || undefined,
        });
      } else if (mode === 'benefit') {
        await createInvestmentBenefit.mutateAsync({
          investmentId: String(investment.id),
          payload: {
            benefitType,
            amount: numericAmount,
            benefitDate: date,
            notes: notes || undefined,
          },
        });
      } else {
        await recordIncomeCredit.mutateAsync({
          investmentId: String(investment.id),
          payload: {
            eventType: INVESTMENT_EVENT_TYPES.INCOME_CREDIT,
            status: 'CONFIRMED',
            eventSource: 'MANUAL',
            eventDate: date,
            amount: numericAmount,
            netAmount: numericAmount,
            notes: notes || undefined,
          },
        });
      }

      pushNotification({ type: 'success', message: isEditingBenefit ? 'Investment benefit updated successfully' : isEditing ? 'Income credit updated successfully' : `${modeConfig.label} recorded successfully` });
      onClose();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.message || `Failed to record ${modeConfig.label.toLowerCase()}`);
    } finally {
      setAction(null);
    }
  };

  const skipCurrentContribution = async () => {
    if (!investment?.id || !contributionPlan?.id) return;

    setAction('skip');
    setError('');
    try {
      await skipContribution.mutateAsync({
        investmentId: investment.id,
        planId: contributionPlan.id,
        payload: { notes: notes || undefined },
      });
      pushNotification({ type: 'success', message: 'Scheduled contribution skipped' });
      onClose();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.message || 'Failed to skip contribution');
    } finally {
      setAction(null);
    }
  };

  const showAccount = !isEditing && !isEditingBenefit && (mode === 'contribution' || mode === 'withdrawal');
  const accountLabelText = mode === 'contribution' ? 'Funding account' : 'Receiving account';
  const showSkip = !isEditing && !isEditingBenefit && mode === 'contribution' && Boolean(contributionPlan?.id && contributionPlan?.nextDueDate);

  return (
    <Modal open={open} onClose={pending ? undefined : onClose} aria-labelledby="record-investment-activity-modal">
      <Box sx={modalStyle}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'flex-start' },
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography id="record-investment-activity-modal" variant="h6" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
              {isEditingBenefit ? 'Edit Investment Benefit' : isEditing ? 'Edit Income Credit' : 'Record Investment Activity'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {investment?.name}
            </Typography>
          </Box>
          <Box sx={{ flexShrink: 0, textAlign: { xs: 'left', sm: 'right' } }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Current:{' '}
              <Typography
                component="span"
                variant="inherit"
                sx={{ fontWeight: 700, color: getProfitLossHexColor(currentValue - totalInvested) }}
              >
                {formatCurrency(currentValue)}
              </Typography>
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
              Invested:{' '}
              <Typography component="span" variant="inherit" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {formatCurrency(totalInvested)}
              </Typography>
            </Typography>
          </Box>
        </Box>

        {!isEditing && !isEditingBenefit ? (
          <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            value={mode}
            onChange={handleModeChange}
            aria-label="Investment activity type"
            sx={{ mt: 2.25 }}
          >
            {Object.entries(MODES).map(([value, config]) => (
              <ToggleButton
                key={value}
                value={value}
                aria-label={config.label}
                sx={{
                  textTransform: 'none',
                  flex: 1,
                  whiteSpace: 'nowrap',
                  '&.Mui-selected': {
                    color: 'primary.contrastText',
                    bgcolor: 'primary.main',
                    borderColor: 'primary.main',
                  },
                  '&.Mui-selected:hover': {
                    bgcolor: 'primary.dark',
                  },
                }}
              >
                {config.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        ) : null}

        <Stack spacing={1} sx={{ mt: 2.25 }}>
          <Alert severity={mode === 'income_credit' || mode === 'benefit' ? 'info' : 'warning'}>{modeConfig.helperText}</Alert>

          {mode === 'benefit' ? (
            <LabeledSelectField
              labelText="Benefit type"
              value={benefitType}
              onChange={(event) => setBenefitType(event.target.value)}
              options={INVESTMENT_BENEFIT_OPTIONS}
            />
          ) : null}

          {showAccount ? (
            <LabeledTextField
              labelText={accountLabelText}
              value={accountLabel}
              errorMessage={!hasLinkedAccount ? 'No linked account' : ''}
              helperText={
                hasLinkedAccount ? (
                  <>
                    Current available amount:{' '}
                    <Typography component="span" variant="inherit" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      {formatCurrency(availableBalance)}
                    </Typography>
                  </>
                ) : mode === 'contribution' ? (
                  "This contribution uses the investment's linked account."
                ) : (
                  "This withdrawal is deposited into the investment's linked account."
                )
              }
              slotProps={{ input: { readOnly: true } }}
            />
          ) : null}

          {mode === 'contribution' && contributionPlan?.nextDueDate ? (
            <LabeledTextField
              labelText="Scheduled due contribution"
              value={dayjs(contributionPlan.nextDueDate).format('DD MMM YYYY')}
              slotProps={{ input: { readOnly: true } }}
            />
          ) : null}

          <LabeledDateField
            labelText={modeConfig.dateLabel}
            value={date ? dayjs(date) : null}
            onChange={(value) => setDate(value ? value.format('YYYY-MM-DD') : '')}
          />
          <LabelCurrencyField
            labelText="Amount (₹)"
            value={amount}
            onValueChange={setAmount}
          />
          <LabeledTextareaField
            labelText="Notes (Optional)"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            minRows={2}
          />
          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column-reverse', sm: 'row' },
            justifyContent: 'space-between',
            gap: 1,
            mt: 3,
          }}
        >
          <AppButton variant="outlined" onClick={onClose} disabled={pending} sx={{ whiteSpace: 'nowrap' }}>
            Cancel
          </AppButton>
          <Box sx={{ display: 'flex', gap: 1, flex: { sm: 1 }, justifyContent: { sm: 'flex-end' } }}>
            {showSkip ? (
              <AppButton variant="outlined" color="warning" onClick={skipCurrentContribution} disabled={pending} sx={{ whiteSpace: 'nowrap' }}>
                {action === 'skip' ? <CircularProgress size={18} sx={{ mr: 0.75 }} /> : null}
                Skip Current
              </AppButton>
            ) : null}
            <AppButton
              variant="contained"
              onClick={submit}
              disabled={pending || (showAccount && !hasLinkedAccount)}
              sx={{ whiteSpace: 'nowrap' }}
            >
              {action === 'record' ? <CircularProgress size={18} sx={{ mr: 0.75 }} /> : null}
              {isEditingBenefit || isEditing ? 'Save Changes' : modeConfig.submitLabel}
            </AppButton>
          </Box>
        </Box>
      </Box>
    </Modal>
  );
}