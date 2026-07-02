const { spawn, spawnSync } = require("node:child_process");
const WebSocket = require("ws");
const {
  WSS_HEADERS,
  assertConfig,
  backendWsBaseUrl,
  buildBackendWsUrl,
  getEnv,
  getRequiredEnv,
  isWebSocketOpen,
  sendJson,
} = require("./common");

function createRtspPublisher() {
  const state = {
    config: null,
    shuttingDown: false,
    activeFfmpegProcesses: new Set(),
    restartTimers: new Set(),
    devices: new Map(),
  };

  function start() {
    state.config = loadConfig();
    validateConfig(state.config);
    state.config.stallSeconds ??= Math.max(state.config.intervalSeconds * 5, 15);

    for (const channel of state.config.channels) {
      state.devices.set(channel, createDeviceConnection(channel));
    }

    console.log(`Capturing RTSP channels ${state.config.channels.join(", ")} subtype ${state.config.subtype} from ${state.config.host}`);
    console.log(`Publishing RTSP devices to ${backendWsBaseUrl()}`);

    for (const channel of state.config.channels) {
      startCapture(channel);
    }
  }

  function stop() {
    state.shuttingDown = true;

    for (const timer of state.restartTimers) {
      clearTimeout(timer);
    }
    state.restartTimers.clear();

    for (const device of state.devices.values()) {
      if (device.reconnectTimer) clearTimeout(device.reconnectTimer);
      device.reconnectTimer = null;

      if (device.ws) {
        device.ws.close(1000, "shutdown");
        device.ws = null;
      }
    }

    stopAllFfmpeg();
  }

  function startCapture(channel) {
    return spawnFfmpeg(channel, buildFfmpegArgs(channel));
  }

  function buildFfmpegArgs(channel) {
    return [
      "-hide_banner",
      "-loglevel", "error",
      "-nostdin",
      "-rtsp_transport", "tcp",
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
      "-vf", `fps=1/${state.config.intervalSeconds}`,
      "-q:v", "3",
      "-f", "image2pipe",
      "-vcodec", "mjpeg",
      "pipe:1",
    ];
  }

  function spawnFfmpeg(channel, ffmpegArgs) {
    const child = spawn("/usr/bin/ffmpeg", ffmpegArgs, {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    let lastFrameAt = Date.now();
    let restartRequested = false;
    let forceKillTimer = null;
    const frameParser = createJpegFrameParser((jpeg) => {
      lastFrameAt = Date.now();
      sendDeviceImage(channel, jpeg);
    });
    const stallTimer = setInterval(() => {
      const stalledForMs = Date.now() - lastFrameAt;
      if (stalledForMs < state.config.stallSeconds * 1000) return;

      console.warn(`[channel ${channel}] No frames from ffmpeg for ${Math.round(stalledForMs / 1000)}s; restarting stream`);
      requestRestart();
    }, Math.max(1000, Math.min(state.config.stallSeconds * 500, 5000)));
    stallTimer.unref?.();

    state.activeFfmpegProcesses.add(child);
    child.stdout.on("data", frameParser.push);
    child.stderr.on("data", (chunk) => process.stderr.write(prefixLines(channel, chunk)));

    child.on("error", (error) => {
      console.error(`[channel ${channel}] Could not start ffmpeg: ${error.message}`);
      process.exitCode = 1;
    });

    child.on("exit", (code, signal) => {
      clearInterval(stallTimer);
      if (forceKillTimer) clearTimeout(forceKillTimer);
      state.activeFfmpegProcesses.delete(child);
      frameParser.flush();

      if (!state.shuttingDown && code !== 0) {
        console.log(`[channel ${channel}] ffmpeg exited with code ${code ?? "null"}, signal ${signal ?? "null"}`);
      }

      if (!state.shuttingDown) {
        scheduleFfmpegRestart(channel);
      }
    });

    return child;

    function requestRestart() {
      if (restartRequested) return;
      restartRequested = true;
      clearInterval(stallTimer);
      stopFfmpeg(child);

      forceKillTimer = setTimeout(() => {
        if (!state.activeFfmpegProcesses.has(child)) return;
        console.warn(`[channel ${channel}] ffmpeg did not exit after ${state.config.restartGraceSeconds}s; forcing restart`);
        stopFfmpeg(child, true);
      }, state.config.restartGraceSeconds * 1000);
      forceKillTimer.unref?.();
    }
  }

  function scheduleFfmpegRestart(channel) {
    const timer = setTimeout(() => {
      state.restartTimers.delete(timer);
      startCapture(channel);
    }, 1000);

    state.restartTimers.add(timer);
  }

  function createDeviceConnection(channel) {
    const device = {
      channel,
      deviceId: formatDeviceId(channel),
      ws: null,
      reconnectTimer: null,
    };

    connectDevice(device);
    return device;
  }

  function connectDevice(device) {
    if (state.shuttingDown) return;

    const ws = new WebSocket(buildBackendWsUrl(device.deviceId), {
      handshakeTimeout: 15000,
      headers: WSS_HEADERS,
    });

    device.ws = ws;

    ws.on("open", () => {
      console.log(`[channel ${device.channel}] Connected as ${device.deviceId}`);
      sendJson(ws, {
        type: "deviceReady",
      });
    });

    ws.on("message", (data) => {
      const text = Buffer.isBuffer(data) ? data.toString("utf8") : String(data);
      if (text) {
        console.log(`[channel ${device.channel}] Backend message: ${text}`);
      }
    });

    ws.on("error", (error) => {
      if (!state.shuttingDown) {
        console.error(`[channel ${device.channel}] Backend WS error: ${error.message}`);
      }
    });

    ws.on("close", (code, reason) => {
      if (device.ws === ws) {
        device.ws = null;
      }

      if (!state.shuttingDown) {
        const reasonText = reason?.length ? ` (${reason.toString()})` : "";
        console.log(`[channel ${device.channel}] Backend WS closed: ${code}${reasonText}; reconnecting in ${state.config.reconnectMs}ms`);
        device.reconnectTimer = setTimeout(() => connectDevice(device), state.config.reconnectMs);
      }
    });
  }

  function sendDeviceImage(channel, jpeg) {
    const device = state.devices.get(channel);
    const ws = device?.ws;
    if (!isWebSocketOpen(ws)) return;

    if (ws.bufferedAmount > state.config.maxBufferedBytes) {
      console.warn(`[channel ${channel}] Dropping frame because websocket buffer is ${ws.bufferedAmount} bytes`);
      return;
    }

    sendJson(ws, {
      type: "image",
      length: jpeg.length,
    });
    ws.send(jpeg, { binary: true });
  }

  function stopAllFfmpeg(forceSync = false) {
    state.activeFfmpegProcesses.forEach((child) => stopFfmpeg(child, forceSync));
  }

  function stopFfmpeg(child, forceSync = false) {
    if (!child.pid || child.killed) return;

    if (process.platform === "win32") {
      const args = ["/pid", String(child.pid), "/t"];
      if (forceSync) args.push("/f");
      spawnSync("taskkill", args, { stdio: "ignore", windowsHide: true });
      return;
    }

    const signal = forceSync ? "SIGKILL" : "SIGTERM";
    try {
      child.kill(signal);
    } catch (_) {
      // Process may already be gone.
    }
  }

  function buildRtspUrl(channel) {
    const user = encodeURIComponent(state.config.username);
    const pass = encodeURIComponent(state.config.password);
    return `rtsp://${user}:${pass}@${state.config.host}:${state.config.rtspPort}/cam/realmonitor?channel=${channel}&subtype=${state.config.subtype}`;
  }

  function formatDeviceId(channel) {
    return state.config.deviceIdPattern.replaceAll("{channel}", String(channel));
  }

  return {
    name: "rtsp",
    start,
    stop,
  };
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

function loadConfig() {
  return {
    username: getRequiredEnv("RTSP_DVR_USERNAME"),
    password: getRequiredEnv("RTSP_DVR_PASSWORD"),
    host: normalizeHost(getRequiredEnv("RTSP_DVR_HOST")),
    rtspPort: getEnv("RTSP_DVR_PORT", "554"),
    channels: parseChannels(getEnv("RTSP_DVR_CHANNELS", "1,2,3,4")),
    subtype: getEnv("RTSP_DVR_SUBTYPE", "1"),
    intervalSeconds: Number(getEnv("RTSP_CAPTURE_INTERVAL_SECONDS", "2")),
    stallSeconds: getOptionalNumberEnv("RTSP_STREAM_STALL_SECONDS"),
    restartGraceSeconds: Number(getEnv("RTSP_RESTART_GRACE_SECONDS", "5")),
    deviceIdPattern: getEnv("RTSP_DEVICE_ID_PATTERN", "lorex-camera-{channel}"),
    reconnectMs: 5000,
    maxBufferedBytes: 5242880,
  };
}

function validateConfig(value) {
  assertConfig(Number.isFinite(value.intervalSeconds) && value.intervalSeconds > 0, "RTSP_CAPTURE_INTERVAL_SECONDS must be a positive number.");

  if (value.stallSeconds !== undefined) {
    assertConfig(
      Number.isFinite(value.stallSeconds) && value.stallSeconds >= value.intervalSeconds * 2,
      "RTSP_STREAM_STALL_SECONDS must be at least twice RTSP_CAPTURE_INTERVAL_SECONDS.",
    );
  }

  assertConfig(Number.isFinite(value.restartGraceSeconds) && value.restartGraceSeconds > 0, "RTSP_RESTART_GRACE_SECONDS must be a positive number.");
  assertConfig(Number.isFinite(value.reconnectMs) && value.reconnectMs >= 1000, "RTSP reconnect delay must be at least 1000.");
  assertConfig(Number.isFinite(value.maxBufferedBytes) && value.maxBufferedBytes >= 0, "RTSP max buffered bytes must be zero or a positive number.");
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

function getOptionalNumberEnv(name) {
  const value = process.env[name];
  return value ? Number(value) : undefined;
}

module.exports = {
  createRtspPublisher,
};
