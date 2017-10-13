'use strict';

const sleep = require('mz-modules/sleep');

module.exports = app => {
  if (process.env.ERROR) {
    app.logger.error(new Error(process.env.ERROR));
  }

  app.beforeStart(function* () {
    yield sleep(process.env.WAIT_TIME);
  });
};
