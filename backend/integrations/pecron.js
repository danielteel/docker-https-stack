const crypto = require("node:crypto");

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
    refreshToken: result.refreshToken.token,
    accessTokenExpiresAt: result.accessToken.expirationTime,
  };
}

function parseDevice(device) {
  return {
    deviceName: device.deviceName || "Unknown",
    productName: device.productName || "",
    productKey: device.productKey || "",
    deviceKey: device.deviceKey || "",
    online: device.onlineStatus === 1,
    protocol: device.protocol || "",
    serialNumber: device.sn || null,
    signalStrength: device.signalStrength || null,
    lastConnectionTime: device.lastConnTime || null,
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

async function getPecronDevices(options) {
  const session = await loginPecron(options);

  return listPecronDevices(session);
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

  const parsed = Number.parseInt(String(value).replace(/,/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function firstNumberByCode(byCode, codes) {
  for (const code of codes) {
    const value = parseNumber(byCode[code]);
    if (value !== null) return value;
  }

  return null;
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

  const raw = result.customizeTslInfo || [];
  const byCode = {};

  for (const item of raw) {
    const code = item.resourceCode;

    if (code) {
      byCode[code] = item.resourceValce ?? item.resourceValue ?? null;
    }
  }

  return {
    raw,
    byCode,
    batteryPercentage: parseNumber(byCode.battery_percentage),
    totalInputPower: parseNumber(byCode.total_input_power),
    totalOutputPower: parseNumber(byCode.total_output_power),
    acOutputPower: firstNumberByCode(byCode, [
      "ac_output_power",
      "ac_out_power",
      "ac_power",
      "ac_power_hm",
      "ac_output_power_hm",
    ]),
    dcOutputPower: firstNumberByCode(byCode, [
      "dc_output_power",
      "dc_out_power",
      "dc_power",
      "dc_power_hm",
      "dc_output_power_hm",
    ]),
    acOn: byCode.ac_switch_hm === undefined ? null : String(byCode.ac_switch_hm).toLowerCase() === "true",
    dcOn: byCode.dc_switch_hm === undefined ? null : String(byCode.dc_switch_hm).toLowerCase() === "true",
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
    totalInputPower: properties.totalInputPower,
    totalOutputPower: properties.totalOutputPower,
    acOutputPower: properties.acOutputPower,
    dcOutputPower: properties.dcOutputPower,
    properties,
  };
}

async function setPecronProperties(session, device, properties) {
  const data = Object.entries(properties).map(([code, value]) => ({ [code]: value }));
  const result = await pecronRequest(
    session.config,
    session.accessToken,
    "POST",
    "/v2/binding/enduserapi/batchControlDevice",
    {
      json: {
        data: JSON.stringify(data),
        deviceList: [
          {
            productKey: device.productKey,
            deviceKey: device.deviceKey,
          },
        ],
        type: 2,
      },
    },
  );

  for (const item of result.successList || []) {
    const itemData = item.data || {};

    if (itemData.productKey === device.productKey && itemData.deviceKey === device.deviceKey) {
      return {
        success: true,
        ticket: item.ticket || null,
      };
    }
  }

  for (const item of result.failureList || []) {
    const itemData = item.data || {};

    if (itemData.productKey === device.productKey && itemData.deviceKey === device.deviceKey) {
      return {
        success: false,
        errorMessage: item.msg || "Command failed.",
      };
    }
  }

  return {
    success: false,
    errorMessage: "Device was not present in the command response.",
  };
}

async function setPecronOutput({ email, password, region = "US", device, ac, dc } = {}) {
  if (ac === undefined && dc === undefined) {
    throw new Error("Pass ac, dc, or both as booleans.");
  }

  if (ac !== undefined && typeof ac !== "boolean") {
    throw new TypeError("ac must be a boolean when provided.");
  }

  if (dc !== undefined && typeof dc !== "boolean") {
    throw new TypeError("dc must be a boolean when provided.");
  }

  const session = await loginPecron({ email, password, region });
  const devices = await listPecronDevices(session);
  const selectedDevice = findDevice(devices, device);

  if (!selectedDevice) {
    throw new Error(device ? `No Pecron device matched "${device}".` : "No Pecron devices found.");
  }

  const updates = {};

  if (ac !== undefined) {
    updates.ac_switch_hm = ac;
  }

  if (dc !== undefined) {
    updates.dc_switch_hm = dc;
  }

  return setPecronProperties(session, selectedDevice, updates);
}

async function setPecronAcStatus(options, on) {
  return setPecronOutput({ ...options, ac: on });
}

async function setPecronDcStatus(options, on) {
  return setPecronOutput({ ...options, dc: on });
}

module.exports = {
  getPecronDevices,
  getPecronStatus,
  setPecronAcStatus,
  setPecronDcStatus,
  setPecronOutput,
};
