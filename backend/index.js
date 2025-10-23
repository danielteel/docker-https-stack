const http = require('http');
const { WebSocketServer } = require('ws');

const {app} = require('./app.js');
const {DeviceServer} = require('./deviceServer.js');

const apiPort = process.env.API_PORT || 4001;
const devicePort = process.env.DEVICE_PORT || 4004;


const server = http.createServer(app);

const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (ws, req) => {
  console.log('✅ New WebSocket connection from', req.socket.remoteAddress);
  ws.send('Hello from shared WebSocket server!');
  ws.on('message', (message) => {
    console.log('📩 Received:', message.toString());
    ws.send(`Echo: ${message}`);
  });
  ws.on('close', () => {
    console.log('❌ WebSocket disconnected');
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
