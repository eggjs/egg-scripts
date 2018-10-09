'use strict';

const runScript = require('runscript');
const terminate = require('terminate');
const isWin = process.platform === 'win32';
const REGEX = isWin ? /^(.*)\s+(\d+)\s*$/ : /^\s*(\d+)\s+(.*)/;

exports.findNodeProcess = function* (filterFn) {
  const command = isWin ?
    'wmic Path win32_process Where "Name = \'node.exe\'" Get CommandLine,ProcessId' :
    // command, cmd are alias of args, not POSIX standard, so we use args
    'ps -eo "pid,args"';
  const stdio = yield runScript(command, { stdio: 'pipe' });
  const processList = stdio.stdout.toString().split('\n')
    .reduce((arr, line) => {
      if (!!line && !line.includes('/bin/sh') && line.includes('node')) {
        const m = line.match(REGEX);
        /* istanbul ignore else */
        if (m) {
          const item = isWin ? { pid: m[2], cmd: m[1] } : { pid: m[1], cmd: m[2] };
          if (!filterFn || filterFn(item)) {
            arr.push(item);
          }
        }
      }
      return arr;
    }, []);
  return processList;
};

exports.kill = function* (pids, signal) {
  yield pids.map(pid => function* () {
    yield kill(pid, signal);
  });
};

// use terminate to prevents zombie processes
function kill(pid, signal) {
  signal = signal || 'SIGTERM';
  return new Promise((resolve, reject) => {
    terminate(pid, signal, err => {
      if (err) {
        try {
          process.kill(pid, signal);
        } catch (err) {
          if (err.code !== 'ESRCH') return reject(err);
        }
      }
      resolve();
    });
  });
}
