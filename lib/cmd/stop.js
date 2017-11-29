'use strict';

const path = require('path');
const sleep = require('mz-modules/sleep');
const Command = require('../command');

class StopCommand extends Command {

  constructor(rawArgv) {
    super(rawArgv);
    this.usage = 'Usage: egg-scripts stop [--title=example]';
    this.serverBin = path.join(__dirname, '../start-cluster');
    this.options = {
      title: {
        description: 'process title description, use for kill grep',
        type: 'string',
      },
    };
  }

  get description() {
    return 'Stop server';
  }

  * run(context) {
    /* istanbul ignore next */
    if (process.platform === 'win32') {
      this.logger.warn('Windows is not supported, try to kill master process which command contains `start-cluster` or `--type=egg-server` yourself, good luck.');
      process.exit(0);
    }

    const { argv } = context;

    this.logger.info(`stopping egg application ${argv.title ? `with --title=${argv.title}` : ''}`);

    // node /Users/tz/Workspaces/eggjs/egg-scripts/lib/start-cluster {"title":"egg-server","workers":4,"port":7001,"baseDir":"/Users/tz/Workspaces/eggjs/test/showcase","framework":"/Users/tz/Workspaces/eggjs/test/showcase/node_modules/egg"}
    let processList = yield this.helper.findNodeProcess(item => {
      const cmd = item.cmd;
      return argv.title ?
        cmd.includes('start-cluster') && cmd.includes(`"title":"${argv.title}"`) :
        cmd.includes('start-cluster');
    });
    let pids = processList.map(x => x.pid);

    if (pids.length) {
      this.logger.info('got master pid %j', pids);
      this.helper.kill(pids);
    } else {
      this.logger.warn('can\'t detect any running egg process');
    }

    // wait for 5s to confirm whether any worker process did not kill by master
    yield sleep('5s');

    // node --debug-port=5856 /Users/tz/Workspaces/eggjs/test/showcase/node_modules/_egg-cluster@1.8.0@egg-cluster/lib/agent_worker.js {"framework":"/Users/tz/Workspaces/eggjs/test/showcase/node_modules/egg","baseDir":"/Users/tz/Workspaces/eggjs/test/showcase","port":7001,"workers":2,"plugins":null,"https":false,"key":"","cert":"","title":"egg-server","clusterPort":52406}
    // node /Users/tz/Workspaces/eggjs/test/showcase/node_modules/_egg-cluster@1.8.0@egg-cluster/lib/app_worker.js {"framework":"/Users/tz/Workspaces/eggjs/test/showcase/node_modules/egg","baseDir":"/Users/tz/Workspaces/eggjs/test/showcase","port":7001,"workers":2,"plugins":null,"https":false,"key":"","cert":"","title":"egg-server","clusterPort":52406}
    processList = yield this.helper.findNodeProcess(item => {
      const cmd = item.cmd;
      return argv.title ?
        (cmd.includes('egg-cluster/lib/app_worker.js') || cmd.includes('egg-cluster/lib/agent_worker.js')) && cmd.includes(`"title":"${argv.title}"`) :
        (cmd.includes('egg-cluster/lib/app_worker.js') || cmd.includes('egg-cluster/lib/agent_worker.js'));
    });
    pids = processList.map(x => x.pid);

    if (pids.length) {
      this.logger.info('got worker/agent pids %j that is not killed by master', pids);
      this.helper.kill(pids, 'SIGKILL');
    }

    this.logger.info('stopped');
  }
}

module.exports = StopCommand;
