const net = require("node:net");

const DEFAULT_PORT = 9999;
const DEFAULT_TIMEOUT_MS = 5000;
const INITIAL_KEY = 0xab;

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

function sendKasaCommand(ipAddress, payload, { port = DEFAULT_PORT, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: ipAddress, port });
    const chunks = [];
    let expectedLength = null;
    let settled = false;

    function settle(fn, value) {
      if (settled) {
        return;
      }

      settled = true;
      socket.destroy();
      fn(value);
    }

    socket.setTimeout(timeoutMs);

    socket.on("connect", () => {
      socket.write(encrypt(payload));
    });

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

    socket.on("timeout", () => {
      settle(reject, new Error(`Timed out connecting to Kasa plug at ${ipAddress}:${port}.`));
    });

    socket.on("error", (error) => {
      settle(reject, error);
    });
  });
}

function parseOnOff(response) {
  const relayState = response?.system?.get_sysinfo?.relay_state;

  if (relayState === 1) {
    return "on";
  }

  if (relayState === 0) {
    return "off";
  }

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

module.exports = { getKasaStatus, setKasaStatus };
