'use strict';

const sleep = require('mz-modules/sleep');
const path = require('path');
const Command = require('../command');

class StopCommand extends Command {

  * run(cwd, args) {
    // egg-scripts stop [baseDir]
    args = utils.parseArgv(args);
    const baseDir = path.resolve(process.env.PWD, args._[0] || '.');
    logger.info(`Stopping egg application at ${baseDir}`);

    let pids = yield this.getRunningMasterPid(baseDir);
    if (pids.length) {
      utils.kill(pids);
    } else {
      logger.warn('can\'t detect any running egg process');
    }

    // wait for 5s to confirm whether any worker process did not kill by master
    yield sleep(5000);
    pids = yield this.getRunningPid(baseDir);
    utils.kill(pids, 'SIGKILL');
    logger.info('Stopped');
  }

  help() {
    console.log('egg-scripts stop');
  }

  * getRunningMasterPid(baseDir) {
    const pids = yield utils.getPids(line => {
      return line.includes('--customEgg') && line.includes(`--baseDir ${baseDir}`);
    });
    if (pids.length) logger.info('Got master pid %j', pids);
    return pids;
  }

  // get worker/agent pids
  * getRunningPid(baseDir) {
    const pids = yield utils.getPids(line => {
      return line.includes('"customEgg":') && line.includes(`"baseDir":"${baseDir}"`);
    });
    if (pids.length) logger.info('Got worker/agent pids %j that is not killed by master', pids);
    return pids;
  }
}

module.exports = StopCommand;
