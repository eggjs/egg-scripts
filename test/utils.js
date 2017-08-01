'use strict';

const findProcess = require('find-process');
const sleep = require('mz-modules/sleep');

exports.cleanup = function* (baseDir) {
  let processList = yield findProcess('name', 'node');
  processList = processList.filter(x => x.cmd.includes(`"baseDir":"${baseDir}"`));

  if (processList.length) {
    console.log(`cleanup: ${processList.length} to kill`);
    for (const item of processList) {
      const pid = item.pid;
      const cmd = item.cmd;
      let type = 'unknown: ' + cmd;
      if (cmd.includes('start-cluster')) {
        type = 'master';
      } else if (cmd.includes('app_worker.js')) {
        type = 'worker';
      } else if (cmd.includes('agent_worker.js')) {
        type = 'agent';
      }

      try {
        process.kill(pid, 'SIGKILL');
        console.log(`cleanup ${type} ${pid}`);
      } catch (err) {
        console.log(`cleanup ${type} ${pid} got error ${err.code || err.message}`);
        if (err.code !== 'ESRCH') {
          throw err;
        }
      }
    }

    yield sleep('5s');
  }
};
