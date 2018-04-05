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

process.platform === 'win32' &&
describe('test/start-win.test.js', () => {
  const eggBin = require.resolve('../bin/egg-scripts.js');
  const fixturePath = path.join(__dirname, 'fixtures/example');
  const homePath = path.join(__dirname, 'fixtures/home');
  const logDir = path.join(homePath, 'logs');
  const waitTime = '10s';
  // const title = 'egg-win-test-c:\\a\\b\\-' + Math.random();
  const title = 'egg-win-test-c:/a/b/-' + Math.random();

  before(function* () {
    yield mkdirp(homePath);
  });
  after(function* () {
    yield rimraf(homePath);
  });
  beforeEach(() => mm(process.env, 'MOCK_HOME_DIR', homePath));
  afterEach(mm.restore);

  describe('start without daemon', () => {
    describe('full path', () => {
      let app;

      before(function* () {
        yield utils.cleanup({ port });
      });

      after(function* () {
        app.proc.kill('SIGTERM');
        yield utils.cleanup({ port });
      });

      it('should start', function* () {
        app = coffee.fork(eggBin, [ 'start', '--workers=2', fixturePath ]);
        // app.debug();
        app.expect('code', 0);

        yield sleep(waitTime);

        assert(app.stderr === '');
        assert(app.stdout.includes('--title=egg-server-example'));
        assert(app.stdout.includes('"title":"egg-server-example"'));
        assert(app.stdout.match(/custom-framework started on http:\/\/127\.0\.0\.1:7001/));
        assert(app.stdout.includes('app_worker#2:'));
        assert(!app.stdout.includes('app_worker#3:'));
        const result = yield httpclient.request('http://127.0.0.1:7001');
        assert(result.data.toString() === 'hi, egg');
      });
    });

    describe('relative path', () => {
      let app;

      before(function* () {
        yield utils.cleanup({ port });
      });

      after(function* () {
        app.proc.kill('SIGTERM');
        yield utils.cleanup({ port });
      });

      it('should start', function* () {
        app = coffee.fork(eggBin, [ 'start', '--workers=2', path.relative(process.cwd(), fixturePath) ]);
        // app.debug();
        app.expect('code', 0);

        yield sleep(waitTime);

        assert(app.stderr === '');
        assert(app.stdout.match(/custom-framework started on http:\/\/127\.0\.0\.1:7001/));
        const result = yield httpclient.request('http://127.0.0.1:7001');
        assert(result.data.toString() === 'hi, egg');
      });
    });

    describe('without baseDir', () => {
      let app;

      before(function* () {
        yield utils.cleanup({ port });
      });

      after(function* () {
        app.proc.kill('SIGTERM');
        yield utils.cleanup({ port });
      });

      it('should start', function* () {
        app = coffee.fork(eggBin, [ 'start', '--workers=2' ], { cwd: fixturePath });
        // app.debug();
        app.expect('code', 0);

        yield sleep(waitTime);

        assert(app.stderr === '');
        assert(app.stdout.match(/custom-framework started on http:\/\/127\.0\.0\.1:7001/));
        const result = yield httpclient.request('http://127.0.0.1:7001');
        assert(result.data.toString() === 'hi, egg');
      });
    });

    describe('--framework', () => {
      let app;

      before(function* () {
        yield utils.cleanup({ port });
      });

      after(function* () {
        app.proc.kill('SIGTERM');
        yield utils.cleanup({ port });
      });

      it('should start', function* () {
        app = coffee.fork(eggBin, [ 'start', '--framework=yadan', '--workers=2', fixturePath ]);
        // app.debug();
        app.expect('code', 0);

        yield sleep(waitTime);

        assert(app.stderr === '');
        assert(app.stdout.match(/yadan started on http:\/\/127\.0\.0\.1:7001/));
        const result = yield httpclient.request('http://127.0.0.1:7001');
        assert(result.data.toString() === 'hi, yadan');
      });
    });

    describe('--title', () => {
      let app;

      before(function* () {
        yield utils.cleanup({ port });
      });

      after(function* () {
        app.proc.kill('SIGTERM');
        yield utils.cleanup({ port });
      });

      it('should start', function* () {
        app = coffee.fork(eggBin, [ 'start', '--workers=2', `--title=${title}`, fixturePath ]);
        // app.debug();
        app.expect('code', 0);

        yield sleep(waitTime);

        assert(app.stderr === '');
        assert(app.stdout.includes(`--title=${title}`));
        assert(app.stdout.includes(`"title":"${title}"`));
        assert(app.stdout.match(/custom-framework started on http:\/\/127\.0\.0\.1:7001/));
        assert(app.stdout.includes('app_worker#2:'));
        assert(!app.stdout.includes('app_worker#3:'));
        const result = yield httpclient.request('http://127.0.0.1:7001');
        assert(result.data.toString() === 'hi, egg');
      });
    });

    describe('--port', () => {
      let app;

      before(function* () {
        yield utils.cleanup({ port: 7002 });
      });

      after(function* () {
        app.proc.kill('SIGTERM');
        yield utils.cleanup({ port: 7002 });
      });

      it('should start', function* () {
        app = coffee.fork(eggBin, [ 'start', '--port=7002', '--workers=2', fixturePath ]);
        // app.debug();
        app.expect('code', 0);

        yield sleep(waitTime);

        assert(app.stderr === '');
        assert(app.stdout.match(/custom-framework started on http:\/\/127\.0\.0\.1:7002/));
        const result = yield httpclient.request('http://127.0.0.1:7002');
        assert(result.data.toString() === 'hi, egg');
      });
    });

    describe('process.env.PORT', () => {
      let app;

      before(function* () {
        yield utils.cleanup({ port: process.env.PORT });
      });

      after(function* () {
        app.proc.kill('SIGTERM');
        yield utils.cleanup({ port: process.env.PORT });
      });

      it('should start', function* () {
        app = coffee.fork(eggBin, [ 'start', '--workers=2', fixturePath ], { env: Object.assign({}, process.env, { PORT: 7002 }) });
        // app.debug();
        app.expect('code', 0);

        yield sleep(waitTime);

        assert(app.stderr === '');
        assert(app.stdout.match(/custom-framework started on http:\/\/127\.0\.0\.1:7002/));
        const result = yield httpclient.request('http://127.0.0.1:7002');
        assert(result.data.toString() === 'hi, egg');
      });
    });

    describe('--env', () => {
      let app;

      before(function* () {
        yield utils.cleanup({ port });
      });

      after(function* () {
        app.proc.kill('SIGTERM');
        yield utils.cleanup({ port });
      });

      it('should start', function* () {
        app = coffee.fork(eggBin, [ 'start', '--workers=2', '--env=pre', fixturePath ]);
        // app.debug();
        app.expect('code', 0);

        yield sleep(waitTime);

        assert(app.stderr === '');
        assert(app.stdout.match(/custom-framework started on http:\/\/127\.0\.0\.1:7001/));
        const result = yield httpclient.request('http://127.0.0.1:7001/env');
        assert(result.data.toString() === 'pre, true');
      });
    });

    describe('custom env', () => {
      let app;

      before(function* () {
        yield utils.cleanup({ port });
      });

      after(function* () {
        app.proc.kill('SIGTERM');
        yield utils.cleanup({ port });
      });

      it('should start', function* () {
        mm(process.env, 'CUSTOM_ENV', 'pre');
        app = coffee.fork(eggBin, [ 'start', '--workers=2', fixturePath ]);
        // app.debug();
        app.expect('code', 0);

        yield sleep(waitTime);

        assert(app.stderr === '');
        assert(app.stdout.includes('## EGG_SERVER_ENV is not pass'));
        assert(app.stdout.includes('## CUSTOM_ENV: pre'));
        assert(app.stdout.match(/custom-framework started on http:\/\/127\.0\.0\.1:7001/));
        let result = yield httpclient.request('http://127.0.0.1:7001/env');
        assert(result.data.toString() === 'pre, true');
        result = yield httpclient.request('http://127.0.0.1:7001/path');
        // assert(result.data.toString().match(new RegExp(`^${fixturePath}/node_modules/.bin${path.delimiter}`)));
        assert(result.data.toString().indexOf(path.join(fixturePath, `/node_modules/.bin${path.delimiter}`)) === 0);
      });
    });

    describe('--stdout --stderr', () => {
      let app;

      before(function* () {
        yield utils.cleanup({ port });
        yield rimraf(logDir);
        yield mkdirp(logDir);
      });

      after(function* () {
        app.proc.kill('SIGTERM');
        yield utils.cleanup({ port });
        yield rimraf(path.join(fixturePath, 'stdout.log'));
        yield rimraf(path.join(fixturePath, 'stderr.log'));
      });

      it('should start', function* () {
        const stdout = path.join(fixturePath, 'stdout.log');
        const stderr = path.join(fixturePath, 'stderr.log');
        app = coffee.fork(eggBin, [ 'start', '--workers=1', '--daemon', `--stdout=${stdout}`, `--stderr=${stderr}`, fixturePath ]);
        // app.debug();
        app.expect('code', 0);

        yield sleep(waitTime);

        let content = yield fs.readFile(stdout, 'utf-8');
        assert(content.match(/custom-framework started on http:\/\/127\.0\.0\.1:7001/));

        content = yield fs.readFile(stderr, 'utf-8');
        assert(content === '');
      });
    });

    describe('read cluster config', () => {
      let app;
      const fixturePath = path.join(__dirname, 'fixtures/cluster-config');

      before(function* () {
        yield utils.cleanup({ port });
      });

      after(function* () {
        app.proc.kill('SIGTERM');
        yield utils.cleanup({ port });
      });

      it('should start', function* () {
        app = coffee.fork(eggBin, [ 'start', '--workers=2', fixturePath ]);
        // app.debug();
        app.expect('code', 0);

        yield sleep(waitTime);

        assert(app.stderr === '');
        assert(app.stdout.match(/egg started on http:\/\/127\.0\.0\.1:8000/));
        assert(!app.stdout.includes('app_worker#3:'));
        const result = yield httpclient.request('http://127.0.0.1:8000');
        assert(result.data.toString() === 'hi, egg');
      });
    });

    describe('subDir as baseDir', () => {
      let app;
      const rootDir = path.join(__dirname, '..');
      const subDir = path.join(__dirname, 'fixtures/subdir-as-basedir/base-dir');

      before(function* () {
        yield utils.cleanup({ port });
      });

      after(function* () {
        app.proc.kill('SIGTERM');
        yield utils.cleanup({ port });
      });

      it('should start', function* () {
        app = coffee.fork(eggBin, [ 'start', '--workers=2', subDir ], { cwd: rootDir });
        // app.debug();
        app.expect('code', 0);

        yield sleep(waitTime);

        assert(app.stderr === '');
        assert(app.stdout.match(/egg started on http:\/\/127\.0\.0\.1:7001/));
        const result = yield httpclient.request('http://127.0.0.1:7001');
        assert(result.data.toString() === 'hi, egg');
      });
    });

    describe('auto set custom node dir to PATH', () => {
      let app;
      const fixturePath = path.join(__dirname, 'fixtures/custom-node-dir');

      before(function* () {
        yield utils.cleanup({ port });
      });

      after(function* () {
        app.proc.kill('SIGTERM');
        yield utils.cleanup({ port });
      });

      it('should start', function* () {
        const expectPATH = [
          path.join(fixturePath, 'node_modules/.bin'),
          path.join(fixturePath, '.node/bin'),
        ].join(path.delimiter) + path.delimiter;
        app = coffee.fork(eggBin, [ 'start', '--workers=2', fixturePath ]);
        app.debug();
        app.expect('code', 0);

        yield sleep(waitTime);

        assert(app.stderr === '');
        assert(app.stdout.match(/egg started on http:\/\/127\.0\.0\.1:7001/));
        assert(!app.stdout.includes('app_worker#3:'));
        const result = yield httpclient.request('http://127.0.0.1:7001');
        assert(result.data.toString().startsWith(`hi, ${expectPATH}`));
      });
    });
  });

  describe('start with daemon', () => {
    let cwd;
    beforeEach(function* () {
      yield utils.cleanup({ port });
      yield utils.cleanup({ port: 7002 });
      yield rimraf(logDir);
      yield mkdirp(logDir);
      yield fs.writeFile(path.join(logDir, 'master-stdout.log'), 'just for test');
      yield fs.writeFile(path.join(logDir, 'master-stderr.log'), 'just for test');
    });
    afterEach(function* () {
      yield coffee.fork(eggBin, [ 'stop', cwd ])
        .debug()
        .end();
      yield utils.cleanup({ port });
      yield utils.cleanup({ port: 7002 });
    });

    it('should start custom-framework', function* () {
      cwd = fixturePath;
      yield coffee.fork(eggBin, [ 'start', '--daemon', '--workers=2', '--port=7002', cwd ])
        // .debug()
        .expect('stdout', /Starting custom-framework application/)
        .expect('stdout', /custom-framework started on http:\/\/127\.0\.0\.1:7002/)
        .expect('code', 0)
        .end();

      // master log
      const stdout = yield fs.readFile(path.join(logDir, 'master-stdout.log'), 'utf-8');
      const stderr = yield fs.readFile(path.join(logDir, 'master-stderr.log'), 'utf-8');
      assert(stderr === '');
      assert(stdout.match(/custom-framework started on http:\/\/127\.0\.0\.1:7002/));

      // should rotate log
      const fileList = yield fs.readdir(logDir);
      assert(fileList.some(name => name.match(/master-stdout\.log\.\d+\.\d+/)));
      assert(fileList.some(name => name.match(/master-stderr\.log\.\d+\.\d+/)));

      const result = yield httpclient.request('http://127.0.0.1:7002');
      assert(result.data.toString() === 'hi, egg');
    });

    it('should start default egg', function* () {
      cwd = path.join(__dirname, 'fixtures/egg-app');
      yield coffee.fork(eggBin, [ 'start', '--daemon', '--workers=2', cwd ])
        .debug()
        .expect('stdout', /Starting egg application/)
        .expect('stdout', /egg started on http:\/\/127\.0\.0\.1:7001/)
        .expect('code', 0)
        .end();
    });
  });

  describe('check status', () => {
    const cwd = path.join(__dirname, 'fixtures/status');

    after(function* () {
      yield coffee.fork(eggBin, [ 'stop', cwd ])
        // .debug()
        .end();
      yield utils.cleanup({ port });
    });

    it('should status check success, exit with 0', function* () {
      mm(process.env, 'WAIT_TIME', 5000);
      const app = coffee.fork(eggBin, [ 'start', '--daemon', '--workers=1' ], { cwd });

      // app.debug();
      yield sleep(waitTime);
      assert(app.stdout.includes('Wait Start: 5...'));
      assert(app.stdout.includes('custom-framework started'));
      app.expect('code', 0);
    });

    it('should status check fail `--ignore-stderr`, exit with 0', function* () {
      mm(process.env, 'WAIT_TIME', 5000);
      mm(process.env, 'ERROR', 'error message');

      const stderr = path.join(homePath, 'logs/master-stderr.log');
      const app = coffee.fork(eggBin, [ 'start', '--daemon', '--workers=1', '--ignore-stderr' ], { cwd });

      // app.debug();
      app.expect('code', 0);
      yield sleep(waitTime);
      assert(app.stderr.includes('Start got error, see ' + stderr));
    });

    it('should status check fail, exit with 1', function* () {
      mm(process.env, 'WAIT_TIME', 5000);
      mm(process.env, 'ERROR', 'error message');

      const stderr = path.join(homePath, 'logs/master-stderr.log');
      const app = coffee.fork(eggBin, [ 'start', '--daemon', '--workers=1' ], { cwd });

      // app.debug();
      yield sleep(waitTime);
      app.expect('code', 1);
      assert(app.stderr.includes('Start got error, see ' + stderr));
    });

    it('should status check timeout and exit with code 1', function* () {
      mm(process.env, 'WAIT_TIME', 10000);
      const app = coffee.fork(eggBin, [ 'start', '--daemon', '--workers=1', '--timeout=5000' ], { cwd });

      // app.debug();
      yield sleep(waitTime);
      assert(app.stdout.includes('Wait Start: 1...'));
      assert(app.stderr.includes('Start failed, 5s timeout'));
      app.expect('code', 1);
    });

  });
});
