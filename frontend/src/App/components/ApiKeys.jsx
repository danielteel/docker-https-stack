import React, { useState, useEffect } from 'react';
import { Typography } from '@mui/material';
import {Button} from '@mui/material';
import Paper from '@mui/material/Paper';
import Title from './Title';
import { useAppContext } from '../../contexts/AppContext';
import { Container } from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import EditIcon from '@mui/icons-material/Edit';
import IconButton from '@mui/material/IconButton';
import ApiKeyEditDialog from './ApiKeyEditDialog';
import ApiKeyAddDialog from './ApiKeyAddDialog';

export default function ApiKeys() {
    const [apiKeys, setApiKeys] = useState(null);
    const [editItem, setEditItem] = useState({ open: false, item: null });
    const [addOpen, setAddOpen] = useState(false);

    const {api} = useAppContext();

    useEffect(() => {
        async function getApiKeys() {
            const [passed, fetchedApiKeys] = await api.apiKeysList();
            if (passed) {
                setApiKeys(fetchedApiKeys);
            }
        }
        getApiKeys();
    }, [api]);

    return (
        <Container maxWidth='sm'>
            <ApiKeyEditDialog api={api} apiKeys={apiKeys} setApiKeys={setApiKeys} editItem={editItem} setEditItem={() => setEditItem({ open: false, item: null })} />
            <ApiKeyAddDialog api={api} apiKeys={apiKeys} setApiKeys={setApiKeys} open={addOpen} setOpen={setAddOpen}/>
            <Paper sx={{p:1, m:-2, display: 'flex', flexDirection: 'column'}}>
                <Title>API Keys</Title>
                <Grid container alignItems={'center'}>
                    <Grid item xs={4}>
                        <Typography variant='subtitle1'>Name</Typography>
                    </Grid>
                    <Grid item xs={6}>
                        <Typography variant='subtitle1'>API Key</Typography>
                    </Grid>
                    <Grid item xs={2}>
                    </Grid>
                    {
                        apiKeys?.map?.((k) => (
                            <React.Fragment key={k.api_key_id+k.name}>
                                <Grid item xs={4}><Typography style={{overflowWrap:'anywhere'}} variant='body2'>{k.name}</Typography></Grid>
                                <Grid item xs={6}><Typography style={{overflowWrap:'anywhere'}} variant='body2'>{k.api_key}</Typography></Grid>
                                <Grid item xs={2} textAlign='center'>
                                    <IconButton color="primary" onClick={() => setEditItem({ open: true, item: k })}>
                                        <EditIcon />
                                    </IconButton>
                                </Grid>
                            </React.Fragment>
                        ))
                    }
                    {apiKeys?.length?null:<Grid item xs={12} textAlign='center'><Typography variant='body2'>No API keys were found</Typography></Grid>}
                    <Grid item xs={12} sx={{ mt: 2 }} textAlign={'center'}><Button color='success' variant='contained' onClick={() => setAddOpen(true)}>Add</Button></Grid>
                </Grid>
            </Paper>
        </Container>
    );
}
