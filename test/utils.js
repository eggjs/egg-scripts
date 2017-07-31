'use strict';

const findProcess = require('find-process');
const sleep = require('mz-modules/sleep');

exports.cleanup = function* (baseDir) {
  const pids = (yield findProcess('name', 'node'))
    .filter(x => x.cmd.includes(`"baseDir":"${baseDir}"`))
    .map(x => x.pid);

  if (pids.length) {
    console.log('cleanup: %j', pids);
    for (const pid of pids) {
      try {
        process.kill(pid, 'SIGKILL');
      } catch (err) {
        if (err.code !== 'ESRCH') {
          throw err;
        }
      }
    }
    yield sleep(5000);
  }
};
