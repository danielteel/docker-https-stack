import { useMemo, useCallback } from 'react';
import { Button, Box, Stack } from '@mui/material';
import { DataGrid, GridActionsCellItem  } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';


const logItemTypes = ['number', 'degree', 'percent', 'bool', 'string', 'time'];
const logItemColumns=[
        {field: 'name', headerName: 'Name', type: 'string', width: 160, editable: true, sortable: false, filterable: false},
        {field: 'type', headerName: 'Type', type: 'singleSelect', valueOptions: logItemTypes, width: 100, editable: true, sortable: false, filterable: false},
        {field: 'stored', headerName: 'Stored', type:'boolean', editable: true, sortable: false, filterable: false},
        {field: 'description', headerName: 'Description', type:'string', flex: 1, editable: true, sortable: false, filterable: false}
];


export default function LogItems({logItems, setLogItems}){
    const logItemsWithIds = useMemo(() => {
        return logItems.map((item, index) => ({ id: index, ...item }))
    }, [logItems]);

    const processRowUpdate = useCallback((newRow) => {
        setLogItems((prev) => prev.map((row, index) => (index === newRow.id ? {name: newRow.name, type: newRow.type, stored: newRow.stored, description: newRow.description} : row)));
        return newRow;
    }, [setLogItems]);

    const handleAddRow = useCallback(() => {
        const newItem = { name: '', type: logItemTypes[0], stored: false, description: '' };
        setLogItems((prev) => [...prev, newItem]);
    }, [setLogItems]);
    
    const handleDeleteRow = useCallback( (id) => {
        setLogItems((prev) => {
            const filtered = prev.filter((row, index) => index !== id)
            return filtered.map( item => ({name: item.name, type: item.type, stored: item.stored, description: item.description}));
    });
    }, [setLogItems]);

    const localLogItemColumns = useMemo(() => [...logItemColumns,
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
    }], [handleDeleteRow]);

    return (
        <Stack sx={{width:'100%', height:'100%'}}>
            <h2>Log Items</h2>
            <Box sx={{flex: 1, display: 'flex', flexDirection: 'column', minHeight:0}}>
                <DataGrid 
                    rows={logItemsWithIds} 
                    columns={localLogItemColumns} 
                    processRowUpdate={processRowUpdate} 
                    sx={{flex: 1}} 
                    disableSelectionOnClick 
                    hideFooterPagination 
                    disableColumnSelector
                    disableColumnMenu
                    disableColumnSorting
                    disableColumnFilter
                />
            </Box>
            <Button variant="contained" onClick={handleAddRow}>
                + Add Log Item
            </Button>
        </Stack>
    );
}
