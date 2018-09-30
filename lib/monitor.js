'use strict';
// code copy from pm2

const pidusage = require('pidusage');

exports.getMonitorData = function getMonitorData(processs, cb) {

  if (processs.length === 0) {
    return cb(null, processs.map(function(pro) {
      pro.monit = {
        memory: 0,
        cpu: 0,
        elapsed: 0,
      };
      return pro;
    }));
  }

  const pids = processs.map(pro => {
    return pro.pid;
  });

  if (pids.length === 0) {
    return cb(null, pids.map(function(pro) {
      pro.monit = {
        memory: 0,
        cpu: 0,
        elapsed: 0,
      };
      return pro;
    }));
  }

  pidusage(pids, function retPidUsage(err, statistics) {
    // Just log, we'll set empty statistics
    if (err) {
      console.error('Error caught while calling pidusage');
      console.error(err);

      return cb(err, processs.map(function(pro) {
        pro.monit = {
          memory: 0,
          cpu: 0,
          elapsed: 0,
        };
        return pro;
      }));
    }

    if (!statistics) {
      console.error('Statistics is not defined!');
      return cb(err, processs.map(function(pro) {
        pro.monit = {
          memory: 0,
          cpu: 0,
          elapsed: 0,
        };
        return pro;
      }));
    }

    processs = processs.map(function(pro) {
      const stat = statistics[pro.pid];

      if (!stat) {
        pro.monit = {
          memory: 0,
          cpu: 0,
          elapsed: 0,
        };

        return pro;
      }

      pro.monit = {
        memory: stat.memory,
        cpu: Math.round(stat.cpu * 10) / 10,
        elapsed: stat.elapsed,
      };

      return pro;
    });
    return cb(err, processs);
  });
};
