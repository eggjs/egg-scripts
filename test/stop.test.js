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
const utils = require('./utils');
const helper = require('../lib/helper');

describe('test/stop.test.js', () => {
  const eggBin = require.resolve('../bin/egg-scripts.js');
  const fixturePath = path.join(__dirname, 'fixtures/example');
  const homePath = path.join(__dirname, 'fixtures/home');
  const logDir = path.join(homePath, 'logs');
  const waitTime = '10s';
  const fixturePathR = path.normalize(fixturePath).replace(/\\/g, '\\\\'); // for win32

  before(function* () {
    yield mkdirp(homePath);
  });
  after(function* () {
    yield rimraf(homePath);
  });
  beforeEach(() => mm(process.env, 'MOCK_HOME_DIR', homePath));
  afterEach(() => mm.restore);

  describe('stop without daemon', () => {
    let app;
    let killer;

    beforeEach(function* () {
      yield utils.cleanup(fixturePath);
      app = coffee.fork(eggBin, [ 'start', '--workers=2', fixturePath ]);
      // app.debug();
      app.expect('code', 0);
      yield sleep(waitTime);

      assert(app.stderr === '');
      assert(app.stdout.match(/custom-framework started on http:\/\/127\.0\.0\.1:7001/));
      const result = yield httpclient.request('http://127.0.0.1:7001');
      assert(result.data.toString() === 'hi, egg');
    });

    afterEach(function* () {
      app.proc.kill('SIGTERM');
      yield utils.cleanup(fixturePath);
    });

    describe('full path', () => {
      it('should stop', function* () {
        killer = coffee.fork(eggBin, [ 'stop', fixturePath ]);
        killer.debug();
        killer.expect('code', 0);

        // yield killer.end();
        yield sleep(waitTime);


        if (process.platform !== 'win32') {
        // make sure is kill not auto exist
          assert(!app.stdout.includes('exist by env'));

          assert(app.stdout.includes('[master] receive signal SIGTERM, closing'));
          assert(app.stdout.includes('[master] exit with code:0'));
          assert(app.stdout.includes('[app_worker] exit with code:0'));
          // assert(app.stdout.includes('[agent_worker] exit with code:0'));
          assert(killer.stdout.includes(`[egg-scripts] stopping egg application at ${fixturePath}`));
          assert(killer.stdout.match(/got master pid \["\d+\"\]/i));
        }
      });
    });

    describe('relative path', () => {
      it('should stop', function* () {
        killer = coffee.fork(eggBin, [ 'stop', path.relative(process.cwd(), fixturePath) ]);
        killer.debug();
        killer.expect('code', 0);

        if (process.platform !== 'win32') {
          // yield killer.end();
          yield sleep(waitTime);

          // make sure is kill not auto exist
          assert(!app.stdout.includes('exist by env'));

          assert(app.stdout.includes('[master] receive signal SIGTERM, closing'));
          assert(app.stdout.includes('[master] exit with code:0'));
          assert(app.stdout.includes('[app_worker] exit with code:0'));
          // assert(app.stdout.includes('[agent_worker] exit with code:0'));
          assert(killer.stdout.includes(`[egg-scripts] stopping egg application at ${fixturePath}`));
          assert(killer.stdout.match(/got master pid \["\d+\"\]/i));
        }
      });
    });

    describe('without baseDir', () => {
      it('should stop', function* () {
        killer = coffee.fork(eggBin, [ 'stop' ], { cwd: fixturePath });
        killer.debug();
        killer.expect('code', 0);

        if (process.platform !== 'win32') {
          // yield killer.end();
          yield sleep(waitTime);

          // make sure is kill not auto exist
          assert(!app.stdout.includes('exist by env'));

          assert(app.stdout.includes('[master] receive signal SIGTERM, closing'));
          assert(app.stdout.includes('[master] exit with code:0'));
          assert(app.stdout.includes('[app_worker] exit with code:0'));
          // assert(app.stdout.includes('[agent_worker] exit with code:0'));
          assert(killer.stdout.includes(`[egg-scripts] stopping egg application at ${fixturePath}`));
          assert(killer.stdout.match(/got master pid \["\d+\"\]/i));
        }
      });
    });
  });

  describe('stop with daemon', () => {
    beforeEach(function* () {
      yield utils.cleanup(fixturePath);
      yield rimraf(logDir);
      yield coffee.fork(eggBin, [ 'start', '--daemon', '--workers=2', fixturePath ])
        .debug()
        .expect('code', 0)
        .end();

      const result = yield httpclient.request('http://127.0.0.1:7001');
      assert(result.data.toString() === 'hi, egg');
    });
    afterEach(function* () {
      yield utils.cleanup(fixturePath);
    });

    it('should stop', function* () {
      if (process.platform !== 'win32') {
        yield coffee.fork(eggBin, [ 'stop', fixturePath ])
          .debug()
          .expect('stdout', new RegExp(`\\[egg-scripts] stopping egg application at ${fixturePath}`))
          .expect('stdout', /got master pid \["\d+\"\]/i)
          .expect('code', 0)
          .end();

        yield sleep(waitTime);

        // master log
        const stdout = yield fs.readFile(path.join(logDir, 'master-stdout.log'), 'utf-8');

        assert(stdout.includes('[master] receive signal SIGTERM, closing'));
        assert(stdout.includes('[master] exit with code:0'));
        assert(stdout.includes('[app_worker] exit with code:0'));

      } else {
        yield coffee.fork(eggBin, [ 'stop', fixturePath ])
          .debug()
          .expect('stdout', new RegExp(`\\[egg-scripts] stopping egg application at ${fixturePathR}`))
          .expect('stdout', /(got master pid \["\d+\"\])|(\[egg-scripts\] stopped)/i)
          .expect('code', 0)
          .end();

        yield sleep(waitTime);

      }

      yield coffee.fork(eggBin, [ 'stop', fixturePath ])
        .debug()
        .expect('stderr', /can't detect any running egg process/)
        .expect('code', 0)
        .end();
    });

    if (process.platform === 'win32') {
      it('should got pid', function* () {
        const port = 7001;
        const processList = yield helper.findNodeProcessWin(port);

        assert(Array.isArray(processList) && processList.length);
      });

      it('should got empty pid', function* () {
        const port = 0;
        const processList = yield helper.findNodeProcessWin(port);

        assert(Array.isArray(processList) && !processList.length);
      });
    }

  });

  describe('stop with not exist', () => {
    it('should work', function* () {
      yield utils.cleanup(fixturePath);
      yield coffee.fork(eggBin, [ 'stop', fixturePath ])
        .debug()
        .expect('stdout', new RegExp(`\\[egg-scripts] stopping egg application at ${fixturePathR}`))
        .expect('stderr', /can't detect any running egg process/)
        .expect('code', 0)
        .end();
    });
  });
});
