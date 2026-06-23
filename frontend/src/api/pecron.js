export async function pecronStatus() {
    try {
        const response = await fetch('/api/pecron/status', {credentials: 'include', cache: 'no-cache'});
        return [response.status >= 200 && response.status <= 299, await response.json(), response.status];
    } catch {
        return [false, 'failed', 400];
    }
}

async function setPecronOutput(output, on) {
    try {
        const options = {
            credentials: 'include',
            method: 'POST',
            cache: 'no-cache',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({on})
        };
        const response = await fetch('/api/pecron/'+output, options);
        return [response.status >= 200 && response.status <= 299, await response.json(), response.status];
    } catch {
        return [false, 'failed', 400];
    }
}

export async function pecronSetAc(on) {
    return setPecronOutput('ac', on);
}

export async function pecronSetDc(on) {
    return setPecronOutput('dc', on);
}
