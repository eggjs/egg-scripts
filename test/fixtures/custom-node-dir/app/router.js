'use strict';

module.exports = app => {
  app.get('/', function* () {
    this.body = `hi, ${process.env.PATH}`;
  });
};
