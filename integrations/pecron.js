const crypto = require("node:crypto");
const WebSocket = require("ws");

const APP_ID = "633";
const APP_VERSION = "1.9.0";
const APP_SYSTEM_TYPE = "android";

const REGIONS = {
  CN: {
    baseUrl: "https://iot-api.quectelcn.com",
    userDomain: "C.DM.5903.1",
    userDomainSecret: "EufftRJSuWuVY7c6txzGifV9bJcfXHAFa7hXY5doXSn7",
  },
  EU: {
    baseUrl: "https://iot-api.acceleronix.io",
    userDomain: "C.DM.10351.1",
    userDomainSecret: "FA5ZHXSka8y9GHvU91Hz1vWvaDSHE2mGW5B7bpn3fXTW",
  },
  US: {
    baseUrl: "https://iot-api.landecia.com",
    userDomain: "U.DM.10351.1",
    userDomainSecret: "HARsQXfeex8vxyaPRAM8fyjqqVuH2uxAGQ3inJ8XxTiB",
  },
};

function randomString(length = 16) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = crypto.randomBytes(length);
  let value = "";

  for (const byte of bytes) {
    value += chars[byte % chars.length];
  }

  return value;
}

function deriveAesKey(random) {
  return crypto.createHash("md5").update(random).digest("hex").toUpperCase().slice(8, 24);
}

function encryptPassword(password, random) {
  const aesKey = deriveAesKey(random);
  const iv = `${aesKey.slice(8, 16)}${aesKey.slice(0, 8)}`;
  const cipher = crypto.createCipheriv("aes-128-cbc", Buffer.from(aesKey), Buffer.from(iv));

  return Buffer.concat([cipher.update(password, "utf8"), cipher.final()]).toString("base64");
}

function computeSignature(email, encryptedPassword, random, secret) {
  return crypto
    .createHash("sha256")
    .update(`${email}${encryptedPassword}${random}${secret}`)
    .digest("hex");
}

function normalizeRegion(region = "US") {
  const normalized = String(region).toUpperCase();

  if (!REGIONS[normalized]) {
    throw new Error(`Unknown Pecron region "${region}". Use one of: ${Object.keys(REGIONS).join(", ")}.`);
  }

  return normalized;
}

function buildHeaders(accessToken) {
  return {
    "X-Q-Language": "en",
    "quec-random-url": crypto.randomUUID(),
    "app-info": "[Node][docker-https-stack][1]",
    appId: APP_ID,
    appVersion: APP_VERSION,
    appSystemType: APP_SYSTEM_TYPE,
    ...(accessToken ? { Authorization: accessToken } : {}),
  };
}

