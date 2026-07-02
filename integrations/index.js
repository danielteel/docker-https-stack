const { createDesecPublisher } = require("./desec");
const { createPecronPublisher } = require("./pecron");
const { createRtspPublisher } = require("./rtsp");

const publishers = [
  createRtspPublisher(),
  createPecronPublisher(),
  createDesecPublisher(),
];

let stopping = false;

try {
  for (const publisher of publishers) {
    publisher.start();
  }
} catch (error) {
  console.error("Failed to start integrations:", error);
  stopPublishers();
  process.exitCode = 1;
}

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.once(signal, () => {
    console.log(`Received ${signal}; stopping integrations...`);
    stopPublishers();
    setTimeout(() => process.exit(0), 750).unref();
  });
}

process.once("beforeExit", stopPublishers);
process.once("exit", stopPublishers);

function stopPublishers() {
  if (stopping) return;
  stopping = true;

  for (const publisher of publishers) {
    try {
      publisher.stop();
    } catch (error) {
      console.error(`Failed to stop ${publisher.name} publisher:`, error);
    }
  }
}
