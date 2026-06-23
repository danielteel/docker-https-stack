const express = require('express');
const {authenticate} = require('../common/accessToken');
const {verifyFields} = require('../common/common');
const {getKasaStatus, setKasaStatus} = require('../integrations/kasa');

const router = express.Router();
module.exports = router;

function slugify(value, fallback) {
    const slug = String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return slug || fallback;
}

function getConfiguredPlugs() {
    const plugs = [];

    if (process.env.KASA_PLUGS) {
        const parsed = JSON.parse(process.env.KASA_PLUGS);
        if (!Array.isArray(parsed)) throw new Error('KASA_PLUGS must be a JSON array');

        parsed.forEach((plug, index) => {
            if (!plug || typeof plug !== 'object') return;
            const name = String(plug.name || plug.id || `Plug ${index + 1}`).trim();
            const ip = String(plug.ip || plug.ipAddress || '').trim();
            if (!ip) return;
            plugs.push({
                id: slugify(plug.id || name, `plug-${index + 1}`),
                name,
                ip,
            });
        });
    }

    let plugNumber = 1;
    while (process.env[`KASA_PLUG${plugNumber}_IP`] || process.env[`KASA_PLUG${plugNumber}_NAME`]) {
        const name = String(process.env[`KASA_PLUG${plugNumber}_NAME`] || `Plug ${plugNumber}`).trim();
        const ip = String(process.env[`KASA_PLUG${plugNumber}_IP`] || '').trim();
        if (ip) {
            plugs.push({
                id: slugify(process.env[`KASA_PLUG${plugNumber}_ID`] || name, `plug-${plugNumber}`),
                name,
                ip,
            });
        }
        plugNumber += 1;
    }

    const seen = new Set();
    return plugs.filter(plug => {
        if (seen.has(plug.id)) return false;
        seen.add(plug.id);
        return true;
    });
}

function publicPlug(plug, state) {
    return {
        id: plug.id,
        name: plug.name,
        state,
    };
}

async function getPlugStates() {
    const plugs = getConfiguredPlugs();
    return Promise.all(plugs.map(async plug => publicPlug(plug, await getKasaStatus(plug.ip))));
}

function findPlug(plugId) {
    return getConfiguredPlugs().find(plug => plug.id === plugId);
}

router.get('/plugs', [authenticate.bind(null, 'member')], async (req, res) => {
    try {
        return res.json(await getPlugStates());
    } catch (e) {
        console.error('ERROR GET /kasa/plugs', e);
        return res.status(400).json({error: 'error'});
    }
});

router.post('/plugs/:plugId/state', [authenticate.bind(null, 'admin')], async (req, res) => {
    try {
        const [fieldCheck, on] = verifyFields(req.body, ['on:boolean']);
        if (fieldCheck) return res.status(400).json({error: 'failed field check: '+fieldCheck});

        const plug = findPlug(req.params.plugId);
        if (!plug) return res.status(404).json({error: 'unknown plug'});

        const state = await setKasaStatus(plug.ip, on);
        return res.json(publicPlug(plug, state));
    } catch (e) {
        console.error('ERROR POST /kasa/plugs/:plugId/state', req.params, req.body, e);
        return res.status(400).json({error: 'error'});
    }
});
