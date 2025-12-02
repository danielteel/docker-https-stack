
import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { LoadingButton } from '@mui/lab';
import Button from '@mui/material/Button';
import { useAppContext } from '../../contexts/AppContext';

export default function ChangeEmailDialog({open, setOpen}){
    const [newEmail, setNewEmail] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [confirmationCode, setConfirmationCode] = useState('');
    const [newEmailStatus, setNewEmailStatus] = useState(null);
    const [initiateNewEmailError, setInitiateNewEmailError] = useState(null);
    const [confirmNewEmailError, setConfirmNewEmailError] = useState(null);
    const [inProgress, setInProgress] = useState(false);

    const {api, user, updateMe} = useAppContext();

    useEffect(() => {
        async function fetchStatus(){
            const [passed, response] = await api.userChangeEmailStatus();
            if (passed && response?.status==='confirm'){
                setNewEmailStatus(response.newEmail);
            }
        }

        if (open) fetchStatus();
    }, [api, open]);

    const handleClose = () => {
        setNewEmail('');
        setCurrentPassword('');
        setConfirmationCode('');
        setInitiateNewEmailError(null);
        setConfirmNewEmailError(null);
        setNewEmailStatus(null);
        setInProgress(false);
        setOpen(false);
    }

    const handleInitiateNewEmail = async (e) => {
        e.preventDefault();
        setInitiateNewEmailError(null);
        setInProgress(true);
        try {
            const [passed, response] = await api.userChangeEmailStart(newEmail, currentPassword);
            if (!passed){
                setInitiateNewEmailError('Error: '+response.error);
            }else{
                setNewEmailStatus(newEmail);
            }
        }catch(e){
            setInitiateNewEmailError('Error occured: '+String(e));
        }
        setInProgress(false);
    }

    const handleConfirmNewEmail = async () => {
        setConfirmNewEmailError(null);
        setInProgress(true);
        try {
            const [passed, response] = await api.userChangeEmailEnd(confirmationCode);
            if (!passed) {
                setConfirmNewEmailError('Error: ' + response.error);
            } else {
                handleClose();
                updateMe();
            }
        } catch (e) {
            setConfirmNewEmailError('Error occured: ' + String(e));
        }
        setInProgress(false);
    }

    return (
        <Dialog open={open} onClose={()=>handleClose()}>
            <form onSubmit={handleInitiateNewEmail}>
                <DialogTitle>
                    Change Password
                </DialogTitle>
                <DialogContent>
                    <input type='email' hidden autoComplete="email" value={user?.email} readOnly/>
                    <TextField disabled={inProgress} fullWidth margin='dense' label='New email' type="email" required autoComplete="new-email" value={newEmail} onChange={(e)=>setNewEmail(e.target.value)}/>
                    <TextField disabled={inProgress} fullWidth margin='dense' label='Current password' type="password" required autoComplete="current-password" value={currentPassword} onChange={(e)=>setCurrentPassword(e.target.value)}/>
                </DialogContent>
                <DialogActions disableSpacing>
                    <Alert severity='error' sx={{width:'100%', ...(initiateNewEmailError?{}:{display:'none'})}}>{initiateNewEmailError}</Alert>
                </DialogActions>
                <DialogActions>
                    <Button disabled={inProgress} onClick={()=>handleClose()}>Cancel</Button>
                    <LoadingButton loading={inProgress} type='submit'>Start Email Change</LoadingButton>
                </DialogActions>
                <DialogContent>
                    {newEmailStatus && (
                        <>
                            <Alert severity='info' sx={{mb:2}}>An email has been sent to {newEmailStatus}. Please check your email for the confirmation code to complete the email change.</Alert>
                            <TextField disabled={inProgress} fullWidth margin='dense' label='Confirmation code' type="text" required autoComplete="one-time-code" value={confirmationCode} onChange={(e)=>setConfirmationCode(e.target.value)}/>
                        </>
                    )}
                </DialogContent>
                <DialogActions disableSpacing>
                    <Alert severity='error' sx={{width:'100%', ...(newEmailStatus&&confirmNewEmailError?{}:{display:'none'})}}>{confirmNewEmailError}</Alert>
                </DialogActions>
                <DialogActions>
                    {newEmailStatus && (
                        <LoadingButton loading={inProgress} onClick={handleConfirmNewEmail}>Complete Email Change</LoadingButton>
                    )}
                </DialogActions>
            </form>
        </Dialog>
    );
}