const http = require('http');
const { WebSocketServer } = require('ws');

const {app} = require('./app.js');
const {DeviceServer} = require('./deviceServer.js');

const cookieParser = require('cookie-parser');
const parseCookies = cookieParser();
const {manualAuthenticate} = require('./common/accessToken');

const apiPort = process.env.API_PORT || 4001;
const devicePort = process.env.DEVICE_PORT || 4004;



const server = http.createServer(app);

const wss = new WebSocketServer({ server, path: '/api/ws' });

wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection from', req.socket.remoteAddress);

    ws.isAlive = true;

    // Handle pong early so heartbeat always works
    ws.on('pong', () => {
        ws.isAlive = true;
        console.log('Pong from client');
    });

    parseCookies(req, {}, async () => {
        console.log('Parsed cookies:', req.cookies);

        const user = await manualAuthenticate('user', req.cookies);
        if (!user) {
            console.log('Authentication failed — closing WebSocket');
            return ws.close(1008, 'Authentication failed');
        }

        ws.user = user;

        // ✅ Start heartbeat only if authenticated
        ws.interval = setInterval(() => {
            if (!ws.isAlive) {
                console.log('Client unresponsive — terminating');
                return ws.terminate();
            }
            ws.isAlive = false;
            ws.ping();
        }, 30000);

        ws.on('close', () => {
            clearInterval(ws.interval);
            console.log('WebSocket disconnected');
        });

        ws.send(`✅ Welcome ${user.email}! Auth successful.`);

        ws.on('message', (msg) => {
            console.log(`📩 From ${user.email}:`, msg.toString());
            ws.send(`Echo: ${msg}`);
        });
    });
});



server.listen(apiPort, () => {
  console.log('App listening on '+apiPort)
});

const deviceServer=new DeviceServer(devicePort);


process.on('SIGTERM', ()=>{
  console.log('SIGTERM recieved, exiting process');
  process.exit(0);
});
