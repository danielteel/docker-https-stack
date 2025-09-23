import React, { useState, useEffect } from 'react';
import { Typography } from '@mui/material';
import Paper from '@mui/material/Paper';
import Title from './Title';
import { useAppContext } from '../../contexts/AppContext';
import { Container } from '@mui/material';
import Grid from '@mui/material/Grid';
import EditIcon from '@mui/icons-material/Edit';
import IconButton from '@mui/material/IconButton';
import UserEditDialog from './UserEditDialog';

export default function User() {
    const [users, setUsers] = useState(null);
    const [editOpen, setEditOpen] = useState(false);
    const [editUser, setEditUser] = useState(null);

    const {api} = useAppContext();

    useEffect(() => {
        async function getUsers() {
            const [passed, fetchedUsers] = await api.manageUsers();
            if (passed) {
                setUsers(fetchedUsers);
            }
        }
        getUsers();
    }, [api]);

    function updateUser(user){
        if (users && user?.user_id){
            setUsers([...users.filter(u=>u.user_id!==user.user_id), user]);
        }
    }

    return (
        <Container maxWidth='sm'>
            <UserEditDialog updateUser={updateUser} open={editOpen} setOpen={setEditOpen} user={editUser}/>
            <Paper sx={{p:1, m:-2, display: 'flex', flexDirection: 'column'}}>
                <Title>Users</Title>
                <Grid container alignItems={'center'}>
                    <Grid item xs={6}>
                        <Typography variant='subtitle1'>Email</Typography>
                    </Grid>
                    <Grid item xs={4}>
                        <Typography variant='subtitle1'>Role</Typography>
                    </Grid>
                    <Grid item xs={2}>
                    </Grid>
                    {
                        users?.map?.((u) => (
                            <React.Fragment key={u.email+' '+u.user_id}>
                                <Grid item xs={6}><Typography style={{overflowWrap:'anywhere'}} variant='body2'>{u.email}</Typography></Grid>
                                <Grid item xs={4}><Typography style={{overflowWrap:'anywhere'}} variant='body2'>{u.role}</Typography></Grid>
                                <Grid item xs={2} textAlign='center'>
                                    <IconButton color="primary" onClick={()=>{setEditUser(u); setEditOpen(true)}}>
                                        <EditIcon />
                                    </IconButton>
                                </Grid>
                            </React.Fragment>
                        ))
                    }
                    {users?.length?null:<Grid item xs={12} textAlign='center'><Typography variant='body2'>No users that you can manage were found</Typography></Grid>}
                </Grid>
            </Paper>
        </Container>
    );
}