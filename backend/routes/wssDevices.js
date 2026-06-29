const express = require("express");
const { authenticate } = require("../common/accessToken");
const { listWssDevices } = require("../wssDeviceWebSocket");

const router = express.Router();
module.exports = router;

router.get("/list", [authenticate.bind(null, "member")], (req, res) => {
    res.json(listWssDevices());
});
