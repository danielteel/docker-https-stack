import dayjs from 'dayjs';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';

import { useAppContext } from '../../contexts/AppContext';
import { useEffect, useState } from "react";
import { LineChart } from '@mui/x-charts';
import { Button, ButtonGroup, Container, Grid } from '@mui/material';



export default function DeviceLog({ deviceId }) {
    const { api } = useAppContext();
    const [log, setLog] = useState(null);
    const [startDate, _setStartDate] = useState(dayjs(new Date(Date.now() - 24 * 60 * 60 * 1000)));
    const [endDate, _setEndDate] = useState(dayjs(new Date()));

    const setStartDate = (newValue) => {
        if (newValue>endDate){
            _setEndDate(newValue);
            _setStartDate(endDate);
        }else{
            _setStartDate(newValue);
        }
    }

    const setEndDate = (newValue) => {
        if (newValue<startDate){
            _setStartDate(newValue);
            _setEndDate(startDate);
        }else{
            _setEndDate(newValue);
        }  
    }


    useEffect(() => {
        let cancel = false;

        async function getLast24HoursLog(deviceId) {
            const startTime = startDate.toDate().toISOString(); // 24 hours ago
            const endTime = endDate.toDate().toISOString(); // now, in UTC ISO format
            return await api.devicesLog(deviceId, startTime, endTime);
        }

        async function getLog() {
            if (cancel) return;
            let [passed, fetchedLogs, ] = await getLast24HoursLog(deviceId);
            if (passed && Array.isArray(fetchedLogs)) {
                const mappedLogs = fetchedLogs.map(log => ({
                    time: new Date(log.time),
                    humidity: Number(log.data.humidity),
                    temperature: Number(log.data.temperature),
                }));
                setLog(mappedLogs);
            } else {
                setLog(null);
            }
        }
        getLog();

        return () => {
            cancel = true;
        }
    }, [deviceId, startDate, endDate, api]);

    return (
        <Container maxWidth='xl'>
            
            <Grid 
            container
            spacing={0.5}   
            sx={{
                justifyContent: "center",
                alignItems: "center",
            }}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <Grid size={6} container alignContent={"center"} alignItems={"center"} justifyContent={"center"} justifyItems={"center"}>
                            <DateTimePicker
                                label="Start Date & Time"
                                value={startDate}
                                onChange={(newValue) => setStartDate(newValue)}
                            />
                        </Grid>
                        <Grid size={6} container alignContent={"center"} alignItems={"center"} justifyContent={"center"} justifyItems={"center"}>
                            <DateTimePicker
                                label="End Date & Time"
                                value={endDate}
                                onChange={(newValue) => setEndDate(newValue)}
                            />
                        </Grid>
                </LocalizationProvider> 
            </Grid>
            <ButtonGroup>
                <Button onClick={()=>{
                    setEndDate(dayjs(new Date()));
                    setStartDate(dayjs(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)));
                }}>Last 7 Days</Button>            
                <Button onClick={()=>{
                    setEndDate(dayjs(new Date()));
                    setStartDate(dayjs(new Date(Date.now() - 24 * 60 * 60 * 1000)));
                }}>Last 24 hours</Button>
                <Button onClick={()=>{
                    setEndDate(dayjs(new Date()));
                    setStartDate(dayjs(new Date(Date.now() - 12 * 60 * 60 * 1000)));
                }}>Last 12 hours</Button>            
                <Button onClick={()=>{
                    setEndDate(dayjs(new Date()));
                    setStartDate(dayjs(new Date(Date.now() - 6 * 60 * 60 * 1000)));
                }}>Last 6 hours</Button>            
                <Button onClick={()=>{
                    setEndDate(dayjs(new Date()));
                    setStartDate(dayjs(new Date(Date.now() - 3 * 60 * 60 * 1000)));
                }}>Last 3 hours</Button>
            </ButtonGroup>

            <LineChart
                xAxis={[{ dataKey: 'time', scaleType: 'time', label: 'Time'}]}
                yAxis={[{id:'leftAxis', scaleType:'linear', position:'left'},{id:"rightAxis", scaleType:'linear', position:'right'}]}
                series={[
                    { yAxisId:'left', dataKey: 'temperature', label: 'Temp (°F)', color: 'red', showMark: false},
                    { yAxisId:'rightAxis', dataKey: 'humidity', label: 'Humidity (%RH)', color: 'blue', showMark: false},
                ]}
                dataset={log || []}
                height={300}
                tooltip={{ trigger: 'axis' }}
                axisHighlight={{ x: 'line' }}
                grid={{ vertical: true, horizontal: true }}
            />
            <LineChart
                xAxis={[{ dataKey: 'time', scaleType: 'time', label: 'Time'}]}
                series={[
                    { dataKey: 'humidity', label: 'Humidity (%)', color: 'blue', showMark: false},
                ]}
                dataset={log || []}
                height={300}
                tooltip={{ trigger: 'axis' }}
                axisHighlight={{ x: 'line' }}
                grid={{ vertical: true, horizontal: true }}
            />
        </Container>
    );
}