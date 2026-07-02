const {
  assertConfig,
  basicAuth,
  getEnv,
} = require("./common");

function createDesecPublisher() {
  const config = {
    domain: getEnv("DESEC_DOMAIN", ""),
    token: getEnv("DESEC_TOKEN", ""),
    intervalSeconds: Number(getEnv("DDNS_INTERVAL_SECONDS", "300")),
    timeoutMs: 20000,
  };
  const state = {
    timer: null,
    abortController: null,
    shuttingDown: false,
  };

  function start() {
    if (!config.domain || !config.token) {
      console.log("[desec] DESEC_DOMAIN or DESEC_TOKEN is not set; skipping DDNS updates");
      return;
    }

    validateConfig(config);
    console.log(`[desec] Updating ${config.domain} every ${config.intervalSeconds}s`);
    updateNow();
  }

  function stop() {
    state.shuttingDown = true;
    clearUpdateTimer();
    state.abortController?.abort();
    state.abortController = null;
  }

  async function updateNow() {
    clearUpdateTimer();
    state.abortController = new AbortController();
    const timeout = setTimeout(() => state.abortController?.abort(), config.timeoutMs);

    try {
      const ip = await getPublicIp(state.abortController.signal);
      if (ip) {
        console.log(`[desec] Updating ${config.domain} to ${ip}`);
      } else {
        console.log(`[desec] Updating ${config.domain}; public IP lookup failed`);
      }

      const response = await fetch("https://update.dedyn.io/", {
        headers: {
          Authorization: basicAuth(config.domain, config.token),
        },
        signal: state.abortController.signal,
      });
      const text = await response.text();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
    } catch (error) {
      if (!state.shuttingDown && error.name !== "AbortError") {
        console.error(`[desec] DDNS update failed: ${error.message}`);
      }
    } finally {
      clearTimeout(timeout);
      state.abortController = null;
      scheduleUpdate();
    }
  }

  function scheduleUpdate() {
    if (state.shuttingDown) return;
    state.timer = setTimeout(updateNow, config.intervalSeconds * 1000);
    state.timer.unref?.();
  }

  function clearUpdateTimer() {
    if (state.timer) {
      clearTimeout(state.timer);
      state.timer = null;
    }
  }

  return {
    name: "desec",
    start,
    stop,
  };
}

async function getPublicIp(signal) {
  return await fetchText("https://api.ipify.org", signal)
    || await fetchText("https://checkip.amazonaws.com", signal);
}

async function fetchText(url, signal) {
  try {
    const response = await fetch(url, { signal });
    if (!response.ok) return "";
    return (await response.text()).trim();
  } catch {
    return "";
  }
}

function validateConfig(value) {
  assertConfig(Number.isFinite(value.intervalSeconds) && value.intervalSeconds >= 60, "DDNS_INTERVAL_SECONDS must be at least 60.");
}

module.exports = {
  createDesecPublisher,
};
