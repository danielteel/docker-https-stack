const express = require('express');
const {authenticate, isAtLeastRanked} = require('../common/accessToken');
const { needKnex } = require('../database');
const {getHash, verifyFields, generateVerificationCode, isLegalPassword, isHexadecimal} = require('../common/common');
const fetch = require('node-fetch');

const {stackVertically} = require('../common/images');

const {getDeviceServer}=require('../index.js');

const router = express.Router();
module.exports = router;

async function getAndValidateDevices(knex, userRole, wantDirectObject=false){
    let devices;
    const isAtLeastAdmin = isAtLeastRanked(userRole, 'admin');
    if (isAtLeastAdmin){
        devices = await knex('devices').select(['id as device_id', 'name', 'encro_key', 'log_items', 'actions']);
    }else{
        devices = await knex('devices').select(['id as device_id', 'name', 'log_items', 'actions']);
    }
    if (devices.length===0) return [];


    const connectedDevices=getDeviceServer().getDevices();

    for (const device of devices){
        device.connected=[];

        for (const connectedDevice of connectedDevices){
            if (connectedDevice.name===device.name){
                device.connected.push(connectedDevice);
            }
        }
        if (!wantDirectObject){
            device.connected=device.connected.length;
        }
    }

    return devices;
}

async function getADevice(knex, userRole, deviceId, wantDirectObject=false){
    let device;
    const isAtLeastAdmin = isAtLeastRanked(userRole, 'admin');
    if (isAtLeastAdmin){
        device = await knex('devices').select(['id as device_id', 'name', 'encro_key', 'log_items', 'actions']).where('id', deviceId).first();
    }else{
        device = await knex('devices').select(['id as device_id', 'name', 'log_items', 'actions']).where('id', deviceId).first();
    }
    if (!device) return null;
    
    device.connected=[];
    
    for (const connectedDevice of getDeviceServer().getDevices()){
        if (connectedDevice.name===device.name){
            device.connected.push(connectedDevice);
        }
    }

    if (!wantDirectObject){
        device.connected=device.connected.length;
    }
    return device;
}

router.get('/list', [needKnex, authenticate.bind(null, 'member')], async (req, res) => {
    try {
        res.json(await getAndValidateDevices(req.knex, req.user.role));
    }catch(e){
        console.error('ERROR GET /devices/list', req.body, e);
        return res.status(400).json({error: 'error'});
    }
});

router.get('/image/:device_id', [needKnex, authenticate.bind(null, 'member')], async (req, res) => {
    try {
        const device_id = Number(req.params.device_id);

        const device=await getADevice(req.knex, req.user.role, device_id, true);


        if (device?.connected?.length===1){//TODO: REMOVE, ONLY FOR TESTING SHARP LIBRARY
            res.writeHead(200, { 'content-type': 'image/jpeg' });
            return res.end(await stackVertically([device.connected[0].image, device.connected[0].image]), 'binary');
        }


        if (device?.connected?.length===1){
            if (device.connected[0].image){
                res.writeHead(200, { 'content-type': 'image/jpeg' });
                return res.end(device.connected[0].image, 'binary');
            }else{
                return res.status(400).json({error: 'device hasnt sent an image yet'});
            }
        }else if (device?.connected?.length>1){
            //stack images vertically
            const buffers = [];
            for (const connectedDevice of device.connected){
                if (connectedDevice.image) buffers.push(connectedDevice.image);
            }
            res.writeHead(200, { 'content-type': 'image/jpeg' });
            return res.end(await stackVertically(buffers), 'binary');
        }

        return res.status(400).json({error: 'invalid device id or its not connected'});

    }catch(e){
        console.error('ERROR GET /devices/image', req.body, e);
        return res.status(400).json({error: 'error'});
    }
});


//Times should be in UTC
router.get('/log/:device_id/:start_time/:end_time', [needKnex, authenticate.bind(null, 'member')], async (req, res) => {
    try {
        let [fieldCheck, deviceId] = verifyFields(req.params, ['device_id:string']);
        if (fieldCheck) return res.status(400).json({error: 'failed field check: '+fieldCheck});
        
        deviceId=Number(deviceId);
        const startTime=req.params.start_time;
        const endTime=req.params.end_time;

        //check if start time and end time is valid
        if (isNaN(Date.parse(startTime))) return res.status(400).json({error: 'invalid start time'});
        if (isNaN(Date.parse(endTime))) return res.status(400).json({error: 'invalid end time'});


        const log = await req.knex('device_logs').select(['time', 'data']).where('device_id', deviceId).andWhere('time', '>=', startTime).andWhere('time', '<=', endTime).orderBy('time', 'asc');

        res.json(log);
    }catch(e){
        console.error('ERROR GET /log', req.params, e);
        return res.status(400).json({error: 'error'});
    }
});

