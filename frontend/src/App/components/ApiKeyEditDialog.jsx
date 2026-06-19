import { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { Alert } from '@mui/material';
import LoadingButton from '@mui/lab/LoadingButton';

export default function ApiKeyEditDialog({ api, apiKeys, setApiKeys, editItem, setEditItem }) {
    const [error, setError] = useState(null);
    const [name, setName] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [inProgress, setInProgress] = useState(null);

    useEffect(() => {
        setName(editItem?.item?.name || '');
        setApiKey(editItem?.item?.api_key || '');
        setError(null);
    }, [editItem]);

    const handleClose = () => {
        if (!inProgress) setEditItem({ open: false, item: null });
    };

    const handleDelete = async () => {
        try{
            setInProgress('delete');
            setError(null);
            const [passed, newApiKeys] = await api.apiKeysDelete(editItem?.item?.api_key_id);
            if (passed){
                setApiKeys(newApiKeys);
                setEditItem({open: false, item: null});
            }else{
                setError('Error occurred trying to delete the API key');
            }
        }catch(e){
            setError('Error occurred');
        }
        setInProgress(null);
    };

    const handleUpdate = async () => {
        try{
            setInProgress('update');
            setError(null);
            const [passed, newApiKeys] = await api.apiKeysUpdate(editItem?.item?.api_key_id, name, apiKey);
            if (passed) {
                setApiKeys(newApiKeys);
                setEditItem({ open: false, item: null });
            }else{
                const error=newApiKeys?.error;
                const existingName = apiKeys?.find(r=>(name.trim().toLowerCase() === r.name.trim().toLowerCase() && r.api_key_id!==editItem?.item?.api_key_id));
                if (error){
                    setError(error);
                }else if (existingName){
                    setError('API key name already exists, try a different name');
                }else{
                    setError('Failed to update for some reason.');
                }
            }
        }catch(e){
            setError('Error occurred');
        }
        setInProgress(null);
    };

    return (
        <Dialog open={editItem.open} onClose={handleClose} maxWidth='sm' fullWidth>
            <DialogTitle sx={{py:'12px'}}>Edit API Key</DialogTitle>
            <DialogContent>
                <TextField disabled={!!inProgress} fullWidth margin='dense' label='Name' value={name} onChange={e=>setName(e.target.value)}/>
                <TextField disabled={!!inProgress} fullWidth margin='dense' label='API Key' value={apiKey} onChange={e=>setApiKey(e.target.value)} multiline minRows={3}/>
            </DialogContent>
            <DialogActions disableSpacing>
                <Alert style={error?{width:'100%'}:{display: 'none'}} variant='filled' severity={'error'}>{error}</Alert>
            </DialogActions>
            <DialogActions>
                <LoadingButton disabled={!!inProgress && inProgress!=='delete'} loading={inProgress==='delete'} variant='contained' color='error' onClick={handleDelete} style={{marginRight:'auto'}}>Delete</LoadingButton>
                <Button disabled={!!inProgress} variant='contained' color='primary' onClick={handleClose}>Cancel</Button>
                <LoadingButton disabled={!!inProgress && inProgress!=='update'} loading={inProgress==='update'} variant='contained' color='success' onClick={handleUpdate}>Update</LoadingButton>
            </DialogActions>
        </Dialog>
    );
}
