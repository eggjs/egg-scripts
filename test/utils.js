'use strict';

const helper = require('../lib/helper');
const sleep = require('mz-modules/sleep');
const isWin = process.platform === 'win32';

exports.cleanup = function* (baseDir) {
  const processList = yield helper.findNodeProcess(x => {
    const dir = isWin ? baseDir.replace(/\\/g, '\\\\') : baseDir;
    const prefix = isWin ? '\\"baseDir\\":\\"' : '"baseDir":"';
    return x.cmd.includes(`${prefix}${dir}`);
  });

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
        process.kill(pid, type === 'master' ? '' : 'SIGKILL');
        console.log(`cleanup ${type} ${pid}`);
      } catch (err) {
        console.log(`cleanup ${type} ${pid} got error ${err.code || err.message || err}`);
        if (err.code !== 'ESRCH') {
          throw err;
        }
      }
    }

    yield sleep('5s');
  }
};
