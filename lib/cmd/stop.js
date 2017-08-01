'use strict';

const path = require('path');
const findProcess = require('find-process');
const Command = require('../command');

class StopCommand extends Command {

  constructor(rawArgv) {
    super(rawArgv);
    this.usage = 'Usage: egg-scripts stop [dir] [options]';
    this.serverBin = path.join(__dirname, '../start-cluster');

    this.options = {
      baseDir: {
        description: 'directory of application, default to `process.cwd()`',
        type: 'string',
      },
    };
  }

  get description() {
    return 'Stop server';
  }

  * run(context) {
    const { argv } = context;

    // egg-script stop
    // egg-script stop ./server
    // egg-script stop /opt/app
    let baseDir = argv._[0] || context.cwd;
    if (!path.isAbsolute(baseDir)) baseDir = path.join(context.cwd, baseDir);
    argv.baseDir = baseDir;

    this.logger.info(`Stopping egg application at ${baseDir}`);

    // node /Users/tz/Workspaces/eggjs/egg-scripts/lib/start-cluster {"title":"egg-server","workers":4,"port":7001,"baseDir":"/Users/tz/Workspaces/eggjs/test/showcase","framework":"/Users/tz/Workspaces/eggjs/test/showcase/node_modules/egg"}
    let pids = yield findProcess('name', 'node');
    pids = pids.filter(item => {
      return item.cmd.includes(this.serverBin) && item.cmd.includes(`"baseDir":"${baseDir}"`);
    }).map(x => x.pid);

    if (pids.length) {
      this.logger.info('Got master pid %j', pids);
      this.kill(pids);
    } else {
      this.logger.warn('can\'t detect any running egg process');
    }

    this.logger.info('Stopped');
  }

  kill(pids, signal) {
    pids.forEach(pid => {
      try {
        process.kill(pid, signal);
      } catch (err) { /* istanbul ignore next */
        if (err.code !== 'ESRCH') {
          throw err;
        }
      }
      /* istanbul ignore next */
      this.logger.error(`Killed ${pid} ${signal ? 'with ' + signal : ''}`);
    });
  }
}

module.exports = StopCommand;
