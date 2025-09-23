import {  useState, useEffect } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { Alert } from '@mui/material';
import LoadingButton from '@mui/lab/LoadingButton';

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

export default function DeviceAddDialog({ api, devices, setDevices, open, setOpen }) {
    const [error, setError] = useState(null);
    const [name, setName] = useState('');
    const [encroKey, setEncroKey] = useState('');
    const [inProgress, setInProgress] = useState(null);

    useEffect( () => {
        if (open){
            setName('');
            setEncroKey(generateRandomEncroKey());
            setError(null);
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
                const existingName = devices?.find(r=>(name.trim().toLowerCase() === r.name.trim().toLowerCase()));
                const badKey = !isValidEncroKey(encroKey);
                if (badKey){
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