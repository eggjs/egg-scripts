'use strict';

const path = require('path');
const mkdirp = require('mz-modules/mkdirp');
const homedir = require('node-homedir');
const utils = require('egg-utils');
const fs = require('mz/fs');
const moment = require('moment');
const spawn = require('child_process').spawn;
const Command = require('../command');

class StartCommand extends Command {
  constructor(rawArgv) {
    super(rawArgv);
    this.usage = 'Usage: egg-scripts start [options] [baseDir]';
    this.serverBin = path.join(__dirname, '../start-cluster');

    this.options = {
      title: {
        description: 'process title description, use for kill grep, default to `egg-server-APPNAME`',
        type: 'string',
      },
      workers: {
        description: 'numbers of app workers, default to `os.cpus().length`',
        type: 'number',
        alias: [ 'c', 'cluster' ],
        default: process.env.EGG_WORKERS,
      },
      port: {
        description: 'listening port, default to `process.env.PORT`',
        type: 'number',
        alias: 'p',
        default: process.env.PORT,
      },
      env: {
        description: 'egg server env, default to `process.env.EGG_SERVER_ENV`',
        default: process.env.EGG_SERVER_ENV,
      },
      framework: {
        description: 'specify framework that can be absolute path or npm package',
        type: 'string',
      },
      daemon: {
        description: 'whether run at background daemon mode',
        type: 'boolean',
      },
    };
  }

  get description() {
    return 'Start server at prod mode';
  }

  * run(context) {
    const argv = Object.assign({}, context.argv);

    // egg-script start
    // egg-script start ./server
    // egg-script start /opt/app
    let baseDir = argv._[0] || context.cwd;
    if (!path.isAbsolute(baseDir)) baseDir = path.join(context.cwd, baseDir);
    argv.baseDir = baseDir;

    const isDaemon = argv.daemon;

    argv.framework = utils.getFrameworkPath({
      framework: argv.framework,
      baseDir,
    });

    const env = context.env;
    env.PWD = baseDir;
    env.HOME = homedir();
    env.NODE_ENV = 'production';

    // cli argv -> process.env.EGG_SERVER_ENV -> `undefined` then egg will use `prod`
    if (argv.env) {
      // if undefined, should not pass key due to `spwan`, https://github.com/nodejs/node/blob/master/lib/child_process.js#L470
      env.EGG_SERVER_ENV = argv.env;
      argv.env = undefined;
    }

    const pkgInfo = require(path.join(baseDir, 'package.json'));
    const logDir = path.join(env.HOME, 'logs', pkgInfo.name);

    argv.title = argv.title || `egg-server-${pkgInfo.name}`;

    // adjust env for win
    let envPath = env.PATH || env.Path;
    if (envPath) {
      // for nodeinstall
      envPath = path.join(baseDir, 'node_modules/.bin') + path.delimiter + envPath;
    }

    // for alinode
    env.ENABLE_NODE_LOG = 'YES';
    env.NODE_LOG_DIR = env.NODE_LOG_DIR || path.join(logDir, 'alinode');
    yield mkdirp(env.NODE_LOG_DIR);

    // remove unused properties, alias had been remove by `removeAlias`
    argv._ = undefined;
    argv.$0 = undefined;
    argv.daemon = undefined;

    const options = {
      execArgv: context.execArgv,
      env,
      stdio: 'inherit',
      detached: false,
    };

    this.logger.info(`starting egg application at ${baseDir}`);

    const eggArgs = [ this.serverBin, JSON.stringify(argv), `--title=${argv.title}` ];
    this.logger.info('run node %s', eggArgs.join(' '));

    // whether run in the background.
    if (isDaemon) {
      this.logger.info(`save log file to ${logDir}`);
      const { stdout, stderr } = yield getRotatelog(logDir);
      options.stdio = [ 'ignore', stdout, stderr, 'ipc' ];
      options.detached = true;

      const child = spawn('node', eggArgs, options);
      child.on('message', msg => {
        if (msg && msg.action === 'egg-ready') {
          this.logger.info(`egg started on ${msg.data.address}`);
          child.unref();
          child.disconnect();
          process.exit(0);
        }
      });
    } else {
      // signal event had been handler at common-bin helper
      this.helper.spawn('node', eggArgs, options);
    }
  }
}

function* getRotatelog(logDir) {
  const stdoutPath = path.join(logDir, 'master-stdout.log');
  const stderrPath = path.join(logDir, 'master-stderr.log');

  // format style: .20150602.193100
  const timestamp = moment().format('.YYYYMMDD.HHmmss');

  yield mkdirp(logDir);

  /* istanbul ignore else */
  if (yield fs.exists(stdoutPath)) {
    // Note: rename last log to next start time, not when last log file created
    yield fs.rename(stdoutPath, stdoutPath + timestamp);
  }

  /* istanbul ignore else */
  if (yield fs.exists(stderrPath)) {
    yield fs.rename(stderrPath, stderrPath + timestamp);
  }

  return yield {
    stdout: fs.open(stdoutPath, 'a'),
    stderr: fs.open(stderrPath, 'a'),
  };
}

module.exports = StartCommand;
