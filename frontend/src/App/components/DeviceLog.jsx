import { useAppContext } from '../../contexts/AppContext';
import { useEffect, useState } from "react";
import { LineChart } from '@mui/x-charts';



export default function DeviceLog({ deviceId }) {
    const { api } = useAppContext();
    const [log, setLog] = useState(null);
    const [ticks, setTicks] = useState([]);


    useEffect(() => {
        let cancel = false;

        async function getLast24HoursLog(deviceId) {
            const endTime = new Date().toISOString(); // now, in UTC ISO format
            const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24 hours ago
            return await api.devicesLog(deviceId, startTime, endTime);
        }

        async function getLog() {
            if (cancel) return;
            let [passed, fetchedLogs, ] = await getLast24HoursLog(deviceId);
            if (passed && Array.isArray(fetchedLogs)) {
                const newTicks=[];
                const mappedLogs = fetchedLogs.map(log => {
                    const time=new Date(log.time);
                    newTicks.push(time);
                    return ({
                    time: time,
                    humidity: Number(log.data.humidity),
                    temperature: Number(log.data.temperature),
                })});
                setLog(mappedLogs);
                console.log(mappedLogs);
                setTicks(newTicks);
            } else {
                setLog(null);
                setTicks([]);
            }
        }
        getLog();

        return () => {
            cancel = true;
        }
    }, [deviceId, api]);

    return (
        <LineChart
            xAxis={[{ dataKey: 'time', scaleType: 'time', label: 'Time', ticks: ticks }]}
            series={[
                { dataKey: 'humidity', label: 'Humidity (%)', color: 'blue', showMark: false, connectNulls: false },
                { dataKey: 'temperature', label: 'Temperature (°C)', color: 'red', showMark: false, connectNulls: false },
            ]}
            dataset={log || []}
            height={600}
        />
    );
}