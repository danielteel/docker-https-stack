import { useState, useEffect } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { Alert } from '@mui/material';
import LoadingButton from '@mui/lab/LoadingButton';

export default function ApiKeyAddDialog({ api, apiKeys, setApiKeys, open, setOpen }) {
    const [error, setError] = useState(null);
    const [name, setName] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [inProgress, setInProgress] = useState(false);

    useEffect(() => {
        if (open){
            setName('');
            setApiKey('');
            setError(null);
        }
    }, [open]);

    const handleClose = () => {
        if (!inProgress) setOpen(false);
    };

    const handleAdd = async () => {
        try{
            setInProgress(true);
            setError(null);
            const [passed, newApiKeys] = await api.apiKeysAdd(name, apiKey);
            if (passed) {
                setApiKeys(newApiKeys);
                setOpen(false);
            }else{
                const error=newApiKeys?.error;
                const existingName = apiKeys?.find(r=>(name.trim().toLowerCase() === r.name.trim().toLowerCase()));
                if (error){
                    setError(error);
                }else if (existingName){
                    setError('API key name already exists, try a different name');
                }else{
                    setError('Failed to add for some reason.');
                }
            }
        }catch(e){
            setError('Error occurred');
        }
        setInProgress(false);
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth='sm' fullWidth>
            <DialogTitle sx={{py:'12px'}}>Add API Key</DialogTitle>
            <DialogContent>
                <TextField disabled={inProgress} fullWidth margin='dense' label='Name' value={name} onChange={e=>setName(e.target.value)}/>
                <TextField disabled={inProgress} fullWidth margin='dense' label='API Key' value={apiKey} onChange={e=>setApiKey(e.target.value)} multiline minRows={3}/>
            </DialogContent>
            <DialogActions disableSpacing>
                <Alert style={error?{width:'100%'}:{display: 'none'}} variant='filled' severity={'error'}>{error}</Alert>
            </DialogActions>
            <DialogActions>
                <Button disabled={inProgress} variant='contained' color='primary' onClick={handleClose}>Cancel</Button>
                <LoadingButton loading={inProgress} variant='contained' color='success' onClick={handleAdd}>Add</LoadingButton>
            </DialogActions>
        </Dialog>
    );
}
