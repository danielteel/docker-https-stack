const express = require('express');
const cors = require('cors');
const helmet = require("helmet");
const cookieparser = require("cookie-parser");
const { connect } = require('./database');
const {createDeviceServer} = require('./newDeviceServer.js');
const {createPlainDeviceServer} = require('./plainDeviceServer.js');

const { initAccessToken } = require('./common/accessToken');

const app = express();
app.set('trust proxy', true);

//Logging
app.use((req, res, next) => {console.log(req.method, req.originalUrl, req.ip); next();});

app.use(cors({ origin: ['http://' + process.env.DOMAIN], credentials: true }));

app.use(helmet());
app.use(cookieparser());
app.use(express.json());

app.use('/api/devices', require('./routes/devices'));
app.use('/api/user', require('./routes/user'));
app.use('/api/manage', require('./routes/manage'));


const deviceServer=createDeviceServer();
const plainDeviceServer=createPlainDeviceServer();

const knexConfig = require('./knexfile').production;

connect(knexConfig, async (knex) => {
    console.log('database connected');

    if (await knex.migrate.currentVersion() === 'none') {
        await knex.migrate.latest();
        await knex.seed.run();
        console.log("Initial migration and seed completed");
    }else{
        console.log("Database already migrated and seeded");
    }
    await initAccessToken(knex);

}).catch(err=>{
    console.error(err);
})


module.exports = { app, deviceServer, plainDeviceServer };