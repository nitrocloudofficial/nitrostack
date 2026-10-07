const { parentPort } = require('node:worker_threads');

parentPort.on('message', () => {
  // Stay alive without completing the task so the host watchdog has to terminate us.
});
