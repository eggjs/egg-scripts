'use strict';
// code copy from pm2

const Table = require('cli-table-redemption');
const chalk = require('chalk');

exports.dispAsTable = function(list) {
  const stacked = (process.stdout.columns || 90) < 90;
  const app_head = stacked ? [ 'Name', 'ppid', 'pid', 'mode', 'cpu', 'memory' ] : [ 'App name', 'ppid', 'pid', 'mode', 'elapsed', 'cpu', 'mem', 'user', 'port' ];
  const app_table = new Table({
    head: app_head,
    colAligns: [ 'left' ],
    style: {
      'padding-left': 1,
      head: [ 'cyan', 'bold' ],
      compact: true,
    },
  });
  if (!list) {
    return console.log('list empty');
  }

  list.forEach(function(l) {
    const obj = {};

    const key = chalk.bold.cyan(l.name);

    // ls for Applications
    obj[key] = [];

    // ppid
    obj[key].push(l.ppid);

    // pid
    obj[key].push(l.pid);

    // Exec mode
    obj[key].push(colorModels(l.mode));

    // elapsed
    if (!stacked) {
      obj[key].push(l.monit ? timeSince(l.monit.elapsed) : 'N/A');
    }

    // CPU
    obj[key].push(l.monit ? l.monit.cpu + '%' : 'N/A');

    // Memory
    obj[key].push(l.monit ? bytesToSize(l.monit.memory, 1) : 'N/A');

    // User
    if (!stacked) {
      const user = l.user ? l.user : 'N/A';
      obj[key].push(chalk.bold(user));
    }

    // port
    if (!stacked) {
      const port = l.port ? l.port : 'N/A';
      obj[key].push(chalk.bold(port));
    }

    safe_push(app_table, obj);

  });

  console.log(app_table.toString());
};

function safe_push() {
  const argv = arguments;
  const table = argv[0];

  for (let i = 1; i < argv.length; ++i) {
    const elem = argv[i];
    if (elem[Object.keys(elem)[0]] === undefined ||
      elem[Object.keys(elem)[0]] === null) {
      elem[Object.keys(elem)[0]] = 'N/A';
    } else if (Array.isArray(elem[Object.keys(elem)[0]])) {
      elem[Object.keys(elem)[0]].forEach(function(curr, j) {
        if (curr === undefined || curr === null) {
          elem[Object.keys(elem)[0]][j] = 'N/A';
        }
      });
    }
    table.push(elem);
  }
}


function timeSince(date) {
  const seconds = Math.floor(date / 1000);
  let interval = Math.floor(seconds / 31536000);
  if (interval > 1) {
    return interval + 'Y';
  }
  interval = Math.floor(seconds / 2592000);
  if (interval > 1) {
    return interval + 'M';
  }
  interval = Math.floor(seconds / 86400);
  if (interval > 1) {
    return interval + 'D';
  }
  interval = Math.floor(seconds / 3600);
  if (interval > 1) {
    return interval + 'h';
  }
  interval = Math.floor(seconds / 60);
  if (interval > 1) {
    return interval + 'm';
  }
  return Math.floor(seconds) + 's';
}

function bytesToSize(bytes, precision) {
  const kilobyte = 1024;
  const megabyte = kilobyte * 1024;
  const gigabyte = megabyte * 1024;
  const terabyte = gigabyte * 1024;

  if ((bytes >= 0) && (bytes < kilobyte)) {
    return bytes + ' B   ';
  } else if ((bytes >= kilobyte) && (bytes < megabyte)) {
    return (bytes / kilobyte).toFixed(precision) + ' KB  ';
  } else if ((bytes >= megabyte) && (bytes < gigabyte)) {
    return (bytes / megabyte).toFixed(precision) + ' MB  ';
  } else if ((bytes >= gigabyte) && (bytes < terabyte)) {
    return (bytes / gigabyte).toFixed(precision) + ' GB  ';
  } else if (bytes >= terabyte) {
    return (bytes / terabyte).toFixed(precision) + ' TB  ';
  }
  return bytes + ' B   ';
}

function colorModels(model) {
  switch (model) {
    case 'Master':
      return chalk.green.bold('Master');
    case 'Worker':
      return chalk.blue.bold('Worker');
    default:
      return chalk.red.bold(model);
  }
}
