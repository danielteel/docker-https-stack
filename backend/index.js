const http = require('http');
const { WebSocketServer } = require('ws');

const {app} = require('./app.js');
const {DeviceServer} = require('./deviceServer.js');

const apiPort = process.env.API_PORT || 4001;
const devicePort = process.env.DEVICE_PORT || 4004;


const server = http.createServer(app);

const wss = new WebSocketServer({ server, path: '/api/ws' });
wss.on('connection', (ws, req) => {
  console.log('✅ New WebSocket connection from', req.socket.remoteAddress);
  console.log(req.cookies);
  const interval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping(); // Send a ping frame
    }
  }, 30000); // Ping every 30 seconds

  ws.on('pong', () => {
    console.log('Pong received from client');
  });

  ws.send('Hello from shared WebSocket server!');
  ws.on('message', (message) => {
    console.log('📩 Received:', message.toString());
    ws.send(`Echo: ${message}`);
  });
  ws.on('close', () => {
    clearInterval(interval);
    console.log('❌ WebSocket disconnected');
  });
  ws.on('upgrade', (req) => {
    console.log('🔄 WebSocket upgrade');
    console.log(req.cookies);
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