async function pecronRequest(config, accessToken, method, path, { params, form, json } = {}) {
  const url = new URL(path, config.baseUrl);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const headers = buildHeaders(accessToken);
  let body;

  if (form) {
    body = new URLSearchParams(form);
    headers["content-type"] = "application/x-www-form-urlencoded";
  } else if (json) {
    body = JSON.stringify(json);
    headers["content-type"] = "application/json";
  }

  const response = await fetch(url, { method, headers, body });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Pecron HTTP ${response.status}: ${text}`);
  }

  const payload = JSON.parse(text);

  if (payload.code !== 200) {
    throw new Error(`Pecron API ${payload.code}: ${payload.msg || "unknown error"}`);
  }

  return payload.data;
}

async function loginPecron({ email, password, region = "US" }) {
  if (!email || !password) {
    throw new Error("Pecron email and password are required.");
  }

  const normalizedRegion = normalizeRegion(region);
  const config = REGIONS[normalizedRegion];
  const random = randomString();
  const encryptedPassword = encryptPassword(password, random);
  const signature = computeSignature(email, encryptedPassword, random, config.userDomainSecret);

  const result = await pecronRequest(config, null, "POST", "/v2/enduser/enduserapi/emailPwdLogin", {
    form: {
      email,
      pwd: encryptedPassword,
      random,
      userDomain: config.userDomain,
      signature,
    },
  });

  return {
    region: normalizedRegion,
    config,
    accessToken: result.accessToken.token,
  };
}

function parseDevice(device) {
  return {
    deviceName: device.deviceName || "Unknown",
    productName: device.productName || "",
    productKey: device.productKey || "",
    deviceKey: device.deviceKey || "",
    online: device.onlineStatus === 1,
    serialNumber: device.sn || null,
  };
}

async function listPecronDevices(session) {
  const result = await pecronRequest(
    session.config,
    session.accessToken,
    "GET",
    "/v2/binding/enduserapi/userDeviceList",
  );
  const list = Array.isArray(result) ? result : result.list || [];

  return list.map(parseDevice);
}

function findDevice(devices, deviceFilter) {
  if (!deviceFilter) {
    return devices[0] || null;
  }

  const needle = String(deviceFilter).toLowerCase();

  return devices.find((device) =>
    `${device.deviceName} ${device.productName} ${device.serialNumber || ""} ${device.deviceKey || ""}`
      .toLowerCase()
      .includes(needle),
  ) || null;
}

function parseNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number.parseFloat(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function firstNumber(...values) {
  for (const rawValue of values) {
    const value = parseNumber(rawValue);
    if (value !== null) return value;
  }

  return null;
}

function firstNumberByCode(byCode, codes) {
  return firstNumber(...codes.map((code) => byCode[code]));
}

function parseBoolean(value) {
  if (typeof value === "boolean") return value;
  if (value === undefined || value === null || value === "") return null;

  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "on"].includes(normalized)) return true;
  if (["false", "0", "off"].includes(normalized)) return false;
  return null;
}

function parseJsonObject(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function applyProperty(props, item) {
  const code = item.resourceCode || "";
  const value = item.resourceValce ?? item.resourceValue ?? "";
  const dataType = item.dataType || "";

  switch (code) {
    case "battery_percentage":
      props.batteryPercentage = parseNumber(value);
      break;
    case "total_input_power":
      props.totalInputPower = parseNumber(value);
      break;
    case "total_output_power":
      props.totalOutputPower = parseNumber(value);
      break;
    case "ac_switch_hm":
      props.acSwitch = parseBoolean(value);
      break;
    case "dc_switch_hm":
      props.dcSwitch = parseBoolean(value);
      break;
    case "ups_status_hm":
      props.upsStatus = parseBoolean(value);
      break;
    case "ac_data_output_hm":
      props.acOutput = dataType === "STRUCT" ? parseJsonObject(value) : null;
      break;
    case "dc_data_output_hm":
      props.dcOutput = dataType === "STRUCT" ? parseJsonObject(value) : null;
      break;
    case "ac_data_input_hm":
      props.acInput = dataType === "STRUCT" ? parseJsonObject(value) : null;
      break;
    case "dc_data_input_hm":
      props.dcInput = dataType === "STRUCT" ? parseJsonObject(value) : null;
      break;
    case "host_packet_data_jdb":
      props.batteryPack = dataType === "STRUCT" ? parseJsonObject(value) : null;
      break;
    default:
      break;
  }
}

function celsiusToFahrenheit(celsius) {
  const numeric = parseNumber(celsius);
  if (numeric === null) return null;
  return Number(((numeric * 9) / 5 + 32).toFixed(1));
}

async function getDeviceProperties(session, device) {
  const result = await pecronRequest(
    session.config,
    session.accessToken,
    "GET",
    "/v2/binding/enduserapi/getDeviceBusinessAttributes",
    {
      params: {
        pk: device.productKey,
        dk: device.deviceKey,
      },
    },
  );

  const directSource = result.properties && typeof result.properties === "object"
    ? result.properties
    : result;
  const raw = directSource.customizeTslInfo || directSource.raw || [];
  const parsedSource = { raw };
  const byCode = {};

  for (const item of raw) {
    const code = item.resourceCode;

    if (code) {
      byCode[code] = item.resourceValce ?? item.resourceValue ?? null;
    }

    try {
      applyProperty(parsedSource, item);
    } catch {
      // Unsupported properties should not block status publishing.
    }
  }

  const source = {
    ...parsedSource,
    ...directSource,
    acOutput: directSource.acOutput || parsedSource.acOutput,
    dcOutput: directSource.dcOutput || parsedSource.dcOutput,
    acInput: directSource.acInput || parsedSource.acInput,
    dcInput: directSource.dcInput || parsedSource.dcInput,
    batteryPack: directSource.batteryPack || parsedSource.batteryPack,
    acSwitch: directSource.acSwitch ?? parsedSource.acSwitch,
    dcSwitch: directSource.dcSwitch ?? parsedSource.dcSwitch,
    upsStatus: directSource.upsStatus ?? parsedSource.upsStatus,
    batteryPercentage: directSource.batteryPercentage ?? parsedSource.batteryPercentage,
    totalInputPower: directSource.totalInputPower ?? parsedSource.totalInputPower,
    totalOutputPower: directSource.totalOutputPower ?? parsedSource.totalOutputPower,
  };

  const batteryPercentage = firstNumber(
    source.batteryPercentage,
    source.batteryPack?.host_packet_electric_percentage,
    byCode.battery_percentage,
  );
  const dcInputPower = firstNumber(
    source.dcInput?.dc_input_power,
    byCode.dc_input_power,
    byCode.dc_in_power,
  );
  const acInputPower = firstNumber(
    source.acInput?.ac_power,
    source.acInput?.ac_input_power,
    byCode.ac_input_power,
    byCode.ac_in_power,
  );
  const summedInputPower = dcInputPower === null && acInputPower === null
    ? null
    : (dcInputPower || 0) + (acInputPower || 0);
  const totalInputPower = firstNumber(
    source.totalInputPower,
    byCode.total_input_power,
    summedInputPower,
  );
  const dcOutputPower = firstNumber(
    source.dcOutput?.dc_output_power,
    firstNumberByCode(byCode, [
      "dc_output_power",
      "dc_out_power",
      "dc_power",
      "dc_power_hm",
      "dc_output_power_hm",
    ]),
  );
  const acOutputPower = firstNumber(
    source.acOutput?.ac_output_power,
    firstNumberByCode(byCode, [
      "ac_output_power",
      "ac_out_power",
      "ac_power_hm",
      "ac_output_power_hm",
    ]),
  );

  return {
    batteryPercentage,
    temperatureFahrenheit: celsiusToFahrenheit(source.batteryPack?.host_packet_temp ?? byCode.host_packet_temp),
    totalInputPower,
    acInputPower,
    dcInputPower,
    totalOutputPower: firstNumber(source.totalOutputPower, byCode.total_output_power),
    acOutputPower,
    dcOutputPower,
    acOutputVoltage: firstNumber(source.acOutput?.ac_output_voltage, byCode.ac_output_voltage),
    acOutputFrequency: firstNumber(source.acOutput?.ac_output_hz, byCode.ac_output_hz),
    upsMode: parseBoolean(source.upsStatus ?? byCode.ups_status ?? byCode.upsStatus),
    acOn: parseBoolean(source.acSwitch ?? byCode.ac_switch_hm),
    dcOn: parseBoolean(source.dcSwitch ?? byCode.dc_switch_hm),
  };
}

async function getPecronStatus({ email, password, region = "US", device } = {}) {
  const session = await loginPecron({ email, password, region });
  const devices = await listPecronDevices(session);
  const selectedDevice = findDevice(devices, device);

  if (!selectedDevice) {
    throw new Error(device ? `No Pecron device matched "${device}".` : "No Pecron devices found.");
  }

  const properties = await getDeviceProperties(session, selectedDevice);

  return {
    device: selectedDevice,
    batteryPercentage: properties.batteryPercentage,
    acOn: properties.acOn,
    dcOn: properties.dcOn,
    temperatureFahrenheit: properties.temperatureFahrenheit,
    totalInputPower: properties.totalInputPower,
    acInputPower: properties.acInputPower,
    dcInputPower: properties.dcInputPower,
    totalOutputPower: properties.totalOutputPower,
    acOutputPower: properties.acOutputPower,
    dcOutputPower: properties.dcOutputPower,
    acOutputVoltage: properties.acOutputVoltage,
    acOutputFrequency: properties.acOutputFrequency,
    upsMode: properties.upsMode,
  };
}

function createPecronPublisher() {
  const pecronEmail = getEnv("PECRON_EMAIL", "");
  const pecronPassword = getEnv("PECRON_PASSWORD", "");
  const config = {
    email: pecronEmail,
    password: pecronPassword,
    region: getEnv("PECRON_REGION", "US"),
    device: getEnv("PECRON_DEVICE", ""),
    deviceId: getEnv("PECRON_WSS_DEVICE_ID", "pecron-power-station"),
    pollIntervalSeconds: Number(getEnv("PECRON_WSS_POLL_INTERVAL_SECONDS", "30")),
    reconnectMs: 5000,
  };
  const state = {
    ws: null,
    reconnectTimer: null,
    pollTimer: null,
    shuttingDown: false,
  };

  function start() {
    validatePublisherConfig(config);
    console.log(`Publishing Pecron device ${config.deviceId} to ${backendWsBaseUrl()}`);
    connectDevice();
  }

  function stop() {
    state.shuttingDown = true;

    if (state.reconnectTimer) {
      clearTimeout(state.reconnectTimer);
      state.reconnectTimer = null;
    }
    clearPollTimer();
    if (state.ws) {
      state.ws.close(1000, "shutdown");
      state.ws = null;
    }
  }

  function connectDevice() {
    if (state.shuttingDown) return;

    const ws = new WebSocket(buildWsUrl(config.deviceId), {
      handshakeTimeout: 15000,
      headers: buildWebSocketHeaders(),
    });

    state.ws = ws;

    ws.on("open", () => {
      console.log(`[pecron] Connected as ${config.deviceId}`);
      sendJson(ws, {
        type: "deviceReady",
        deviceType: "pecronPowerStation",
        source: "pecron",
      });
      publishStatus();
    });

    ws.on("message", (data) => {
      const text = Buffer.isBuffer(data) ? data.toString("utf8") : String(data);
      if (text) {
        console.log(`[pecron] Backend message: ${text}`);
      }
    });

    ws.on("error", (error) => {
      if (!state.shuttingDown) {
        console.error(`[pecron] Backend WS error: ${error.message}`);
      }
    });

    ws.on("close", (code, reason) => {
      if (state.ws === ws) {
        state.ws = null;
      }
      clearPollTimer();

      if (!state.shuttingDown) {
        const reasonText = reason?.length ? ` (${reason.toString()})` : "";
        console.log(`[pecron] Backend WS closed: ${code}${reasonText}; reconnecting in ${config.reconnectMs}ms`);
        state.reconnectTimer = setTimeout(connectDevice, config.reconnectMs);
      }
    });
  }

  async function publishStatus() {
    const ws = state.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    let nextPollMs = config.pollIntervalSeconds * 1000;
    try {
      const status = await getPecronStatus(config);
      sendJson(ws, {
        type: "deviceReady",
        deviceName: status.device?.deviceName || "Pecron",
        productName: status.device?.productName || "",
        serialNumber: status.device?.serialNumber || "",
      });
      sendJson(ws, {
        type: "telemetry",
        values: pecronTelemetry(status),
      });
    } catch (error) {
      nextPollMs = Math.max(60000, nextPollMs);
      console.error(`[pecron] Failed to publish status: ${error.message}`);
      sendJson(ws, {
        type: "telemetry",
        values: {
          status: "Error",
          error: error.message || "Failed to load Pecron status",
        },
      });
    } finally {
      schedulePoll(nextPollMs);
    }
  }

  function schedulePoll(delayMs) {
    clearPollTimer();
    if (state.shuttingDown) return;

    state.pollTimer = setTimeout(publishStatus, delayMs);
  }

  function clearPollTimer() {
    if (state.pollTimer) {
      clearTimeout(state.pollTimer);
      state.pollTimer = null;
    }
  }

  return {
    name: "pecron",
    start,
    stop,
  };
}

function pecronTelemetry(status) {
  return compactObject({
    online: status.device?.online ? "Online" : "Offline",
    battery: formatPercent(status.batteryPercentage),
    temperature: formatTemperature(status.temperatureFahrenheit),
    totalInputPower: formatWatts(status.totalInputPower),
    acInputPower: formatWatts(status.acInputPower),
    dcInputPower: formatWatts(status.dcInputPower),
    totalOutputPower: formatWatts(status.totalOutputPower),
    acOutputPower: formatWatts(status.acOutputPower),
    dcOutputPower: formatWatts(status.dcOutputPower),
    acOutputVoltage: formatVolts(status.acOutputVoltage),
    acOutputFrequency: formatHertz(status.acOutputFrequency),
    acOutput: formatOnOff(status.acOn),
    dcOutput: formatOnOff(status.dcOn),
    upsMode: formatOnOff(status.upsMode),
  });
}

function validatePublisherConfig(value) {
  if (!value.deviceId || !/^[a-zA-Z0-9_.:-]+$/.test(value.deviceId)) {
    throw new Error("PECRON_WSS_DEVICE_ID must contain only letters, numbers, underscore, period, colon, or dash.");
  }

  if (!Number.isFinite(value.pollIntervalSeconds) || value.pollIntervalSeconds < 5) {
    throw new Error("PECRON_WSS_POLL_INTERVAL_SECONDS must be at least 5.");
  }

  if (!Number.isFinite(value.reconnectMs) || value.reconnectMs < 1000) {
    throw new Error("Pecron reconnect delay must be at least 1000.");
  }
}

function buildWsUrl(deviceId) {
  return `${backendWsBaseUrl()}?deviceId=${encodeURIComponent(deviceId)}`;
}

function buildWebSocketHeaders() {
  return { "X-Forwarded-Proto": "https" };
}

function sendJson(ws, value) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(value));
  }
}

function isKnown(value) {
  return value !== null && value !== undefined && !Number.isNaN(Number(value));
}

function formatWatts(value) {
  return isKnown(value) ? `${value} W` : null;
}

function formatVolts(value) {
  return isKnown(value) ? `${value} V` : null;
}

function formatHertz(value) {
  return isKnown(value) ? `${value} Hz` : null;
}

function formatPercent(value) {
  return isKnown(value) ? `${value}%` : null;
}

function formatTemperature(value) {
  return isKnown(value) ? `${value} F` : null;
}

function formatOnOff(value) {
  if (value === true) return "On";
  if (value === false) return "Off";
  return null;
}

function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== null && item !== undefined && item !== ""),
  );
}

function formatPort(port) {
  return port && port !== "443" ? `:${port}` : "";
}

function backendWsBaseUrl() {
  return `ws://backend${formatPort(getEnv("API_PORT", "3000"))}/api/wss-devices/ws`;
}

function getEnv(name, fallback) {
  return process.env[name] || fallback;
}

module.exports = {
  createPecronPublisher,
  getPecronStatus,
};
