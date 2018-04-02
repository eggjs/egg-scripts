'use strict';

const runScript = require('runscript');
const REGEX = /^\s*(\d+)\s+(.*)/;
const regexDim = /\\+/g;

exports.findNodeProcess = function* (filterFn) {
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


/* ------- below for win32 ------ */

/**
 * retrieve master pid by worker's pid via ppid for win32
 * Minimum supported client: Vista
 * Minimum supported server: Server 2008
 *
 * @param {object} argv - context
 * @return {number[]} - array pids of master and app/agent worker
 */
exports.findfindNodeProcessWin = function* (argv) {
  const port = argv.port || (process.env && process.env.PORT);
  const keyStr = argv.title ? argv.title : argv.baseDir;
  let masterPids = [];
  let workerPids = [];

  if (keyStr) { // title match first
    const mPidSet = new Set(); // master pid
    workerPids = yield findWorkerPidsWin(keyStr); // order or pid random

    for (const workerPid of workerPids) {
      const ppid = yield findMasterPidByWorker(workerPid);
      ppid > 0 && mPidSet.add(ppid);
    }
    if (mPidSet.size > 1) {
      throw new Error('number of master pid should be One via title, but got:' + mPidSet.size);
    }
    masterPids = Array.from(mPidSet);
  } else if (port) {
    masterPids = yield findMasterPidsByPort(port);
    if (masterPids.length > 1) {
      throw new Error('number of master pid should be One via port, but got:' + masterPids.length);
    }
    workerPids = yield findWorkerPidsByMaster(masterPids[0]); // [agentPid, ...workerPids]
  }

  return masterPids.concat(workerPids); // master first
};

function parseKeyStr(str) {
  const ret = str && typeof str === 'string' ? str : '';
  return ret.replace(regexDim, '/');
}

/**
 * retrieve master pid by worker's pid via ppid for win32
 * Minimum supported client: Vista
 * Minimum supported server: Server 2008
 *
 * @param {number} pid - process id
 * @return {number} - pid of master
 */
function* findMasterPidByWorker(pid) {
  const where = `process where processid="${pid}"`;
  const str = yield retrieveProcessInfo(pid, where);
  const info = parseProcessInfo(str);
  const row = info && info.length === 1 && info[0];

  return row && row.pid && row.ppid && row.pid === pid
    ? row.ppid
    : 0;
}

/**
 * retrieve master pid by worker's pid via ppid for win32
 * Minimum supported client: Vista
 * Minimum supported server: Server 2008
 *
 * @param {number} pid - master process id
 * @return {number[]} - array pids of app/agent work, order: [agentPid, ...appPids]
 */
function* findWorkerPidsByMaster(pid) {
  const where = `process where ParentProcessId="${pid}"`;
  const str = yield retrieveProcessInfo(pid, where);
  const info = parseProcessInfo(str);
  const ret = [];

  for (const row of info) {
    if (row && row.ppid && row.ppid === pid) {
      if (row.cmd.includes('agent_worker')) { // agent at first
        row.unshift(row.pid);
      } else {
        ret.push(row.pid);
      }
    }
  }

  return ret;
}

/**
 * find master pids by listining port
 * @param {number} port - port number of master listening
 * @return {number[]} - array of pid
 */
function* findMasterPidsByPort(port) {
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
  const list = new Set();
  const arr = stdio.stdout && stdio.stdout.toString().split('\n') || [];

  arr.length && arr.forEach(line => {
    if (line) {
      //  [ '', 'TCP', '0.0.0.0:7001', '0.0.0.0:0', 'LISTENING', '4580', '' ]
      //  [ '', 'TCP', '[::]:7001', '0.0.0.0:0', 'LISTENING', '4580', '' ]
      const lineArr = line.split(/\s+/);

      if (!lineArr[0] && lineArr[1] === 'TCP' && lineArr[2] && lineArr[5]) {
        const pid = +lineArr[5];
        const ipArr = lineArr[2].split(':');

        if (!Number.isSafeInteger(pid) && list.has(pid)) {
          return;
        }

        if (ipArr && ipArr.length >= 2) {
          if (+ipArr[ipArr.length - 1] === port) { // ipv4/v6
            list.add(pid);
          }
        }
      }
    }
  });

  return [ ...list ];
}

function* findWorkerPidsWin(str) {
  const keyStr = parseKeyStr(str);
  const command = `tasklist /NH /FI "WINDOWTITLE eq ${keyStr}"`;

  if (!keyStr) {
    return [];
  }

  let stdio;
  try {
    stdio = yield runScript(command, { stdio: 'pipe' });
  } catch (ex) {
    return [];
  }
  const list = new Set();
  const arr = stdio.stdout && stdio.stdout.toString().split('\n') || [];

  arr.length && arr.forEach(line => {
    if (line && line.includes('node.exe')) {
      // image name   PID  session name  session#   memory
      // node.exe     1704 Console       1          31,540 K
      // node.exe     6096 Console       1          33,380 K
      const [ , id ] = line.split(/\s+/);
      const pid = parseInt(id, 10);

      if (typeof pid === 'number' && Number.isSafeInteger(pid)) {
        if (list.has(pid)) {
          return;
        }
        list.add(pid);
      }
    }
  });

  return [ ...list ];
}

/**
 * retrieve process info by pid via wmic
 * Minimum supported client: Vista
 * Minimum supported server: Server 2008
 *
 * @param {number} processId - process id
 * @param {string} where - wmic query string
 * @return {Promise<string>} - raw data
 */
function* retrieveProcessInfo(processId, where) {
  // invalid result of runScript(), so run by spawn
  const spawn = require('child_process').spawn;

  return new Promise((resolve, reject) => {
    const pid = +processId;

    if (Number.isNaN(pid) || !Number.isSafeInteger(pid)) {
      return resolve('');
    }
    const wmic = spawn('wmic', []);
    const stdout = [];

    wmic.stdout.on('data', buf => {
      stdout.push(buf.toString('utf8'));
    });
    wmic.stdout.on('error', err => {
      reject(err);
    });
    wmic.on('close', () => {
      resolve(stdout.join(''));
    });

    wmic.stdin.end(where + ' get CommandLine, Name, ParentProcessId, ProcessId');
  });
}

/**
 * parse process info for win32
 *
 * @param {string} data - data from retrieveProcessInfo()
 * @return {processInfo[]} - <code>
 * interface ProcessInfo {
 *   shell: string  // 'D:/.../node.exe'
 *   cmd: string    // 'E:/.../node_modules/egg-cluster/lib/(agent_worker|app_worker).js'
 *   options: ClusterOptions
 *   ppid: number
 *   pid: number
 * }
 * interface ClusterOptions {
 *   framework: string  // delimite '\' be replaced to '/' -> 'E:/.../app/node_modules/yadan-ts'
 *   baseDir: string    // delimite '\' be replaced to '/' -> 'E:/.../app'
 *   plugins: object | null
 *   workers: number
 *   port: number
 *   https: boolean
 *   key: string
 *   cert: string
 *   typescript: boolean
 *   title?: string
 *   [prop: string]: any
 * }
 * </code>
 */
function parseProcessInfo(data) {
  const ret = [];

  data && typeof data === 'string' && data.split('\n').forEach(line => {
    if (!line) {
      return;
    }
    // sh, cmd, optstr, imageName, ppid, pid
    const arr = line.trim().split(/\s+/);

    if (!arr[3] || !arr[3].includes('node')) { // node.exe
      return;
    }
    let [ sh, cmd, optstr, , ppid, pid ] = arr;

    if (typeof +ppid === 'number' && typeof +pid === 'number') {
      optstr = optstr.trim().slice(1, -1).replace(/\\"/g, '"');

      try {
        const options = JSON.parse(optstr);

        if (options.framework) {
          options.framework = options.framework.trim().replace(regexDim, '/');
        }
        if (options.baseDir) {
          options.baseDir = options.baseDir.trim().replace(regexDim, '/');
        }

        ret.push({
          shell: sh && sh.trim().replace(regexDim, '/') || '',
          cmd: cmd && cmd.trim().replace(regexDim, '/') || '',
          options,
          ppid: +ppid,
          pid: +pid,
        });
      } catch (ex) {
        return;
      }
    }
  });

  return ret;
}
