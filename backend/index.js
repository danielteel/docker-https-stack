const apiPort = process.env.API_PORT || 4001;
const devicePort = process.env.DEVICE_PORT || 4004;
const plainDevicePort = process.env.PLAIN_DEVICE_PORT || 4005;

const {app, deviceServer, plainDeviceServer} = require('./app.js');


app.listen(apiPort, () => {
  console.log('App listening on '+apiPort)
});


deviceServer.listen(devicePort, function() {
  console.log(`Device server listening on port ${devicePort}`);
});

plainDeviceServer.listen(plainDevicePort, function(){
  console.log(`Plain Device server listening on port ${plainDevicePort}`);
});

process.on('SIGTERM', ()=>{
  console.log('SIGTERM recieved, exiting process');
  process.exit(0);
});