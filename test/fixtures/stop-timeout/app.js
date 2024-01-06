'use strict';

const sleep = require('mz-modules/sleep');
module.exports = app => {
  app.beforeClose(async function() {
    await sleep(6000);
  });
};
