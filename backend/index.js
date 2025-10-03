const {app} = require('./app.js');
const {DeviceServer} = require('./deviceServer.js');

const apiPort = process.env.API_PORT || 4001;
const devicePort = process.env.DEVICE_PORT || 4004;


app.listen(apiPort, () => {
  console.log('App listening on '+apiPort)
});

const deviceServer=new DeviceServer(devicePort);


process.on('SIGTERM', ()=>{
  console.log('SIGTERM recieved, exiting process');
  process.exit(0);
});

module.exports = {deviceServer};