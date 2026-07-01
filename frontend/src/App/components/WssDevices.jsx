import { useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Box,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Grid,
    Stack,
    Switch,
    Typography,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SensorsIcon from "@mui/icons-material/Sensors";
import VideocamIcon from "@mui/icons-material/Videocam";
import { wssDevicesLiveUrl } from "../../api/wssDevices";

function formatTimestamp(value) {
    if (!value) return "Never";
    return new Date(value).toLocaleString();
}

function formatLabel(value) {
    return String(value)
        .replace(/[_-]+/g, " ")
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatValue(value) {
    if (value === null || value === undefined || value === "") return "--";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value !== "number" || Number.isNaN(value)) return String(value);
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function actionStateKeys(device) {
    const actions = Array.isArray(device.actions) ? device.actions : [];
    return new Set(
        actions
            .map((action) => action?.stateKey)
            .filter((stateKey) => typeof stateKey === "string" && stateKey),
    );
}

function telemetryEntries(device) {
    const telemetry = device.telemetry && typeof device.telemetry === "object" ? device.telemetry : {};
    const stateKeys = actionStateKeys(device);
    return Object.entries(telemetry).filter(([key]) => !stateKeys.has(key));
}

function deviceInfoEntries(device) {
    const deviceInfo = device.deviceInfo && typeof device.deviceInfo === "object" ? device.deviceInfo : {};
    return Object.entries(deviceInfo).filter(([, value]) => value !== null && value !== undefined && value !== "");
}

function shouldShowImage(device) {
    if (device.image?.dataUrl) return true;
    const deviceType = String(device.deviceInfo?.deviceType || "").toLowerCase();
    return deviceType.includes("camera") || deviceType.includes("image");
}

function detailIcon() {
    return <InfoOutlinedIcon color="primary" fontSize="small" />;
}

function upsertDevice(devices, nextDevice) {
    const existingIndex = devices.findIndex((device) => device.deviceId === nextDevice.deviceId);
    if (existingIndex === -1) {
        return [...devices, nextDevice].sort((a, b) => a.deviceId.localeCompare(b.deviceId));
    }

    return devices.map((device, index) => (
        index === existingIndex ? { ...device, ...nextDevice } : device
    ));
}

function toggleActions(device) {
    return Array.isArray(device.actions)
        ? device.actions.filter((action) => action?.type === "toggle" && action.stateKey)
        : [];
}

function toggleChecked(value) {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value.trim().toLowerCase() === "on";
    return false;
}

export default function WssDevices() {
    const [devices, setDevices] = useState([]);
    const [connectionState, setConnectionState] = useState("connecting");
    const [pendingActions, setPendingActions] = useState({});
    const [actionErrors, setActionErrors] = useState({});
    const socketRef = useRef(null);

    const sortedDevices = useMemo(
        () => [...devices].sort((a, b) => a.deviceId.localeCompare(b.deviceId)),
        [devices],
    );

    useEffect(() => {
        let socket = null;
        let reconnectTimeout = null;
        let stopped = false;

        function connect() {
            setConnectionState("connecting");
            socket = new WebSocket(wssDevicesLiveUrl());
            socketRef.current = socket;

            socket.addEventListener("open", () => {
                setConnectionState("connected");
            });

            socket.addEventListener("message", (event) => {
                const payload = JSON.parse(event.data);
                if (payload.type === "snapshot") {
                    setDevices(payload.devices || []);
                } else if (payload.type === "device" && payload.device) {
                    setDevices((currentDevices) => upsertDevice(currentDevices, payload.device));
                } else if (payload.type === "actionResult") {
                    const key = `${payload.deviceId}:${payload.action}`;
                    setPendingActions((current) => {
                        const next = { ...current };
                        delete next[key];
                        return next;
                    });
                    setActionErrors((current) => ({
                        ...current,
                        [key]: payload.success ? null : payload.error || "Action failed",
                    }));
                }
            });

            socket.addEventListener("close", () => {
                if (stopped) return;
                setConnectionState("disconnected");
                reconnectTimeout = setTimeout(connect, 2000);
            });

            socket.addEventListener("error", () => {
                setConnectionState("disconnected");
                socket.close();
            });
        }

        connect();

        return () => {
            stopped = true;
            clearTimeout(reconnectTimeout);
            if (socketRef.current === socket) socketRef.current = null;
            socket?.close();
        };
    }, []);

    function sendAction(device, action, value) {
        const socket = socketRef.current;
        if (!socket || socket.readyState !== WebSocket.OPEN) return;

        const key = `${device.deviceId}:${action.name}`;
        setPendingActions((current) => ({ ...current, [key]: true }));
        setActionErrors((current) => ({ ...current, [key]: null }));
        socket.send(JSON.stringify({
            type: "action",
            requestId: `${key}:${Date.now()}`,
            deviceId: device.deviceId,
            action: action.name,
            value,
        }));
    }

    return (
        <Box sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                    <SensorsIcon color="primary" />
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        WSS Devices
                    </Typography>
                </Stack>
                <Chip
                    color={connectionState === "connected" ? "success" : "warning"}
                    size="small"
                    label={connectionState === "connected" ? "Live" : "Reconnecting"}
                />
            </Stack>

            {sortedDevices.length === 0 && (
                <Alert severity={connectionState === "connected" ? "info" : "warning"} sx={{ mb: 2 }}>
                    {connectionState === "connected"
                        ? "No ESP32 WebSocket devices are connected."
                        : "Connecting to the live device stream."}
                </Alert>
            )}

            <Grid container spacing={2}>
                {sortedDevices.map((device) => {
                    const info = deviceInfoEntries(device);
                    const telemetry = telemetryEntries(device);
                    const actions = toggleActions(device);
                    const hasDetails = info.length > 0 || telemetry.length > 0;

                    return (
                        <Grid item xs={12} lg={6} key={device.deviceId}>
                            <Card sx={{ borderRadius: 2 }}>
                                <CardContent>
                                    <Stack spacing={2}>
                                        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                                            <Box>
                                                <Typography variant="h6">{device.deviceId}</Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Last seen {formatTimestamp(device.lastSeenAt)}
                                                </Typography>
                                            </Box>
                                            <Chip
                                                color={device.online ? "success" : "default"}
                                                size="small"
                                                label={device.online ? "Online" : "Offline"}
                                            />
                                        </Stack>

                                        {shouldShowImage(device) && (
                                            <Box
                                                sx={{
                                                    width: "100%",
                                                    aspectRatio: "4 / 3",
                                                    bgcolor: "grey.100",
                                                    border: "1px solid",
                                                    borderColor: "divider",
                                                    borderRadius: 1,
                                                    overflow: "hidden",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                }}
                                            >
                                                {device.image?.dataUrl ? (
                                                    <Box
                                                        component="img"
                                                        src={device.image.dataUrl}
                                                        alt={`${device.deviceId} camera`}
                                                        sx={{
                                                            width: "100%",
                                                            height: "100%",
                                                            objectFit: "contain",
                                                            display: "block",
                                                        }}
                                                    />
                                                ) : (
                                                    <Stack alignItems="center" spacing={1} color="text.secondary">
                                                        <VideocamIcon />
                                                        <Typography variant="body2">Waiting for image</Typography>
                                                    </Stack>
                                                )}
                                            </Box>
                                        )}

                                        {hasDetails ? (
                                            <Grid container spacing={1.5}>
                                                {[...info, ...telemetry].map(([key, value]) => (
                                                    <Grid item xs={6} sm={4} key={`${device.deviceId}-${key}`}>
                                                        <Stack direction="row" alignItems="center" spacing={1}>
                                                            {detailIcon(key)}
                                                            <Box sx={{ minWidth: 0 }}>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {formatLabel(key)}
                                                                </Typography>
                                                                <Typography variant="h6" sx={{ wordBreak: "break-word" }}>
                                                                    {formatValue(value)}
                                                                </Typography>
                                                            </Box>
                                                        </Stack>
                                                    </Grid>
                                                ))}
                                            </Grid>
                                        ) : (
                                            <Typography variant="body2" color="text.secondary">
                                                Waiting for device data
                                            </Typography>
                                        )}

                                        {actions.length > 0 && (
                                            <Stack spacing={1}>
                                                {actions.map((action) => {
                                                    const key = `${device.deviceId}:${action.name}`;
                                                    const checked = toggleChecked(device.telemetry?.[action.stateKey]);
                                                    const pending = pendingActions[key] === true;
                                                    const error = actionErrors[key];

                                                    return (
                                                        <Box key={key}>
                                                            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                                                                <Box sx={{ minWidth: 0 }}>
                                                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                                                        {action.label || formatLabel(action.name)}
                                                                    </Typography>
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        {checked ? "On" : "Off"}
                                                                    </Typography>
                                                                </Box>
                                                                <Stack direction="row" alignItems="center" spacing={1}>
                                                                    {pending && <CircularProgress size={16} />}
                                                                    <Switch
                                                                        checked={checked}
                                                                        disabled={!device.online || pending || connectionState !== "connected"}
                                                                        onChange={(event) => sendAction(device, action, event.target.checked)}
                                                                        inputProps={{ "aria-label": action.label || action.name }}
                                                                    />
                                                                </Stack>
                                                            </Stack>
                                                            {error && (
                                                                <Alert severity="error" sx={{ mt: 1 }}>
                                                                    {error}
                                                                </Alert>
                                                            )}
                                                        </Box>
                                                    );
                                                })}
                                            </Stack>
                                        )}

                                        {telemetry.length > 0 && (
                                            <Typography variant="body2" color="text.secondary">
                                                Telemetry {formatTimestamp(device.telemetryAt)}
                                            </Typography>
                                        )}
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>
        </Box>
    );
}
