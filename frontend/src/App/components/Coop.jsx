import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Stack,
    Typography
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import LoadingButton from '@mui/lab/LoadingButton';
import RefreshIcon from '@mui/icons-material/Refresh';
import Title from './Title';
import { Coop } from '../../common/coopHelper';
import { useAppContext } from '../../contexts/AppContext';
import { getCoopDeviceIcon } from './CoopIcons';

function statusColor(status) {
    if (status === 'connected' || status === 'polling') return 'success';
    return 'error';
}

function powerColor(powerLevel) {
    const numericPower = Number(powerLevel);
    if (!Number.isFinite(numericPower)) return 'default';
    if (numericPower < 15) return 'error';
    if (numericPower <= 30) return 'warning';
    return 'success';
}

function formatValue(value) {
    if (value === null || value === undefined || value === '') return '?';
    return String(value);
}

function formatPowerLevel(value) {
    const formattedValue = formatValue(value);
    return Number.isFinite(Number(value)) ? `${formattedValue}%` : formattedValue;
}

function CoopDeviceCard({device, onAction, inProgress}) {
    const DeviceIcon = getCoopDeviceIcon(device.deviceType);

    return (
        <Card sx={{height: '100%', borderRadius: 1}}>
            <CardContent sx={{height: '100%', display: 'flex', flexDirection: 'column', p: 1.25, '&:last-child': {pb: 1.25}}}>
                <Stack direction='row' alignItems='flex-start' justifyContent='space-between' spacing={1}>
                    <Stack direction='row' spacing={1} sx={{minWidth: 0}}>
                        <DeviceIcon color='primary' sx={{fontSize: 32, flexShrink: 0, mt: 0.25}}/>
                        <Box sx={{minWidth: 0}}>
                            <Typography variant='subtitle1' sx={{fontWeight: 700, lineHeight: 1.2, overflowWrap: 'anywhere'}}>
                                {device.name || device.deviceId}
                            </Typography>
                            <Typography variant='caption' color='text.secondary' sx={{overflowWrap: 'anywhere'}}>
                                {device.deviceType}
                            </Typography>
                        </Box>
                    </Stack>
                    <Stack direction='row' spacing={0.5} sx={{flexShrink: 0}}>
                        <Chip size='small' color={statusColor(device.connected)} label={device.connected}/>
                        <Chip size='small' color={powerColor(device.powerLevel)} label={formatPowerLevel(device.powerLevel)}/>
                    </Stack>
                </Stack>

                <Grid container spacing={0.75} sx={{mt: 1}}>
                    {device.stateSummary.length ? device.stateSummary.map(item => (
                        <Grid item xs={6} key={`${device.deviceId}-${item.label}`}>
                            <Typography variant='caption' color='text.secondary' sx={{display: 'block', lineHeight: 1}}>
                                {item.label}
                            </Typography>
                            <Typography variant='body2' sx={{fontWeight: 600, lineHeight: 1.25, overflowWrap: 'anywhere'}}>
                                {formatValue(item.value)}
                            </Typography>
                        </Grid>
                    )) : (
                        <Grid item xs={12}>
                            <Typography variant='body2' color='text.secondary'>No state values</Typography>
                        </Grid>
                    )}
                </Grid>

                <Box sx={{mt: 'auto', pt: 1}}>
                    <Stack direction='row' spacing={0.75} sx={{flexWrap: 'wrap', rowGap: 0.75}}>
                        {device.actions.map(action => (
                            <LoadingButton
                                key={`${device.deviceId}-${action.actionName}`}
                                size='small'
                                variant='contained'
                                loading={inProgress === action.actionName}
                                disabled={!!inProgress && inProgress !== action.actionName}
                                onClick={() => onAction(device, action)}
                            >
                                {action.name}
                            </LoadingButton>
                        ))}
                    </Stack>
                </Box>
            </CardContent>
        </Card>
    );
}

export default function CoopPage() {
    const coopRef = useRef(new Coop());
    const hasLoadedRef = useRef(false);
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [actionProgress, setActionProgress] = useState({});
    const {setUser} = useAppContext();

    async function loadDevices({quiet=false} = {}) {
        if (quiet) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }
        setError(null);

        try {
            const fetchedDevices = await coopRef.current.fetchDevices();
            hasLoadedRef.current = true;
            setDevices(fetchedDevices);
        } catch (e) {
            if (e.status === 401) setUser(null);
            setError(e.message || 'Failed to load coop devices');
        }

        setLoading(false);
        setRefreshing(false);
    }

    useEffect(() => {
        let cancel = false;
        let timeoutId = null;

        async function pollDevices() {
            if (cancel) return;
            await loadDevices({quiet: hasLoadedRef.current});
            if (!cancel) timeoutId = setTimeout(pollDevices, 5000);
        }

        pollDevices();

        return () => {
            cancel = true;
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, []);

    async function handleAction(device, action) {
        setActionProgress(prev => ({...prev, [device.deviceId]: action.actionName}));
        setError(null);

        try {
            await action.action();
            await loadDevices({quiet: true});
        } catch (e) {
            if (e.status === 401) setUser(null);
            setError(e.message || `Failed to run ${action.name}`);
        }

        setActionProgress(prev => {
            const next = {...prev};
            delete next[device.deviceId];
            return next;
        });
    }

    return (
        <Box sx={{p: 1}}>
            <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{mb: 2}}>
                <Title sx={{mb: 0}}>Coop</Title>
                <Button
                    variant='contained'
                    startIcon={refreshing ? <CircularProgress color='inherit' size={16}/> : <RefreshIcon/>}
                    disabled={loading || refreshing}
                    onClick={() => loadDevices({quiet: true})}
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
                    {devices.map(device => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={device.deviceId}>
                            <CoopDeviceCard
                                device={device}
                                inProgress={actionProgress[device.deviceId]}
                                onAction={handleAction}
                            />
                        </Grid>
                    ))}
                    {devices.length ? null : (
                        <Grid item xs={12} textAlign='center'>
                            <Typography variant='body2'>No coop devices were found</Typography>
                        </Grid>
                    )}
                </Grid>
            )}
        </Box>
    );
}
