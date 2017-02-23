'use strict';

const path = require('path');
const assert = require('assert');
const fs = require('mz/fs');
const sleep = require('mz-modules/sleep');
const rimraf = require('mz-modules/rimraf');
const mkdirp = require('mz-modules/mkdirp');
const coffee = require('coffee');
const mm = require('mm');
const homedir = require('node-homedir');

describe('test/start.test.js', () => {
  const eggBin = require.resolve('../bin/egg-scripts.js');
  const fixturePath = path.join(__dirname, 'fixtures/example');
  const homePath = homedir();

  describe('start with no-daemon', () => {
    let app;

    after(function* () {
      mm.restore();
      console.log('kill by mocha after');
      app.proc.kill('SIGTERM');
      yield sleep(5000);
    });

    it('should start', function* () {
      mm(process.env, 'TEST_EXIT', '15000');

      app = coffee.fork(eggBin, [ 'start', '--no-daemon', '--framework=custom-framework', '--workers=2', fixturePath ]);
      app
        // .debug()
        // .coverage(false)
        .expect('code', 0);

      yield sleep('10s');

      assert(app.stdout.match(/custom-framework started on http:\/\/127\.0\.0\.1:7001/));
      assert(!app.stdout.includes('exist by env'));
      assert(app.stderr === '');
    });
  });

  describe('start at relative baseDir', () => {
    let app;

    after(function* () {
      mm.restore();
      console.log('kill by mocha after');
      app.proc.kill('SIGTERM');
      yield sleep(5000);
    });

    it('should start', function* () {
      mm(process.env, 'TEST_EXIT', '15000');

      app = coffee.fork(eggBin, [ 'start', '--no-daemon', '--framework=custom-framework', '--workers=2', path.relative(process.cwd(), fixturePath) ]);
      app
        // .debug()
        // .coverage(false)
        .expect('code', 0);

      yield sleep('10s');

      assert(app.stdout.includes(`[egg-scripts] Starting egg application at ${fixturePath}`));
      assert(app.stdout.match(/custom-framework started on http:\/\/127\.0\.0\.1:7001/));
      assert(!app.stdout.includes('exist by env'));
      assert(app.stderr === '');
    });
  });

  describe('start with --baseDir', () => {
    let app;

    after(function* () {
      mm.restore();
      console.log('kill by mocha after');
      app.proc.kill('SIGTERM');
      yield sleep(5000);
    });

    it('should start', function* () {
      mm(process.env, 'TEST_EXIT', '15000');

      app = coffee.fork(eggBin, [ 'start', '--no-daemon', '--framework=custom-framework', '--workers=2', '--baseDir=' + path.relative(process.cwd(), fixturePath) ]);
      app
        // .debug()
        // .coverage(false)
        .expect('code', 0);

      yield sleep('10s');

      assert(app.stdout.includes(`[egg-scripts] Starting egg application at ${fixturePath}`));
      assert(app.stdout.match(/custom-framework started on http:\/\/127\.0\.0\.1:7001/));
      assert(!app.stdout.includes('exist by env'));
      assert(app.stderr === '');
    });
  });

  describe('start with daemon', () => {
    let app;
    const logDir = path.join(homePath, 'logs/example');

    before(function* () {
      yield rimraf(logDir);
      yield mkdirp(logDir);
      yield fs.writeFile(path.join(logDir, 'master-stdout.log'), 'just for test');
      yield fs.writeFile(path.join(logDir, 'master-stderr.log'), 'just for test');
    });

    after(function* () {
      mm.restore();
      console.log('kill by mocha after');
      app.proc.kill('SIGTERM');
      yield sleep(5000);
    });

    it('should start', function* () {
      mm(process.env, 'TEST_EXIT', '15000');

      app = coffee.fork(eggBin, [ 'start', '--framework=custom-framework', '--workers=2', fixturePath ]);
      app
        // .debug()
        .coverage(false)
        .expect('code', 0);

      yield sleep('10s');

      assert(app.stdout.match(/Starting egg.*example/));

      const stdout = yield fs.readFile(path.join(logDir, 'master-stdout.log'), 'utf-8');
      const stderr = yield fs.readFile(path.join(logDir, 'master-stderr.log'), 'utf-8');
      assert(stdout.match(/custom-framework started on http:\/\/127\.0\.0\.1:7001/));
      assert(!stdout.includes('exist by env'));
      assert(stderr === '');
      // should rotate log
      const fileList = yield fs.readdir(logDir);
      assert(fileList.some(name => name.match(/master-stdout\.log\.\d+\.\d+/)));
      assert(fileList.some(name => name.match(/master-stderr\.log\.\d+\.\d+/)));
    });
  });

  describe.skip('with EGG_WORKERS env', () => {
    let app;

    after(function* () {
      mm.restore();
      app.proc.kill('SIGTERM');
      yield sleep(1000);
    });

    it('should start', done => {
      mm(process.env, 'EGG_WORKERS', '2');
      mm(process.env, 'NODE_ENV', 'development');
      mm(process.env, 'PWD', fixturePath);
      mm(process.env, 'HOME', process.env.PWD);
      app = coffee.fork(eggBin, [ 'start', '--no-daemon' ]);
      app
        // .debug()
        .coverage(false)
        .expect('code', 0);

      setTimeout(() => {
        assert(app.stdout.match(/"workers":2,/));
        assert(app.stdout.match(/custom-framework started on http:\/\/127\.0\.0\.1:7001/));
        done();
      }, 5000);
    });
  });
});
