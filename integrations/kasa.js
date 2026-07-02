const net = require("node:net");
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

const DEFAULT_KASA_PORT = 9999;
const DEFAULT_TIMEOUT_MS = 5000;
const INITIAL_KEY = 0xab;

function createKasaPublisher() {
  const state = {
    config: null,
    devices: new Map(),
    shuttingDown: false,
  };

  function start() {
    state.config = loadConfig();
    if (state.config.plugs.length === 0) {
      console.log("[kasa] No Kasa plugs configured; skipping Kasa publisher");
      return;
    }

    validateConfig(state.config);
    console.log(`Publishing ${state.config.plugs.length} Kasa plug(s) to ${backendWsBaseUrl()}`);
    for (const plug of state.config.plugs) {
      const device = createDevice(plug);
      state.devices.set(plug.id, device);
      connectDevice(device);
    }
  }

  function stop() {
    state.shuttingDown = true;

    for (const device of state.devices.values()) {
      clearDeviceTimers(device);
      if (device.ws) {
        device.ws.close(1000, "shutdown");
        device.ws = null;
      }
    }
  }

  function createDevice(plug) {
    return {
      plug,
      deviceId: `kasa-${plug.id}`,
      ws: null,
      reconnectTimer: null,
      pollTimer: null,
    };
  }

  function connectDevice(device) {
    if (state.shuttingDown) return;

    const ws = new WebSocket(buildBackendWsUrl(device.deviceId), {
      handshakeTimeout: 15000,
      headers: WSS_HEADERS,
    });

    device.ws = ws;

    ws.on("open", () => {
      console.log(`[kasa ${device.plug.id}] Connected as ${device.deviceId}`);
      publishStatus(device);
    });

    ws.on("message", (data) => {
      const text = Buffer.isBuffer(data) ? data.toString("utf8") : String(data);
      if (!text) return;

      console.log(`[kasa ${device.plug.id}] Backend message: ${text}`);
      handleBackendMessage(device, ws, text);
    });

    ws.on("error", (error) => {
      if (!state.shuttingDown) {
        console.error(`[kasa ${device.plug.id}] Backend WS error: ${error.message}`);
      }
    });

    ws.on("close", (code, reason) => {
      if (device.ws === ws) {
        device.ws = null;
      }
      clearPollTimer(device);

      if (!state.shuttingDown) {
        const reasonText = reason?.length ? ` (${reason.toString()})` : "";
        console.log(`[kasa ${device.plug.id}] Backend WS closed: ${code}${reasonText}; reconnecting in ${state.config.reconnectMs}ms`);
        device.reconnectTimer = setTimeout(() => connectDevice(device), state.config.reconnectMs);
      }
    });
  }

  async function publishStatus(device) {
    const ws = device.ws;
    if (!isWebSocketOpen(ws)) return;

    try {
      const state = await getKasaStatus(device.plug.ip);
      sendDeviceReady(ws, device);
      sendJson(ws, {
        type: "telemetry",
        values: kasaTelemetry(state),
      });
    } catch (error) {
      console.error(`[kasa ${device.plug.id}] Failed to publish status: ${error.message}`);
      sendDeviceReady(ws, device);
      sendJson(ws, {
        type: "telemetry",
        values: kasaTelemetry("disconnected", error.message),
      });
    } finally {
      schedulePoll(device);
    }
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
      if (payload.action !== "setPower") {
        throw new Error(`Unknown Kasa action "${payload.action}".`);
      }

      const state = await setKasaStatus(device.plug.ip, payload.value === true);
      sendJson(ws, {
        type: "actionResult",
        requestId: payload.requestId,
        action: payload.action,
        success: true,
      });
      sendJson(ws, {
        type: "telemetry",
        values: kasaTelemetry(state),
      });
      schedulePoll(device);
    } catch (error) {
      sendJson(ws, {
        type: "actionResult",
        requestId: payload.requestId,
        action: payload.action,
        success: false,
        error: error.message || "Action failed.",
      });
      publishStatus(device);
    }
  }

  function sendDeviceReady(ws, device) {
    sendJson(ws, {
      type: "deviceReady",
      deviceName: device.plug.name,
      deviceType: "smart-plug",
      ipAddress: device.plug.ip,
      actions: [
        {
          name: "setPower",
          label: "Power",
          type: "toggle",
          stateKey: "power",
        },
      ],
    });
  }

  function schedulePoll(device) {
    clearPollTimer(device);
    if (state.shuttingDown) return;

    device.pollTimer = setTimeout(() => publishStatus(device), state.config.pollIntervalSeconds * 1000);
    device.pollTimer.unref?.();
  }

  function clearDeviceTimers(device) {
    if (device.reconnectTimer) {
      clearTimeout(device.reconnectTimer);
      device.reconnectTimer = null;
    }
    clearPollTimer(device);
  }

  function clearPollTimer(device) {
    if (device.pollTimer) {
      clearTimeout(device.pollTimer);
      device.pollTimer = null;
    }
  }

  return {
    name: "kasa",
    start,
    stop,
  };
}

function loadConfig() {
  return {
    plugs: getConfiguredPlugs(),
    pollIntervalSeconds: Number(getEnv("KASA_POLL_INTERVAL_SECONDS", "30")),
    reconnectMs: 5000,
  };
}