router.post('/add', [needKnex, authenticate.bind(null, 'admin')], async (req, res)=>{
    try {
        const fields = [
            'name:string:*:t',
            'encro_key:string:*:t',
        ]
        let [fieldCheck, name, encro_key] = verifyFields(req.body, fields);
        if (!fieldCheck){
            if (name==='') fieldCheck+='name cannot be empty. ';
            if (typeof encro_key==='string' && encro_key.length!=64) fieldCheck+='encro_key length needs to be 64 hexadecimal characters. ';
            if (!isHexadecimal(encro_key)) fieldCheck+='encro_key needs to be hexadecimal character. ';
        }
        if (fieldCheck) return res.status(400).json({error: 'failed field check: '+fieldCheck});

        const deviceExists = await req.knex('devices').select(['name']).where('name', name);
        if (deviceExists.length) return res.status(400).json({error: 'device with name '+name+' already exists'});

        await req.knex('devices').insert({name, encro_key});

        res.json(await getAndValidateDevices(req.knex, req.user.role));
    }catch(e){
        console.error('ERROR POST /devices/add', req.body, e);
        return res.status(400).json({error: 'error'});
    }
});

router.post('/update', [needKnex, authenticate.bind(null, 'admin')], async (req, res)=>{
    try {
        const fields = [
            'device_id:number',
            'name:string:*:t',
            'encro_key:string:*:t'
        ]
        let [fieldCheck, device_id, name, encro_key] = verifyFields(req.body, fields);
        if (!fieldCheck){
            if (name==='') fieldCheck+='name cannot be empty. ';
            if (typeof encro_key==='string' && encro_key.length!=64) fieldCheck+='encro_key length needs to be 64 hexadecimal characters. ';
            if (!isHexadecimal(encro_key)) fieldCheck+='encro_key needs to be hexadecimal character. ';
        }
        if (fieldCheck) return res.status(400).json({error: 'failed field check: '+fieldCheck});

        const deviceExists = await req.knex('devices').select(['id as device_id', 'name']).where('name', name);
        if (deviceExists.length){
            if (deviceExists[0].device_id!=device_id) return res.status(400).json({error: 'device with name '+name+' already exists'});
        }

        await req.knex('devices').update({name, encro_key}).where({id: device_id});

        getDeviceServer().disconnectDeviceId(device_id);


        res.json(await getAndValidateDevices(req.knex, req.user.role));
    }catch(e){
        console.error('ERROR POST /devices/update', req.body, e);
        return res.status(400).json({error: 'error'});
    }
});

router.post('/delete', [needKnex, authenticate.bind(null, 'admin')], async (req, res)=>{
    try {
        const [fieldCheck, device_id] = verifyFields(req.body, ['device_id:number']);
        if (fieldCheck) return res.status(400).json({error: 'failed field check: '+fieldCheck});
        
        const deviceExists = await req.knex('devices').select(['id']).where('id', device_id);
        if (!deviceExists.length) return res.status(400).json({error: 'device with id '+device_id+' doesnt exist'});


        await req.knex('devices').where({id: device_id}).delete();

        getDeviceServer().disconnectDeviceId(device_id);

        res.json(await getAndValidateDevices(req.knex, req.user.role));
    }catch(e){
        console.error('ERROR POST /devices/delete', req.body, e);
        return res.status(400).json({error: 'error'});
    }
});


router.post('/action', [needKnex, authenticate.bind(null, 'member')], async (req, res) => {
    try {
        const fields = [
            'device_id:number',
            'action:string:*:lt',
            'data:any:?'
        ]
        let [fieldCheck, device_id, action, data] = verifyFields(req.body, fields);
        if (fieldCheck) return res.status(400).json({error: 'failed field check: '+fieldCheck});

        const device = await getADevice(req.knex, req.user.role, device_id, true);

        if (device.devio){
            if (device.devio.sendAction(action, data)){
                return res.status(200).end();
            }
        }
    
        return res.status(400).json({error: 'failed to send action, either device not connected, or invalid action command'});
    }catch(e){
        console.error('ERROR POST /devices/action', req.body, e);
        return res.status(400).json({error: 'error'});
    }
});