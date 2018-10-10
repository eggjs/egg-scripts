'use strict';

const runScript = require('runscript');
const isWin = process.platform === 'win32';
const REGEX = isWin ? /^(.*)\s+(\d+)\s*$/ : /^\s*(\d+)\s+(.*)/;

// ls
const REGEXPPID = isWin ? /^\s*(\d+)\s*(\d+)\s+(.*)/ : /^\s*(\d+)\s*(\d+)\s*(\S+)\s+(.*)/;
const getMonitorData = require('./monitor').getMonitorData;
const dispAsTable = require('./display').dispAsTable;

exports.getMonitorData = getMonitorData;
exports.dispAsTable = dispAsTable;

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

// ps process func with user ppid
exports.findNodeProcessWithPpid = function* (filterFn) {
  const command = isWin ?
    'wmic Path win32_process Where "Name = \'node.exe\'" Get ParentProcessId,,ProcessId,CommandLine' :
    // command, cmd are alias of args, not POSIX standard, so we use args
    'ps -eo "ppid,pid,user,args"';
  const stdio = yield runScript(command, { stdio: 'pipe' });

  const processList = stdio.stdout.toString().split('\n')
    .reduce((arr, line) => {
      if (!!line && !line.includes('/bin/sh') && line.includes('node')) {
        const m = line.match(REGEXPPID);
        /* istanbul ignore else */
        if (m) {
          // TODO: just test in osx
          const item = isWin ? { ppid: m[1], pid: m[2], user: '', cmd: m[3] } :
            { ppid: m[1], pid: m[2], user: m[3], cmd: m[4] };
          if (!filterFn || filterFn(item)) {
            item.port = getPort(item.cmd);
            item.name = getName(item.cmd);
            arr.push(item);
          }
        }
      }
      return arr;
    }, []);
  return processList;
};


// get port string, it is not perfect
function getPort(cmd) {

  // default value
  let port = '7001(default)';

  // find in cmd , when set port option in package.json, it will be find in cmd
  const cmdArr = cmd.split(' ');
  const options = JSON.parse(cmdArr[2]);
  if (options.port) {
    port = options.port;
    return port;
  }

  // when set port in config , the process require the config file with runtime env
  // but how easy to know the process env. eg:"local prod .."
  // const baseDir = options.baseDir;

  return port;
}


// get tile string in the script, tile as the project name ?
function getName(cmd) {
  let title = '';
  const cmdArr = cmd.split(' ');

  const options = JSON.parse(cmdArr[2]);
  if (options.title) {
    title = options.title;
  }
  return title;
}
