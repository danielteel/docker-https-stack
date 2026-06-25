const express = require("express");
const { authenticate } = require("../common/accessToken");
const { listWssDevices, sendColorToWssDevice } = require("../wssDeviceWebSocket");

const router = express.Router();
module.exports = router;

router.get("/list", [authenticate.bind(null, "member")], (req, res) => {
    res.json(listWssDevices());
});

router.post("/color", [authenticate.bind(null, "member")], (req, res) => {
    const { deviceId, color } = req.body || {};
    const result = sendColorToWssDevice(deviceId, color);

    if (!result.ok) {
        return res.status(400).json({ error: result.error });
    }

    return res.json({ ok: true });
});
