'use strict';

const findProcess = require('find-process');
const sleep = require('mz-modules/sleep');

exports.cleanup = function* (baseDir) {
  const processList = (yield findProcess('name', 'node')).filter(x => x.cmd.includes(`"baseDir":"${baseDir}"`));
  const pids = processList.map(x => x.pid);

  if (pids.length) {
    console.log('cleanup: %j', processList);
    for (const pid of pids) {
      try {
        process.kill(pid, 'SIGKILL');
      } catch (err) {
        if (err.code !== 'ESRCH') {
          throw err;
        }
      }
    }
    yield sleep('5s');
  }
};
