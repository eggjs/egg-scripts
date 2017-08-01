'use strict';

const findProcess = require('find-process');

// 正则匹配，/带引号的字符串序列|连续非空格序列/
const REGEX = /"(?:[^\\"\r\n\f]|\\[\s\S])*"|\S+/g;

exports.findProcess = function* (...args) {
  const processList = yield findProcess(...args);
  for (const item of processList) {
    const cmd = item.cmd;
    if (process.platform === 'win32') {
      item.argv = [];
      cmd.replace(REGEX, m => {
        item.argv.push(m);
      });
    } else {
      item.argv = cmd.split(/\s+/);
    }
  }
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
