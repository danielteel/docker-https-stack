const express = require('express');
const {authenticate} = require('../common/accessToken');
const { needKnex } = require('../database');
const {callOmlet, relayOmletResponse, getJsonBody} = require('../integrations/coop');


const router = express.Router();
module.exports = router;

function pathPart(value){
    return encodeURIComponent(String(value));
}

router.get('/device', [needKnex, authenticate.bind(null, 'member')], async (req, res) => {
    try {
        return await relayOmletResponse(res, await callOmlet(req.knex, '/device', {query: req.query}));
    }catch(e){
        console.error('ERROR GET /coop/device', req.body, e);
        return res.status(400).json({error: 'error'});
    }
});

router.get('/device/:deviceId', [needKnex, authenticate.bind(null, 'member')], async (req, res) => {
    try {
        const path = '/device/'+pathPart(req.params.deviceId);
        return await relayOmletResponse(res, await callOmlet(req.knex, path, {query: req.query}));
    }catch(e){
        console.error('ERROR GET /coop/device/:deviceId', req.body, e);
        return res.status(400).json({error: 'error'});
    }
});

router.patch('/device/:deviceId', [needKnex, authenticate.bind(null, 'admin')], async (req, res) => {
    try {
        const path = '/device/'+pathPart(req.params.deviceId);
        return await relayOmletResponse(res, await callOmlet(req.knex, path, {method: 'PATCH', body: getJsonBody(req), query: req.query}));
    }catch(e){
        console.error('ERROR PATCH /coop/device/:deviceId', req.body, e);
        return res.status(400).json({error: 'error'});
    }
});

router.post('/device/:deviceId/action/:action', [needKnex, authenticate.bind(null, 'member')], async (req, res) => {
    try {
        const path = '/device/'+pathPart(req.params.deviceId)+'/action/'+pathPart(req.params.action);
        return await relayOmletResponse(res, await callOmlet(req.knex, path, {method: 'POST', body: getJsonBody(req), query: req.query}));
    }catch(e){
        console.error('ERROR POST /coop/device/:deviceId/action/:action', req.body, e);
        return res.status(400).json({error: 'error'});
    }
});

router.get('/device/:deviceId/configuration', [needKnex, authenticate.bind(null, 'member')], async (req, res) => {
    try {
        const path = '/device/'+pathPart(req.params.deviceId)+'/configuration';
        return await relayOmletResponse(res, await callOmlet(req.knex, path, {query: req.query}));
    }catch(e){
        console.error('ERROR GET /coop/device/:deviceId/configuration', req.body, e);
        return res.status(400).json({error: 'error'});
    }
});

router.patch('/device/:deviceId/configuration', [needKnex, authenticate.bind(null, 'admin')], async (req, res) => {
    try {
        const path = '/device/'+pathPart(req.params.deviceId)+'/configuration';
        return await relayOmletResponse(res, await callOmlet(req.knex, path, {method: 'PATCH', body: getJsonBody(req), query: req.query}));
    }catch(e){
        console.error('ERROR PATCH /coop/device/:deviceId/configuration', req.body, e);
        return res.status(400).json({error: 'error'});
    }
});

router.get('/events', [needKnex, authenticate.bind(null, 'member')], async (req, res) => {
    try {
        return await relayOmletResponse(res, await callOmlet(req.knex, '/events', {query: req.query}));
    }catch(e){
        console.error('ERROR GET /coop/events', req.body, e);
        return res.status(400).json({error: 'error'});
    }
});
