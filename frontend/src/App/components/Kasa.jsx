import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Stack,
    Switch,
    Typography
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import RefreshIcon from '@mui/icons-material/Refresh';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import OutletIcon from '@mui/icons-material/Outlet';
import Title from './Title';
import { useAppContext } from '../../contexts/AppContext';
import { meetsMinRole } from '../../common/common';

function stateColor(state) {
    if (state === 'on') return 'success';
    if (state === 'off') return 'default';
    return 'error';
}

function stateLabel(state) {
    if (state === 'on') return 'On';
    if (state === 'off') return 'Off';
    return 'Disconnected';
}

function KasaPlugCard({plug, canControl, changing, onToggle}) {
    const disconnected = plug.state === 'disconnected';

    return (
        <Card sx={{height: '100%', borderRadius: 1, bgcolor: disconnected ? 'action.hover' : 'background.paper'}}>
            <CardContent sx={{height: '100%', display: 'flex', flexDirection: 'column', p: 1.5, '&:last-child': {pb: 1.5}}}>
                <Stack direction='row' justifyContent='space-between' alignItems='flex-start' spacing={1}>
                    <Stack direction='row' spacing={1} alignItems='center' sx={{minWidth: 0}}>
                        <OutletIcon color={disconnected ? 'disabled' : 'primary'} sx={{fontSize: 34, flexShrink: 0}}/>
                        <Box sx={{minWidth: 0}}>
                            <Typography variant='subtitle1' sx={{fontWeight: 700, overflowWrap: 'anywhere', lineHeight: 1.2}}>
                                {plug.name}
                            </Typography>
                            <Typography variant='caption' color='text.secondary' sx={{overflowWrap: 'anywhere'}}>
                                {plug.id}
                            </Typography>
                        </Box>
                    </Stack>
                    <Chip size='small' color={stateColor(plug.state)} label={stateLabel(plug.state)}/>
                </Stack>

                <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{mt: 2}}>
                    <Stack direction='row' alignItems='center' spacing={1}>
                        <PowerSettingsNewIcon color={plug.state === 'on' ? 'success' : 'disabled'}/>
                        <Typography variant='body2' color='text.secondary'>
                            Power
                        </Typography>
                    </Stack>
                    {canControl ? (
                        <Switch
                            checked={plug.state === 'on'}
                            disabled={changing || disconnected}
                            onChange={(event) => onToggle(plug, event.target.checked)}
                        />
                    ) : (
                        <Typography variant='body2' sx={{fontWeight: 600}}>
                            {stateLabel(plug.state)}
                        </Typography>
                    )}
                </Stack>

                {changing && (
                    <Stack direction='row' alignItems='center' spacing={1} sx={{mt: 1}}>
                        <CircularProgress size={16}/>
                        <Typography variant='caption' color='text.secondary'>Updating</Typography>
                    </Stack>
                )}
            </CardContent>
        </Card>
    );
}

export default function Kasa() {
    const {api, user} = useAppContext();
    const hasLoadedRef = useRef(false);
    const [plugs, setPlugs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [changing, setChanging] = useState({});
    const canControl = meetsMinRole(user.role, 'admin');

    const loadPlugs = useCallback(async ({quiet = false} = {}) => {
        if (quiet) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }
        setError(null);

        const [ok, data] = await api.kasaPlugs();
        if (ok) {
            hasLoadedRef.current = true;
            setPlugs(data);
        } else {
            setError(data?.error || 'Failed to load Kasa plugs');
        }

        setLoading(false);
        setRefreshing(false);
    }, [api]);

    useEffect(() => {
        let cancel = false;
        let timeoutId = null;

        async function pollPlugs() {
            if (cancel) return;
            await loadPlugs({quiet: hasLoadedRef.current});
            if (!cancel) timeoutId = setTimeout(pollPlugs, 5000);
        }

        pollPlugs();

        return () => {
            cancel = true;
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [loadPlugs]);

    async function handleToggle(plug, on) {
        setChanging(prev => ({...prev, [plug.id]: true}));
        setError(null);

        const [ok, updatedPlug] = await api.kasaSetPlugState(plug.id, on);
        if (ok) {
            setPlugs(prev => prev.map(item => item.id === updatedPlug.id ? updatedPlug : item));
        } else {
            setError(updatedPlug?.error || `Failed to turn ${plug.name} ${on ? 'on' : 'off'}`);
        }

        setChanging(prev => {
            const next = {...prev};
            delete next[plug.id];
            return next;
        });
    }

    return (
        <Box sx={{p: 1}}>
            <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{mb: 2}}>
                <Title sx={{mb: 0}}>Kasa Plugs</Title>
                <Button
                    variant='contained'
                    startIcon={refreshing ? <CircularProgress color='inherit' size={16}/> : <RefreshIcon/>}
                    disabled={loading || refreshing}
                    onClick={() => loadPlugs({quiet: true})}
                >
                    Refresh
                </Button>
            </Stack>

            {error && <Alert severity='error' sx={{mb: 2}}>{error}</Alert>}

            {loading ? (
                <Stack alignItems='center' sx={{py: 6}}>
                    <CircularProgress/>
                </Stack>
            ) : (
                <Grid container spacing={2}>
                    {plugs.map(plug => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={plug.id}>
                            <KasaPlugCard
                                plug={plug}
                                canControl={canControl}
                                changing={!!changing[plug.id]}
                                onToggle={handleToggle}
                            />
                        </Grid>
                    ))}
                    {plugs.length ? null : (
                        <Grid item xs={12} textAlign='center'>
                            <Typography variant='body2'>No Kasa plugs are configured</Typography>
                        </Grid>
                    )}
                </Grid>
            )}
        </Box>
    );
}
