'use strict';

const assert = require('assert');
const mock = require('egg-mock');

describe('test/index.test.js', () => {
  let app;

  before(() => {
    app = require('../index');
  });

  afterEach(mock.restore);

  it('should work', () => {
    assert(app === 'hi, developer');
  });
});
