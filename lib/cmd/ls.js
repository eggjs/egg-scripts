'use strict';

const path = require('path');
const Command = require('../command');
const isWin = process.platform === 'win32';
const osRelated = {
  titlePrefix: isWin ? '\\"title\\":\\"' : '"title":"',
  appWorkerPath: isWin ? 'egg-cluster\\lib\\app_worker.js' : 'egg-cluster/lib/app_worker.js',
  agentWorkerPath: isWin ? 'egg-cluster\\lib\\agent_worker.js' : 'egg-cluster/lib/agent_worker.js',
};

class LsCommand extends Command {

  constructor(rawArgv) {
    super(rawArgv);
    this.usage = 'Usage: egg-scripts ls [--title=example]';
    this.serverBin = path.join(__dirname, '../start-cluster');
    this.options = {
      title: {
        description: 'process title description, use for find app',
        type: 'string',
      },
    };
  }

  get description() {
    return 'ls app';
  }

  * run(context) {
    const { argv } = context;
    const that = this;
    this.logger.info(`list egg application ${argv.title ? `with --title=${argv.title}` : ''}`);

    const processList = yield this.helper.findNodeProcessWithPpid(item => {
      const cmd = item.cmd;

      item.isMaster = false;
      item.isAgent = false;
      item.isWorker = false;

      let tileFlag = true;
      if (argv.title) {
        tileFlag = cmd.includes(argv.title);
      }

      if (cmd.includes(osRelated.appWorkerPath) && tileFlag) {
        item.isWorker = true;
        item.mode = 'Worker';
        return true;
      }

      if (cmd.includes('start-cluster') && tileFlag) {
        item.isMaster = true;
        item.mode = 'Master';
        return true;
      }

      if (cmd.includes(osRelated.agentWorkerPath) && tileFlag) {
        item.isAgent = true;
        item.mode = 'Agent';
        return true;
      }
      return false;
    });

    this.helper.getMonitorData(processList, (err, list) => {
      if (err) {
        console.log('getMonitorData error', err);
        that.exit(1);
      }
      this.helper.dispAsTable(list);
      that.exit(0);
    });
  }
}

module.exports = LsCommand;
