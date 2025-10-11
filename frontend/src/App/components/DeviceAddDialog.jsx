import {  useState, useEffect, useMemo, useCallback } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { Alert, Box, IconButton, List, ListItem, ListItemText, ListSubheader, Stack } from '@mui/material';
import LoadingButton from '@mui/lab/LoadingButton';

import DeleteIcon from '@mui/icons-material/Delete';
import { DataGrid, GridActionsCellItem  } from '@mui/x-data-grid';

function isHexadecimal(str){
    return /^[a-fA-F0-9]+$/i.test(str);
}

function isValidEncroKey(key){
    const trimmedKey = key.trim();
    if (isHexadecimal(key) && trimmedKey.length===64){
        return true;
    }
    return false;
}

function generateRandomEncroKey() {
    const randomBytes = new Uint8Array(32);
    window.crypto.getRandomValues(randomBytes);
    return Array.from(randomBytes).map((i) => i.toString(16).padStart(2, '0')).join('');
}


const actionTypes = ['number', 'time', 'string', 'bool', 'void', 'color'];
const actionColumns = [
        {field: 'name', headerName: 'Name', type: 'string', width: 200, editable: true, sortable: false, filterable: false},
        {field: 'byte', headerName: 'Byte', type: 'number', width: 120, editable: true, sortable: false, filterable: false},
        {field: 'type', headerName: 'Type', type: 'singleSelect', valueOptions: actionTypes, width: 120, editable: true, sortable: false, filterable: false},
        {field: 'description', headerName: 'Description', type:'string', flex: 1, editable: true, sortable: false, filterable: false}
];

const logItemTypes = ['number', 'degree', 'percent', 'bool', 'string', 'time'];
const logItemColumns=[
        {field: 'name', headerName: 'Name', type: 'string', width: 200, editable: true, sortable: false, filterable: false},
        {field: 'type', headerName: 'Type', type: 'singleSelect', valueOptions: logItemTypes, width: 120, editable: true, sortable: false, filterable: false},
        {field: 'description', headerName: 'Description', type:'string', flex: 1, editable: true, sortable: false, filterable: false}
];

function LogItems({logItems, setLogItems}){
    const logItemsWithIds = useMemo(() => {
        return logItems.map((item, index) => ({ id: index, ...item }))
    }, [logItems]);

    const processRowUpdate = useCallback((newRow) => {
        setLogItems((prev) => prev.map((row, index) => (index === newRow.id ? {name: newRow.name, type: newRow.type, description: newRow.description} : row)));
        return newRow;
    }, [setLogItems]);

    const handleAddRow = useCallback(() => {
        const newItem = { name: '', type: logItemTypes[0], description: '' };
        setLogItems((prev) => [...prev, newItem]);
    }, [setLogItems]);
    
    const handleDeleteRow = useCallback( (id) => {
        setLogItems((prev) => {
            const filtered = prev.filter((row, index) => index !== id)
            return filtered.map( item => ({name: item.name, type: item.type, description: item.description}));
    });
    }, [setLogItems]);

    const localLogItemColumns = useMemo(() => [...logItemColumns,
    {
        field: 'actions',
        type: 'actions',
        headerName: '',
        width: 80,
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
                <DataGrid rows={logItemsWithIds} columns={localLogItemColumns} processRowUpdate={processRowUpdate} sx={{flex: 1}} disableSelectionOnClick hideFooterPagination/>
            </Box>
            <Button variant="contained" onClick={handleAddRow}>
                + Add Log Item
            </Button>
        </Stack>
    );
}


function Actions({ actions, setActions }) {
    const actionsWithIds = useMemo(() => actions.map((item, index) => ({ id: index, ...item }))
    , [actions]);

    const processRowUpdate = useCallback( (newRow) => {
        setActions((prev) => prev.map((row, index) => index === newRow.id ? {name: newRow.name, byte: newRow.byte, type: newRow.type, description: newRow.description} : row));
        return newRow;
    }, [setActions]);

    const handleAddRow = useCallback(() => {
        const newAction = { name: '', byte: '', type: actionTypes[0], description: '' };
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
            width: 80,
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
                />
            </Box>
            <Button variant="contained" onClick={handleAddRow}>
                + Add Action
            </Button>
        </Stack>
    );
}

export default function DeviceAddDialog({ api, devices, setDevices, open, setOpen }) {
    const [error, setError] = useState(null);
    const [name, setName] = useState('');
    const [encroKey, setEncroKey] = useState('');
    const [actions, setActions] = useState([]);
    const [logItems, setLogItems] = useState([]);
    const [inProgress, setInProgress] = useState(null);

    useEffect( () => {
        if (open){
            setName('');
            setEncroKey(generateRandomEncroKey());
            setError(null);
            setActions([]);
            setLogItems([]);
        }
    }, [open]);

    const handleClose = () => {
        if (!inProgress) setOpen(false);
    };


    const handleAdd = async () => {
        try{
            setInProgress('adding');
            const sanitizedLogItems = JSON.stringify(logItems.map( item => ({name: item.name, type: item.type, description: item.description})));
            const sanitizedActions = JSON.stringify(actions.map( item => ({name: item.name, byte: Number(item.byte), type: item.type, description: item.description})));
            const [passed, newDevices] = await api.devicesAdd(name, encroKey, sanitizedLogItems, sanitizedActions);
            if (passed) {
                setDevices(newDevices);
                setOpen(false);
            }else{
                const error=newDevices?.error;
                const existingName = devices?.find(r=>(name.trim().toLowerCase() === r.name.trim().toLowerCase()));
                const badKey = !isValidEncroKey(encroKey);
                if (error){
                    setError(error);
                }else if (badKey){
                    setError('Bad encro key, needs to be hexadecimal characters and 64 characters long');
                }else if (existingName){
                    setError('Device name already exists, try a different name');
                }else{
                    setError('Failed to add for some reason.');
                }
            }
        }catch(e){
            setError('Error occurred');
        }
        setInProgress(null);
    }

    return (
        <Dialog open={open} onClose={handleClose} maxWidth='md' fullWidth>
        <DialogTitle sx={{py:'12px'}}>Add Device</DialogTitle>
            <DialogContent>
                <TextField disabled={!!inProgress} fullWidth margin='dense' label='Name'      value={name}     onChange={e=>setName(e.target.value)}/>
                <TextField disabled={!!inProgress} fullWidth margin='dense' label='Encro Key' value={encroKey} onChange={e=>setEncroKey(e.target.value)}/>
                <LogItems logItems={logItems} setLogItems={setLogItems}/>
                <Actions actions={actions} setActions={setActions}/>
            </DialogContent>
            <DialogActions disableSpacing>
                <Alert style={error?{width:'100%'}:{display: 'none'}} variant='filled' severity={'error'}>{error}</Alert>
            </DialogActions>
            <DialogActions>
                <Button disabled={!!inProgress} variant='contained' color='primary' onClick={handleClose}>Cancel</Button>
                <LoadingButton disabled={!!inProgress && inProgress!=='adding'} loading={inProgress==='adding'} variant='contained' color='success' onClick={handleAdd}>Add</LoadingButton>
            </DialogActions>
        </Dialog>
    );
}