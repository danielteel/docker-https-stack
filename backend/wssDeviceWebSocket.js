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
        actions: Array.isArray(device.actions) ? device.actions : [],
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
    if (Array.isArray(payload.actions)) {
        device.actions = payload.actions
            .filter((action) => action && typeof action.name === "string")
            .map((action) => ({
                name: action.name,
                label: typeof action.label === "string" ? action.label : action.name,
                type: typeof action.type === "string" ? action.type : "button",
                stateKey: typeof action.stateKey === "string" ? action.stateKey : null,
            }));
    }
    device.lastSeenAt = new Date().toISOString();
    broadcast({ type: "device", device: publicDevice(device) });
}

function updateImage(device, image, data) {
    if (Number.isFinite(image.length) && image.length !== data.length) {
        console.warn(`WSS image length mismatch for ${device.deviceId}: expected ${image.length}, received ${data.length}`);
    }

    device.image = {
        dataUrl: `data:image/jpeg;base64,${data.toString("base64")}`,
    };
    device.lastSeenAt = new Date().toISOString();
    broadcast({ type: "device", device: publicDevice(device) });
}

function handleDeviceMessage(device, message, isBinary) {
    device.lastSeenAt = new Date().toISOString();

    if (isBinary) {
        if (device.pendingImage) {
            updateImage(device, device.pendingImage, Buffer.from(message));
            device.pendingImage = null;
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
        device.pendingImage = {
            length: Number.isFinite(Number(payload.length)) ? Number(payload.length) : null,
        };
    } else if (payload.type === "deviceReady") {
        updateDeviceInfo(device, payload);
    } else if (payload.type === "actionResult") {
        broadcast({
            type: "actionResult",
            deviceId: device.deviceId,
            requestId: typeof payload.requestId === "string" ? payload.requestId : null,
            action: typeof payload.action === "string" ? payload.action : null,
            success: payload.success === true,
            error: typeof payload.error === "string" ? payload.error : null,
        });
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

    ws.on("message", (message) => {
        handleBrowserMessage(ws, message);
    });
}

function handleBrowserMessage(ws, message) {
    let payload = null;
    try {
        payload = JSON.parse(message.toString());
    } catch {
        return;
    }

    if (payload.type !== "action") return;

    const deviceId = normalizeDeviceId(payload.deviceId);
    const actionName = typeof payload.action === "string" ? payload.action : null;
    const requestId = typeof payload.requestId === "string" ? payload.requestId : null;
    const device = deviceId ? devices.get(deviceId) : null;

    if (!device || device.ws?.readyState !== 1) {
        ws.send(JSON.stringify({
            type: "actionResult",
            deviceId,
            requestId,
            action: actionName,
            success: false,
            error: "Device is not connected.",
        }));
        return;
    }

    const action = Array.isArray(device.actions)
        ? device.actions.find((item) => item.name === actionName)
        : null;

    if (!action) {
        ws.send(JSON.stringify({
            type: "actionResult",
            deviceId,
            requestId,
            action: actionName,
            success: false,
            error: "Action is not available.",
        }));
        return;
    }

    device.ws.send(JSON.stringify({
        type: "action",
        requestId,
        action: action.name,
        value: payload.value,
    }));
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
        pendingImage: null,
        actions: existing?.actions || [],
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
