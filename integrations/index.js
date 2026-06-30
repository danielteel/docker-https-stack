const { spawn, spawnSync } = require("node:child_process");
const WebSocket = require("ws");

const config = {
  enabled: getEnv("RTSP_CAPTURE_ENABLED", "true").toLowerCase() !== "false",
  username: getRequiredEnv("RTSP_DVR_USERNAME"),
  password: getRequiredEnv("RTSP_DVR_PASSWORD"),
  host: normalizeHost(getRequiredEnv("RTSP_DVR_HOST")),
  rtspPort: getEnv("RTSP_DVR_PORT", "554"),
  channels: parseChannels(getEnv("RTSP_DVR_CHANNELS", "1,2,3,4")),
  subtype: getEnv("RTSP_DVR_SUBTYPE", "1"),
  rtspTransport: getEnv("RTSP_TRANSPORT", "tcp").toLowerCase(),
  intervalSeconds: Number(getEnv("RTSP_CAPTURE_INTERVAL_SECONDS", "2")),
  stallSeconds: getOptionalNumberEnv("RTSP_STREAM_STALL_SECONDS"),
  ffmpegBin: getEnv("FFMPEG_BIN", "/usr/bin/ffmpeg"),
  wsScheme: getEnv("RTSP_BACKEND_WS_SCHEME", "ws").toLowerCase(),
  wsHost: getEnv("RTSP_BACKEND_WS_HOST", "backend"),
  wsPort: getEnv("RTSP_BACKEND_WS_PORT", getEnv("API_PORT", "3000")),
  wsPath: getEnv("RTSP_BACKEND_WS_PATH", "/api/wss-devices/ws"),
  wsForwardedProto: getEnv("RTSP_BACKEND_WS_FORWARDED_PROTO", "https"),
  deviceIdPattern: getEnv("RTSP_DEVICE_ID_PATTERN", "lorex-camera-{channel}"),
  reconnectMs: Number(getEnv("RTSP_WS_RECONNECT_MS", "5000")),
  maxBufferedBytes: Number(getEnv("RTSP_WS_MAX_BUFFERED_BYTES", "5242880")),
};

validateConfig(config);
config.stallSeconds ??= Math.max(config.intervalSeconds * 5, 15);

let shuttingDown = false;
const activeFfmpegProcesses = new Set();
const restartTimers = new Set();
const devices = new Map();

if (!config.enabled) {
  console.log("RTSP capture integration is disabled.");
} else {
  for (const channel of config.channels) {
    devices.set(channel, createDeviceConnection(channel));
  }

  console.log(`Capturing RTSP channels ${config.channels.join(", ")} subtype ${config.subtype} from ${config.host}`);
  console.log(`Publishing RTSP devices to ${config.wsScheme}://${config.wsHost}${formatPort(config.wsPort)}${config.wsPath}`);

  for (const channel of config.channels) {
    startCapture(channel);
  }
}

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.once(signal, () => shutdown(signal));
}

process.once("beforeExit", () => stopAllFfmpeg());
process.once("exit", () => stopAllFfmpeg(true));

function startCapture(channel) {
  const ffmpegArgs = [
    "-hide_banner",
    "-loglevel", "error",
    "-nostdin",
    "-rtsp_transport", config.rtspTransport,
    "-fflags", "nobuffer+discardcorrupt",
    "-flags", "low_delay",
    "-avioflags", "direct",
    "-max_delay", "0",
    "-reorder_queue_size", "0",
    "-analyzeduration", "100000",
    "-probesize", "100000",
    "-i", buildRtspUrl(channel),
    "-map", "0:v:0",
    "-an",
    "-sn",
    "-dn",
    "-vf", `fps=1/${config.intervalSeconds}`,
    "-q:v", "3",
    "-f", "image2pipe",
    "-vcodec", "mjpeg",
    "pipe:1",
  ];

  return spawnFfmpeg(channel, ffmpegArgs);
}

