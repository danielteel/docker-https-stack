const http = require('http');
const { WebSocketServer } = require('ws');

const {app} = require('./app.js');
const {DeviceServer} = require('./deviceServer.js');

const cookieParser = require('cookie-parser');
const parseCookies = cookieParser();
const {manualAuthenticate} = require('../common/accessToken');

const apiPort = process.env.API_PORT || 4001;
const devicePort = process.env.DEVICE_PORT || 4004;



const server = http.createServer(app);

const wss = new WebSocketServer({ server, path: '/api/ws' });
wss.on('connection', (ws, req) => {
    ws.interval = null;
    ws.isAlive=true;

    ws.interval = setInterval(() => {
        if (ws.isAlive === false) {
            console.log('No pong received, terminating WebSocket');
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
    }, 30000);

    ws.on('close', () => {
        clearInterval(ws.interval);
        console.log('WebSocket disconnected');
    });
    
    console.log('New WebSocket connection from', req.socket.remoteAddress);

    parseCookies(req, {}, async () => {
        console.log('Parsed cookies:', req.cookies);
        const user = await manualAuthenticate('user', req.cookies);
        if (!user) {
            console.log('Authentication failed, closing WebSocket');
            ws.close(1008, 'Authentication failed');
            return;
        }
        ws.send('Authentication successful. Welcome, ' + user.email + '!');

        ws.on('pong', () => {
            ws.isAlive=true;
            console.log('Pong received from client');
        });
        ws.on('message', (message) => {
            console.log('📩 Received:', message.toString());
            ws.send(`Echo: ${message}`);
        });
    })
});



server.listen(apiPort, () => {
  console.log('App listening on '+apiPort)
});

const deviceServer=new DeviceServer(devicePort);


process.on('SIGTERM', ()=>{
  console.log('SIGTERM recieved, exiting process');
  process.exit(0);
});
