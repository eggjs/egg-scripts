'use strict';

const runScript = require('runscript');
const isWin = process.platform === 'win32';
const REGEX = /^(.*)\s+(\d+)\s*$/;

exports.findNodeProcess = function* (filterFn) {
  const command = isWin ?
    'wmic Path win32_process Where "Name = \'node.exe\'" Get CommandLine,ProcessId' :
    'ps -eo "command,pid"';
  const stdio = yield runScript(command, { stdio: 'pipe' });
  const processList = stdio.stdout.toString().split('\n')
    .reduce((arr, line) => {
      if (!!line && !line.includes('/bin/sh') && line.includes('node')) {
        const m = line.match(REGEX);
        /* istanbul ignore else */
        if (m) {
          const item = { pid: m[2], cmd: m[1] };
          if (!filterFn || filterFn(item)) {
            arr.push(item);
          }
        }
      }
      return arr;
    }, []);
  return processList;
};

exports.kill = function(pids, signal) {
  pids.forEach(pid => {
    try {
      process.kill(pid, signal);
    } catch (err) { /* istanbul ignore next */
      if (err.code !== 'ESRCH') {
        throw err;
      }
    }
  });
};