function spawnFfmpeg(channel, ffmpegArgs) {
  const child = spawn(config.ffmpegBin, ffmpegArgs, {
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  let lastFrameAt = Date.now();
  const frameParser = createJpegFrameParser((jpeg) => {
    lastFrameAt = Date.now();
    sendDeviceImage(channel, jpeg);
  });
  const stallTimer = setInterval(() => {
    const stalledForMs = Date.now() - lastFrameAt;
    if (stalledForMs < config.stallSeconds * 1000) return;

    console.warn(`[channel ${channel}] No frames from ffmpeg for ${Math.round(stalledForMs / 1000)}s; restarting stream`);
    stopFfmpeg(child, true);
  }, Math.max(1000, Math.min(config.stallSeconds * 500, 5000)));
  stallTimer.unref?.();

  activeFfmpegProcesses.add(child);
  child.stdout.on("data", frameParser.push);
  child.stderr.on("data", (chunk) => process.stderr.write(prefixLines(channel, chunk)));

  child.on("error", (error) => {
    console.error(`[channel ${channel}] Could not start ffmpeg: ${error.message}`);
    process.exitCode = 1;
  });

  child.on("exit", (code, signal) => {
    clearInterval(stallTimer);
    activeFfmpegProcesses.delete(child);
    frameParser.flush();

    if (!shuttingDown && code !== 0) {
      console.log(`[channel ${channel}] ffmpeg exited with code ${code ?? "null"}, signal ${signal ?? "null"}`);
    }

    if (!shuttingDown) {
      scheduleFfmpegRestart(channel);
    }
  });

  return child;
}

function scheduleFfmpegRestart(channel) {
  const timer = setTimeout(() => {
    restartTimers.delete(timer);
    startCapture(channel);
  }, 1000);

  restartTimers.add(timer);
}

function createDeviceConnection(channel) {
  const deviceId = formatDeviceId(channel);
  const state = {
    channel,
    deviceId,
    ws: null,
    reconnectTimer: null,
  };

  connectDevice(state);
  return state;
}

function connectDevice(state) {
  if (shuttingDown) return;

  const ws = new WebSocket(buildWsUrl(state.deviceId), {
    handshakeTimeout: 15000,
    headers: buildWebSocketHeaders(),
  });

  state.ws = ws;

  ws.on("open", () => {
    console.log(`[channel ${state.channel}] Connected as ${state.deviceId}`);
    sendJson(ws, {
      type: "deviceReady",
      deviceType: "rtspCamera",
      source: "lorex",
      channel: state.channel,
      subtype: config.subtype,
    });
  });

  ws.on("message", (data) => {
    const text = Buffer.isBuffer(data) ? data.toString("utf8") : String(data);
    if (text) {
      console.log(`[channel ${state.channel}] Backend message: ${text}`);
    }
  });

  ws.on("error", (error) => {
    if (!shuttingDown) {
      console.error(`[channel ${state.channel}] Backend WS error: ${error.message}`);
    }
  });

  ws.on("close", (code, reason) => {
    if (state.ws === ws) {
      state.ws = null;
    }

    if (!shuttingDown) {
      const reasonText = reason?.length ? ` (${reason.toString()})` : "";
      console.log(`[channel ${state.channel}] Backend WS closed: ${code}${reasonText}; reconnecting in ${config.reconnectMs}ms`);
      state.reconnectTimer = setTimeout(() => connectDevice(state), config.reconnectMs);
    }
  });
}

function sendDeviceImage(channel, jpeg) {
  const state = devices.get(channel);
  const ws = state?.ws;
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  if (ws.bufferedAmount > config.maxBufferedBytes) {
    console.warn(`[channel ${channel}] Dropping frame because websocket buffer is ${ws.bufferedAmount} bytes`);
    return;
  }

  const now = Date.now();
  sendJson(ws, {
    type: "image",
    id: `${state.deviceId}-${now}`,
    format: "jpeg",
    length: jpeg.length,
    channel,
    capturedAt: new Date(now).toISOString(),
  });
  ws.send(jpeg, { binary: true });
}

function sendJson(ws, value) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(value));
  }
}

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Received ${signal}; stopping RTSP captures and websocket connections...`);

  for (const timer of restartTimers) {
    clearTimeout(timer);
  }
  restartTimers.clear();

  for (const state of devices.values()) {
    if (state.reconnectTimer) {
      clearTimeout(state.reconnectTimer);
      state.reconnectTimer = null;
    }
    if (state.ws) {
      state.ws.close(1000, "shutdown");
      state.ws = null;
    }
  }

  stopAllFfmpeg();
  setTimeout(() => process.exit(0), 750).unref();
}

function stopAllFfmpeg(forceSync = false) {
  for (const child of activeFfmpegProcesses) {
    stopFfmpeg(child, forceSync);
  }
}

function stopFfmpeg(child, forceSync = false) {
  if (!child.pid || child.killed) return;

  if (process.platform === "win32") {
    const args = ["/pid", String(child.pid), "/t"];
    if (forceSync) args.push("/f");
    spawnSync("taskkill", args, { stdio: "ignore", windowsHide: true });
    return;
  }

  try {
    child.kill("SIGTERM");
  } catch (_) {
    // Process may already be gone.
  }
}

function createJpegFrameParser(onFrame) {
  let buffer = Buffer.alloc(0);

  return {
    push(chunk) {
      buffer = Buffer.concat([buffer, chunk]);

      while (true) {
        const start = findMarker(buffer, 0xff, 0xd8, 0);
        if (start === -1) {
          buffer = Buffer.alloc(0);
          return;
        }

        const end = findMarker(buffer, 0xff, 0xd9, start + 2);
        if (end === -1) {
          if (start > 0) {
            buffer = buffer.slice(start);
          }
          return;
        }

        const frame = buffer.slice(start, end + 2);
        buffer = buffer.slice(end + 2);
        onFrame(frame);
      }
    },
    flush() {
      buffer = Buffer.alloc(0);
    },
  };
}

function findMarker(buffer, firstByte, secondByte, offset) {
  for (let index = offset; index < buffer.length - 1; index += 1) {
    if (buffer[index] === firstByte && buffer[index + 1] === secondByte) {
      return index;
    }
  }
  return -1;
}

function buildRtspUrl(channel) {
  const user = encodeURIComponent(config.username);
  const pass = encodeURIComponent(config.password);
  return `rtsp://${user}:${pass}@${config.host}:${config.rtspPort}/cam/realmonitor?channel=${channel}&subtype=${config.subtype}`;
}

