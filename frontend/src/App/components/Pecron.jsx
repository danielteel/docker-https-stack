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
import BatteryChargingFullIcon from '@mui/icons-material/BatteryChargingFull';
import BoltIcon from '@mui/icons-material/Bolt';
import PowerIcon from '@mui/icons-material/Power';
import RefreshIcon from '@mui/icons-material/Refresh';
import Title from './Title';
import { useAppContext } from '../../contexts/AppContext';
import { meetsMinRole } from '../../common/common';

function formatWatts(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return 'Unknown';
    return `${value} W`;
}

function formatPercent(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return 'Unknown';
    return `${value}%`;
}

function formatOnOff(value) {
    if (value === true) return 'On';
    if (value === false) return 'Off';
    return 'Unknown';
}

function StatusCard({icon, label, value}) {
    return (
        <Card sx={{height: '100%', borderRadius: 1}}>
            <CardContent sx={{p: 1.5, '&:last-child': {pb: 1.5}}}>
                <Stack direction='row' spacing={1} alignItems='center'>
                    {icon}
                    <Box sx={{minWidth: 0}}>
                        <Typography variant='caption' color='text.secondary' sx={{display: 'block', lineHeight: 1}}>
                            {label}
                        </Typography>
                        <Typography variant='h6' sx={{fontWeight: 700, lineHeight: 1.25, overflowWrap: 'anywhere'}}>
                            {value}
                        </Typography>
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
}

function OutputControl({label, checked, watts, canControl, changing, onToggle}) {
    return (
        <Card sx={{height: '100%', borderRadius: 1}}>
            <CardContent sx={{p: 1.5, '&:last-child': {pb: 1.5}}}>
                <Stack direction='row' alignItems='center' justifyContent='space-between' spacing={1}>
                    <Stack direction='row' spacing={1} alignItems='center' sx={{minWidth: 0}}>
                        <PowerIcon color={checked ? 'success' : 'disabled'}/>
                        <Box sx={{minWidth: 0}}>
                            <Typography variant='subtitle1' sx={{fontWeight: 700, lineHeight: 1.2}}>
                                {label}
                            </Typography>
                            <Typography variant='body2' color='text.secondary'>
                                {formatWatts(watts)}
                            </Typography>
                        </Box>
                    </Stack>
                    <Stack direction='row' spacing={1} alignItems='center'>
                        <Chip size='small' color={checked ? 'success' : 'default'} label={formatOnOff(checked)}/>
                        {canControl && (
                            <Switch
                                checked={checked === true}
                                disabled={changing}
                                onChange={(event) => onToggle(event.target.checked)}
                            />
                        )}
                    </Stack>
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

export default function Pecron() {
    const {api, user} = useAppContext();
    const hasLoadedRef = useRef(false);
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [changing, setChanging] = useState(null);
    const canControl = meetsMinRole(user.role, 'admin');

    const loadStatus = useCallback(async ({quiet = false} = {}) => {
        if (quiet) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }
        setError(null);

        const [ok, data] = await api.pecronStatus();
        if (ok) {
            hasLoadedRef.current = true;
            setStatus(data);
        } else {
            setError(data?.error || 'Failed to load Pecron status');
        }

        setLoading(false);
        setRefreshing(false);
    }, [api]);

    useEffect(() => {
        let cancel = false;
        let timeoutId = null;

        async function pollStatus() {
            if (cancel) return;
            await loadStatus({quiet: hasLoadedRef.current});
            if (!cancel) timeoutId = setTimeout(pollStatus, 5000);
        }

        pollStatus();

        return () => {
            cancel = true;
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [loadStatus]);

    async function handleOutput(output, on) {
        setChanging(output);
        setError(null);

        const [ok, data] = output === 'ac' ? await api.pecronSetAc(on) : await api.pecronSetDc(on);
        if (ok) {
            setStatus(data);
        } else {
            setError(data?.error || `Failed to turn ${output.toUpperCase()} ${on ? 'on' : 'off'}`);
        }

        setChanging(null);
    }

    return (
        <Box sx={{p: 1}}>
            <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{mb: 2}}>
                <Title sx={{mb: 0}}>Pecron</Title>
                <Button
                    variant='contained'
                    startIcon={refreshing ? <CircularProgress color='inherit' size={16}/> : <RefreshIcon/>}
                    disabled={loading || refreshing}
                    onClick={() => loadStatus({quiet: true})}
                >
                    Refresh
                </Button>
            </Stack>

            {error && <Alert severity='error' sx={{mb: 2}}>{error}</Alert>}

            {loading ? (
                <Stack alignItems='center' sx={{py: 6}}>
                    <CircularProgress/>
                </Stack>
            ) : status ? (
                <Stack spacing={2}>
                    <Card sx={{borderRadius: 1}}>
                        <CardContent sx={{p: 1.5, '&:last-child': {pb: 1.5}}}>
                            <Stack direction='row' alignItems='center' justifyContent='space-between' spacing={1}>
                                <Stack direction='row' spacing={1} alignItems='center' sx={{minWidth: 0}}>
                                    <BatteryChargingFullIcon color='primary' sx={{fontSize: 34, flexShrink: 0}}/>
                                    <Box sx={{minWidth: 0}}>
                                        <Typography variant='subtitle1' sx={{fontWeight: 700, lineHeight: 1.2, overflowWrap: 'anywhere'}}>
                                            {status.deviceName}
                                        </Typography>
                                        <Typography variant='caption' color='text.secondary' sx={{overflowWrap: 'anywhere'}}>
                                            {status.productName || 'Pecron power station'}
                                        </Typography>
                                    </Box>
                                </Stack>
                                <Chip size='small' color={status.online ? 'success' : 'error'} label={status.online ? 'Online' : 'Offline'}/>
                            </Stack>
                        </CardContent>
                    </Card>

                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatusCard icon={<BatteryChargingFullIcon color='primary'/>} label='Battery' value={formatPercent(status.batteryPercentage)}/>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatusCard icon={<BoltIcon color='primary'/>} label='Power In' value={formatWatts(status.totalInputPower)}/>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatusCard icon={<BoltIcon color='primary'/>} label='AC Out' value={formatWatts(status.acOutputPower)}/>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatusCard icon={<BoltIcon color='primary'/>} label='DC Out' value={formatWatts(status.dcOutputPower)}/>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <OutputControl
                                label='AC Power'
                                checked={status.acOn}
                                watts={status.acOutputPower}
                                canControl={canControl}
                                changing={changing === 'ac'}
                                onToggle={(on) => handleOutput('ac', on)}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <OutputControl
                                label='DC Power'
                                checked={status.dcOn}
                                watts={status.dcOutputPower}
                                canControl={canControl}
                                changing={changing === 'dc'}
                                onToggle={(on) => handleOutput('dc', on)}
                            />
                        </Grid>
                    </Grid>
                </Stack>
            ) : (
                <Typography variant='body2'>No Pecron status is available</Typography>
            )}
        </Box>
    );
}
