import { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { Alert } from '@mui/material';
import LoadingButton from '@mui/lab/LoadingButton';

import LogItems from './LogItems';
import Actions from './Actions';

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

export default function EditFormatDialog({ api, devices, setDevices, editItem, setEditItem }) {
    const [error, setError] = useState(null);
    const [name, setName] = useState('');
    const [encroKey, setEncroKey] = useState('');
    const [actions, setActions] = useState([]);
    const [logItems, setLogItems] = useState([]);
    const [inProgress, setInProgress] = useState(null);

    useEffect(() => {
        setName(editItem?.item?.name || '');
        setEncroKey(editItem?.item?.encro_key || '');
        setActions(editItem?.item?.actions || []);
        setLogItems(editItem?.item?.log_items || []);
        setError(null);
    }, [editItem]);


    const handleClose = () => {
        if (!inProgress) setEditItem({ open: false, item: null });
    };

    const handleDelete = async () => {
        try{
            setInProgress('delete');
            
            const [passed, newDevices] = await api.devicesDelete(editItem?.item?.device_id);
            if (passed){
                setDevices(newDevices);
                setEditItem({open: false, item: null});
                setError(null);
            }else{
                setError('Error occured trying to delete the device');
            }
        }catch(e){
            setError('Error occurred');
        }
        setInProgress(null);
    }

    const handleUpdate = async () => {
        try{
            setInProgress('update');

            const [passed, newDevices] = await api.devicesUpdate(editItem?.item?.device_id, name, encroKey, logItems, actions);
            if (passed) {
                setDevices(newDevices);
                setEditItem({ open: false, item: null });
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
        <Dialog open={editItem.open} onClose={handleClose}>
            <DialogTitle sx={{py:'12px'}}>Edit Device</DialogTitle>
            <DialogContent>
                <TextField disabled={!!inProgress} fullWidth margin='dense' label='Name'      value={name}     onChange={e=>setName(e.target.value)}/>
                <TextField disabled={!!inProgress} fullWidth margin='dense' label='Encro Key' value={encroKey} onChange={e=>setEncroKey(e.target.value)}/>
                <LogItems logItems={logItems} setLogItems={setLogItems}/>
                <Actions actions={actions} setActions={setActions}/>
            </DialogContent>
            <DialogActions disableSpacing>
                <Alert style={error?{width:'100%'}:{display: 'none'}} variant='filled' severity={'error'}>{error}</Alert>
            </DialogActions>
            <DialogActions >
                <LoadingButton disabled={!!inProgress && inProgress!=='delete'} loading={inProgress==='delete'}   variant='contained' color='error'   onClick={handleDelete} style={{marginRight:'auto'}}>Delete</LoadingButton>
                <Button        disabled={!!inProgress}                                                            variant='contained' color='primary' onClick={handleClose}>Cancel</Button>
                <LoadingButton disabled={!!inProgress && inProgress!=='update'} loading={inProgress==='update'}   variant='contained' color='success' onClick={handleUpdate}>Update</LoadingButton>
            </DialogActions>
        </Dialog>
    );
}