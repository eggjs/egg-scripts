'use strict';

const path = require('path');
const os = require('os');
const spawn = require('child_process').spawn;
const mkdirp = require('mz-modules/mkdirp');
const homedir = require('node-homedir');
const Command = require('../command');
const utils = require('egg-utils');
const debug = require('debug')('egg-scripts:start');

class StartCommand extends Command {
  constructor(rawArgv) {
    super(rawArgv);
    this.usage = 'Usage: egg-scripts start [dir] [options]';
    this.serverBin = path.join(__dirname, '../start-cluster');

    this.parserOptions = {
      removeAlias: true,
      removeCamelCase: true,
      execArgv: true,
    };

    this.options = {
      title: {
        description: 'process title description, use for kill grep',
        type: 'string',
        default: 'egg-server',
      },
      baseDir: {
        description: 'directory of application, default to `process.cwd()`',
        type: 'string',
      },
      workers: {
        description: 'numbers of app workers, default to `os.cpus().length`',
        type: 'number',
        alias: [ 'c', 'cluster' ],
        default: process.env.EGG_WORKERS || os.cpus().length,
      },
      port: {
        description: 'listening port, default to `process.env.PORT || 7001`',
        type: 'number',
        alias: 'p',
        default: process.env.PORT || 7001,
      },
      framework: {
        description: 'specify framework that can be absolute path or npm package',
        type: 'string',
      },
      daemon: {
        description: 'whether run at daemon mode, default to true',
        type: 'boolean',
        default: true,
      },
    };
  }

  get description() {
    return 'Start server at prod mode';
  }

  * run(context) {
    const argv = Object.assign({}, context.argv);

    // egg-script start --baseDir=./server
    // egg-script start --baseDir=/opt/app
    // egg-script start ./server
    // egg-script start
    if (!argv.baseDir) argv.baseDir = argv._[0] || /* istanbul ignore next */ '';
    if (!path.isAbsolute(argv.baseDir)) argv.baseDir = path.join(context.cwd, argv.baseDir);
    const baseDir = argv.baseDir;

    const isDaemon = argv.daemon;

    argv.framework = utils.getFrameworkPath({
      framework: argv.framework,
      baseDir: argv.baseDir,
    });

    const env = context.env;
    env.PWD = baseDir;
    env.HOME = homedir() || /* istanbul ignore next */ '/home/admin';
    env.NODE_ENV = 'production';
    env.EGG_SERVER_ENV = env.EGG_SERVER_ENV || 'prod';

    const pkgInfo = require(path.join(baseDir, 'package.json'));
    const logDir = path.join(env.HOME, 'logs', pkgInfo.name);

    // for nodeinstall
    env.PATH = path.join(baseDir, 'node_modules/.bin') + ':' + env.PATH;

    // for alinode
    env.ENABLE_NODE_LOG = 'YES';
    env.NODE_LOG_DIR = env.NODE_LOG_DIR || path.join(logDir, 'alinode');
    yield mkdirp(env.NODE_LOG_DIR);

    // remove unused properties
    argv.cluster = undefined;
    argv.c = undefined;
    argv.p = undefined;
    argv._ = undefined;
    argv.$0 = undefined;
    argv.daemon = undefined;

    const options = {
      execArgv: context.execArgv,
      env,
      stdio: 'inherit',
      detached: false,
    };

    debug('%s %j %j', this.serverBin, argv, options.execArgv);
    this.logger.info(`Starting egg application at ${baseDir}`);

    const eggArgs = [ this.serverBin, JSON.stringify(argv) ];
    this.logger.info('Run node %s', eggArgs.join(' '));

    // whether run in the foreground, default to daemon mode.
    if (isDaemon) {
      this.logger.info(`Save log file to ${logDir}`);
      const { stdout, stderr } = yield this.helper.getRotatelog(logDir);
      options.stdio = [ 'ignore', stdout, stderr ];
      options.detached = true;

      const child = spawn('node', eggArgs, options);
      child.unref();
      process.exit(0);
    } else {
      // signal event had been handler at common-bin helper
      this.helper.spawn('node', eggArgs, options);
    }
  }
}

module.exports = StartCommand;
