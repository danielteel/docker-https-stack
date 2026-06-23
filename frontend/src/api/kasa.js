import equal from 'fast-deep-equal';

let lastKasaPlugs = [];

function sortPlugs(plugs) {
    plugs.sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

async function kasaResponse(response) {
    const data = await response.json();
    if (response.status >= 200 && response.status <= 299) {
        const plugs = Array.isArray(data) ? data : [data];
        sortPlugs(plugs);
        if (Array.isArray(data) && equal(lastKasaPlugs, plugs)) {
            return [true, lastKasaPlugs, response.status];
        }
        if (Array.isArray(data)) lastKasaPlugs = plugs;
        return [true, Array.isArray(data) ? plugs : data, response.status];
    }
    return [false, data, response.status];
}

export async function kasaPlugs() {
    try {
        const response = await fetch('/api/kasa/plugs', {credentials: 'include', cache: 'no-cache'});
        return await kasaResponse(response);
    } catch {
        return [false, 'failed', 400];
    }
}

export async function kasaSetPlugState(id, on) {
    try {
        const options = {
            credentials: 'include',
            method: 'POST',
            cache: 'no-cache',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({on})
        };
        const response = await fetch('/api/kasa/plugs/'+encodeURIComponent(id)+'/state', options);
        return await kasaResponse(response);
    } catch {
        return [false, 'failed', 400];
    }
}
