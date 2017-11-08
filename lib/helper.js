'use strict';

const runScript = require('runscript');
const REGEX = /^\s*(\d+)\s+(.*)/;

exports.findNodeProcess = function* (filterFn, port) {
  if (process.platform === 'win32') {
    return yield findNodeProcessWin(port);
  }

  const command = 'ps -eo "pid,command"';
  const stdio = yield runScript(command, { stdio: 'pipe' });
  const processList = stdio.stdout.toString().split('\n')
    .reduce((arr, line) => {
      if (!!line && !line.includes('/bin/sh') && line.includes('node')) {
        const m = line.match(REGEX);
        /* istanbul ignore else */
        if (m) {
          const item = { pid: m[1], cmd: m[2] };
          if (!filterFn || filterFn(item)) {
            arr.push(item);
          }
        }
      }
      return arr;
    }, []);
  return processList;

};

function* findNodeProcessWin(port) {
  port = +port;
  if (!Number.isSafeInteger(port)) {
    return [];
  }
  const command = `netstat -aon|findstr ":${port}"`;
  let stdio;

  try {
    stdio = yield runScript(command, { stdio: 'pipe' });
  } catch (ex) {
    return [];
  }
  const map = new Map();

  stdio.stdout.toString().split('\n')
    .forEach(line => {
        if (line) {
            //  [ '', 'TCP', '0.0.0.0:7001', '0.0.0.0:0', 'LISTENING', '4580', '' ]
            //  [ '', 'TCP', '[::]:7001', '0.0.0.0:0', 'LISTENING', '4580', '' ]
            const lineArr = line.split(/\s+/);

            if (!lineArr[0] && lineArr[1] === 'TCP' && lineArr[2] && lineArr[5]) {
                const pid = lineArr[5];
                const ipArr = lineArr[2].split(':');

                if (!Number.isSafeInteger(+pid) && map.has(pid)) {
                    return;
                }

                if (ipArr && ipArr.length >= 2) {
                    if (+ipArr[ipArr.length - 1] === port) { // ipv4/v6
                        map.set(pid, { pid, cmd: '' });
                    }
                }
            }
        }
    });

  return Array.from(map.values());
}
exports.findNodeProcessWin = findNodeProcessWin;

exports.kill = function(pids, signal) {
  pids.forEach(pid => {
    try {
      process.kill(pid, 0) && process.kill(pid, signal);
    } catch (err) { /* istanbul ignore next */
      if (err.code !== 'ESRCH') {
        throw err;
      }
    }
  });
};
