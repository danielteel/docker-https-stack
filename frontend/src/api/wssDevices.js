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

export function wssDevicesLiveUrl() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/api/wss-devices/live`;
}
