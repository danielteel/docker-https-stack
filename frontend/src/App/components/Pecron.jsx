import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Divider,
    Stack,
    Switch,
    Typography
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import BatteryChargingFullIcon from '@mui/icons-material/BatteryChargingFull';
import BoltIcon from '@mui/icons-material/Bolt';
import DeviceThermostatIcon from '@mui/icons-material/DeviceThermostat';
import ElectricBoltIcon from '@mui/icons-material/ElectricBolt';
import PowerIcon from '@mui/icons-material/Power';
import RefreshIcon from '@mui/icons-material/Refresh';
import SettingsInputComponentIcon from '@mui/icons-material/SettingsInputComponent';
import Title from './Title';
import { useAppContext } from '../../contexts/AppContext';
import { meetsMinRole } from '../../common/common';

function isKnown(value) {
    return value !== null && value !== undefined && !Number.isNaN(Number(value));
}

function formatWatts(value) {
    return isKnown(value) ? `${value} W` : 'Unknown';
}

function formatVolts(value) {
    return isKnown(value) ? `${value} V` : 'Unknown';
}

function formatHertz(value) {
    return isKnown(value) ? `${value} Hz` : 'Unknown';
}

function formatPercent(value) {
    return isKnown(value) ? `${value}%` : 'Unknown';
}

function formatTemperature(value) {
    return isKnown(value) ? `${value} F` : 'Unknown';
}

function formatOnOff(value) {
    if (value === true) return 'On';
    if (value === false) return 'Off';
    return 'Unknown';
}

function MiniStat({label, value}) {
    return (
        <Box sx={{minWidth: 0}}>
            <Typography variant='caption' color='text.secondary' sx={{display: 'block', lineHeight: 1}}>
                {label}
            </Typography>
            <Typography variant='body2' sx={{fontWeight: 700, overflowWrap: 'anywhere'}}>
                {value}
            </Typography>
        </Box>
    );
}

function MetricCard({icon, title, value, children}) {
    return (
        <Card sx={{height: '100%', borderRadius: 1}}>
            <CardContent sx={{height: '100%', display: 'flex', flexDirection: 'column', p: 1.5, '&:last-child': {pb: 1.5}}}>
                <Stack direction='row' alignItems='flex-start' spacing={1}>
                    {icon}
                    <Box sx={{minWidth: 0}}>
                        <Typography variant='caption' color='text.secondary' sx={{display: 'block', lineHeight: 1}}>
                            {title}
                        </Typography>
                        <Typography variant='h5' sx={{fontWeight: 800, lineHeight: 1.2, overflowWrap: 'anywhere'}}>
                            {value}
                        </Typography>
                    </Box>
                </Stack>
                {children && (
                    <>
                        <Divider sx={{my: 1.25}}/>
                        {children}
                    </>
                )}
            </CardContent>
        </Card>
    );
}

