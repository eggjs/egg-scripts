'use strict';

const path = require('path');
const findProcess = require('find-process');
const sleep = require('mz-modules/sleep');
const Command = require('../command');

class StopCommand extends Command {

  constructor(rawArgv) {
    super(rawArgv);
    this.usage = 'Usage: egg-scripts stop [dir]';
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

    // wait for 5s to confirm whether any worker process did not kill by master
    yield sleep('5s');

    // node --debug-port=5856 /Users/tz/Workspaces/eggjs/test/showcase/node_modules/_egg-cluster@1.8.0@egg-cluster/lib/agent_worker.js {"framework":"/Users/tz/Workspaces/eggjs/test/showcase/node_modules/egg","baseDir":"/Users/tz/Workspaces/eggjs/test/showcase","port":7001,"workers":2,"plugins":null,"https":false,"key":"","cert":"","title":"egg-server","clusterPort":52406}
    // node /Users/tz/Workspaces/eggjs/test/showcase/node_modules/_egg-cluster@1.8.0@egg-cluster/lib/app_worker.js {"framework":"/Users/tz/Workspaces/eggjs/test/showcase/node_modules/egg","baseDir":"/Users/tz/Workspaces/eggjs/test/showcase","port":7001,"workers":2,"plugins":null,"https":false,"key":"","cert":"","title":"egg-server","clusterPort":52406}
    pids = yield findProcess('name', 'node');
    pids = pids.filter(item => {
      const cmd = item.cmd;
      return cmd.includes(`"baseDir":"${baseDir}"`) && (cmd.includes('app_worker.js') || cmd.includes('agent_worker.js'));
    }).map(x => x.pid);

    if (pids.length) {
      this.logger.info('Got worker/agent pids %j that is not killed by master', pids);
      this.kill(pids);
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
