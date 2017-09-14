'use strict';

const findProcess = require('find-process');
const REGEX = /"(?:[^\\"\r\n\f]|\\[\s\S])*"|\S+/g;

exports.findNodeProcess = function* (filterFn) {
  const processList = yield findProcess('name', 'node');
  return filterFn ? processList.filter(filterFn) : processList;
};

exports.getEggMaster = function* (baseDir) {
  const processList = yield findProcess('name', 'node');
  return processList.filter(item => {
    const cmd = item.cmd;
    if (!cmd.includes('start-cluster') || !cmd.includes('baseDir')) return false;
    const opts = extractOptions(cmd);
    console.log(opts, baseDir, opts.baseDir, typeof opts, Object.keys(opts), opts.baseDir === baseDir, baseDir.replace(/\\/g, '/'), opts.baseDir === baseDir.replace(/\\/g, '/'));
    return opts && opts.baseDir === baseDir;
  });
};

function extractOptions(cmd) {
  const args = [];
  cmd.replace(REGEX, m => args.push(m));
  let opts;
  try {
    console.log(args);
    opts = JSON.parse(args[2]);
    console.log(typeof opts);
    if (typeof opts === 'string') opts = JSON.parse(opts);
    console.log(typeof opts);
  } catch (err) {
    console.log(err);
    // ignore
  }
  return opts;
}

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
