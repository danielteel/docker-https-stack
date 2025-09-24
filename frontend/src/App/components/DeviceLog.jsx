import dayjs from 'dayjs';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';

import { useAppContext } from '../../contexts/AppContext';
import { useEffect, useState } from "react";
import { LineChart } from '@mui/x-charts';
import { Container } from '@mui/material';



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
            
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DateTimePicker
                    label="Start Date & Time"
                    value={startDate}
                    onChange={(newValue) => setStartDate(newValue)}
                />
                <DateTimePicker
                    label="End Date & Time"
                    value={endDate}
                    onChange={(newValue) => setEndDate(newValue)}
                />
            </LocalizationProvider>
            <LineChart
                xAxis={[{ dataKey: 'time', scaleType: 'time', label: 'Time'}]}
                series={[
                    { dataKey: 'temperature', label: 'Temperature (°C)', color: 'red', showMark: false},
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