'use strict';

module.exports = app => {
  app.get('/', function* () {
    this.body = `hi, ${app.config.framework || 'egg'}`;
  });

  app.get('/env', function* () {
    this.body = app.config.env + ', ' + app.config.pre;
  });

  app.get('/path', function* () {
    this.body = process.env.PATH;
  });
};
