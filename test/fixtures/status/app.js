'use strict';

const sleep = require('mz-modules/sleep');

module.exports = app => {
  if (process.env.ERROR) {
    app.logger.error(new Error(process.env.ERROR));
  }

  app.beforeStart(async function() {
    await sleep(process.env.WAIT_TIME);
  });
};
