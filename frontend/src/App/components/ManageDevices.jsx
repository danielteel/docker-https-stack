import React, { useState, useEffect } from 'react';
import { Typography } from '@mui/material';

import {Button} from '@mui/material';
import Paper from '@mui/material/Paper';
import Title from './Title';
import { useAppContext } from '../../contexts/AppContext';
import { Container } from '@mui/material';
import Grid from '@mui/material/Grid';
import EditIcon from '@mui/icons-material/Edit';
import IconButton from '@mui/material/IconButton';
import DeviceEditDialog from './DeviceEditDialog';
import DeviceAddDialog from './DeviceAddDialog';

export default function ManageDevices() {
    const [devices, setDevices] = useState(null);
    const [editItem, setEditItem] = useState({ open: false, item: null });
    const [addOpen, setAddOpen] = useState(false);

    const {api} = useAppContext();
  
    useEffect(() => {
        let timeoutId = null;
        let cancel=false;

        async function getDevices() {
            if (cancel) return;
            const [passed, fetchedDevices] = await api.devicesList();
            if (passed) {
                setDevices(fetchedDevices);
            } else {
                timeoutId = setTimeout(getDevices, 2000);
            }
        }
        getDevices();

        return () => {
            cancel=true;
            if (timeoutId) clearTimeout(timeoutId);
        }
    }, [api]);

    return (
        <Container maxWidth='sm'>
            <DeviceEditDialog api={api} devices={devices} setDevices={setDevices} editItem={editItem} setEditItem={() => setEditItem({ open: false, item: null })} />
            <DeviceAddDialog api={api} devices={devices} setDevices={setDevices} open={addOpen} setOpen={setAddOpen}/>
            <Paper sx={{p:1, m:-2, display: 'flex', flexDirection: 'column'}}>
                <Title>Manage Devices</Title>
                <Grid container alignItems={'center'}>
                    <Grid item xs={3}>
                        <Typography variant='subtitle1'>Name</Typography>
                    </Grid>
                    <Grid item xs={7}>
                        <Typography variant='subtitle1'>Encro Key</Typography>
                    </Grid>
                    <Grid item xs={2}>
                    </Grid>
                    {
                        devices?.map?.((d) => (
                            <React.Fragment key={d.device_id+d.encro_key}>
                                <Grid item xs={6}><Typography style={{overflowWrap:'anywhere'}} variant='body2'>{d.name}</Typography></Grid>
                                <Grid item xs={4}><Typography style={{overflowWrap:'anywhere'}} variant='body2'>{d.encro_key}</Typography></Grid>
                                <Grid item xs={2} textAlign='center'>
                                    <IconButton color="primary" onClick={() => setEditItem({ open: true, item: d })}>
                                        <EditIcon />
                                    </IconButton>
                                </Grid>
                            </React.Fragment>
                        ))
                    }
                    {devices?.length?null:<Grid item xs={12} textAlign='center'><Typography variant='body2'>No devices were found</Typography></Grid>}
                    <Grid item xs={12} sx={{ mt: 2 }} textAlign={'center'}><Button color='success' variant='contained' onClick={() => setAddOpen(true)}>Add</Button></Grid>
                </Grid>
            </Paper>
        </Container>
    );
}