import { useState } from "react";
import Icon from "@mdi/react";
import { mdiEyeOffOutline, mdiEyeOutline } from "@mdi/js";
import { Alert, Box, IconButton, Stack } from "@mui/material";
import dayjs from "dayjs";
import AppDrawer from "../../../components/drawers/AppDrawer";
import AppButton from "../../../components/common/AppButton";
import {
  LabeledDateField,
  LabeledSelectField,
  LabeledTextField,
} from "../../../components/common";
import { useNotificationStore } from "../../../store/notificationStore";
import { useCreateLockerRecord, useUpdateLockerRecord } from "../useLocker";
import { getErrorMessage } from "../locker.utils";
import type {
  CreateLockerRecordInput,
  LockerEntity,
  LockerRecord,
} from "../locker.types";

interface LockerRecordFormDrawerProps {
  record?: LockerRecord;
  entities: LockerEntity[];
  defaultEntityUid?: string;
  onClose: () => void;
}

export default function LockerRecordFormDrawer({
  record,
  entities,
  defaultEntityUid,
  onClose,
}: LockerRecordFormDrawerProps) {
  const initialEntityUid =
    record?.entityUid || defaultEntityUid || entities[0]?.uid || "";
  const [entityUid, setEntityUid] = useState(initialEntityUid);
  const [label, setLabel] = useState(record?.label || "");
  const [values, setValues] = useState<Record<string, string | null>>(
    record?.values || {},
  );
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const createMutation = useCreateLockerRecord();
  const updateMutation = useUpdateLockerRecord();
  const pushNotification = useNotificationStore(
    (state) => state.pushNotification,
  );
  const entity = entities.find((candidate) => candidate.uid === entityUid);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const setValue = (fieldUid: string, value: string | null) =>
    setValues((current) => ({ ...current, [fieldUid]: value }));

  const save = async () => {
    if (!entityUid || !entity) return setError("Choose an information type.");
    if (!label.trim()) return setError("Enter a record name.");
    const payload: CreateLockerRecordInput = {
      entityUid,
      label: label.trim(),
      values,
    };
    try {
      if (record)
        await updateMutation.mutateAsync({
          uid: record.uid,
          data: { label: payload.label, values: payload.values },
        });
      else await createMutation.mutateAsync(payload);
      pushNotification({
        type: "success",
        message: record
          ? "Stored information updated"
          : "Stored information created",
      });
      onClose();
    } catch (mutationError) {
      setError(
        getErrorMessage(mutationError, "Unable to save this information."),
      );
    }
  };

  return (
    <AppDrawer
      open
      title={record ? "Edit stored information" : "New stored information"}
      subtitle="Values are stored against the selected information type."
      onClose={onClose}
      width={560}
      footer={
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
          <AppButton variant="outlined" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton
            variant="contained"
            onClick={save}
            disabled={isSaving || !entities.length}
          >
            {isSaving ? "Saving..." : "Save information"}
          </AppButton>
        </Box>
      }
    >
      <Stack spacing={2}>
        {error ? <Alert severity="error">{error}</Alert> : null}
        <LabeledSelectField
          labelText="Information type"
          value={entityUid}
          disabled={Boolean(record)}
          options={entities.map((candidate) => ({
            value: candidate.uid,
            label: candidate.label,
          }))}
          onChange={(event) => {
            setEntityUid(event.target.value);
            setValues({});
          }}
        />
        <LabeledTextField
          labelText="Record name"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Primary Savings Account"
        />
        {entity?.fields.map((field) => {
          const value = values[field.uid] || "";
          if (field.type === "select") {
            return (
              <LabeledSelectField
                key={field.uid}
                labelText={field.label}
                value={value}
                options={[
                  { value: "", label: "Not set" },
                  ...(field.options || []).map((option) => ({
                    value: option.value,
                    label: option.label,
                  })),
                ]}
                onChange={(event) =>
                  setValue(field.uid, event.target.value || null)
                }
              />
            );
          }
          if (field.type === "date") {
            return (
              <LabeledDateField
                key={field.uid}
                labelText={field.label}
                value={value ? dayjs(value) : null}
                onChange={(date) =>
                  setValue(
                    field.uid,
                    date?.isValid() ? date.format("YYYY-MM-DD") : null,
                  )
                }
              />
            );
          }
          const isMasked = field.masked || field.type === "password";
          return (
            <Box
              key={field.uid}
              sx={{
                display: "flex",
                alignItems: "flex-start",
                gap: isMasked ? 0.5 : 0,
              }}
            >
              <LabeledTextField
                fullWidth
                labelText={field.label}
                type={
                  isMasked && !revealed[field.uid]
                    ? "password"
                    : field.type === "number"
                      ? "number"
                      : "text"
                }
                inputMode={field.type === "number" ? "decimal" : undefined}
                value={value}
                onChange={(event) =>
                  setValue(field.uid, event.target.value || null)
                }
              />
              {isMasked ? (
                <IconButton
                  aria-label={
                    revealed[field.uid]
                      ? `Hide ${field.label}`
                      : `Show ${field.label}`
                  }
                  title={revealed[field.uid] ? "Hide value" : "Show value"}
                  onClick={() =>
                    setRevealed((current) => ({
                      ...current,
                      [field.uid]: !current[field.uid],
                    }))
                  }
                  sx={{ mt: 2.8 }}
                >
                  <Icon
                    path={
                      revealed[field.uid] ? mdiEyeOffOutline : mdiEyeOutline
                    }
                    size={0.8}
                  />
                </IconButton>
              ) : null}
            </Box>
          );
        })}
        {!entity?.fields.length ? (
          <Alert severity="info">
            This information type has no fields yet.
          </Alert>
        ) : null}
      </Stack>
    </AppDrawer>
  );
}
