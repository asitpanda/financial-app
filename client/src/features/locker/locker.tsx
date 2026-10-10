import { useMemo, useState } from "react";
import Icon from "@mdi/react";
import { mdiPencilOutline, mdiDeleteOutline } from "@mdi/js";
import {
  Alert,
  Box,
  CircularProgress,
  IconButton,
  Stack,
  Tab,
  Tabs,
} from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import ConfirmDialog from "../../components/dialogs/ConfirmDialog";
import { useHeaderAction } from "../../hooks/useHeaderAction";
import LockerEntityFormDrawer from "./components/LockerEntityFormDrawer";
import LockerRecordFormDrawer from "./components/LockerRecordFormDrawer";
import {
  DataTable,
  EmptyState,
  LabeledSelectField,
  SectionCard,
} from "../../components/common";
import { useNotificationStore } from "../../store/notificationStore";
import {
  useDeleteLockerEntity,
  useDeleteLockerRecord,
  useLockerEntities,
  useLockerRecords,
} from "./useLocker";
import { formatDate, getErrorMessage } from "./locker.utils";
import type { LockerEntity, LockerRecord } from "./locker.types";

type TabValue = "entities" | "records";
type DeleteTarget = {
  type: "entity" | "record";
  uid: string;
  label: string;
} | null;

