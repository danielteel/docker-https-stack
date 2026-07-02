const DEVICE_ID_PATTERN = /^[a-zA-Z0-9_.:-]+$/;
const OPEN_READY_STATE = 1;
const WSS_HEADERS = { "X-Forwarded-Proto": "https" };

function assertConfig(condition, message) {
  if (!condition) throw new Error(message);
}

function basicAuth(username, password) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

function buildBackendWsUrl(deviceId) {
  return `${backendWsBaseUrl()}?deviceId=${encodeURIComponent(deviceId)}`;
}

function backendWsBaseUrl() {
  return `ws://backend${formatPort(getEnv("API_PORT", "3000"))}/api/wss-devices/ws`;
}

function getEnv(name, fallback) {
  return process.env[name] || fallback;
}

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment value: ${name}`);
  return value;
}

function sendJson(ws, value) {
  if (isWebSocketOpen(ws)) {
    ws.send(JSON.stringify(value));
  }
}

function isWebSocketOpen(ws) {
  return ws?.readyState === OPEN_READY_STATE;
}

function validateDeviceId(value, envName) {
  assertConfig(
    value && DEVICE_ID_PATTERN.test(value),
    `${envName} must contain only letters, numbers, underscore, period, colon, or dash.`,
  );
}

function formatPort(port) {
  return port && port !== "443" ? `:${port}` : "";
}

module.exports = {
  WSS_HEADERS,
  assertConfig,
  backendWsBaseUrl,
  basicAuth,
  buildBackendWsUrl,
  getEnv,
  getRequiredEnv,
  isWebSocketOpen,
  sendJson,
  validateDeviceId,
};
