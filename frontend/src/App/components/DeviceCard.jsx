import { useEffect, useState, useRef } from "react";
import {
    Card,
    CardMedia,
    CardContent,
    Typography,
    Box,
    Chip,
    Button,
    Stack,
    Collapse,
    IconButton
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";

import DeviceActions from "./DeviceActions";
import DeviceValues from "./DeviceValues";

export default function DeviceCard({ device }) {
    const [imgSrc, setImgSrc] = useState(null);
    const [values, setValues] = useState({});
    const [deviceConnected, setDeviceConnected] = useState(device?.connected || false);
    const [status, setStatus] = useState("connecting"); // connecting | live | disconnected
    const wsRef = useRef(null);

    // Expand/collapse states
    const [showValues, setShowValues] = useState(true);   // expanded by default
    const [showActions, setShowActions] = useState(false); // collapsed by default

    const deviceId = device?.device_id;

    // WebSocket subscription effect
    useEffect(() => {
        if (!deviceId) return;

        let retryDelay = 1000;
        const maxDelay = 5000;
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
                        setImgSrc(msg.image ? `data:image/jpeg;base64,${msg.image}` : null);
                        setValues(msg.values || {});
                        setDeviceConnected(Boolean(msg.connected));
                    }

                    if (msg.type === "disconnected") setDeviceConnected(false);
                    if (msg.type === "connected") setDeviceConnected(true);
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
                setDeviceConnected(false);
                scheduleReconnect();
            };

            ws.onclose = () => {
                setStatus("disconnected");
                setDeviceConnected(false);
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

    // --- Derived labels/colors ---
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
                    {device?.name || `Device ${deviceId}`}
                </Typography>
            </Box>

            {imgSrc && (
                <CardMedia
                    component="img"
                    image={imgSrc}
                    alt={device?.name || `Device ${deviceId}`}
                    sx={{
                        height: 300,
                        objectFit: "contain",
                        bgcolor: "black",
                        opacity: (status === "live" && deviceConnected) ? 1 : 0.4,
                        transition: "opacity 0.3s ease"
                    }}
                />
            )}

            <CardContent
                sx={{
                    opacity: (status === "live" && deviceConnected) ? 1 : 0.4,
                    transition: "opacity 0.3s ease"
                }}
            >
                {/* --- VALUES (expanded by default) --- */}
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        Values
                    </Typography>
                    <IconButton size="small" onClick={() => setShowValues(v => !v)}>
                        {showValues ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                </Stack>

                <Collapse in={showValues} timeout="auto" unmountOnExit>
                    <DeviceValues
                        values={values}
                        actions={device?.actions}
                        logItems={device?.log_items}
                    />
                </Collapse>

                {
                    device?.actions?.length > 0 
                    ? 
                        <>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 2 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                Actions
                            </Typography>
                            <IconButton size="small" onClick={() => setShowActions(a => !a)}>
                                {showActions ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            </IconButton>
                        </Stack>

                        <Collapse in={showActions} timeout="auto" unmountOnExit>
                            <DeviceActions
                                deviceId={deviceId}
                                actions={device?.actions}
                                values={values}
                                webSocket={wsRef}
                            />
                        </Collapse>
                        </>
                    :
                        null
                }

                <Button href={`/devicelog/${deviceId}`} sx={{ mt: 2 }}>
                    Device Log
                </Button>
            </CardContent>
        </Card>
    );
}