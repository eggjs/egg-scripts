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

describe('test/stop.test.js', () => {
  const eggBin = require.resolve('../bin/egg-scripts.js');
  const fixturePath = path.join(__dirname, 'fixtures/example');
  const homePath = path.join(__dirname, 'fixtures/home');
  const logDir = path.join(homePath, 'logs');
  const waitTime = '10s';

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

    it('should stop', function* () {
      killer = coffee.fork(eggBin, [ 'stop', fixturePath ]);
      killer.debug();
      killer.expect('code', 0);

      // yield killer.end();
      yield sleep(waitTime);

      // make sure is kill not auto exist
      assert(!app.stdout.includes('exist by env'));

      assert(app.stdout.includes('[master] receive signal SIGTERM, closing'));
      assert(app.stdout.includes('[master] exit with code:0'));
      assert(app.stdout.includes('[app_worker] exit with code:0'));
      // assert(app.stdout.includes('[agent_worker] exit with code:0'));
      assert(killer.stdout.includes('[egg-scripts] stopping egg application'));
      assert(killer.stdout.match(/got master pid \["\d+\"\]/i));
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
      yield coffee.fork(eggBin, [ 'stop', fixturePath ])
        .debug()
        .expect('stdout', /\[egg-scripts] stopping egg application/)
        .expect('stdout', /got master pid \["\d+\"\]/i)
        .expect('code', 0)
        .end();

      yield sleep(waitTime);

      // master log
      const stdout = yield fs.readFile(path.join(logDir, 'master-stdout.log'), 'utf-8');

      assert(stdout.includes('[master] receive signal SIGTERM, closing'));
      assert(stdout.includes('[master] exit with code:0'));
      assert(stdout.includes('[app_worker] exit with code:0'));

      yield coffee.fork(eggBin, [ 'stop', fixturePath ])
        .debug()
        .expect('stderr', /can't detect any running egg process/)
        .expect('code', 0)
        .end();
    });
  });

  describe('stop with not exist', () => {
    it('should work', function* () {
      yield utils.cleanup(fixturePath);
      yield coffee.fork(eggBin, [ 'stop', fixturePath ])
        .debug()
        .expect('stdout', /\[egg-scripts] stopping egg application/)
        .expect('stderr', /can't detect any running egg process/)
        .expect('code', 0)
        .end();
    });
  });

  describe('stop --title', () => {
    let app;
    let killer;

    beforeEach(function* () {
      yield utils.cleanup(fixturePath);
      app = coffee.fork(eggBin, [ 'start', '--workers=2', '--title=example', fixturePath ]);
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

    it('should stop', function* () {
      yield coffee.fork(eggBin, [ 'stop', '--title=random', fixturePath ])
        .debug()
        .expect('stdout', /\[egg-scripts] stopping egg application with --title=random/)
        .expect('stderr', /can't detect any running egg process/)
        .expect('code', 0)
        .end();

      killer = coffee.fork(eggBin, [ 'stop', '--title=example' ], { cwd: fixturePath });
      killer.debug();
      killer.expect('code', 0);

      // yield killer.end();
      yield sleep(waitTime);

      // make sure is kill not auto exist
      assert(!app.stdout.includes('exist by env'));

      assert(app.stdout.includes('[master] receive signal SIGTERM, closing'));
      assert(app.stdout.includes('[master] exit with code:0'));
      assert(app.stdout.includes('[app_worker] exit with code:0'));
      // assert(app.stdout.includes('[agent_worker] exit with code:0'));
      assert(killer.stdout.includes('[egg-scripts] stopping egg application with --title=example'));
      assert(killer.stdout.match(/got master pid \["\d+\"\]/i));
    });
  });

  describe('stop all', () => {
    let app;
    let app2;
    let killer;

    beforeEach(function* () {
      yield utils.cleanup(fixturePath);
      app = coffee.fork(eggBin, [ 'start', '--workers=2', '--title=example', fixturePath ]);
      // app.debug();
      app.expect('code', 0);

      app2 = coffee.fork(eggBin, [ 'start', '--workers=2', '--title=test', '--port=7002', fixturePath ]);
      app2.expect('code', 0);

      yield sleep(waitTime);

      assert(app.stderr === '');
      assert(app.stdout.match(/custom-framework started on http:\/\/127\.0\.0\.1:7001/));
      const result = yield httpclient.request('http://127.0.0.1:7001');
      assert(result.data.toString() === 'hi, egg');

      assert(app2.stderr === '');
      assert(app2.stdout.match(/custom-framework started on http:\/\/127\.0\.0\.1:7002/));
      const result2 = yield httpclient.request('http://127.0.0.1:7002');
      assert(result2.data.toString() === 'hi, egg');
    });

    afterEach(function* () {
      app.proc.kill('SIGTERM');
      app2.proc.kill('SIGTERM');
      yield utils.cleanup(fixturePath);
    });

    it('should stop', function* () {
      killer = coffee.fork(eggBin, [ 'stop' ], { cwd: fixturePath });
      killer.debug();
      killer.expect('code', 0);

      // yield killer.end();
      yield sleep(waitTime);

      // make sure is kill not auto exist
      assert(!app.stdout.includes('exist by env'));
      assert(app.stdout.includes('[master] receive signal SIGTERM, closing'));
      assert(app.stdout.includes('[master] exit with code:0'));
      assert(app.stdout.includes('[app_worker] exit with code:0'));
      // assert(app.stdout.includes('[agent_worker] exit with code:0'));
      assert(killer.stdout.includes('[egg-scripts] stopping egg application'));
      assert(killer.stdout.match(/got master pid \["\d+\","\d+\"\]/i));

      assert(!app2.stdout.includes('exist by env'));
      assert(app2.stdout.includes('[master] receive signal SIGTERM, closing'));
      assert(app2.stdout.includes('[master] exit with code:0'));
      assert(app2.stdout.includes('[app_worker] exit with code:0'));
    });
  });

  describe('stop with symlink', () => {
    const baseDir = path.join(__dirname, 'fixtures/tmp');

    beforeEach(function* () {
      yield fs.symlink(fixturePath, baseDir);

      yield utils.cleanup(fixturePath);
      yield rimraf(logDir);
      yield coffee.fork(eggBin, [ 'start', '--daemon', '--workers=2' ], { cwd: baseDir })
        .debug()
        .expect('stdout', new RegExp(`Starting custom-framework application at ${fixturePath}`))
        .expect('code', 0)
        .end();

      yield rimraf(baseDir);
      const result = yield httpclient.request('http://127.0.0.1:7001');
      assert(result.data.toString() === 'hi, egg');
    });
    afterEach(function* () {
      yield utils.cleanup(fixturePath);
      yield rimraf(baseDir);
    });

    it('should stop', function* () {
      yield rimraf(baseDir);
      yield fs.symlink(path.join(__dirname, 'fixtures/status'), baseDir);

      yield coffee.fork(eggBin, [ 'stop', baseDir ])
        .debug()
        .expect('stdout', /\[egg-scripts] stopping egg application/)
        .expect('stdout', /got master pid \["\d+\"\]/i)
        .expect('code', 0)
        .end();
    });
  });

});
