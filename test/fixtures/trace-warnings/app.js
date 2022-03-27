'use strict';

const Event = require('events');
const event = new Event();
event.setMaxListeners(1);

module.exports = () => {
  // --trace-warnings test about MaxListenersExceededWarning
  event.on('xx', () => {});
  event.on('xx', () => {});

  // will not effect --no-deprecation argv
  new Buffer('aaa');
};
