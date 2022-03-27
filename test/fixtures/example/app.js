'use strict';

const Event = require('events');
const event = new Event();
event.setMaxListeners(1);

module.exports = () => {
  // --no-deprecation
  new Buffer('aaa');

  // --trace-warnings test about MaxListenersExceededWarning
  event.on('xx', () => {});
  event.on('xx', () => {});
};
