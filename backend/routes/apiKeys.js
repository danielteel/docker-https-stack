const express = require('express');
const {verifyFields} = require('../common/common');
const {authenticate} = require('../common/accessToken');
const { needKnex } = require('../database');


const router = express.Router();
module.exports = router;

async function getApiKeys(knex){
    return await knex('api_keys').select(['id as api_key_id', 'name', 'api_key', 'created_at', 'updated_at']).orderBy('name', 'asc');
}

async function getApiKey(knex, apiKeyId){
    return await knex('api_keys').select(['id as api_key_id', 'name', 'api_key', 'created_at', 'updated_at']).where('id', apiKeyId).first();
}

router.get('/list', [needKnex, authenticate.bind(null, 'admin')], async (req, res) => {
    try {
        res.json(await getApiKeys(req.knex));
    }catch(e){
        console.error('ERROR GET /api_keys/list', req.body, e);
        return res.status(400).json({error: 'error'});
    }
});

router.get('/get/:api_key_id', [needKnex, authenticate.bind(null, 'admin')], async (req, res) => {
    try {
        const api_key_id = Number(req.params.api_key_id);
        if (!Number.isInteger(api_key_id)) return res.status(400).json({error: 'invalid api key id'});

        const apiKey = await getApiKey(req.knex, api_key_id);
        if (!apiKey) return res.status(400).json({error: 'invalid api key id'});

        return res.json(apiKey);
    }catch(e){
        console.error('ERROR GET /api_keys/get', req.body, e);
        return res.status(400).json({error: 'error'});
    }
});

router.post('/add', [needKnex, authenticate.bind(null, 'admin')], async (req, res)=>{
    try {
        const [fieldCheck, name, api_key] = verifyFields(req.body, ['name:string:*:t', 'api_key:string:*:t']);
        let failed = fieldCheck;
        if (!failed){
            if (name==='') failed+='name cannot be empty. ';
            if (api_key==='') failed+='api_key cannot be empty. ';
        }
        if (failed) return res.status(400).json({error: 'failed field check: '+failed});

        const apiKeyExists = await req.knex('api_keys').select(['name']).where('name', name);
        if (apiKeyExists.length) return res.status(400).json({error: 'api key with name '+name+' already exists'});

        await req.knex('api_keys').insert({name, api_key});

        res.json(await getApiKeys(req.knex));
    }catch(e){
        console.error('ERROR POST /api_keys/add', req.body, e);
        return res.status(400).json({error: 'error'});
    }
});

router.post('/update', [needKnex, authenticate.bind(null, 'admin')], async (req, res)=>{
    try {
        const [fieldCheck, api_key_id, name, api_key] = verifyFields(req.body, ['api_key_id:number', 'name:string:*:t', 'api_key:string:*:t']);
        let failed = fieldCheck;
        if (!failed){
            if (name==='') failed+='name cannot be empty. ';
            if (api_key==='') failed+='api_key cannot be empty. ';
        }
        if (failed) return res.status(400).json({error: 'failed field check: '+failed});

        const [apiKey] = await req.knex('api_keys').select(['id']).where('id', api_key_id);
        if (!apiKey) return res.status(400).json({error: 'api key with id '+api_key_id+' doesnt exist'});

        const apiKeyExists = await req.knex('api_keys').select(['id as api_key_id', 'name']).where('name', name);
        if (apiKeyExists.length){
            if (apiKeyExists[0].api_key_id!=api_key_id) return res.status(400).json({error: 'api key with name '+name+' already exists'});
        }

        await req.knex('api_keys').update({name, api_key, updated_at: req.knex.fn.now()}).where({id: api_key_id});

        res.json(await getApiKeys(req.knex));
    }catch(e){
        console.error('ERROR POST /api_keys/update', req.body, e);
        return res.status(400).json({error: 'error'});
    }
});

router.post('/delete', [needKnex, authenticate.bind(null, 'admin')], async (req, res)=>{
    try {
        const [fieldCheck, api_key_id] = verifyFields(req.body, ['api_key_id:number']);
        if (fieldCheck) return res.status(400).json({error: 'failed field check: '+fieldCheck});
        
        const apiKeyExists = await req.knex('api_keys').select(['id']).where('id', api_key_id);
        if (!apiKeyExists.length) return res.status(400).json({error: 'api key with id '+api_key_id+' doesnt exist'});

        await req.knex('api_keys').where({id: api_key_id}).delete();

        res.json(await getApiKeys(req.knex));
    }catch(e){
        console.error('ERROR POST /api_keys/delete', req.body, e);
        return res.status(400).json({error: 'error'});
    }
});
