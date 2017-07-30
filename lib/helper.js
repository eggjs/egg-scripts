'use strict';

const cp = require('mz/child_process');
const fs = require('mz/fs');
const mkdirp = require('mz-modules/mkdirp');
const path = require('path');
const debug = require('debug')('egg-scripts:utils');
const moment = require('moment');

module.exports = exports = require('egg-utils');

exports.exec = function* (command, options) {
  const stdout = yield cp.exec(command, options);
  debug('spawn `%s`, stdout: %s', command, stdout);
  return stdout.filter(k => !!k).join('\n');
};

exports.getRotatelog = function* (logDir) {
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
};
