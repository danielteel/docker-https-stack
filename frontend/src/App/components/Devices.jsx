import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import {
    Box,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    Grid,
    Typography,
    CircularProgress
} from '@mui/material';
import DeviceCard from './DeviceCard';

export default function Devices() {
    const { api } = useAppContext();
    const [devices, setDevices] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);

    useEffect(() => {
        let timeoutId = null;
        let cancel = false;

        async function getDevices() {
            if (cancel) return;
            let [passed, fetchedDevices] = await api.devicesList();
            if (passed) {
                setDevices(fetchedDevices);
            } else {
                timeoutId = setTimeout(getDevices, 2000);
            }
        }

        getDevices();
        return () => {
            cancel = true;
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [api]);

    const handleChange = (event) => {
        setSelectedIds(event.target.value);
    };

    if (!devices) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Select devices</InputLabel>
                <Select
                    multiple
                    label="Select devices"
                    value={selectedIds}
                    onChange={handleChange}
                    renderValue={(selected) => (
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {selected.map(id => {
                                const d = devices.find(x => x.device_id === id);
                                return <Chip key={id} label={d?.name || id} />;
                            })}
                        </Box>
                    )}
                >
                    {devices.map(device => (
                        <MenuItem
                            key={device.device_id}
                            value={device.device_id}
                            disabled={!device.connected}
                        >
                            {device.name}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            {selectedIds.length === 0 && (
                <Typography sx={{ textAlign: 'center', mt: 3 }} color="text.secondary">
                    Select one or more devices to view live data.
                </Typography>
            )}

            <Grid container spacing={2}>
                {selectedIds.map(id => (
                    <Grid item xs={12} sm={6} lg={4} key={id}>
                        <DeviceCard deviceId={id} />
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
}