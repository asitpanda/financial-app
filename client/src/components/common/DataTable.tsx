import { Box, type SxProps, type Theme } from '@mui/material';
import { DataGrid, type DataGridProps } from '@mui/x-data-grid';

type DataTableProps = DataGridProps & {
  containerSx?: SxProps<Theme>;
};

export default function DataTable(props: DataTableProps) {
  const { containerSx, ...dataGridProps } = props;

  return (
    <Box
      sx={{
        width: '100%',
        height: { xs: 480, sm: 560, md: 620 },
        minHeight: 0,
        ...containerSx,
      }}
    >
      <DataGrid
        disableRowSelectionOnClick
        pageSizeOptions={[10, 25, 50, 100]}
        sx={{
          height: '100%',
          borderColor: 'divider',
          '& .MuiDataGrid-columnHeaders': { backgroundColor: 'action.hover' },
          '& .MuiDataGrid-cell': {
            display: 'flex',
            alignItems: 'center',
          },
        }}
        {...dataGridProps}
      />
    </Box>
  );
}
