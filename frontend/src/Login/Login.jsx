import { useState } from 'react';
import Avatar from '@mui/material/Avatar';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { LoadingButton } from '@mui/lab';
import { Alert, Stack } from '@mui/material';

import { Link as WouterLink } from 'wouter';
import Copyright from '../common/Copyright';
import { useAppContext } from '../contexts/AppContext';


export default function Login() {
    const {setUser, api} = useAppContext();
    const [error, setError] = useState(null);
    const [inProgress, setInProgress] = useState(false);

    const handleSubmit = async (event) => {
        setInProgress(true);
        setError(null);
        event.preventDefault();
        try{
            const data = new FormData(event.currentTarget);
            const [passed, fetchedUser] = await api.userLogin(data.get('email'), data.get('password'), String(data.get('remember')).toLowerCase().trim()!=='on'?false:true);
            if (passed){
                setUser(fetchedUser);
            }else{
                setError('failed to login, double check email and password');
            }
        }catch{
            setError('failed to login, double check email and password');
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
                    Sign in
                </Typography>
                <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
                    <TextField
                        disabled={inProgress}
                        margin="normal"
                        required
                        fullWidth
                        id="email"
                        label="Email Address"
                        name="email"
                        autoComplete="email"
                        type="email"
                        autoFocus
                    />
                    <TextField
                        disabled={inProgress}
                        margin="normal"
                        required
                        fullWidth
                        name="password"
                        label="Password"
                        type="password"
                        id="password"
                        autoComplete="current-password"
                    />            
                    <FormControlLabel
                        control={<Checkbox disabled={inProgress} name="remember" color="primary" />}
                        label="Remember me"
                    />
                    <Alert severity='error' style={{width:'100%', ...(error?{}:{display:'none'})}}>{error}</Alert>
                    <LoadingButton loading={inProgress} type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>Sign In</LoadingButton>

                    <Stack>
                        <WouterLink href="/forgotpassword" variant="body2">Forgot password?</WouterLink>
                        <WouterLink href="/signup" variant="body2">Don't have an account? Sign Up</WouterLink>
                    </Stack>
                </Box>
            </Box>
            <Copyright sx={{ mt: 8, mb: 4 }} />
        </Container>
    );
}