import { useMemo, useCallback } from 'react';
import { Button, Box, Stack } from '@mui/material';
import { DataGrid, GridActionsCellItem  } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';


const actionTypes = ['number', 'time', 'string', 'bool', 'void', 'color'];
const actionColumns = [
        {field: 'name', headerName: 'Name', type: 'string', width: 160, editable: true, sortable: false, filterable: false},
        {field: 'byte', headerName: 'Byte', type: 'number', width: 100, editable: true, sortable: false, filterable: false},
        {field: 'type', headerName: 'Type', type: 'singleSelect', valueOptions: actionTypes, width: 120, editable: true, sortable: false, filterable: false},
        {field: 'description', headerName: 'Description', type:'string', flex: 1, editable: true, sortable: false, filterable: false}
];


export default function Actions({ actions, setActions }) {
    const actionsWithIds = useMemo(() => actions.map((item, index) => ({ id: index, ...item }))
    , [actions]);

    const processRowUpdate = useCallback( (newRow) => {
        setActions((prev) => prev.map((row, index) => index === newRow.id ? {name: newRow.name, byte: newRow.byte, type: newRow.type, description: newRow.description} : row));
        return newRow;
    }, [setActions]);

    const handleAddRow = useCallback(() => {
        const newAction = { name: '', byte: 0, type: actionTypes[0], description: '' };
        setActions((prev) => [...prev, newAction]);
    }, [setActions]);

    const handleDeleteRow = useCallback( (id) => {
        setActions((prev) => {
            const filtered = prev.filter((row, index) => index !== id)
            return filtered.map( item => ({name: item.name, byte: item.byte, type: item.type, description: item.description}));
    });
    }, [setActions]);

    const localActionColumns = useMemo(() => [...actionColumns,
        {
            field: 'actions',
            type: 'actions',
            headerName: '',
            width: 60,
            getActions: (params) => [
            <GridActionsCellItem
                icon={<DeleteIcon />}
                label="Delete"
                onClick={() => handleDeleteRow(params.id)}
                showInMenu={true}
            />,
            ],
        },
    ], [handleDeleteRow]);



    return (
        <Stack sx={{ width: '100%', height: '100%' }}>
            <h2>Actions</h2>
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <DataGrid
                    rows={actionsWithIds}
                    columns={localActionColumns}
                    processRowUpdate={processRowUpdate}
                    sx={{ flex: 1 }}
                    disableSelectionOnClick
                    hideFooterPagination
                    disableColumnSelector
                    disableColumnMenu
                    disableColumnSorting
                    disableColumnFilter
                />
            </Box>
            <Button variant="contained" onClick={handleAddRow}>
                + Add Action
            </Button>
        </Stack>
    );
}