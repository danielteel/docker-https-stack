import { useAppContext } from '../../contexts/AppContext';
import { useEffect, useState } from "react";
import { LineChart } from '@mui/x-charts';



export default function DeviceLog({ deviceId }) {
    const { api } = useAppContext();
    const [log, setLog] = useState(null);


    useEffect(() => {
        let cancel = false;

        async function getLast24HoursLog(deviceId) {
            const endTime = new Date().toISOString(); // now, in UTC ISO format
            const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24 hours ago
            return await api.devicesLog(Number(deviceId), startTime, endTime);
        }

        async function getLog() {
            if (cancel) return;
            let [passed, fetchedLogs, ] = await getLast24HoursLog(deviceId);
            if (passed && Array.isArray(fetchedLogs)) {
                const mappedLogs = fetchedLogs.map(log => ({
                    time: new Date(log.time),
                    humidity: log.data.humidity,
                    temperature: log.data.temperature,
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
    }, [deviceId, api]);

    return (
        <LineChart
            xAxis={[{ dataKey: 'time', scaleType: 'time', label: 'Time' }]}
            series={[
                { dataKey: 'humidity', label: 'Humidity (%)', color: 'blue' },
                { dataKey: 'temperature', label: 'Temperature (°C)', color: 'red' },
            ]}
            dataset={log || []}
            width={600}
            height={300}
        />
    );
}