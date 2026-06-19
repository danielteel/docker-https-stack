import equal from 'fast-deep-equal';

let lastApiKeys=[];

function sortApiKeys(apiKeys){
    apiKeys.sort((a, b) => {
        if (a.api_key_id>b.api_key_id){
            return 1;
        }
        if  (a.api_key_id<b.api_key_id){
            return -1;
        }
        return 0;
    });
}

async function apiKeysResponse(response){
    const apiKeys = await response.json();
    if (response.status>=200 && response.status<=299){
        sortApiKeys(apiKeys);
        if (equal(lastApiKeys, apiKeys)){
            return [true, lastApiKeys, response.status];
        }
        lastApiKeys=apiKeys;
        return [true, apiKeys, response.status];
    }
    return [false, apiKeys, response.status];
}

export async function apiKeysList(){
    try {
        const response = await fetch('/api/api_keys/list', {credentials: 'include'});
        return await apiKeysResponse(response);
    }catch(e){
        return [false, 'failed', 400];
    }
}

export async function apiKeysAdd(name, apiKey){
    try{
        const options = {
            credentials: 'include',
            method: "POST",
            cache: "no-cache",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({name, api_key: apiKey})
        };
        const response = await fetch('/api/api_keys/add', options);
        return await apiKeysResponse(response);
    }catch(e){
        return [false, 'failed', 400];
    }
}

export async function apiKeysUpdate(id, name, apiKey){
    try{
        const options = {
            credentials: 'include',
            method: "POST",
            cache: "no-cache",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({api_key_id: id, name, api_key: apiKey})
        };
        const response = await fetch('/api/api_keys/update', options);
        return await apiKeysResponse(response);
    }catch(e){
        return [false, 'failed', 400];
    }
}

export async function apiKeysDelete(id){
    try{
        const options = {
            credentials: 'include',
            method: "POST",
            cache: "no-cache",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({api_key_id: id})
        };
        const response = await fetch('/api/api_keys/delete', options);
        return await apiKeysResponse(response);
    }catch(e){
        return [false, 'failed', 400];
    }
}