function buildWsUrl(deviceId) {
  const port = formatPort(config.wsPort);
  const pathPart = config.wsPath.startsWith("/") ? config.wsPath : `/${config.wsPath}`;
  const separator = pathPart.includes("?") ? "&" : "?";
  return `${config.wsScheme}://${config.wsHost}${port}${pathPart}${separator}deviceId=${encodeURIComponent(deviceId)}`;
}

function buildWebSocketHeaders() {
  if (!config.wsForwardedProto) return {};
  return { "X-Forwarded-Proto": config.wsForwardedProto };
}

function validateConfig(value) {
  if (!["ws", "wss"].includes(value.wsScheme)) {
    throw new Error("RTSP_BACKEND_WS_SCHEME must be either ws or wss.");
  }

  if (!["tcp", "udp"].includes(value.rtspTransport)) {
    throw new Error("RTSP_TRANSPORT must be either tcp or udp.");
  }

  if (!Number.isFinite(value.intervalSeconds) || value.intervalSeconds <= 0) {
    throw new Error("RTSP_CAPTURE_INTERVAL_SECONDS must be a positive number.");
  }

  if (value.stallSeconds !== undefined && (!Number.isFinite(value.stallSeconds) || value.stallSeconds < value.intervalSeconds * 2)) {
    throw new Error("RTSP_STREAM_STALL_SECONDS must be at least twice RTSP_CAPTURE_INTERVAL_SECONDS.");
  }

  if (!Number.isFinite(value.reconnectMs) || value.reconnectMs < 1000) {
    throw new Error("RTSP_WS_RECONNECT_MS must be at least 1000.");
  }

  if (!Number.isFinite(value.maxBufferedBytes) || value.maxBufferedBytes < 0) {
    throw new Error("RTSP_WS_MAX_BUFFERED_BYTES must be zero or a positive number.");
  }
}

function formatPort(port) {
  return port && port !== "443" ? `:${port}` : "";
}

function formatDeviceId(channel) {
  return config.deviceIdPattern.replaceAll("{channel}", String(channel));
}

function prefixLines(channel, chunk) {
  return chunk
    .toString()
    .split(/(\r?\n)/)
    .map((part) => (part === "\n" || part === "\r\n" || part === "" ? part : `[channel ${channel}] ${part}`))
    .join("");
}

function parseChannels(value) {
  const channels = value
    .split(",")
    .map((channel) => Number(channel.trim()))
    .filter((channel) => Number.isInteger(channel) && channel > 0);

  if (channels.length === 0) {
    throw new Error("RTSP_DVR_CHANNELS must include at least one positive channel number.");
  }

  return channels;
}

function normalizeHost(value) {
  return value.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

function getEnv(name, fallback) {
  return process.env[name] || fallback;
}

function getOptionalNumberEnv(name) {
  const value = process.env[name];
  return value ? Number(value) : undefined;
}

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment value: ${name}`);
  return value;
}
