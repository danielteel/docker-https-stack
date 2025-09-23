import { useState } from 'react';
import Avatar from '@mui/material/Avatar';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';


import { Link as WouterLink, useLocation, useParams } from 'wouter';
import {useAppContext} from '../contexts/AppContext';
import { Alert } from '@mui/material';
import Copyright from '../common/Copyright';
import LoadingButton from '@mui/lab/LoadingButton';

import { isValidEmail } from '../common/common';

export default function ForgotPassword() {
    const {api} = useAppContext();
    const [, setLocation] = useLocation();
    const [error, setError] = useState(null);
    const params = useParams();

    const [inProgress, setInProgress] = useState(null);

    const handleSubmit = async (event) => {
        setError(null);
        setInProgress(true);
        event.preventDefault();
        try {
            const data = new FormData(event.currentTarget);
            const email = data.get('email');
            
            if (isValidEmail(email)){
                const [passed, message] = await api.userForgotStart(email);
                if (passed) {
                    setLocation('/verifyforgot/'+email);
                }else{
                    setError(message.error || 'Error occured');
                }
            }else{
                setError('Invalid email address');
            }
        }catch (e){
            setError('error occured');
        }
        setInProgress(false);
    };

    return (
        <Container component="main" maxWidth="xs">
            <Box
                sx={{
                    marginTop: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
                    <LockOutlinedIcon />
                </Avatar>
                <Typography component="h1" variant="h5">
                    Reset Password
                </Typography>
                <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
                    <TextField
                        disabled={inProgress}
                        margin="normal"
                        required
                        fullWidth
                        id="email"
                        label="Email Address"
                        name="email"
                        type="email"
                        autoComplete="email"
                        defaultValue={params?.email || ''}
                        autoFocus
                    />                    
                    {
                        error?
                            <Alert severity='error' style={{width:'100%'}}>{error}</Alert>
                        :
                            null
                    }
                    <LoadingButton loading={inProgress} type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>Send Email</LoadingButton>
                    <Grid container>   
                        <Grid item xs>
                            <WouterLink href="/verifyforgot" variant="body2">I already have a confirmation code</WouterLink>
                        </Grid>                     
                        <Grid item>
                            <WouterLink href="/login" variant="body2">Back to login page</WouterLink>
                        </Grid>
                    </Grid>
                </Box>
            </Box>
            <Copyright sx={{ mt: 8, mb: 4 }} />
        </Container>
    );
}