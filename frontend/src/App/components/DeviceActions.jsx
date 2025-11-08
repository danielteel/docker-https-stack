import { useEffect, useState } from "react";
import { MuiColorInput } from "mui-color-input";
import {
    Typography,
    TextField,
    Button,
    Stack,
    Box,
    Tooltip,
    Divider,
    Checkbox,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function buildActionPacket(value, deviceId, action) {
    switch (action.type) {
        case "number":
            return [{ type: "action", deviceId, actionByte: action.byte, a: Number(value) }, Number(value)];
        case "time": {
            let [h, m, s] = (value?.split(":").map((n) => Number(n) || 0) || []);
            if (s > 59) {
                m += Math.floor(s / 60);
                s = s % 60;
            }
            if (m > 59) {
                h += Math.floor(m / 60);
                m = m % 60;
            }
            return [
                { type: "action", deviceId, actionByte: action.byte, a: h, b: m, c: s },
                `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
            ];
        }
        case "string":
            return [{ type: "action", deviceId, actionByte: action.byte, a: String(value) }, String(value)];
        case "bool":
            return [{ type: "action", deviceId, actionByte: action.byte, a: Number(value) }, Number(value)];
        case "void":
            return [{ type: "action", deviceId, actionByte: action.byte }, null];
        case "color": {
            const hex = value.replace("#", "");
            const r = parseInt(hex.substring(0, 2) || "0", 16);
            const g = parseInt(hex.substring(2, 4) || "0", 16);
            const b = parseInt(hex.substring(4, 6) || "0", 16);
            return [
                { type: "action", deviceId, actionByte: action.byte, a: r, b: g, c: b },
                rgbToHex(r, g, b),
            ];
        }
        default:
            return [{}, value];
    }
}

function ActionValue({ action, values }) {
    if (!action || !values) return null;
    const val = values[action.name];
    if (val === undefined) return <em>UNK VAL</em>;

    switch (action.type) {
        case "number":
        case "time":
        case "string":
            return <Typography variant="body2">{val}</Typography>;
        case "bool":
            return <Typography variant="body2">{Number(val) ? "True" : "False"}</Typography>;
        case "color": {
            if (typeof val !== "string") return <em>wrong format</em>;
            const [r, g, b] = val.split(",").map(Number);
            const hex = rgbToHex(r, g, b);
            return (
                <Stack direction="row" alignItems="center" spacing={1}>
                    <Box
                        sx={{
                            width: 24,
                            height: 24,
                            borderRadius: 1,
                            bgcolor: `rgb(${r}, ${g}, ${b})`,
                            border: "1px solid #ccc",
                        }}
                    />
                    <Typography variant="body2">{hex}</Typography>
                </Stack>
            );
        }
        default:
            return <em>UNK TYPE</em>;
    }
}

export default function DeviceActions({ deviceId, actions = [], values = {}, webSocket }) {
    const [userValues, setUserValues] = useState({});

    useEffect(() => {
        if (!Array.isArray(actions)) return;

        const defaults = Object.fromEntries(
            actions.map((a) => {
                switch (a.type) {
                    case "number":
                        return [a.name, 0];
                    case "time":
                        return [a.name, "00:00:00"];
                    case "string":
                        return [a.name, ""];
                    case "bool":
                        return [a.name, false];
                    case "color":
                        return [a.name, "#ffffff"];
                    default:
                        return [a.name, ""];
                }
            })
        );

        setUserValues(defaults);
    }, [actions]);

    const handleChange = (name, newVal) => {
        setUserValues((prev) => ({ ...prev, [name]: newVal }));
    };

    const sendAction = (action) => {
        if (!webSocket?.current || webSocket.current.readyState !== WebSocket.OPEN) {
            console.warn("WebSocket not ready");
            return;
        }

        const [msg, formattedValue] = buildActionPacket(userValues[action.name], deviceId, action);
        setUserValues((prev) => ({ ...prev, [action.name]: formattedValue }));
        webSocket.current.send(JSON.stringify(msg));
    };

    return (
        <Box sx={{ mt: 2 }}>
            <Stack spacing={1.5}>
                {actions.map((action, i) => {
                    const { name, type, description } = action;

                    let inputField = null;
                    switch (type) {
                        case "number":
                            inputField = (
                                <TextField
                                    label="Value"
                                    value={userValues[name]}
                                    onChange={(e) => handleChange(name, e.target.value)}
                                    size="small"
                                    type="number"
                                />
                            );
                            break;
                        case "time":
                        case "string":
                            inputField = (
                                <TextField
                                    label="Value"
                                    value={userValues[name]}
                                    onChange={(e) => handleChange(name, e.target.value)}
                                    size="small"
                                />
                            );
                            break;
                        case "bool":
                            inputField = (
                                <Checkbox
                                    checked={Boolean(userValues[name])}
                                    onChange={(e) => handleChange(name, e.target.checked)}
                                />
                            );
                            break;
                        case "color":
                            inputField = (
                                <MuiColorInput
                                    format="hex"
                                    value={userValues[name]}
                                    onChange={(val) => handleChange(name, val)}
                                    size="small"
                                />
                            );
                            break;
                        default:
                            inputField = (
                                <Typography variant="body2" color="text.secondary">
                                    Unsupported type
                                </Typography>
                            );
                    }

                    return (
                        <Box key={name}>
                            {/* Top line: name and current value */}
                            <Stack
                                direction="row"
                                alignItems="center"
                                justifyContent="space-between"
                                flexWrap="wrap"
                            >
                                <Typography fontWeight={500}>
                                    {name}
                                    {description && (
                                        <Tooltip
                                            title={description}
                                            placement="right"
                                            enterTouchDelay={0}
                                            leaveTouchDelay={3000}
                                        >
                                            <InfoOutlinedIcon
                                                fontSize="small"
                                                sx={{ ml: 0.5, opacity: 0.7, cursor: "pointer" }}
                                            />
                                        </Tooltip>
                                    )}
                                </Typography>

                                <Stack direction="row" alignItems="center">
                                    <Typography variant="body2" color="text.secondary">
                                        Current:
                                    </Typography>
                                    <ActionValue action={action} values={values} />
                                </Stack>
                            </Stack>

                            {/* Bottom line: input + send */}
                            <Stack
                                direction="row"
                                spacing={1}
                                alignItems="center"
                                sx={{ mt: 1, flexWrap: "wrap" }}
                            >
                                {inputField}
                                <Button
                                    variant="contained"
                                    size="small"
                                    onClick={() => sendAction(action)}
                                >
                                    Send
                                </Button>
                            </Stack>

                            {i < actions.length - 1 && <Divider sx={{ mt: 1.5 }} />}
                        </Box>
                    );
                })}
            </Stack>
        </Box>
    );
}