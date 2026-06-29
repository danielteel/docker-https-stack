import { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Box,
    Card,
    CardContent,
    Chip,
    Grid,
    Stack,
    Typography,
} from "@mui/material";
import SensorsIcon from "@mui/icons-material/Sensors";
import ThermostatIcon from "@mui/icons-material/Thermostat";
import WaterDropIcon from "@mui/icons-material/WaterDrop";
import VideocamIcon from "@mui/icons-material/Videocam";
import { wssDevicesLiveUrl } from "../../api/wssDevices";

function formatTimestamp(value) {
    if (!value) return "Never";
    return new Date(value).toLocaleString();
}

function formatNumber(value, suffix) {
    if (typeof value !== "number" || Number.isNaN(value)) return "--";
    return `${value.toFixed(1)}${suffix}`;
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

export default function WssDevices() {
    const [devices, setDevices] = useState([]);
    const [connectionState, setConnectionState] = useState("connecting");

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

            socket.addEventListener("open", () => {
                setConnectionState("connected");
            });

            socket.addEventListener("message", (event) => {
                const payload = JSON.parse(event.data);
                if (payload.type === "snapshot") {
                    setDevices(payload.devices || []);
                } else if (payload.type === "device" && payload.device) {
                    setDevices((currentDevices) => upsertDevice(currentDevices, payload.device));
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
            socket?.close();
        };
    }, []);

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
                {sortedDevices.map((device) => (
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

                                    <Grid container spacing={1.5}>
                                        <Grid item xs={6}>
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <ThermostatIcon color="primary" fontSize="small" />
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Temperature
                                                    </Typography>
                                                    <Typography variant="h6">
                                                        {formatNumber(device.temperature, " C")}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <WaterDropIcon color="primary" fontSize="small" />
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Humidity
                                                    </Typography>
                                                    <Typography variant="h6">
                                                        {formatNumber(device.humidity, "%")}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                        </Grid>
                                    </Grid>

                                    <Typography variant="body2" color="text.secondary">
                                        Telemetry {formatTimestamp(device.telemetryAt)}
                                    </Typography>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
}
