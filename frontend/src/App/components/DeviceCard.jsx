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
    Tooltip,
    Stack
} from "@mui/material";

import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

import { useAppContext } from '../../contexts/AppContext';
import DeviceActions from "./DeviceActions";

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

function ValueCell({ logItems, name, value }) {
    return <TableCell>{formatValue(logItems, name, value)}</TableCell>
}

function getDescription(logItems, name){
    const item = logItems.find( item => item.name === name);
    if (!item) return null;
    return item.description || null;
    
}

function KeyCell({ logItems, name }) {
    const description = getDescription(logItems, name);

    return (
        <TableCell sx={{ fontWeight: 600 }}>
            {name}
            {description && (
                <Tooltip title={description} placement="right" enterTouchDelay={0} leaveTouchDelay={3000}>
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
    const [deviceConnected, setDeviceConnected] = useState(false);
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

        let timeoutId = null;

        setImgSrc(null);
        setValues({});
        setStatus("connecting");

        const connectWS = () => {
            timeoutId = null;
            if (!active) return;

            const url = `${window.location.origin.replace("http", "ws")}/api/ws`;

            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => {
                retryDelay = 1000;
                setStatus("authenticating");
            };

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.type === "ready") {
                        setStatus("live");
                        ws.send(JSON.stringify({ type: "subscribe", deviceId }));
                    }

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
                        }else{
                            setImgSrc(null);
                        }
                        if (msg.values) {
                            setValues(msg.values);
                        }else{
                            setValues({});
                        }
                        setDeviceConnected(Boolean(msg.connected));
                    }

                    if (msg.type === "disconnected") {
                        setDeviceConnected(false);
                    }

                    if (msg.type === "connected") {
                        setDeviceConnected(true);
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
                if (timeoutId) clearTimeout(timeoutId);
                timeoutId = setTimeout(connectWS, retryDelay);
            };

            ws.onerror = () => {
                setStatus("error/disconnected");
                scheduleReconnect();
            };

            ws.onclose = () => {
                setStatus("disconnected");
                scheduleReconnect();
            };
        };

        connectWS();

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = null;
            active = false;
            wsRef.current?.close();
            setDeviceConnected(false);
        };
    }, [deviceId]);

    const statusLabel = {
        connecting: "WS Connecting",
        authenticating: "WS Authenticating",
        live: "WS Live",
        disconnected: "WS Disconnected"
    }[status];

    const statusColor = {
        connecting: "warning",
        authenticating: "info",
        live: "success",
        disconnected: "error"
    }[status];

    const deviceColor = deviceConnected ? "success" : "error";
    const deviceLabel = deviceConnected ? "Dev Live" : "Dev Disconnected";

    const logItems = deviceInfo?.log_items || [];
    const actions = deviceInfo?.actions || [];

    return (
        <Card sx={{ maxWidth: 500, margin: "auto", mt: 2, boxShadow: 4 }}>
            <Box sx={{ p: 1, position: "relative" }}>
                <Stack direction="row" spacing={1} sx={{ position: "absolute", right: 8, top: 8 }}>
                    <Chip label={statusLabel} color={statusColor} size="small" />
                    <Chip label={deviceLabel} color={deviceColor} size="small" />
                </Stack>
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
                        bgcolor: "black",
                        opacity: (status === "live" && deviceConnected) ? 1 : 0.4,
                        transition: "opacity 0.3s ease"
                    }}
                />
            ) : null}

            <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                    Current Values
                </Typography>

                {Object.keys(values).length > 0 ? (
                    <Table
                        size="small"
                        sx={{
                            opacity: (status === "live" && deviceConnected) ? 1 : 0.4,
                            transition: "opacity 0.3s ease"
                        }}
                    >
                        <TableBody>
                            {Object.entries(values).map(([key, val]) => (
                                <TableRow key={key}>
                                    <KeyCell logItems={logItems} name={key} />
                                    <ValueCell logItems={logItems} name={key} value={val} />
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <Typography variant="body2" color="text.secondary">
                        Waiting for values...
                    </Typography>
                )}
                <Typography variant="subtitle1" gutterBottom>
                    Actions
                </Typography>
                <DeviceActions actions={actions}/>
                <Button href={'/devicelog/'+deviceId}>Device Log</Button>
            </CardContent>
        </Card>
    );
}