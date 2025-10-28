import { useEffect, useState, useRef } from "react";
import {
    Card,
    CardMedia,
    CardContent,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableRow,
    CircularProgress,
    Box,
    Chip,
    Button,
    Tooltip
} from "@mui/material";

import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

import { useAppContext } from '../../contexts/AppContext';

function formatValue(logItems, name, value){
    const item = logItems.find( item => item.name === name);
    if (!item) return String(value);

    switch(item.type){
        case 'degree':
            return `${value}°`;
        case 'percent':
            return `${value}%`;
        case 'time':
            {
                const date = new Date(value);
                return date.toLocaleString();
            }
        case 'number':
            return Number(value).toString();
        case 'bool':
            return value ? 'True' : 'False';
        case 'string':
            return String(value);
        default:
            return String(value);
    }
}

function ValueCell({ logItems, key, value }) {
    return <TableCell>{formatValue(logItems, key, value)}</TableCell>
}

function getDescription(logItems, name){
    const item = logItems.find( item => item.name === name);
    if (!item) return null;
    return item.description || null;
    
}

function KeyCell({ logItems, key }) {
    const description = getDescription(logItems, key);

    return (
        <TableCell sx={{ fontWeight: 600 }}>
            {key}
            {description && (
                <Tooltip title={description} placement="right">
                    <InfoOutlinedIcon
                        fontSize="small"
                        sx={{ ml: 0.5, opacity: 0.7, cursor: "pointer" }}
                    />
                </Tooltip>
            )}
        </TableCell>
    );
}

export default function DeviceCard({ deviceId }) {
    const { api } = useAppContext();
    const [deviceInfo, setDeviceInfo] = useState(null);
    const [imgSrc, setImgSrc] = useState(null);
    const [values, setValues] = useState({});
    const [status, setStatus] = useState("connecting"); // connecting | live | disconnected
    const wsRef = useRef(null);

    // Fetch device info including device name
    useEffect(() => {
        setDeviceInfo(null);
        if (!deviceId) return;

        async function loadDevice() {
            const [ok, device] = await api.devicesGet(deviceId);
            if (ok && device) {
                setDeviceInfo(device);
            }
        }
        loadDevice();
    }, [deviceId, api]);

    // WebSocket subscription effect
    useEffect(() => {
        if (!deviceId) return;

        let retryDelay = 1000; // Starts at 1 second, will grow
        const maxDelay = 15000;
        let active = true;

        setImgSrc(null);
        setValues({});
        setStatus("connecting");

        const connectWS = () => {
            if (!active) return;

            const url = `${window.location.origin.replace("http", "ws")}/api/ws`;

            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => {
                retryDelay = 1000;
                setStatus("live");
                ws.send(JSON.stringify({ type: "subscribe", deviceId }));
            };

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.deviceId !== deviceId) return;

                    if (msg.type === "image" && msg.imageData) {
                        setImgSrc(`data:image/jpeg;base64,${msg.imageData}`);
                    }

                    if (msg.type === "value" && msg.valueName) {
                        setValues(prev => ({
                            ...prev,
                            [msg.valueName]: msg.valueData
                        }));
                    }

                    if (msg.type === "snapshot") {
                        if (msg.image) {
                            setImgSrc(`data:image/jpeg;base64,${msg.image}`);
                        }
                        if (msg.values) {
                            setValues(msg.values);
                        }
                    }
                } catch (e) {
                    console.error("WS parse error", e);
                }
            };

            const scheduleReconnect = () => {
                if (!active) return;
                setStatus("connecting");
                retryDelay = Math.min(maxDelay, retryDelay * 1.5);
                console.warn(`Reconnecting in ${retryDelay}ms`);
                setTimeout(connectWS, retryDelay);
            };

            ws.onerror = () => {
                setStatus("disconnected");
                scheduleReconnect();
            };

            ws.onclose = () => {
                setStatus("disconnected");
                scheduleReconnect();
            };
        };

        connectWS();

        return () => {
            active = false;
            wsRef.current?.close();
        };
    }, [deviceId]);

    const statusLabel = {
        connecting: "Connecting",
        live: "Live",
        disconnected: "Disconnected"
    }[status];

    const statusColor = {
        connecting: "warning",
        live: "success",
        disconnected: "error"
    }[status];

    const logItems = deviceInfo?.log_items || [];

    return (
        <Card sx={{ maxWidth: 500, margin: "auto", mt: 2, boxShadow: 4 }}>
            <Box sx={{ p: 1, position: "relative" }}>
                <Chip
                    label={statusLabel}
                    color={statusColor}
                    size="small"
                    sx={{ position: "absolute", right: 8, top: 8 }}
                />
                <Typography variant="h6">
                    {deviceInfo?.name && status !== "disconnected"
                        ? deviceInfo?.name
                        : `Device ${deviceId}`}
                </Typography>
            </Box>

            {imgSrc ? (
                <CardMedia
                    component="img"
                    image={imgSrc}
                    alt={deviceInfo?.name || `Device ${deviceId}`}
                    sx={{
                        height: 300,
                        objectFit: "contain",
                        bgcolor: "black"
                    }}
                />
            ) : (
                <Box
                    sx={{
                        height: 300,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: "black"
                    }}
                >
                    <CircularProgress />
                </Box>
            )}

            <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                    Live Values
                </Typography>

                {Object.keys(values).length > 0 ? (
                    <Table size="small">
                        <TableBody>
                            {Object.entries(values).map(([key, val]) => (
                                <TableRow key={key}>
                                    <KeyCell logItems={logItems} key={key} />
                                    <ValueCell logItems={logItems} key={key} value={val} />
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <Typography variant="body2" color="text.secondary">
                        Waiting for values...
                    </Typography>
                )}
                
                <Button href={'/devicelog/'+deviceId}>Device Log</Button>
            </CardContent>
        </Card>
    );
}