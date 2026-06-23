const express = require('express');
const {authenticate} = require('../common/accessToken');
const {verifyFields} = require('../common/common');
const {getPecronStatus, setPecronAcStatus, setPecronDcStatus} = require('../integrations/pecron');

const router = express.Router();
module.exports = router;

function getPecronConfig() {
    return {
        email: process.env.PECRON_EMAIL,
        password: process.env.PECRON_PASSWORD,
        region: process.env.PECRON_REGION || 'US',
        device: process.env.PECRON_DEVICE,
    };
}

function missingConfig(config) {
    const missing = [];
    if (!config.email) missing.push('PECRON_EMAIL');
    if (!config.password) missing.push('PECRON_PASSWORD');
    return missing;
}

function publicStatus(status) {
    return {
        deviceName: status.device?.deviceName || 'Pecron',
        productName: status.device?.productName || '',
        online: !!status.device?.online,
        batteryPercentage: status.batteryPercentage,
        temperatureFahrenheit: status.temperatureFahrenheit,
        totalInputPower: status.totalInputPower,
        acInputPower: status.acInputPower,
        dcInputPower: status.dcInputPower,
        totalOutputPower: status.totalOutputPower,
        acOutputPower: status.acOutputPower,
        dcOutputPower: status.dcOutputPower,
        acOutputVoltage: status.acOutputVoltage,
        acOutputFrequency: status.acOutputFrequency,
        upsMode: status.upsMode,
        acOn: status.acOn,
        dcOn: status.dcOn,
    };
}

async function getConfiguredStatus() {
    const config = getPecronConfig();
    const missing = missingConfig(config);
    if (missing.length) {
        const error = new Error('Pecron is missing required env vars: '+missing.join(', '));
        error.status = 400;
        throw error;
    }

    return publicStatus(await getPecronStatus(config));
}

router.get('/status', [authenticate.bind(null, 'member')], async (req, res) => {
    try {
        return res.json(await getConfiguredStatus());
    } catch (e) {
        console.error('ERROR GET /pecron/status', e);
        return res.status(e.status || 400).json({error: e.message || 'error'});
    }
});

router.post('/ac', [authenticate.bind(null, 'admin')], async (req, res) => {
    try {
        const [fieldCheck, on] = verifyFields(req.body, ['on:boolean']);
        if (fieldCheck) return res.status(400).json({error: 'failed field check: '+fieldCheck});

        const config = getPecronConfig();
        const missing = missingConfig(config);
        if (missing.length) return res.status(400).json({error: 'Pecron is missing required env vars: '+missing.join(', ')});

        const result = await setPecronAcStatus(config, on);
        if (!result.success) return res.status(400).json({error: result.errorMessage || 'failed to update AC status'});

        return res.json(await getConfiguredStatus());
    } catch (e) {
        console.error('ERROR POST /pecron/ac', req.body, e);
        return res.status(400).json({error: e.message || 'error'});
    }
});

router.post('/dc', [authenticate.bind(null, 'admin')], async (req, res) => {
    try {
        const [fieldCheck, on] = verifyFields(req.body, ['on:boolean']);
        if (fieldCheck) return res.status(400).json({error: 'failed field check: '+fieldCheck});

        const config = getPecronConfig();
        const missing = missingConfig(config);
        if (missing.length) return res.status(400).json({error: 'Pecron is missing required env vars: '+missing.join(', ')});

        const result = await setPecronDcStatus(config, on);
        if (!result.success) return res.status(400).json({error: result.errorMessage || 'failed to update DC status'});

        return res.json(await getConfiguredStatus());
    } catch (e) {
        console.error('ERROR POST /pecron/dc', req.body, e);
        return res.status(400).json({error: e.message || 'error'});
    }
});
