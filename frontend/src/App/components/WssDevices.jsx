import { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Grid,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { MuiColorInput } from "mui-color-input";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import RefreshIcon from "@mui/icons-material/Refresh";
import SendIcon from "@mui/icons-material/Send";
import { useAppContext } from "../../contexts/AppContext";

export default function WssDevices() {
    const { api } = useAppContext();
    const [devices, setDevices] = useState([]);
    const [deviceId, setDeviceId] = useState("esp32-1");
    const [color, setColor] = useState("#33aaff");
    const [message, setMessage] = useState(null);

    const connectedDeviceIds = useMemo(() => devices.map((device) => device.deviceId), [devices]);

    const loadDevices = async () => {
        const [ok, data] = await api.wssDevicesList();
        if (ok) {
            setDevices(data);
            if (data.length && !connectedDeviceIds.includes(deviceId)) {
                setDeviceId(data[0].deviceId);
            }
        }
    };

    useEffect(() => {
        let cancelled = false;
        let timeoutId = null;

        async function poll() {
            const [ok, data] = await api.wssDevicesList();
            if (!cancelled && ok) setDevices(data);
            timeoutId = setTimeout(poll, 4000);
        }

        poll();
        return () => {
            cancelled = true;
            clearTimeout(timeoutId);
        };
    }, [api]);

    const sendColor = async () => {
        setMessage(null);
        const [ok, data] = await api.wssDevicesSetColor(deviceId, color);
        if (ok) {
            setMessage({ severity: "success", text: `Sent ${color} to ${deviceId}` });
            await loadDevices();
        } else {
            setMessage({ severity: "error", text: data?.error || "Failed to send color" });
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                <LightbulbIcon color="primary" />
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    WSS Devices
                </Typography>
            </Stack>

            <Grid container spacing={2}>
                <Grid item xs={12} md={5}>
                    <Card sx={{ borderRadius: 2 }}>
                        <CardContent>
                            <Stack spacing={2}>
                                <TextField
                                    label="Device ID"
                                    value={deviceId}
                                    onChange={(event) => setDeviceId(event.target.value)}
                                    size="small"
                                />
                                <MuiColorInput
                                    format="hex"
                                    value={color}
                                    onChange={setColor}
                                    size="small"
                                    isAlphaHidden
                                />
                                <Stack direction="row" spacing={1}>
                                    <Button
                                        variant="contained"
                                        startIcon={<SendIcon />}
                                        onClick={sendColor}
                                        disabled={!deviceId.trim()}
                                    >
                                        Send
                                    </Button>
                                    <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadDevices}>
                                        Refresh
                                    </Button>
                                </Stack>
                                {message && <Alert severity={message.severity}>{message.text}</Alert>}
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={7}>
                    <Stack spacing={1.5}>
                        {devices.length === 0 && (
                            <Alert severity="info">
                                No ESP32 WebSocket devices are connected.
                            </Alert>
                        )}
                        {devices.map((device) => (
                            <Card key={device.deviceId} sx={{ borderRadius: 2 }}>
                                <CardContent>
                                    <Stack
                                        direction="row"
                                        alignItems="center"
                                        justifyContent="space-between"
                                        spacing={2}
                                    >
                                        <Box>
                                            <Typography variant="h6">{device.deviceId}</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Last seen {new Date(device.lastSeenAt).toLocaleString()}
                                            </Typography>
                                        </Box>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            {device.lastColor && (
                                                <Box
                                                    sx={{
                                                        width: 28,
                                                        height: 28,
                                                        borderRadius: 1,
                                                        bgcolor: device.lastColor,
                                                        border: "1px solid",
                                                        borderColor: "divider",
                                                    }}
                                                />
                                            )}
                                            <Chip color="success" size="small" label="Online" />
                                        </Stack>
                                    </Stack>
                                </CardContent>
                            </Card>
                        ))}
                    </Stack>
                </Grid>
            </Grid>
        </Box>
    );
}
