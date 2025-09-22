const apiPort = process.env.API_PORT || 4001;
const devicePort = process.env.DEVICE_PORT || 4004;

const {app, deviceServer} = require('./app.js');


app.listen(apiPort, () => {
  console.log('App listening on '+apiPort)
});


deviceServer.listen(devicePort, function() {
  console.log(`Device server listening on port ${devicePort}`);
});


process.on('SIGTERM', ()=>{
  console.log('SIGTERM recieved, exiting process');
  process.exit(0);
});