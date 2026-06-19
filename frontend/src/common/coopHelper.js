const COOP_API_BASE = "/api/coop";

async function request(path, {method = "GET", body} = {}) {
    const options = {
        method,
        credentials: "include",
        cache: "no-cache",
        headers: {
            Accept: "application/json",
        },
    };

    if (body !== undefined) {
        options.headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(body);
    }

    const res = await fetch(`${COOP_API_BASE}${path}`, options);
    const text = await res.text();
    let data = null;

    if (text) {
        try {
            data = JSON.parse(text);
        } catch {
            data = text;
        }
    }

    if (!res.ok) {
        const message = data?.message || data?.error || text || res.statusText;
        const error = new Error(message || `Coop request failed with status ${res.status}`);
        error.status = res.status;
        error.data = data;
        throw error;
    }

    return data;
}

function getConnected(obj) {
    if (obj.overdueConnection) return "overdue";
    if (obj.state?.general?.powerSource === "battery") return "polling";
    if (obj.state?.connectivity?.connected === false) return "disconnected";
    if (obj.state?.connectivity?.connected === true) return "connected";
    if (obj.connected === false) return "disconnected";
    return "connected";
}

function getPowerLevel(obj) {
    if (obj.state?.general?.batteryLevel !== undefined) {
        return obj.state.general.batteryLevel;
    }
    if (obj.state?.general?.powerSource && obj.state.general.powerSource !== "battery") {
        return 100;
    }
    return "?";
}

function normalizeDeviceType(deviceType) {
    return String(deviceType || "unknown").trim().toLowerCase();
}

function celsiusToFahrenheit(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return value;
    return Math.round((number * 1.8 + 32) * 10) / 10;
}

export class Coop {
    constructor() {
        this.devices = [];
    }

    async fetchDevices() {
        const rawDevices = await request("/device");
        this.devices = (rawDevices || []).map((obj) => this.createDevice(obj));
        return this.devices;
    }

    async fetchDevice(deviceId) {
        return this.createDevice(await request(`/device/${encodeURIComponent(deviceId)}`));
    }

    async updateDevice(deviceId, details) {
        return this.createDevice(await request(`/device/${encodeURIComponent(deviceId)}`, {method: "PATCH", body: details}));
    }

    async action(deviceId, actionName) {
        return await request(`/device/${encodeURIComponent(deviceId)}/action/${encodeURIComponent(actionName)}`, {method: "POST"});
    }

    async fetchConfiguration(deviceId) {
        return await request(`/device/${encodeURIComponent(deviceId)}/configuration`);
    }

    async updateConfiguration(deviceId, configuration) {
        return await request(`/device/${encodeURIComponent(deviceId)}/configuration`, {method: "PATCH", body: configuration});
    }

    async fetchEvents() {
        return await request("/events");
    }

    createDevice(obj) {
        const base = {
            coop: this,
            raw: obj,
            deviceId: obj.deviceId,
            name: obj.name,
            connected: getConnected(obj),
            powerLevel: getPowerLevel(obj),
        };

        const type = normalizeDeviceType(obj.deviceType);
        let device;

        switch (type) {
            case "feeder":
            case "autofeeder":
                device = new OmletFeeder({
                    ...base,
                    doorState: obj.state?.feeder?.state ?? "?",
                    fault: obj.state?.feeder?.fault ?? "?",
                    feedLevel: obj.state?.feeder?.feedLevel ?? "?",
                });
                break;

            case "autodoor":
            case "auto door":
                device = new OmletAutoDoor({
                    ...base,
                    lightState: obj.state?.light?.state ?? "?",
                    doorState: obj.state?.door?.state ?? "?",
                    doorFault: obj.state?.door?.fault ?? "?",
                });
                break;

            case "fan":
                device = new OmletFan({
                    ...base,
                    humidity: obj.state?.fan?.humidity ?? "?",
                    state: obj.state?.fan?.state ?? "?",
                    temperature: obj.state?.fan?.temperature ?? null,
                    mode: obj.configuration?.fan?.mode ?? "?",
                });
                break;

            default:
                device = new OmletUnknownDevice({
                    ...base,
                    deviceType: obj.deviceType || "unknown",
                });
                break;
        }

        device.stateSummary = device.getStateSummary();
        device.actions = device.getDefaultActions();
        return device;
    }
}

