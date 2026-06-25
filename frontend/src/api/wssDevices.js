export async function wssDevicesList() {
    try {
        const response = await fetch("/api/wss-devices/list", {
            credentials: "include",
            method: "GET",
            cache: "no-cache",
        });
        return [response.status >= 200 && response.status <= 299, await response.json(), response.status];
    } catch {
        return [false, "failed", 400];
    }
}

export async function wssDevicesSetColor(deviceId, color) {
    try {
        const response = await fetch("/api/wss-devices/color", {
            credentials: "include",
            method: "POST",
            cache: "no-cache",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deviceId, color }),
        });
        return [response.status >= 200 && response.status <= 299, await response.json(), response.status];
    } catch {
        return [false, "failed", 400];
    }
}