export default function Locker() {
  const [tab, setTab] = useState<TabValue>("entities");
  const [entityForm, setEntityForm] = useState<{
    open: boolean;
    entity?: LockerEntity;
  }>({ open: false });
  const [recordForm, setRecordForm] = useState<{
    open: boolean;
    record?: LockerRecord;
    entityUid?: string;
  }>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [recordFilter, setRecordFilter] = useState("all");
  const entitiesQuery = useLockerEntities();
  const recordsQuery = useLockerRecords(
    recordFilter === "all" ? undefined : recordFilter,
  );
  const deleteEntityMutation = useDeleteLockerEntity();
  const deleteRecordMutation = useDeleteLockerRecord();
  const pushNotification = useNotificationStore(
    (state) => state.pushNotification,
  );
  const entities = useMemo(
    () => entitiesQuery.data || [],
    [entitiesQuery.data],
  );
  const records = useMemo(() => recordsQuery.data || [], [recordsQuery.data]);
  const entityByUid = useMemo(
    () => new Map(entities.map((entity) => [entity.uid, entity])),
    [entities],
  );

  useHeaderAction(
    "locker",
    tab === "entities"
      ? {
          label: "New entity",
          onClick: () => setEntityForm({ open: true }),
        }
      : {
          label: "New record",
          onClick: () =>
            setRecordForm({
              open: true,
              entityUid:
                recordFilter === "all" ? entities[0]?.uid : recordFilter,
            }),
          disabled: !entities.length,
        },
  );

  const entityRows = useMemo(
    () =>
      entities.map((entity) => ({
        ...entity,
        id: entity.uid,
        fieldCount: entity.fields.length,
      })),
    [entities],
  );
  const recordRows = useMemo(
    () =>
      records.map((record) => ({
        ...record,
        id: record.uid,
        entityLabel:
          entityByUid.get(record.entityUid)?.label || "Unknown entity",
      })),
    [records, entityByUid],
  );

  const entityColumns: GridColDef[] = [
    { field: "label", headerName: "Entity", flex: 1, minWidth: 220 },
    { field: "fieldCount", headerName: "Fields", width: 110 },
    {
      field: "createdAt",
      headerName: "Created",
      width: 150,
      valueFormatter: (value) => formatDate(value),
    },
    {
      field: "actions",
      headerName: "",
      width: 110,
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => (
        <Stack direction="row">
          <IconButton
            aria-label={`Edit ${row.label}`}
            title="Edit"
            onClick={() => setEntityForm({ open: true, entity: row })}
          >
            <Icon path={mdiPencilOutline} size={0.8} />
          </IconButton>
          <IconButton
            aria-label={`Delete ${row.label}`}
            title="Delete"
            onClick={() =>
              setDeleteTarget({
                type: "entity",
                uid: row.uid,
                label: row.label,
              })
            }
          >
            <Icon path={mdiDeleteOutline} size={0.8} />
          </IconButton>
        </Stack>
      ),
    },
  ];
  const recordColumns: GridColDef[] = [
    { field: "label", headerName: "Record", flex: 1, minWidth: 220 },
    { field: "entityLabel", headerName: "Entity", flex: 0.8, minWidth: 180 },
    {
      field: "values",
      headerName: "Stored fields",
      width: 130,
      valueGetter: (value) => Object.keys(value || {}).length,
    },
    {
      field: "updatedAt",
      headerName: "Updated",
      width: 150,
      valueFormatter: (value) => formatDate(value),
    },
    {
      field: "actions",
      headerName: "",
      width: 110,
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => (
        <Stack direction="row">
          <IconButton
            aria-label={`Edit ${row.label}`}
            title="Edit"
            onClick={() => setRecordForm({ open: true, record: row })}
          >
            <Icon path={mdiPencilOutline} size={0.8} />
          </IconButton>
          <IconButton
            aria-label={`Delete ${row.label}`}
            title="Delete"
            onClick={() =>
              setDeleteTarget({
                type: "record",
                uid: row.uid,
                label: row.label,
              })
            }
          >
            <Icon path={mdiDeleteOutline} size={0.8} />
          </IconButton>
        </Stack>
      ),
    },
  ];

  const deleteTargetItem = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "entity")
        await deleteEntityMutation.mutateAsync(deleteTarget.uid);
      else await deleteRecordMutation.mutateAsync(deleteTarget.uid);
      pushNotification({
        type: "success",
        message: `${deleteTarget.type === "entity" ? "Entity" : "Record"} deleted`,
      });
      setDeleteTarget(null);
    } catch (mutationError) {
      pushNotification({
        type: "error",
        message: getErrorMessage(mutationError, "Unable to delete this item."),
      });
    }
  };

  const queryError = entitiesQuery.error || recordsQuery.error;
  const loading = entitiesQuery.isLoading || recordsQuery.isLoading;

  return (
    <Box sx={{ pb:3 }}>
      <Tabs
        value={tab}
        onChange={(_, value: TabValue) => setTab(value)}
        sx={{ mb: 2 }}
      >
        <Tab value="entities" label={`Entities (${entities.length})`} />
        <Tab value="records" label={`Records (${records.length})`} />
      </Tabs>

      {queryError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          Unable to load Locker data. Check your connection and try again.
        </Alert>
      ) : null}

      {loading ? (
        <Box sx={{ display: "grid", placeItems: "center", minHeight: 300 }}>
          <CircularProgress />
        </Box>
      ) : tab === "entities" ? (
        <SectionCard
          title="Information types"
          subtitle="Define reusable structures for the valuable information you want to store."
        >
          {entities.length ? (
            <DataTable
              rows={entityRows}
              columns={entityColumns}
              autoHeight={false}
            />
          ) : (
            <EmptyState
              text="No entities yet"
              subText="Create an information type such as Bank Details or Card Details to get started."
              actionLabel="Create entity"
              onAction={() => setEntityForm({ open: true })}
            />
          )}
        </SectionCard>
      ) : (
        <SectionCard
          title="Stored information"
          subtitle="View and manage all saved information, with optional filtering by type."
          action={
            <LabeledSelectField
              labelText="Filter"
              value={recordFilter}
              options={[
                { value: "all", label: "All types" },
                ...entities.map((entity) => ({
                  value: entity.uid,
                  label: entity.label,
                })),
              ]}
              onChange={(event) => setRecordFilter(event.target.value)}
              sx={{ minWidth: 190 }}
            />
          }
        >
          {records.length ? (
            <DataTable
              rows={recordRows}
              columns={recordColumns}
              autoHeight={false}
            />
          ) : (
            <EmptyState
              text="No records yet"
              subText={
                entities.length
                  ? "Add a record to one of your credential entities."
                  : "Create an entity before adding records."
              }
              actionLabel={entities.length ? "Create record" : "Create entity"}
              onAction={() =>
                entities.length
                  ? setRecordForm({ open: true, entityUid: entities[0].uid })
                  : setTab("entities")
              }
            />
          )}
        </SectionCard>
      )}

      {entityForm.open ? (
        <LockerEntityFormDrawer
          entity={entityForm.entity}
          onClose={() => setEntityForm({ open: false })}
        />
      ) : null}

      {recordForm.open ? (
        <LockerRecordFormDrawer
          record={recordForm.record}
          entities={entities}
          defaultEntityUid={recordForm.entityUid}
          onClose={() => setRecordForm({ open: false })}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.type || "item"}?`}
        description={`This will permanently delete “${deleteTarget?.label || ""}”.${
          deleteTarget?.type === "entity"
            ? " Its records will also be deleted."
            : ""
        }`}
        loading={
          deleteEntityMutation.isPending || deleteRecordMutation.isPending
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirm={deleteTargetItem}
      />
    </Box>
  );
}
