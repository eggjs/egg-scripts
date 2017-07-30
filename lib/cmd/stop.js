'use strict';

const sleep = require('mz-modules/sleep');
const path = require('path');
const Command = require('../command');

class StopCommand extends Command {

  constructor(rawArgv) {
    super(rawArgv);
    this.usage = 'Usage: egg-scripts stop [dir] [options]';
    this.serverBin = path.join(__dirname, '../start-cluster');

    this.parserOptions = {
      removeAlias: true,
      removeCamelCase: true,
      execArgv: true,
    };

    this.options = {
      baseDir: {
        description: 'directory of application, default to `process.cwd()`',
        type: 'string',
      },
    };
  }

  * run(context) {
    const { argv } = context;

    if (!argv.baseDir) argv.baseDir = argv._[0] || /* istanbul ignore next */ '';
    if (!path.isAbsolute(argv.baseDir)) argv.baseDir = path.join(context.cwd, argv.baseDir);
    const baseDir = argv.baseDir;

    this.logger.info(`Stopping egg application at ${baseDir}`);

    let pids = yield this.getRunningMasterPid(baseDir);
    if (pids.length) {
      this.kill(pids);
    } else {
      this.logger.warn('can\'t detect any running egg process');
    }

    // wait for 5s to confirm whether any worker process did not kill by master
    yield sleep('5s');
    pids = yield this.getRunningPid(baseDir);
    this.kill(pids, 'SIGKILL');
    this.logger.info('Stopped');
  }

  get description() {
    return 'Stop server';
  }

  * getRunningMasterPid(baseDir) {
    const pids = yield this.getPids(line => {
      console.log(line)
      return line.includes(this.serverBin) && line.includes(`"baseDir":"${baseDir}"`);
      // return line.includes('--framework') && line.includes(`--baseDir ${baseDir}`);
    });
    if (pids.length) this.logger.info('Got master pid %j', pids);
    return pids;
  }

  // get worker/agent pids
  * getRunningPid(baseDir) {
    const pids = yield this.getPids(line => {
      return line.includes('"framework":') && line.includes(`"baseDir":"${baseDir}"`);
    });
    if (pids.length) this.logger.info('Got worker/agent pids %j that is not killed by master', pids);
    return pids;
  }

  * getPids(filterFn) {
    const command = 'ps -eo "pid,command"';
    const stdout = yield this.helper.exec(command);
    if (stdout) {
      const pids = stdout.split('\n').filter(line => {
        return !!line && !line.includes('/bin/sh') && (filterFn(line) || !filterFn);
      }).map(k => k.split(/\s+/)[ 0 ]);
      return pids;
    }
    return [];
  }

  kill(pids, signal) {
    [].concat(pids).forEach(pid => {
      // force kill
      try {
        process.kill(pid, signal);
      } catch (err) {
        if (err.code !== 'ESRCH') {
          throw err;
        }
      }
      this.logger.error(`Killed ${pid} ${signal ? 'with ' + signal : ''}`);
    });
  }
}

module.exports = StopCommand;
