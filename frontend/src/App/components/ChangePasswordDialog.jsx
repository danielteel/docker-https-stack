
import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import React, { useState } from 'react';
import { LoadingButton } from '@mui/lab';
import Button from '@mui/material/Button';
import { useAppContext } from '../../contexts/AppContext';

export default function ChangePasswordDialog({open, setOpen}){
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newPasswordAgain, setNewPasswordAgain] = useState('');

    const [inProgress, setInProgress] = useState(false);
    const [changePasswordError, setChangePasswordError] = useState(null);

    const {api, user} = useAppContext();

    const handleClose = (overrideInprogress) => {
        if (inProgress && !overrideInprogress) return;
        setInProgress(false);
        setChangePasswordError(null);
        setOldPassword('');
        setNewPassword('');
        setNewPasswordAgain('');
        setOpen(false);
    }

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setChangePasswordError(null);
        setInProgress(true);
        try {
            if (newPassword !== newPasswordAgain){        
                setChangePasswordError('Passwords dont match, double check that they are the same');
            }else if (!newPassword.trim()){
                setChangePasswordError('Password cant be empty or just spaces');
            }else if (!oldPassword.trim()){
                setChangePasswordError('Current password cant be empty or just spaces');
            }else if (oldPassword===newPassword){
                setChangePasswordError('New password cannot be the same as the current password');
            }else{
                const [passed, response] = await api.userChangePassword(oldPassword, newPassword);
                if (!passed){
                    setChangePasswordError('Error: '+response.error);
                }else{
                    handleClose(true);
                }
            }
        }catch(e){
            setChangePasswordError('Error occured');
        }
        setInProgress(false);
    }

    return (
        <Dialog open={open} onClose={()=>handleClose()}>
            <form onSubmit={handleChangePassword}>
                <DialogTitle>
                    Change Password
                </DialogTitle>
                <DialogContent>
                    <input type='email' hidden autoComplete="email" value={user?.email} readOnly/>
                    <TextField disabled={inProgress} fullWidth margin='dense' label='Current password' type="password" required autoComplete="current-password" value={oldPassword} onChange={(e)=>setOldPassword(e.target.value)}/>
                    <TextField disabled={inProgress} fullWidth margin='dense' label='New password' type='password' autoComplete='new-password' required value={newPassword} onChange={(e)=>setNewPassword(e.target.value)}/>
                    <TextField disabled={inProgress} fullWidth margin='dense' label='Confirm new password' type='password' autoComplete='new-password' required value={newPasswordAgain} onChange={(e)=>setNewPasswordAgain(e.target.value)}/>
                </DialogContent>
                <DialogActions disableSpacing>
                    <Alert severity='error' sx={{width:'100%', ...(changePasswordError?{}:{display:'none'})}}>{changePasswordError}</Alert>
                </DialogActions>
                <DialogActions>
                    <Button disabled={inProgress} onClick={()=>handleClose()}>Cancel</Button>
                    <LoadingButton loading={inProgress} type='submit'>Change Password</LoadingButton>
                </DialogActions>
            </form>
        </Dialog>
    );
}