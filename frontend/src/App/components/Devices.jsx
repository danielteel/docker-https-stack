import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { Button, Card, CardContent, CardHeader, CardMedia, CardActions, FormControlLabel, FormGroup, Input, Stack, Paper } from '@mui/material';
import Switch from '@mui/material/Switch';
import DeviceLog from './DeviceLog';
import DeviceCard from './DeviceCard';

export default function Devices(){
    const [devices, setDevices] = useState(null);
    const {api} = useAppContext();
    const [selectedDevice, setSelectedDevice] = useState(null);

    useEffect(() => {
        let timeoutId = null;
        let cancel=false;

        async function getDevices() {
            if (cancel) return;
            let [passed, fetchedDevices] = await api.devicesList();
            if (passed) {
                setDevices(fetchedDevices);
                if (fetchedDevices.length){
                    setSelectedDevice(fetchedDevices[0]);        
                }
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


    const handleChange = (event, newValue) => {
        setSelectedDevice(newValue);
    };

    return <>
        <Tabs value={selectedDevice} onChange={handleChange}>
            {devices?.map(device => (
                <Tab value={device} label={device.name} disabled={!device.connected}/>
            ))}
        </Tabs>
        {
            !selectedDevice ?
                null
            :
                <DeviceCard deviceId={selectedDevice.device_id}/>
        }
    </>
}