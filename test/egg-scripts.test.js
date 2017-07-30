'use strict';

const coffee = require('coffee');

describe('test/egg-scripts.test.js', () => {
  let app;
  const eggBin = require.resolve('../bin/egg-scripts.js');

  it('show help', done => {
    app = coffee.fork(eggBin, [ '--help' ]);
    app
      // .debug()
      .expect(/Usage: egg-scripts/)
      .expect('code', 0)
      .end(done);
  });
});
