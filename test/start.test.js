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
const awaitEvent = require('await-event');
const isWin = process.platform === 'win32';

describe('test/start.test.js', () => {
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
  afterEach(mm.restore);

  describe('start without daemon', () => {
    describe('full path', () => {
      let app;

      before(function* () {
        yield utils.cleanup(fixturePath);
      });

      afterEach(function* () {
        app.proc.kill('SIGTERM');
        yield utils.cleanup(fixturePath);
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

      it('should get ready', function* () {
        app = coffee.fork(path.join(__dirname, './fixtures/ipc-bin/start.js'), [], {
          env: {
            BASE_DIR: fixturePath,
            PATH: process.env.PATH,
          },
        });
        // app.debug();
        app.expect('code', 0);

        yield sleep(waitTime);

        assert(app.stderr === '');
        assert(app.stdout.includes('READY!!!'));
        assert(app.stdout.includes('--title=egg-server-example'));
        assert(app.stdout.includes('"title":"egg-server-example"'));
        assert(app.stdout.match(/custom-framework started on http:\/\/127\.0\.0\.1:7001/));
        assert(app.stdout.includes('app_worker#2:'));
        assert(!app.stdout.includes('app_worker#3:'));
      });
    });

    describe('child exit with 1', () => {
      let app;

      before(function* () {
        yield utils.cleanup(fixturePath);
      });

      after(function* () {
        app.proc.kill('SIGTERM');
        yield utils.cleanup(fixturePath);
      });

      it('should emit spawn error', function* () {
        const srv = require('http').createServer(() => {});
        srv.listen(7007);

        app = coffee.fork(eggBin, [ 'start', '--port=7007', '--workers=2', fixturePath ]);

        yield sleep(waitTime);
        srv.close();
        assert(app.code === 1);
      });
    });

    describe('relative path', () => {
      let app;

      before(function* () {
        yield utils.cleanup(fixturePath);
      });

      after(function* () {
        app.proc.kill('SIGTERM');
        yield utils.cleanup(fixturePath);
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
        yield utils.cleanup(fixturePath);
      });

      after(function* () {
        app.proc.kill('SIGTERM');
        yield utils.cleanup(fixturePath);
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
        yield utils.cleanup(fixturePath);
      });

      after(function* () {
        app.proc.kill('SIGTERM');
        yield utils.cleanup(fixturePath);
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
        yield utils.cleanup(fixturePath);
      });

      after(function* () {
        app.proc.kill('SIGTERM');
        yield utils.cleanup(fixturePath);
      });

      it('should start', function* () {
        app = coffee.fork(eggBin, [ 'start', '--workers=2', '--title=egg-test', fixturePath ]);
        // app.debug();
        app.expect('code', 0);

        yield sleep(waitTime);

        assert(app.stderr === '');
        assert(app.stdout.includes('--title=egg-test'));
        assert(app.stdout.includes('"title":"egg-test"'));
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
        yield utils.cleanup(fixturePath);
      });

      after(function* () {
        app.proc.kill('SIGTERM');
        yield utils.cleanup(fixturePath);
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
        yield utils.cleanup(fixturePath);
      });

      after(function* () {
        app.proc.kill('SIGTERM');
        yield utils.cleanup(fixturePath);
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
        yield utils.cleanup(fixturePath);
      });

      after(function* () {
        app.proc.kill('SIGTERM');
        yield utils.cleanup(fixturePath);
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
        yield utils.cleanup(fixturePath);
      });

      after(function* () {
        app.proc.kill('SIGTERM');
        yield utils.cleanup(fixturePath);
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
        const appBinPath = path.join(fixturePath, 'node_modules/.bin');
        assert(result.data.toString().startsWith(`${appBinPath}${path.delimiter}`));
      });
    });

    describe('--stdout --stderr', () => {
      let app;

      before(function* () {
        yield utils.cleanup(fixturePath);
        yield rimraf(logDir);
        yield rimraf(path.join(fixturePath, 'start-fail'));
        yield mkdirp(logDir);
      });

      after(function* () {
        app.proc.kill('SIGTERM');
        yield utils.cleanup(fixturePath);
        yield rimraf(path.join(fixturePath, 'stdout.log'));
        yield rimraf(path.join(fixturePath, 'stderr.log'));
        yield rimraf(path.join(fixturePath, 'start-fail'));
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

      it('should start with insecurity --stderr argument', function* () {
        const cwd = path.join(__dirname, 'fixtures/status');
        mm(process.env, 'ERROR', 'error message');

        const stdout = path.join(fixturePath, 'start-fail/stdout.log');
        const stderr = path.join(fixturePath, 'start-fail/stderr.log');
        const malicious = path.join(fixturePath, 'start-fail/malicious');
        app = coffee.fork(eggBin, [
          'start', '--workers=1', '--daemon', `--stdout=${stdout}`,
          `--stderr=${stderr}; touch ${malicious}`,
          cwd,
        ]);
        // app.debug();

        yield sleep(waitTime);

        const content = yield fs.readFile(stdout, 'utf-8');
        assert(!content.match(/custom-framework started on http:\/\/127\.0\.0\.1:7001/));
        let exists = yield fs.exists(stderr);
        assert(!exists);
        exists = yield fs.exists(malicious);
        assert(!exists);
      });
    });

    describe('--node', () => {
      let app;

      beforeEach(function* () {
        yield utils.cleanup(fixturePath);
      });

      beforeEach(function* () {
        app && app.proc && app.proc.kill('SIGTERM');
        yield utils.cleanup(fixturePath);
      });

      describe('daemon', () => {
        it('should start', function* () {
          app = coffee.fork(eggBin, [ 'start', '--daemon', '--framework=yadan', '--workers=2', `--node=${process.execPath}`, fixturePath ]);
          // app.debug();
          app.expect('code', 0);

          yield sleep(waitTime);

          assert(app.stderr === '');
          assert(app.stdout.match(/yadan started on http:\/\/127\.0\.0\.1:7001/));
          const result = yield httpclient.request('http://127.0.0.1:7001');
          assert(result.data.toString() === 'hi, yadan');
        });

        it('should error if node path invalid', function* () {
          app = coffee.fork(eggBin, [ 'start', '--daemon', '--framework=yadan', '--workers=2', '--node=invalid', fixturePath ]);
          // app.debug();
          app.expect('code', 1);

          yield sleep(3000);
          assert(app.stderr.includes('spawn invalid ENOENT'));
        });
      });

      describe('not daemon', () => {
        it('should start', function* () {
          app = coffee.fork(eggBin, [ 'start', '--framework=yadan', '--workers=2', `--node=${process.execPath}`, fixturePath ]);
          // app.debug();
          app.expect('code', 0);

          yield sleep(waitTime);

          assert(app.stderr === '');
          assert(app.stdout.match(/yadan started on http:\/\/127\.0\.0\.1:7001/));
          const result = yield httpclient.request('http://127.0.0.1:7001');
          assert(result.data.toString() === 'hi, yadan');
        });

        it('should error if node path invalid', function* () {
          app = coffee.fork(eggBin, [ 'start', '--framework=yadan', '--workers=2', '--node=invalid', fixturePath ]);
          // app.debug();
          app.expect('code', 1);

          yield sleep(3000);
          assert(app.stderr.includes('spawn invalid ENOENT'));
        });
      });
    });

    describe('read cluster config', () => {
      let app;
      let fixturePath;

      before(function* () {
        fixturePath = path.join(__dirname, 'fixtures/cluster-config');
        yield utils.cleanup(fixturePath);
      });

      after(function* () {
        app.proc.kill('SIGTERM');
        yield utils.cleanup(fixturePath);
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
        yield utils.cleanup(rootDir);
      });

      after(function* () {
        app.proc.kill('SIGTERM');
        yield utils.cleanup(rootDir);
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
      let fixturePath;

      before(function* () {
        fixturePath = path.join(__dirname, 'fixtures/custom-node-dir');
        yield utils.cleanup(fixturePath);
      });

      after(function* () {
        app.proc.kill('SIGTERM');
        yield utils.cleanup(fixturePath);
      });

      it('should start', function* () {
        const expectPATH = [
          path.join(fixturePath, 'node_modules/.bin'),
          path.join(fixturePath, '.node/bin'),
        ].join(path.delimiter) + path.delimiter;
        app = coffee.fork(eggBin, [ 'start', '--workers=2', '--port=7002', fixturePath ]);
        // app.debug();
        app.expect('code', 0);

        yield sleep(waitTime);

        assert(app.stderr === '');
        assert(app.stdout.match(/egg started on http:\/\/127\.0\.0\.1:7002/));
        assert(!app.stdout.includes('app_worker#3:'));
        const result = yield httpclient.request('http://127.0.0.1:7002');
        assert(result.data.toString().startsWith(`hi, ${expectPATH}`));
      });
    });

    describe('kill command', () => {
      let app;

      before(function* () {
        yield utils.cleanup(fixturePath);
      });

      after(function* () {
        yield utils.cleanup(fixturePath);
      });

      it('should wait child process exit', function* () {
        app = coffee.fork(eggBin, [ 'start', '--port=7007', '--workers=2', fixturePath ]);
        yield sleep(waitTime);
        const exitEvent = awaitEvent(app.proc, 'exit');
        app.proc.kill('SIGTERM');
        const code = yield exitEvent;
        assert(code === 0);
      });
    });
  });

  describe('start with daemon', () => {
    let cwd;
    beforeEach(function* () {
      if (cwd) yield utils.cleanup(cwd);
      yield rimraf(logDir);
      yield mkdirp(logDir);
      yield fs.writeFile(path.join(logDir, 'master-stdout.log'), 'just for test');
      yield fs.writeFile(path.join(logDir, 'master-stderr.log'), 'just for test');
    });
    afterEach(function* () {
      yield coffee.fork(eggBin, [ 'stop', cwd ])
      // .debug()
        .end();
      yield utils.cleanup(cwd);
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
      // .debug()
        .expect('stdout', /Starting egg application/)
        .expect('stdout', /egg started on http:\/\/127\.0\.0\.1:7001/)
        .expect('code', 0)
        .end();
    });
  });

  describe('check status', () => {
    let cwd;
    beforeEach(() => {
      cwd = path.join(__dirname, 'fixtures/status');
    });

    after(function* () {
      yield coffee.fork(eggBin, [ 'stop', cwd ])
        // .debug()
        .end();
      yield utils.cleanup(cwd);
    });

    it('should status check success, exit with 0', function* () {
      mm(process.env, 'WAIT_TIME', 5000);
      yield coffee.fork(eggBin, [ 'start', '--daemon', '--workers=1' ], { cwd })
      // .debug()
        .expect('stdout', /Wait Start: 5.../)
        .expect('stdout', /custom-framework started/)
        .expect('code', 0)
        .end();
    });

    it('should status check fail `--ignore-stderr`, exit with 0', function* () {
      mm(process.env, 'WAIT_TIME', 5000);
      mm(process.env, 'ERROR', 'error message');

      let stderr = path.join(homePath, 'logs/master-stderr.log');
      if (isWin) stderr = stderr.replace(/\\/g, '\\\\');

      const app = coffee.fork(eggBin, [ 'start', '--daemon', '--workers=1', '--ignore-stderr' ], { cwd });
      // app.debug();
      // TODO: find a windows replacement for tail command
      if (!isWin) app.expect('stderr', /nodejs.Error: error message/);
      yield app.expect('stderr', new RegExp(`Start got error, see ${stderr}`))
        .expect('code', 0)
        .end();
    });

    it('should status check fail `--ignore-stderr` in package.json, exit with 0', function* () {
      cwd = path.join(__dirname, 'fixtures/egg-scripts-config');
      mm(process.env, 'WAIT_TIME', 5000);
      mm(process.env, 'ERROR', 'error message');

      let stderr = path.join(homePath, 'logs/master-stderr.log');
      if (isWin) stderr = stderr.replace(/\\/g, '\\\\');

      const app = coffee.fork(eggBin, [ 'start' ], { cwd });
      // app.debug();
      // TODO: find a windows replacement for tail command
      if (!isWin) app.expect('stderr', /nodejs.Error: error message/);
      yield app.expect('stderr', new RegExp(`Start got error, see ${stderr}`))
        .expect('code', 0)
        .end();
    });

    it('should status check fail, exit with 1', function* () {
      mm(process.env, 'WAIT_TIME', 5000);
      mm(process.env, 'ERROR', 'error message');

      let stderr = path.join(homePath, 'logs/master-stderr.log');
      if (isWin) stderr = stderr.replace(/\\/g, '\\\\');

      const app = coffee.fork(eggBin, [ 'start', '--daemon', '--workers=1' ], { cwd });
      // app.debug();
      // TODO: find a windows replacement for tail command
      if (!isWin) app.expect('stderr', /nodejs.Error: error message/);
      yield app.expect('stderr', new RegExp(`Start got error, see ${stderr}`))
        .expect('stderr', /Got error when startup/)
        .expect('code', 1)
        .end();
    });

    it('should status check timeout and exit with code 1', function* () {
      mm(process.env, 'WAIT_TIME', 10000);

      yield coffee.fork(eggBin, [ 'start', '--daemon', '--workers=1', '--timeout=5000' ], { cwd })
      // .debug()
        .expect('stdout', /Wait Start: 1.../)
        .expect('stderr', /Start failed, 5s timeout/)
        .expect('code', 1)
        .end();
    });
  });
});
