const { WebSocketServer } = require("ws");
const { manualAuthenticate } = require("./common/accessToken");

let wss = null;
const devices = new Map();
const browserClients = new Set();

function isSecureRequest(req) {
    if (req.socket?.encrypted) return true;

    const forwardedProto = String(req.headers["x-forwarded-proto"] || "")
        .split(",")
        .map((value) => value.trim().toLowerCase());

    return forwardedProto.includes("https") || forwardedProto.includes("wss");
}

function normalizeDeviceId(deviceId) {
    if (typeof deviceId !== "string") return null;
    const trimmed = deviceId.trim();
    if (!trimmed || trimmed.length > 80) return null;
    if (!/^[a-zA-Z0-9_.:-]+$/.test(trimmed)) return null;
    return trimmed;
}

function parseCookies(header) {
    return String(header || "")
        .split(";")
        .map((part) => part.trim())
        .filter(Boolean)
        .reduce((cookies, part) => {
            const separatorIndex = part.indexOf("=");
            if (separatorIndex === -1) return cookies;
            const key = decodeURIComponent(part.slice(0, separatorIndex).trim());
            const value = decodeURIComponent(part.slice(separatorIndex + 1).trim());
            cookies[key] = value;
            return cookies;
        }, {});
}

function publicDevice(device) {
    return {
        deviceId: device.deviceId,
        connectedAt: device.connectedAt,
        lastSeenAt: device.lastSeenAt,
        disconnectedAt: device.disconnectedAt || null,
        online: device.ws?.readyState === 1,
        deviceInfo: device.deviceInfo || {},
        image: device.image || null,
        telemetry: device.telemetry || {},
        telemetryAt: device.telemetryAt || null,
    };
}

function listWssDevices() {
    return Array.from(devices.values()).map(publicDevice);
}

function broadcast(payload) {
    const message = JSON.stringify(payload);
    for (const client of browserClients) {
        if (client.readyState === 1) {
            client.send(message);
        }
    }
}

function broadcastSnapshot() {
    broadcast({ type: "snapshot", devices: listWssDevices() });
}

function updateTelemetry(device, payload) {
    const telemetry = {};
    const source = payload.values && typeof payload.values === "object" && !Array.isArray(payload.values)
        ? payload.values
        : payload;

    for (const [key, value] of Object.entries(source)) {
        if (key === "type") continue;
        if (value === null || ["string", "number", "boolean"].includes(typeof value)) {
            telemetry[key] = value;
        }
    }

    device.telemetry = {
        ...(device.telemetry || {}),
        ...telemetry,
    };
    device.telemetryAt = new Date().toISOString();
    device.lastSeenAt = device.telemetryAt;
    broadcast({ type: "device", device: publicDevice(device) });
}

function updateDeviceInfo(device, payload) {
    const deviceInfo = {};

    for (const [key, value] of Object.entries(payload)) {
        if (key === "type") continue;
        if (value === null || ["string", "number", "boolean"].includes(typeof value)) {
            deviceInfo[key] = value;
        }
    }

    device.deviceInfo = {
        ...(device.deviceInfo || {}),
        ...deviceInfo,
    };
    device.lastSeenAt = new Date().toISOString();
    broadcast({ type: "device", device: publicDevice(device) });
}

function updateImage(device, metadata, data) {
    const capturedAt = new Date().toISOString();
    device.image = {
        id: Number.isFinite(Number(metadata.id)) ? Number(metadata.id) : null,
        format: metadata.format === "jpeg" ? "jpeg" : "jpeg",
        length: data.length,
        capturedAt,
        dataUrl: `data:image/jpeg;base64,${data.toString("base64")}`,
    };
    device.lastSeenAt = capturedAt;
    broadcast({ type: "device", device: publicDevice(device) });
}

function handleDeviceMessage(device, message, isBinary) {
    device.lastSeenAt = new Date().toISOString();

    if (isBinary) {
        if (device.pendingImageMetadata) {
            updateImage(device, device.pendingImageMetadata, Buffer.from(message));
            device.pendingImageMetadata = null;
        }
        return;
    }

    let payload = null;
    try {
        payload = JSON.parse(message.toString());
    } catch {
        return;
    }

    if (payload.type === "telemetry") {
        updateTelemetry(device, payload);
    } else if (payload.type === "image") {
        device.pendingImageMetadata = payload;
    } else if (payload.type === "deviceReady") {
        updateDeviceInfo(device, payload);
    }
}

async function handleBrowserConnection(ws, req) {
    const user = await manualAuthenticate("member", parseCookies(req.headers.cookie));
    if (!user) {
        ws.close(1008, "Authentication required");
        return;
    }

    browserClients.add(ws);
    ws.send(JSON.stringify({ type: "snapshot", devices: listWssDevices() }));

    ws.on("close", () => {
        browserClients.delete(ws);
    });
}

function handleDeviceConnection(ws, req) {
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
        ...(existing || {}),
        ws,
        deviceId,
        connectedAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        disconnectedAt: null,
        pendingImageMetadata: null,
    };

    devices.set(deviceId, device);
    console.log("WSS device connected:", deviceId);
    broadcast({ type: "device", device: publicDevice(device) });

    ws.on("message", (message, isBinary) => {
        handleDeviceMessage(device, message, isBinary);
    });

    ws.on("close", () => {
        if (devices.get(deviceId)?.ws === ws) {
            devices.delete(deviceId);
            broadcastSnapshot();
        }
        console.log("WSS device disconnected:", deviceId);
    });

    ws.send(JSON.stringify({ type: "ready", deviceId }));
}

function getWssDeviceWebSocketServer(server, path = "/api/wss-devices/ws", livePath = "/api/wss-devices/live") {
    if (wss) return wss;

    wss = new WebSocketServer({ noServer: true, perMessageDeflate: false });

    server.on("upgrade", (req, socket, head) => {
        const pathname = req.url.split("?")[0];
        if (pathname !== path && pathname !== livePath) return;

        if (!isSecureRequest(req)) {
            socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
            socket.destroy();
            return;
        }

        wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit("connection", ws, req);
        });
    });

    wss.on("connection", (ws, req) => {
        const pathname = req.url.split("?")[0];
        if (pathname === livePath) {
            handleBrowserConnection(ws, req);
            return;
        }

        handleDeviceConnection(ws, req);
    });

    return wss;
}

module.exports = {
    getWssDeviceWebSocketServer,
    listWssDevices,
};