function OutputCard({title, watts, checked, canControl, changing, onToggle, children}) {
    return (
        <Card sx={{height: '100%', borderRadius: 1}}>
            <CardContent sx={{height: '100%', display: 'flex', flexDirection: 'column', p: 1.5, '&:last-child': {pb: 1.5}}}>
                <Stack direction='row' alignItems='flex-start' justifyContent='space-between' spacing={1}>
                    <Stack direction='row' alignItems='center' spacing={1} sx={{minWidth: 0}}>
                        <PowerIcon color={checked ? 'success' : 'disabled'} sx={{fontSize: 32, flexShrink: 0}}/>
                        <Box sx={{minWidth: 0}}>
                            <Typography variant='caption' color='text.secondary' sx={{display: 'block', lineHeight: 1}}>
                                {title}
                            </Typography>
                            <Typography variant='h5' sx={{fontWeight: 800, lineHeight: 1.2}}>
                                {formatWatts(watts)}
                            </Typography>
                        </Box>
                    </Stack>
                    <Stack direction='row' alignItems='center' spacing={1} sx={{flexShrink: 0}}>
                        <Chip size='small' color={checked ? 'success' : 'default'} label={formatOnOff(checked)}/>
                        <Switch
                            checked={checked === true}
                            disabled={!canControl || changing}
                            onChange={(event) => onToggle(event.target.checked)}
                            inputProps={{'aria-label': `${title} output`}}
                        />
                    </Stack>
                </Stack>

                {children && (
                    <>
                        <Divider sx={{my: 1.25}}/>
                        {children}
                    </>
                )}

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
                <Box sx={{minWidth: 0}}>
                    <Title sx={{mb: 0}}>Pecron</Title>
                    {status && (
                        <Typography variant='body2' color='text.secondary' sx={{overflowWrap: 'anywhere'}}>
                            {status.deviceName} {status.productName ? `- ${status.productName}` : ''}
                        </Typography>
                    )}
                </Box>
                <Stack direction='row' spacing={1} alignItems='center'>
                    {status && <Chip size='small' color={status.online ? 'success' : 'error'} label={status.online ? 'Online' : 'Offline'}/>}
                    <Button
                        variant='contained'
                        startIcon={refreshing ? <CircularProgress color='inherit' size={16}/> : <RefreshIcon/>}
                        disabled={loading || refreshing}
                        onClick={() => loadStatus({quiet: true})}
                    >
                        Refresh
                    </Button>
                </Stack>
            </Stack>

            {error && <Alert severity='error' sx={{mb: 2}}>{error}</Alert>}

            {loading ? (
                <Stack alignItems='center' sx={{py: 6}}>
                    <CircularProgress/>
                </Stack>
            ) : status ? (
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={3}>
                        <MetricCard
                            icon={<BatteryChargingFullIcon color='primary' sx={{fontSize: 34, flexShrink: 0}}/>}
                            title='Battery'
                            value={formatPercent(status.batteryPercentage)}
                        >
                            <Stack direction='row' spacing={1} alignItems='center'>
                                <DeviceThermostatIcon color='action' fontSize='small'/>
                                <MiniStat label='Temperature' value={formatTemperature(status.temperatureFahrenheit)}/>
                            </Stack>
                        </MetricCard>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <MetricCard
                            icon={<SettingsInputComponentIcon color='primary' sx={{fontSize: 34, flexShrink: 0}}/>}
                            title='Total Power In'
                            value={formatWatts(status.totalInputPower)}
                        >
                            <Stack direction='row' spacing={2}>
                                <MiniStat label='AC Input' value={formatWatts(status.acInputPower)}/>
                                <MiniStat label='DC Input' value={formatWatts(status.dcInputPower)}/>
                            </Stack>
                        </MetricCard>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <MetricCard
                            icon={<ElectricBoltIcon color='primary' sx={{fontSize: 34, flexShrink: 0}}/>}
                            title='Total Power Out'
                            value={formatWatts(status.totalOutputPower)}
                        />
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <OutputCard
                            title='DC Power Out'
                            watts={status.dcOutputPower}
                            checked={status.dcOn}
                            canControl={canControl}
                            changing={changing === 'dc'}
                            onToggle={(on) => handleOutput('dc', on)}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <OutputCard
                            title='AC Power Out'
                            watts={status.acOutputPower}
                            checked={status.acOn}
                            canControl={canControl}
                            changing={changing === 'ac'}
                            onToggle={(on) => handleOutput('ac', on)}
                        >
                            <Grid container spacing={2}>
                                <Grid item xs={6} sm={4}>
                                    <MiniStat label='Voltage' value={formatVolts(status.acOutputVoltage)}/>
                                </Grid>
                                <Grid item xs={6} sm={4}>
                                    <MiniStat label='Frequency' value={formatHertz(status.acOutputFrequency)}/>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <MiniStat label='UPS Mode' value={formatOnOff(status.upsMode)}/>
                                </Grid>
                            </Grid>
                        </OutputCard>
                    </Grid>
                </Grid>
            ) : (
                <Typography variant='body2'>No Pecron status is available</Typography>
            )}
        </Box>
    );
}
