'use strict';

const path = require('path');
const assert = require('assert');
const fs = require('mz/fs');
const sleep = require('mz-modules/sleep');
const rimraf = require('mz-modules/rimraf');
const coffee = require('coffee');
const homedir = require('node-homedir');
const httpclient = require('urllib');
const utils = require('./utils');

describe('test/stop.test.js', () => {
  const eggBin = require.resolve('../bin/egg-scripts.js');
  const fixturePath = path.join(__dirname, 'fixtures/example');
  const homePath = homedir();
  const logDir = path.join(homePath, 'logs/example');

  describe('stop --no-daemon', () => {
    let app;
    let killer;

    beforeEach(function* () {
      yield utils.cleanup(fixturePath);
      app = coffee.fork(eggBin, [ 'start', '--no-daemon', '--workers=2', fixturePath ]);
      // app.debug();
      app.expect('code', 0);
      yield sleep('5s');

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
        // killer.debug();
        killer.expect('code', 0);

        yield sleep('5s');

        // make sure is kill not auto exist
        assert(!app.stdout.includes('exist by env'));

        assert(app.stdout.includes('[master] receive signal SIGTERM, closing'));
        assert(app.stdout.includes('[master] exit with code:0'));
        assert(app.stdout.includes('[app_worker] exit with code:0'));
        assert(app.stdout.includes('[agent_worker] exit with code:0'));
        assert(killer.stdout.includes(`[egg-scripts] Stopping egg application at ${fixturePath}`));
        assert(killer.stdout.match(/Got master pid \["\d+\"\]/i));
      });
    });

    describe('relative path', () => {
      it('should stop', function* () {
        killer = coffee.fork(eggBin, [ 'stop', path.relative(process.cwd(), fixturePath) ]);
        // killer.debug();
        killer.expect('code', 0);

        yield sleep('5s');

        // make sure is kill not auto exist
        assert(!app.stdout.includes('exist by env'));

        assert(app.stdout.includes('[master] receive signal SIGTERM, closing'));
        assert(app.stdout.includes('[master] exit with code:0'));
        assert(app.stdout.includes('[app_worker] exit with code:0'));
        assert(app.stdout.includes('[agent_worker] exit with code:0'));
        assert(killer.stdout.includes(`[egg-scripts] Stopping egg application at ${fixturePath}`));
        assert(killer.stdout.match(/Got master pid \["\d+\"\]/i));
      });
    });

    describe('without baseDir', () => {
      it('should stop', function* () {
        killer = coffee.fork(eggBin, [ 'stop' ], { cwd: fixturePath });
        // killer.debug();
        killer.expect('code', 0);

        yield sleep('5s');

        // make sure is kill not auto exist
        assert(!app.stdout.includes('exist by env'));

        assert(app.stdout.includes('[master] receive signal SIGTERM, closing'));
        assert(app.stdout.includes('[master] exit with code:0'));
        assert(app.stdout.includes('[app_worker] exit with code:0'));
        assert(app.stdout.includes('[agent_worker] exit with code:0'));
        assert(killer.stdout.includes(`[egg-scripts] Stopping egg application at ${fixturePath}`));
        assert(killer.stdout.match(/Got master pid \["\d+\"\]/i));
      });
    });
  });

  describe('stop with daemon', () => {
    let app;
    let killer;

    before(function* () {
      yield utils.cleanup(fixturePath);
      yield rimraf(logDir);
      app = coffee.fork(eggBin, [ 'start', '--workers=2', fixturePath ]);
      // app.debug();
      app.expect('code', 0);
      yield sleep('5s');

      const result = yield httpclient.request('http://127.0.0.1:7001');
      assert(result.data.toString() === 'hi, egg');
    });

    after(function* () {
      app.proc.kill('SIGTERM');
      yield utils.cleanup(fixturePath);
    });

    it('should stop', function* () {
      killer = coffee.fork(eggBin, [ 'stop', fixturePath ]);
      // killer.debug();
      killer.expect('code', 0);

      yield sleep('5s');

      // master log
      const stdout = yield fs.readFile(path.join(logDir, 'master-stdout.log'), 'utf-8');

      assert(stdout.includes('[master] receive signal SIGTERM, closing'));
      assert(stdout.includes('[master] exit with code:0'));
      assert(stdout.includes('[app_worker] exit with code:0'));
      assert(stdout.includes('[agent_worker] exit with code:0'));
      assert(killer.stdout.includes(`[egg-scripts] Stopping egg application at ${fixturePath}`));
      assert(killer.stdout.match(/Got master pid \["\d+\"\]/i));
    });
  });

  describe('stop with not exist', () => {
    let killer;

    it('should work', function* () {
      yield utils.cleanup(fixturePath);
      killer = coffee.fork(eggBin, [ 'stop', fixturePath ]);
      // killer.debug();
      killer.expect('code', 0);

      yield sleep('5s');

      assert(killer.stdout.includes(`[egg-scripts] Stopping egg application at ${fixturePath}`));
      assert(killer.stderr.includes('can\'t detect any running egg process'));
    });
  });
});
