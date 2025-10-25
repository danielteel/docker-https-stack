const http = require('http');

const {app} = require('./app.js');

const {DeviceServer} = require('./deviceServer.js');
const { getWebSocketServer } = require('./deviceWebSocket.js');


const apiPort = process.env.API_PORT || 4001;
const devicePort = process.env.DEVICE_PORT || 4004;


const deviceServer=new DeviceServer(devicePort);

const server = http.createServer(app);
const webSocketServer = getWebSocketServer(server, '/api/ws', deviceServer);

server.listen(apiPort, () => {
  console.log('App listening on '+apiPort)
});



process.on('SIGTERM', ()=>{
  console.log('SIGTERM recieved, exiting process');
  process.exit(0);
});
