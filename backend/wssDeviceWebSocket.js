const { WebSocketServer } = require("ws");

let wss = null;
const devices = new Map();

function normalizeDeviceId(deviceId) {
    if (typeof deviceId !== "string") return null;
    const trimmed = deviceId.trim();
    if (!trimmed || trimmed.length > 80) return null;
    if (!/^[a-zA-Z0-9_.:-]+$/.test(trimmed)) return null;
    return trimmed;
}

function colorPayload(color) {
    if (typeof color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(color)) {
        return null;
    }

    const hex = color.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);

    return {
        type: "color",
        color: `#${hex.toLowerCase()}`,
        r,
        g,
        b,
    };
}

function listWssDevices() {
    return Array.from(devices.entries()).map(([deviceId, device]) => ({
        deviceId,
        connectedAt: device.connectedAt,
        lastSeenAt: device.lastSeenAt,
        lastColor: device.lastColor,
    }));
}

function sendColorToWssDevice(deviceId, color) {
    const normalizedDeviceId = normalizeDeviceId(deviceId);
    const payload = colorPayload(color);
    if (!normalizedDeviceId || !payload) return { ok: false, error: "invalid request" };

    const device = devices.get(normalizedDeviceId);
    if (!device || device.ws.readyState !== 1) {
        return { ok: false, error: "device not connected" };
    }

    device.lastColor = payload.color;
    device.lastSeenAt = new Date().toISOString();
    device.ws.send(JSON.stringify(payload));
    return { ok: true, device: { ...device, ws: undefined } };
}

function getWssDeviceWebSocketServer(server, path = "/api/wss-devices/ws") {
    if (wss) return wss;

    wss = new WebSocketServer({ noServer: true, perMessageDeflate: false });

    server.on("upgrade", (req, socket, head) => {
        const pathname = req.url.split("?")[0];
        if (pathname !== path) return;

        wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit("connection", ws, req);
        });
    });

    wss.on("connection", (ws, req) => {
        const url = new URL(req.url, "http://localhost");
        const deviceId = normalizeDeviceId(url.searchParams.get("deviceId"));

        if (!deviceId) {
            ws.close(1008, "Missing or invalid deviceId");
            return;
        }

        const existing = devices.get(deviceId);
        if (existing?.ws) {
            existing.ws.close(1000, "Replaced by a new connection");
        }

        const device = {
            ws,
            deviceId,
            connectedAt: new Date().toISOString(),
            lastSeenAt: new Date().toISOString(),
            lastColor: null,
        };

        devices.set(deviceId, device);
        console.log("WSS device connected:", deviceId);

        ws.on("message", () => {
            device.lastSeenAt = new Date().toISOString();
        });

        ws.on("close", () => {
            if (devices.get(deviceId)?.ws === ws) {
                devices.delete(deviceId);
            }
            console.log("WSS device disconnected:", deviceId);
        });

        ws.send(JSON.stringify({ type: "ready", deviceId }));
    });

    return wss;
}

module.exports = {
    getWssDeviceWebSocketServer,
    listWssDevices,
    sendColorToWssDevice,
};
