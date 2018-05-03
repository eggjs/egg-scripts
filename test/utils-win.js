'use strict';

const helper = require('../lib/helper');
const sleep = require('mz-modules/sleep');

exports.cleanup = function* (argv) {
  const pids = yield helper.findfindNodeProcessWin(argv);

  if (pids.length) {
    console.log(`cleanup: ${pids.length} to kill`);

    // master
    const mpid = pids.shift(); // master pid at first
    try {
      process.kill(mpid, '');
      console.log(`cleanup master ${mpid}`);
    } catch (err) {
      console.log(`cleanup ${mpid} got error ${err.code || err.message || err}`);
      if (err.code !== 'ESRCH') {
        throw err;
      }
    }

    // worker
    for (const pid of pids) {
      try {
        process.kill(pid, 'SIGKILL');
        console.log(`cleanup agent ${pid}`);
      } catch (err) {
        console.log(`cleanup ${pid} got error ${err.code || err.message || err}`);
        if (err.code !== 'ESRCH') {
          throw err;
        }
      }
    }

    yield sleep('5s');
  }
};
