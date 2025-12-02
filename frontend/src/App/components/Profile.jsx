import React, { useState } from 'react';
import { Typography } from '@mui/material';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Title from './Title';
import { useAppContext } from '../../contexts/AppContext';
import { Container } from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import Box from '@mui/material/Box';
import ChangePasswordDialog from './ChangePasswordDialog';
import ChangeEmailDialog from './ChangeEmailDialog';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

export default function Profile() {
    const {api, user} = useAppContext();
    const [changePasswordOpen, setChangePasswordOpen] = useState(false);
    const [changeEmailOpen, setChangeEmailOpen] = useState(false);
    const [snackBarOpen, setSnackBarOpen] = useState(false);
    const [snackBarProps, setSnackBarProps] = useState({type: 'error', message:'blah'});

    return (
        <Container maxWidth='xs'>
            <Snackbar anchorOrigin={{ vertical: 'top', horizontal: 'center' }} open={snackBarOpen} onClose={(e,r)=>r==='timeout'&&setSnackBarOpen(false)} autoHideDuration={2000}>    
                <Alert onClose={()=>setSnackBarOpen(false)} elevation={6} severity={snackBarProps?.type}>{snackBarProps?.message}</Alert>
            </Snackbar>
            <ChangePasswordDialog open={changePasswordOpen} setOpen={setChangePasswordOpen}/>
            <ChangeEmailDialog open={changeEmailOpen} setOpen={setChangeEmailOpen}/>
            <Paper sx={{p: 1}}>
                <Title>Profile</Title>
                <Box >
                    <Grid container alignItems={'center'} spacing={1} rowSpacing={2} padding={1}>
                        <Grid item xs={8}>
                            <Typography variant='subtitle1'>Email</Typography>
                        </Grid>
                        <Grid item xs={4}>
                            <Typography variant='subtitle1'>Role</Typography>
                        </Grid>                        
                        <Grid item xs={8}>
                            <Typography variant='body2'>{user.email}</Typography>
                        </Grid>
                        <Grid item xs={4}>
                            <Typography variant='body2'>{user.role}</Typography>
                        </Grid>
                        <Grid item sm={12} lg={4}>
                            <Button variant='outlined' fullWidth onClick={()=>setChangeEmailOpen(true)}>Change Email</Button>
                        </Grid>
                        <Grid item sm={12} lg={4}>
                            <Button variant='outlined' fullWidth onClick={()=>setChangePasswordOpen(true)}>Change Password</Button>
                        </Grid>
                        <Grid item sm={12} lg={4}>
                            <Button variant='outlined' fullWidth onClick={async ()=>{
                                const [passed] = await api.userLogoutEverywhere();
                                if (!passed){
                                    setSnackBarOpen(true);
                                    setSnackBarProps({type:'error', message: 'failed to logout everywhere'});
                                }
                            }}>Sign out everywhere</Button>
                        </Grid>
                    </Grid>
                </Box>
            </Paper>
        </Container>
    );
}