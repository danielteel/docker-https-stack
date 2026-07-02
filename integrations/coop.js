const WebSocket = require("ws");
const {
  WSS_HEADERS,
  assertConfig,
  backendWsBaseUrl,
  buildBackendWsUrl,
  getEnv,
  isWebSocketOpen,
  sendJson,
  validateDeviceId,
} = require("./common");

const OMLET_BASE_URL = "https://x107.omlet.co.uk/api/v1/";

function createCoopPublisher() {
  const state = {
    config: null,
    devices: new Map(),
    pollTimer: null,
    shuttingDown: false,
  };

  function start() {
    state.config = loadConfig();
    if (!state.config.apiKey) {
      console.log("[coop] OMLET_API_KEY is not set; skipping Coop publisher");
      return;
    }

    validateConfig(state.config);
    console.log(`Publishing Coop devices to ${backendWsBaseUrl()}`);
    pollDevices();
  }

  function stop() {
    state.shuttingDown = true;
    clearPollTimer();

    for (const device of state.devices.values()) {
      clearReconnectTimer(device);
      if (device.ws) {
        device.ws.close(1000, "shutdown");
        device.ws = null;
      }
    }
  }

  async function pollDevices() {
    clearPollTimer();
    if (state.shuttingDown) return;

    try {
      const rawDevices = await omletRequest("/device");
      const seen = new Set();

      for (const [index, rawDevice] of (rawDevices || []).entries()) {
        const normalized = normalizeDevice(rawDevice, index);
        seen.add(normalized.rawDeviceId);
        publishDevice(normalized);
      }

      for (const [rawDeviceId, device] of state.devices) {
        if (!seen.has(rawDeviceId)) {
          disconnectDevice(device);
          state.devices.delete(rawDeviceId);
        }
      }
    } catch (error) {
      if (!state.shuttingDown) {
        console.error(`[coop] Failed to poll devices: ${error.message}`);
      }
    } finally {
      schedulePoll();
    }
  }

  function publishDevice(normalized) {
    let device = state.devices.get(normalized.rawDeviceId);
    if (!device) {
      device = createDevice(normalized);
      state.devices.set(normalized.rawDeviceId, device);
      connectDevice(device);
    }

    device.current = normalized;

    if (isWebSocketOpen(device.ws)) {
      sendDeviceSnapshot(device);
    }
  }

  function createDevice(normalized) {
    return {
      rawDeviceId: normalized.rawDeviceId,
      deviceId: normalized.deviceId,
      current: normalized,
      ws: null,
      reconnectTimer: null,
    };
  }

  function connectDevice(device) {
    if (state.shuttingDown) return;
    clearReconnectTimer(device);

    const ws = new WebSocket(buildBackendWsUrl(device.deviceId), {
      handshakeTimeout: 15000,
      headers: WSS_HEADERS,
    });

    device.ws = ws;

    ws.on("open", () => {
      console.log(`[coop ${device.rawDeviceId}] Connected as ${device.deviceId}`);
      sendDeviceSnapshot(device);
    });

    ws.on("message", (data) => {
      const text = Buffer.isBuffer(data) ? data.toString("utf8") : String(data);
      if (!text) return;

      console.log(`[coop ${device.rawDeviceId}] Backend message: ${text}`);
      handleBackendMessage(device, ws, text);
    });

    ws.on("error", (error) => {
      if (!state.shuttingDown) {
        console.error(`[coop ${device.rawDeviceId}] Backend WS error: ${error.message}`);
      }
    });

    ws.on("close", (code, reason) => {
      if (device.ws === ws) {
        device.ws = null;
      }

      if (!state.shuttingDown && state.devices.has(device.rawDeviceId)) {
        const reasonText = reason?.length ? ` (${reason.toString()})` : "";
        console.log(`[coop ${device.rawDeviceId}] Backend WS closed: ${code}${reasonText}; reconnecting in ${state.config.reconnectMs}ms`);
        device.reconnectTimer = setTimeout(() => connectDevice(device), state.config.reconnectMs);
      }
    });
  }

  async function handleBackendMessage(device, ws, text) {
    let payload = null;
    try {
      payload = JSON.parse(text);
    } catch {
      return;
    }

    if (payload.type !== "action") return;

    try {
      const action = device.current.actions.find((item) => item.name === payload.action);
      if (!action) {
        throw new Error(`Unknown Coop action "${payload.action}".`);
      }

      await omletRequest(`/device/${encodeURIComponent(device.rawDeviceId)}/action/${encodeURIComponent(action.omletAction)}`, {
        method: "POST",
      });
      sendJson(ws, {
        type: "actionResult",
        requestId: payload.requestId,
        action: payload.action,
        success: true,
      });
      pollDevices();
    } catch (error) {
      sendJson(ws, {
        type: "actionResult",
        requestId: payload.requestId,
        action: payload.action,
        success: false,
        error: error.message || "Action failed.",
      });
    }
  }

  function sendDeviceSnapshot(device) {
    const current = device.current;
    sendJson(device.ws, {
      type: "deviceReady",
      deviceName: current.name,
      deviceType: `coop-${current.deviceType}`,
      rawDeviceId: current.rawDeviceId,
      actions: current.actions.map(({ name, label }) => ({
        name,
        label,
        type: "button",
      })),
    });
    sendJson(device.ws, {
      type: "telemetry",
      values: current.telemetry,
    });
  }

  async function omletRequest(path, { method = "GET", body } = {}) {
    const url = new URL(String(path).replace(/^\/+/, ""), OMLET_BASE_URL);
    const headers = {
      Authorization: `Bearer ${state.config.apiKey}`,
      Accept: "application/json",
    };
    const options = { method, headers };

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Omlet HTTP ${response.status}: ${text}`);
    }
    return text ? JSON.parse(text) : null;
  }

  function schedulePoll() {
    if (state.shuttingDown) return;

    state.pollTimer = setTimeout(pollDevices, state.config.pollIntervalSeconds * 1000);
    state.pollTimer.unref?.();
  }

  function clearPollTimer() {
    if (state.pollTimer) {
      clearTimeout(state.pollTimer);
      state.pollTimer = null;
    }
  }

  function clearReconnectTimer(device) {
    if (device.reconnectTimer) {
      clearTimeout(device.reconnectTimer);
      device.reconnectTimer = null;
    }
  }

  function disconnectDevice(device) {
    clearReconnectTimer(device);
    if (device.ws) {
      device.ws.close(1000, "Device no longer returned by Omlet");
      device.ws = null;
    }
  }

  return {
    name: "coop",
    start,
    stop,
  };
}

function loadConfig() {
  return {
    apiKey: getEnv("OMLET_API_KEY", ""),
    pollIntervalSeconds: Number(getEnv("COOP_POLL_INTERVAL_SECONDS", "3")),
    reconnectMs: 5000,
  };
}

function normalizeDevice(rawDevice, index) {
  const rawDeviceId = String(rawDevice.deviceId || rawDevice.id || `device-${index + 1}`);
  const deviceType = normalizeDeviceType(rawDevice.deviceType);
  const deviceId = `coop-${slugify(rawDeviceId, `device-${index + 1}`)}`;
  validateDeviceId(deviceId, `Coop device id "${rawDeviceId}"`);

  return {
    raw: rawDevice,
    rawDeviceId,
    deviceId,
    name: rawDevice.name || rawDeviceId,
    deviceType,
    actions: getActions(rawDevice, deviceType),
    telemetry: getTelemetry(rawDevice, deviceType),
  };
}

function getTelemetry(rawDevice, deviceType) {
  return compactObject({
    status: getConnected(rawDevice),
    battery: formatPercent(getPowerLevel(rawDevice)),
    powerSource: rawDevice.state?.general?.powerSource,
    ...getStateTelemetry(rawDevice, deviceType),
  });
}

function getStateTelemetry(rawDevice, deviceType) {
  switch (deviceType) {
    case "autofeeder":
      return {
        door: rawDevice.state?.feeder?.state,
        feed: rawDevice.state?.feeder?.feedLevel,
        fault: rawDevice.state?.feeder?.fault,
      };
    case "autodoor":
      return {
        door: rawDevice.state?.door?.state,
        light: rawDevice.state?.light?.state,
        fault: rawDevice.state?.door?.fault,
      };
    case "fan":
      return {
        fan: rawDevice.state?.fan?.state,
        temperature: formatTemperature(rawDevice.state?.fan?.temperature),
        humidity: formatPercent(rawDevice.state?.fan?.humidity),
        mode: rawDevice.configuration?.fan?.mode,
      };
    default:
      return {};
  }
}

function getActions(rawDevice, deviceType) {
  const actions = [
    { name: "restart", label: "Restart", omletAction: "restart" },
  ];

  if (deviceType === "autofeeder") {
    actions.push(
      { name: "open", label: "Open", omletAction: "open" },
      { name: "close", label: "Close", omletAction: "close" },
    );
  } else if (deviceType === "autodoor") {
    actions.push(
      { name: "open", label: "Open", omletAction: "open" },
      { name: "close", label: "Close", omletAction: "close" },
      { name: "lightOn", label: "Light On", omletAction: "on" },
      { name: "lightOff", label: "Light Off", omletAction: "off" },
    );
  } else if (deviceType === "fan" && rawDevice.configuration?.fan?.mode === "manual") {
    actions.push(
      { name: "on", label: "On", omletAction: "on" },
      { name: "off", label: "Off", omletAction: "off" },
    );
  }

  return actions;
}

function getConnected(rawDevice) {
  if (rawDevice.overdueConnection) return "overdue";
  if (rawDevice.state?.general?.powerSource === "battery") return "polling";
  if (rawDevice.state?.connectivity?.connected === false) return "disconnected";
  if (rawDevice.state?.connectivity?.connected === true) return "connected";
  if (rawDevice.connected === false) return "disconnected";
  return "connected";
}

function getPowerLevel(rawDevice) {
  if (rawDevice.state?.general?.batteryLevel !== undefined) {
    return rawDevice.state.general.batteryLevel;
  }
  if (rawDevice.state?.general?.powerSource && rawDevice.state.general.powerSource !== "battery") {
    return 100;
  }
  return null;
}

function normalizeDeviceType(deviceType) {
  const normalized = String(deviceType || "unknown").trim().toLowerCase();
  if (normalized === "feeder") return "autofeeder";
  if (normalized === "auto door") return "autodoor";
  return normalized;
}

function celsiusToFahrenheit(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.round((number * 1.8 + 32) * 10) / 10;
}

function formatTemperature(value) {
  const fahrenheit = celsiusToFahrenheit(value);
  return fahrenheit === null ? null : `${fahrenheit} F`;
}

function formatPercent(value) {
  return value === null || value === undefined || value === "?" ? null : `${value}%`;
}

function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== null && item !== undefined && item !== ""),
  );
}

function slugify(value, fallback) {
  const slug = String(value || "").trim().toLowerCase().replace(/[^a-z0-9_.:-]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || fallback;
}

function validateConfig(value) {
  assertConfig(Number.isFinite(value.pollIntervalSeconds) && value.pollIntervalSeconds >= 3, "COOP_POLL_INTERVAL_SECONDS must be at least 3.");
  assertConfig(Number.isFinite(value.reconnectMs) && value.reconnectMs >= 1000, "Coop reconnect delay must be at least 1000.");
}

module.exports = {
  createCoopPublisher,
};
