'use strict';

const path = require('path');
const assert = require('assert');
const fs = require('mz/fs');
const sleep = require('mz-modules/sleep');
const rimraf = require('mz-modules/rimraf');
const mkdirp = require('mz-modules/mkdirp');
const coffee = require('coffee');
const httpclient = require('urllib');
const mm = require('mm');
const utils = require('./utils-win');
const port = 7001;

describe('test/stop.test.js', () => {
  const eggBin = require.resolve('../bin/egg-scripts.js');
  const fixturePath = path.join(__dirname, 'fixtures/example');
  const homePath = path.join(__dirname, 'fixtures/home');
  const logDir = path.join(homePath, 'logs');
  const waitTime = '10s';
  const title = 'egg-win-test';

  before(function* () {
    yield mkdirp(homePath);
  });
  after(function* () {
    yield rimraf(homePath);
  });
  beforeEach(() => mm(process.env, 'MOCK_HOME_DIR', homePath));
  afterEach(() => mm.restore);

  describe('stop with daemon', () => {
    beforeEach(function* () {
      yield utils.cleanup(port);
      yield rimraf(logDir);
      yield coffee.fork(eggBin, [ 'start', '--daemon', '--workers=2', fixturePath, `--title=${title}` ])
        .debug()
        .expect('code', 0)
        .end();

      const result = yield httpclient.request(`http://127.0.0.1:${port}`);
      assert(result.data.toString() === 'hi, egg');
    });
    afterEach(function* () {
      yield utils.cleanup({ port });
    });


    it('should stop by port under win32', function* () {
      if (process.platform !== 'win32') {
        return Promise.resolve();
      }
      yield coffee.fork(eggBin, [ 'stop', fixturePath, `--port=${port}` ])
        .debug()
        .expect('stdout', /\[egg-scripts] stopping egg application/)
        .expect('stdout', /got master pid \[\d+?(,\d+?)+\]/i)
        .expect('code', 0)
        .end();

      yield sleep(waitTime);

      // master log
      // const stdout = yield fs.readFile(path.join(logDir, 'master-stdout.log'), 'utf-8');

      // assert(stdout.includes('[master] receive signal SIGTERM, closing'));
      // assert(stdout.includes('[master] exit with code:0'));
      // assert(stdout.includes('[app_worker] exit with code:0'));

      yield coffee.fork(eggBin, [ 'stop', `--port=${port}` ])
        .debug()
        .expect('stderr', /can't detect any running egg process/)
        .expect('code', 0)
        .end();

    });

  });


});
