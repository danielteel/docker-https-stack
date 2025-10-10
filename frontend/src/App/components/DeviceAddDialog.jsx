import {  useState, useEffect } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { Alert, IconButton, List, ListItem, ListSubheader } from '@mui/material';
import LoadingButton from '@mui/lab/LoadingButton';

import EditIcon from '@mui/icons-material/Edit';

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

function LogItems({logItems, setLogItems}){
    return <List dense={false} sx={{maxWidth: '360px'}} subheader={<ListSubheader>Log Items</ListSubheader>}>
        {
            logItems?.map?.((item) => (
                <ListItem secondaryAction={<IconButton edge='end' aria-label="Edit"><EditIcon/></IconButton>}>
                    <ListItemText primary={item?.name} secondary={item?.type}/>
                </ListItem>
            ))
        }
        <ListItem>
            <Button onClick={()=>{
                setLogItems([...logItems, {name:'New Item', type:'number', description:''}])
            }}>+</Button>
        </ListItem>
    </List>
}

function Actions({actions, setActions}){
    return <List dense={false} sx={{maxWidth: '360px'}} subheader={<ListSubheader>Actions</ListSubheader>}>
        {
            actions?.map?.((item) => (
                <ListItem secondaryAction={<IconButton edge='end' aria-label="Edit"><EditIcon/></IconButton>}>
                    <ListItemText primary={item?.name} secondary={item?.type}/>
                    <ListItemText primary={item?.byte} secondary={item?.description}/>
                </ListItem>
            ))
        }
        <ListItem>
            <Button onClick={()=>{
                setActions([...actions, {name:'New Item', type:'void', byte:0, description:''}])
            }}>+</Button>
        </ListItem>
    </List>
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

            const [passed, newDevices] = await api.devicesAdd(name, encroKey);
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
        <Dialog open={open} onClose={handleClose}>
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