import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { Button, Card, CardContent, CardHeader, CardMedia, CardActions, FormControlLabel, FormGroup, Input, Stack, Paper } from '@mui/material';
import Switch from '@mui/material/Switch';
import DeviceLog from './DeviceLog';

export default function Devices(){
    const [devices, setDevices] = useState(null);
    const {api} = useAppContext();
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [showActions, setShowActions] = useState(false);
    const imgRef = useRef(null);

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

    

    useEffect(()=>{
        if (!imgRef || !imgRef.current) return;
        let timeoutId = null;
        let lastBlob=null;
        let cancelling = false;

        async function updateImage(){
            try {
                const options={
                    credentials: 'include',
                    method: "GET",
                    cache: "no-cache",
                }
                const response = await fetch('/api/devices/image/'+selectedDevice.device_id, options);
                const blob = await response.blob();
                const newBlob = URL.createObjectURL(blob);
                imgRef.current.src=newBlob;
                imgRef.current.style.display="block";
                try{
                    if (lastBlob) URL.revokeObjectURL(lastBlob);
                }catch(e){
                    console.error(e);
                }
                lastBlob=newBlob;
                return true;
            }catch(e){
                imgRef.current.style.display="none";
                console.error(e);
                return false;
            }
        }

        async function loadNext(){
            if (cancelling) return;
            await updateImage();
            timeoutId=setTimeout(loadNext, 2000);
        }

        loadNext();

        return ()=>{
            cancelling=true;
            try{
                if (lastBlob) URL.revokeObjectURL(lastBlob);
            }catch{}
            if (timeoutId){
                clearTimeout(timeoutId);
            }
        }
    }, [selectedDevice]);

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
                <Card sx={{maxWidth:'75dvw'}}>
                    <CardHeader title={selectedDevice.name}/>
                    <CardMedia component='img' ref={imgRef}/>
                    <CardActions>
                        <FormGroup>
                            <FormControlLabel label="Show Actions" control={<Switch checked={showActions} onChange={()=>setShowActions(!showActions)}/>}/>
                        </FormGroup>
                    </CardActions>
                    <CardContent>
                    {
                        !showActions ?
                            null
                        :
                            <Stack>
                            {
                            selectedDevice?.actions?.map( action => {
                                if (action.type.toLowerCase().trim()==='void'){
                                    return  <Paper>
                                                <Button variant='contained' onClick={async () => await api.devicesAction(selectedDevice.device_id, action.title, null)}>
                                                    {action.title}
                                                </Button>
                                            </Paper> 
                                }else if (action.type.toLowerCase().trim()==='byte'){
                                    return  <Paper>
                                                <Input id={"devinput_"+action.title}></Input>
                                                <Button onClick={async () => await api.devicesAction(selectedDevice.device_id, action.title, document.getElementById("devinput_"+action.title).value)}>
                                                    {action.title}
                                                </Button>
                                            </Paper> 
                                }
                            })
                            }
                            </Stack>
                        }
                        <DeviceLog deviceId={selectedDevice.device_id}/>
                    </CardContent>
                </Card>
        }
    </>
}