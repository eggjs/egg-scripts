'use strict';
// code copy from pm2

const pidusage = require('pidusage');

exports.getMonitorData = function* getMonitorData(processs) {

  return new Promise(function(resolve, reject) {

    if (processs.length === 0) {
      resolve(processs);
      return;
    }

    const pids = processs.map(pro => {
      return pro.pid;
    });

    if (pids.length === 0) {
      resolve(pids);
      return;
    }
    pidusage(pids, function(err, statistics) {
      // Just log, we'll set empty statistics
      if (err) {
        console.error('Error caught while calling pidusage');
        console.error(err);

        processs.map(function(pro) {
          pro.monit = {
            memory: 0,
            cpu: 0,
            elapsed: 0,
          };
          return pro;
        });
        reject(err);
        return;
      }

      if (!statistics) {
        console.error('Statistics is not defined!');
        processs.map(function(pro) {
          pro.monit = {
            memory: 0,
            cpu: 0,
            elapsed: 0,
          };
          return pro;
        });
        reject(err);
        return;
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
      resolve(processs);

    }); // pidusage end

  }); // Promise end

}; // getMonitorData end
