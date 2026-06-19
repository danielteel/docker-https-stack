const fetch = require('node-fetch');

const OMLET_BASE_URL = 'https://x107.omlet.co.uk/api/v1';
const OMLET_API_KEY_NAME = 'omlet';

async function getOmletApiKey(knex){
    const apiKeyRecord = await knex('api_keys').select(['api_key']).where({name: OMLET_API_KEY_NAME}).first();
    return apiKeyRecord?.api_key || null;
}

function appendQueryParams(url, query){
    for (const [key, value] of Object.entries(query || {})){
        if (Array.isArray(value)){
            for (const item of value){
                url.searchParams.append(key, item);
            }
        }else if (value!==undefined && value!==null){
            url.searchParams.append(key, value);
        }
    }
}

function getJsonBody(req){
    if (req.body===undefined || req.body===null) return undefined;
    if (Object.keys(req.body).length===0) return undefined;
    return req.body;
}

async function callOmlet(knex, path, {method='GET', body, query={}}={}){
    const apiKey = await getOmletApiKey(knex);
    if (!apiKey){
        return {
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({error: 'omlet api key not configured'})
        };
    }

    const url = new URL(path, OMLET_BASE_URL);
    appendQueryParams(url, query);

    const options = {
        method,
        headers: {
            'Authorization': 'Bearer '+apiKey,
            'Accept': 'application/json'
        }
    };

    if (body!==undefined){
        options.headers['Content-Type']='application/json';
        options.body=JSON.stringify(body);
    }

    const response = await fetch(url.toString(), options);
    return {
        status: response.status,
        contentType: response.headers.get('content-type'),
        body: await response.text()
    };
}

async function relayOmletResponse(res, omletResponse){
    if (omletResponse.contentType){
        res.set('content-type', omletResponse.contentType);
    }
    if (!omletResponse.body){
        return res.status(omletResponse.status).end();
    }
    return res.status(omletResponse.status).send(omletResponse.body);
}

module.exports = { callOmlet, relayOmletResponse, getJsonBody };
