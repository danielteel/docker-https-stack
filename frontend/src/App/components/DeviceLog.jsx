import dayjs from 'dayjs';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimeRangePicker } from '@mui/x-date-pickers-pro/DateTimeRangePicker';

import { useAppContext } from '../../contexts/AppContext';
import { useEffect, useState } from "react";
import { LineChart } from '@mui/x-charts';
import { Container } from '@mui/material';



export default function DeviceLog({ deviceId }) {
    const { api } = useAppContext();
    const [log, setLog] = useState(null);
    const [dateRange, setDateRange] = useState([
        dayjs(new Date(Date.now() - 24 * 60 * 60 * 1000)),
        dayjs(new Date())
    ]);

    useEffect(() => {
        let cancel = false;

        async function getLast24HoursLog(deviceId) {
            const startTime = dateRange[0].toDate().toISOString(); // 24 hours ago
            const endTime = dateRange[1].toDate().toISOString(); // now, in UTC ISO format
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
    }, [deviceId, dateRange, api]);

    return (
        <Container maxWidth='xl'>
            
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DateTimeRangePicker
                value={dateRange}
                onChange={(newValue) => setDateRange(newValue)}
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