import { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { Alert } from '@mui/material';
import LoadingButton from '@mui/lab/LoadingButton';
import { useAppContext } from '../../contexts/AppContext';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';



export default function UserEditDialog({user, open, setOpen, updateUser}) {
    const [error, setError] = useState(null);
    const [role, setRole] = useState('');
    const [email, setEmail] = useState('');
    const [inProgress, setInProgress] = useState(false);
    const {api} = useAppContext();

    useEffect(() => {
        setRole(user?.role || '');
        setEmail(user?.email || '');
        setError(null);
    }, [user, open]);


    const handleClose = () => {
        if (!inProgress) setOpen(false);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setInProgress(true);
        setError(null);
        try{
            const [passed, response] = await api.manageUserRole(user?.user_id, role);
            if (passed){
                updateUser(response);
                setOpen(false);
            }else{
                setError('error occured: '+response.error);
            }
        }catch(e){
            setError('error occured');
        }
        setInProgress(false);
    };

    return (
        <Dialog open={open} onClose={handleClose}>
            <form onSubmit={handleUpdate}>
                <DialogTitle sx={{py:'12px'}}>Edit User</DialogTitle>
                <DialogContent>
                    <TextField fullWidth margin='dense' label='Id'    value={user?.user_id || ''} disabled/>
                    <TextField fullWidth margin='dense' label='Email' value={email} onChange={(e)=>setEmail(e.target.value)} disabled={true}/>
                    <FormControl fullWidth  disabled={inProgress}>
                        <InputLabel id="edit-user-role-label">Role</InputLabel>
                        <Select labelId="edit-user-role-label" value={role} label="Role" onChange={(e)=>setRole(e.target.value)}>
                            <MenuItem value='unverified'>Unverified</MenuItem>
                            <MenuItem value='member'>Member</MenuItem>
                            <MenuItem value='manager'>Manager</MenuItem>
                            <MenuItem value='admin'>Admin</MenuItem>
                            <MenuItem value='super'>Super</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions disableSpacing>
                    <Alert style={error?{width:'100%'}:{display: 'none'}} variant='filled' severity={'error'}>{error}</Alert>
                </DialogActions>
                <DialogActions>
                    <Button        disabled={inProgress} variant='contained' color='primary' onClick={handleClose}>Cancel</Button>
                    <LoadingButton loading={inProgress}  variant='contained' color='success' type='submit'>Update</LoadingButton>
                </DialogActions>
            </form>
        </Dialog>
    );
}