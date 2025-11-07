import { useEffect, useState, useRef } from "react";
import {
    Card,
    CardMedia,
    CardContent,
    Typography,
    Box,
    Chip,
    Button,
    Stack
} from "@mui/material";


import { useAppContext } from '../../contexts/AppContext';
import DeviceActions from "./DeviceActions";
import DeviceValues from "./DeviceValues";

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

            <CardContent sx={{
                opacity: (status === "live" && deviceConnected) ? 1 : 0.4,
                transition: "opacity 0.3s ease"
            }}>
                
                <DeviceValues values={values} logItems={deviceInfo?.log_items}/>

                
                <DeviceActions deviceId={deviceId} actions={deviceInfo?.actions} values={values} webSocket={wsRef}/>

                <Button href={'/devicelog/'+deviceId}>Device Log</Button>
            </CardContent>
        </Card>
    );
}