function encrypt(payload) {
  const json = Buffer.from(JSON.stringify(payload), "utf8");
  const output = Buffer.alloc(json.length + 4);
  let key = INITIAL_KEY;

  output.writeUInt32BE(json.length, 0);

  for (let index = 0; index < json.length; index += 1) {
    const encrypted = json[index] ^ key;
    key = encrypted;
    output[index + 4] = encrypted;
  }

  return output;
}

function decrypt(buffer) {
  let key = INITIAL_KEY;
  const output = Buffer.alloc(buffer.length);

  for (let index = 0; index < buffer.length; index += 1) {
    const decrypted = buffer[index] ^ key;
    key = buffer[index];
    output[index] = decrypted;
  }

  return JSON.parse(output.toString("utf8"));
}

function sendKasaCommand(ipAddress, payload, { port = DEFAULT_KASA_PORT, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: ipAddress, port });
    const chunks = [];
    let expectedLength = null;
    let settled = false;

    function settle(fn, value) {
      if (settled) return;

      settled = true;
      socket.destroy();
      fn(value);
    }

    socket.setTimeout(timeoutMs);
    socket.on("connect", () => socket.write(encrypt(payload)));
    socket.on("data", (chunk) => {
      chunks.push(chunk);
      const response = Buffer.concat(chunks);

      if (response.length >= 4 && expectedLength === null) {
        expectedLength = response.readUInt32BE(0);
      }

      if (expectedLength !== null && response.length >= expectedLength + 4) {
        try {
          settle(resolve, decrypt(response.subarray(4, expectedLength + 4)));
        } catch (error) {
          settle(reject, error);
        }
      }
    });
    socket.on("timeout", () => settle(reject, new Error(`Timed out connecting to Kasa plug at ${ipAddress}:${port}.`)));
    socket.on("error", (error) => settle(reject, error));
  });
}

function parseOnOff(response) {
  const relayState = response?.system?.get_sysinfo?.relay_state;

  if (relayState === 1) return "on";
  if (relayState === 0) return "off";

  throw new Error("Kasa response did not include system.get_sysinfo.relay_state.");
}

async function getKasaStatus(ipAddress) {
  try {
    const response = await sendKasaCommand(ipAddress, { system: { get_sysinfo: {} } });
    return parseOnOff(response);
  } catch {
    return "disconnected";
  }
}

async function setKasaStatus(ipAddress, on) {
  if (typeof on !== "boolean") {
    throw new TypeError("setKasaStatus(ipAddress, on) expects a boolean for on.");
  }

  const response = await sendKasaCommand(ipAddress, {
    system: {
      set_relay_state: {
        state: on ? 1 : 0,
      },
    },
  });
  const errorCode = response?.system?.set_relay_state?.err_code;

  if (errorCode !== 0) {
    throw new Error(`Kasa set_relay_state failed with err_code ${errorCode}.`);
  }

  return getKasaStatus(ipAddress);
}

function kasaTelemetry(state, error) {
  return {
    power: state === "on",
    status: formatPlugState(state),
    ...(error ? { error } : {}),
  };
}

function formatPlugState(state) {
  if (state === "on") return "On";
  if (state === "off") return "Off";
  return "Disconnected";
}

function getConfiguredPlugs() {
  const plugs = [];

  if (process.env.KASA_PLUGS) {
    const parsed = JSON.parse(process.env.KASA_PLUGS);
    if (!Array.isArray(parsed)) throw new Error("KASA_PLUGS must be a JSON array");

    parsed.forEach((plug, index) => {
      if (!plug || typeof plug !== "object") return;

      const name = String(plug.name || plug.id || `Plug ${index + 1}`).trim();
      const ip = String(plug.ip || plug.ipAddress || "").trim();
      if (!ip) return;

      plugs.push({
        id: slugify(plug.id || name, `plug-${index + 1}`),
        name,
        ip,
      });
    });
  }

  let plugNumber = 1;
  while (process.env[`KASA_PLUG${plugNumber}_IP`] || process.env[`KASA_PLUG${plugNumber}_NAME`]) {
    const name = String(process.env[`KASA_PLUG${plugNumber}_NAME`] || `Plug ${plugNumber}`).trim();
    const ip = String(process.env[`KASA_PLUG${plugNumber}_IP`] || "").trim();
    if (ip) {
      plugs.push({
        id: slugify(process.env[`KASA_PLUG${plugNumber}_ID`] || name, `plug-${plugNumber}`),
        name,
        ip,
      });
    }
    plugNumber += 1;
  }

  const seen = new Set();
  return plugs.filter((plug) => {
    if (seen.has(plug.id)) return false;
    seen.add(plug.id);
    return true;
  });
}

function slugify(value, fallback) {
  const slug = String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || fallback;
}

function validateConfig(value) {
  assertConfig(Number.isFinite(value.pollIntervalSeconds) && value.pollIntervalSeconds >= 3, "KASA_POLL_INTERVAL_SECONDS must be at least 3.");
  assertConfig(Number.isFinite(value.reconnectMs) && value.reconnectMs >= 1000, "Kasa reconnect delay must be at least 1000.");

  for (const plug of value.plugs) {
    validateDeviceId(`kasa-${plug.id}`, `Kasa plug id "${plug.id}"`);
  }
}

module.exports = {
  createKasaPublisher,
  getKasaStatus,
  setKasaStatus,
};