export class OmletDevice {
    constructor({ coop, raw, deviceId, name, deviceType, connected, powerLevel }) {
        this.coop = coop;
        this.raw = raw;
        this.deviceId = deviceId;
        this.name = name;
        this.deviceType = deviceType;
        this.connected = connected;
        this.powerLevel = powerLevel;
        this.stateSummary = [];
        this.actions = [];
    }

    getStateSummary() {
        return [];
    }

    getDefaultActions() {
        return [
            {name: "Restart", actionName: "restart", action: () => this.restart()},
        ];
    }

    restart() {
        return this.coop.action(this.deviceId, "restart");
    }
}

export class OmletUnknownDevice extends OmletDevice {
    constructor({coop, raw, deviceId, name, deviceType, connected, powerLevel}) {
        super({
            coop,
            raw,
            deviceId,
            name,
            deviceType: deviceType || "unknown",
            connected,
            powerLevel,
        });
    }
}

export class OmletFeeder extends OmletDevice {
    constructor({
        coop,
        raw,
        deviceId,
        name,
        connected,
        powerLevel,
        doorState,
        fault,
        feedLevel,
    }) {
        super({
            coop,
            raw,
            deviceId,
            name,
            deviceType: "autofeeder",
            connected,
            powerLevel,
        });

        this.doorState = doorState;
        this.fault = fault;
        this.feedLevel = feedLevel;
    }

    getDefaultActions() {
        return [
            ...super.getDefaultActions(),
            {name: "Open", actionName: "open", action: () => this.open()},
            {name: "Close", actionName: "close", action: () => this.close()},
        ];
    }

    getStateSummary() {
        return [
            {label: "Door", value: this.doorState},
            {label: "Feed", value: this.feedLevel},
            {label: "Fault", value: this.fault},
        ];
    }

    open() {
        return this.coop.action(this.deviceId, "open");
    }

    close() {
        return this.coop.action(this.deviceId, "close");
    }
}

export class OmletAutoDoor extends OmletDevice {
    constructor({
        coop,
        raw,
        deviceId,
        name,
        connected,
        powerLevel,
        lightState,
        doorState,
        doorFault,
    }) {
        super({
            coop,
            raw,
            deviceId,
            name,
            deviceType: "autodoor",
            connected,
            powerLevel,
        });

        this.lightState = lightState;
        this.doorState = doorState;
        this.doorFault = doorFault;
    }

    getDefaultActions() {
        return [
            ...super.getDefaultActions(),
            {name: "Open", actionName: "open", action: () => this.open()},
            {name: "Close", actionName: "close", action: () => this.close()},
            {name: "Light On", actionName: "on", action: () => this.lightOn()},
            {name: "Light Off", actionName: "off", action: () => this.lightOff()},
        ];
    }

    getStateSummary() {
        return [
            {label: "Door", value: this.doorState},
            {label: "Light", value: this.lightState},
            {label: "Fault", value: this.doorFault},
        ];
    }

    open() {
        return this.coop.action(this.deviceId, "open");
    }

    close() {
        return this.coop.action(this.deviceId, "close");
    }

    lightOn() {
        return this.coop.action(this.deviceId, "on");
    }

    lightOff() {
        return this.coop.action(this.deviceId, "off");
    }
}

export class OmletFan extends OmletDevice {
    constructor({
        coop,
        raw,
        deviceId,
        name,
        connected,
        powerLevel,
        humidity,
        state,
        temperature,
        mode
    }) {
        super({
            coop,
            raw,
            deviceId,
            name,
            deviceType: "fan",
            connected,
            powerLevel,
        });

        this.humidity = humidity;
        this.state = state;
        this.temperatureC = temperature;
        this.temperatureF = temperature == null ? null : celsiusToFahrenheit(temperature);
        this.mode = mode;
    }

    getDefaultActions() {
        const actions = super.getDefaultActions();
        if (this.mode === "manual") {
            actions.push(
                {name: "On", actionName: "on", action: () => this.on()},
                {name: "Off", actionName: "off", action: () => this.off()}
            );
        }
        return actions;
    }

    getStateSummary() {
        return [
            {label: "Fan", value: this.state},
            {label: "Temp", value: this.temperatureF == null ? "?" : `${this.temperatureF} F`},
            {label: "Humidity", value: this.humidity},
            {label: "Mode", value: this.mode},
        ];
    }

    on() {
        if (this.mode === "manual") {
            return this.coop.action(this.deviceId, "on");
        }
    }

    off() {
        if (this.mode === "manual") {
            return this.coop.action(this.deviceId, "off");
        }
    }
}
