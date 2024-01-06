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

  before(async function() {
    await mkdirp(homePath);
  });
  after(async function() {
    await rimraf(homePath);
  });
  beforeEach(() => mm(process.env, 'MOCK_HOME_DIR', homePath));
  afterEach(mm.restore);

  describe('start without daemon', () => {
    describe('read pkgInfo', () => {
      let app;
      let fixturePath;

      before(async function() {
        fixturePath = path.join(__dirname, 'fixtures/pkg-config');
        await utils.cleanup(fixturePath);
      });

      after(async function() {
        app.proc.kill('SIGTERM');
        await utils.cleanup(fixturePath);
      });

      it('should --require', async function() {
        app = coffee.fork(eggBin, [ 'start', '--workers=1', '--require=./inject2.js' ], { cwd: fixturePath });
        app.debug();
        app.expect('code', 0);

        await sleep(waitTime);

        assert(app.stderr === '');
        assert(app.stdout.match(/@@@ inject script/));
        assert(app.stdout.match(/@@@ inject script1/));
        assert(app.stdout.match(/@@@ inject script2/));
      });

      it('inject incorrect script', async function() {
        const script = './inject3.js';
        app = coffee.fork(eggBin, [ 'start', '--workers=1', `--require=${script}` ], { cwd: fixturePath });
        app.debug();
        app.expect('code', 0);

        await sleep(waitTime);

        assert(app.stderr.includes(`Cannot find module '${path.join(fixturePath, script)}'`));
      });
    });

    describe('sourcemap default value should respect eggScriptConfig', () => {
      let app;
      let fixturePath;

      before(async function() {
        fixturePath = path.join(__dirname, 'fixtures/pkg-config-sourcemap');
        await utils.cleanup(fixturePath);
      });

      after(async function() {
        app.proc.kill('SIGTERM');
        await utils.cleanup(fixturePath);
      });

      it('should not enable sourcemap-support', async function() {
        app = coffee.fork(eggBin, [ 'start', '--workers=1' ], { cwd: fixturePath });
        app.debug();
        app.expect('code', 0);

        await sleep(waitTime);
        assert(!/--require .*\/node_modules\/.*source-map-support/.test(app.stdout));
      });
    });

    describe('full path', () => {
      let app;

      before(async function() {
        await utils.cleanup(fixturePath);
      });

      afterEach(async function() {
        app.proc.kill('SIGTERM');
        await utils.cleanup(fixturePath);
      });

      it('should start', async function() {
        app = coffee.fork(eggBin, [ 'start', '--workers=2', fixturePath ]);
        app.debug();
        app.expect('code', 0);

        await sleep(waitTime);

        assert(app.stderr === '');
        assert(!app.stdout.includes('DeprecationWarning:'));
        assert(app.stdout.includes('--title=egg-server-example'));
        assert(app.stdout.includes('"title":"egg-server-example"'));
        assert(app.stdout.match(/custom-framework started on http:\/\/127\.0\.0\.1:7001/));
        assert(app.stdout.includes('app_worker#2:'));
        assert(!app.stdout.includes('app_worker#3:'));
        const result = await httpclient.request('http://127.0.0.1:7001');
        assert(result.data.toString() === 'hi, egg');
      });

      it('should start --trace-warnings work', async function() {
        app = coffee.fork(eggBin, [ 'start', '--workers=1', path.join(__dirname, 'fixtures/trace-warnings') ]);
        app.debug();
        app.expect('code', 0);

        await sleep(waitTime);

        assert(app.stderr.includes('MaxListenersExceededWarning:'));
        assert(app.stderr.includes('app.js:10:9')); // should had trace
        assert(!app.stdout.includes('DeprecationWarning:'));
      });

      it.skip('should get ready', async function() {
        app = coffee.fork(path.join(__dirname, './fixtures/ipc-bin/start.js'), [], {
          env: {
            BASE_DIR: fixturePath,
            PATH: process.env.PATH,
          },
        });
        app.debug();
        app.expect('code', 0);

        await sleep(waitTime);

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

      before(async function() {
        await utils.cleanup(fixturePath);
      });

      after(async function() {
        app.proc.kill('SIGTERM');
        await utils.cleanup(fixturePath);
      });

      it('should emit spawn error', async function() {
        const srv = require('http').createServer(() => {});
        srv.listen(7007);

        app = coffee.fork(eggBin, [ 'start', '--port=7007', '--workers=2', fixturePath ]);

        await sleep(waitTime);
        srv.close();
        assert(app.code === 1);
      });
    });

    describe('relative path', () => {
      let app;

      before(async function() {
        await utils.cleanup(fixturePath);
      });

      after(async function() {
        app.proc.kill('SIGTERM');
        await utils.cleanup(fixturePath);
      });

      it('should start', async function() {
        app = coffee.fork(eggBin, [ 'start', '--workers=2', path.relative(process.cwd(), fixturePath) ]);
        // app.debug();
        app.expect('code', 0);

        await sleep(waitTime);

        assert(app.stderr === '');
        assert(app.stdout.match(/custom-framework started on http:\/\/127\.0\.0\.1:7001/));
        const result = await httpclient.request('http://127.0.0.1:7001');
        assert(result.data.toString() === 'hi, egg');
      });
    });

    describe('without baseDir', () => {
      let app;

      before(async function() {
        await utils.cleanup(fixturePath);
      });

      after(async function() {
        app.proc.kill('SIGTERM');
        await utils.cleanup(fixturePath);
      });

      it('should start', async function() {
        app = coffee.fork(eggBin, [ 'start', '--workers=2' ], { cwd: fixturePath });
        // app.debug();
        app.expect('code', 0);

        await sleep(waitTime);

        assert(app.stderr === '');
        assert(app.stdout.match(/custom-framework started on http:\/\/127\.0\.0\.1:7001/));
        const result = await httpclient.request('http://127.0.0.1:7001');
        assert(result.data.toString() === 'hi, egg');
      });
    });

    describe('--framework', () => {
      let app;

      before(async function() {
        await utils.cleanup(fixturePath);
      });

      after(async function() {
        app.proc.kill('SIGTERM');
        await utils.cleanup(fixturePath);
      });

      it('should start', async function() {
        app = coffee.fork(eggBin, [ 'start', '--framework=yadan', '--workers=2', fixturePath ]);
        // app.debug();
        app.expect('code', 0);

        await sleep(waitTime);

        assert(app.stderr === '');
        assert(app.stdout.match(/yadan started on http:\/\/127\.0\.0\.1:7001/));
        const result = await httpclient.request('http://127.0.0.1:7001');
        assert(result.data.toString() === 'hi, yadan');
      });
    });

    describe('--title', () => {
      let app;

      before(async function() {
        await utils.cleanup(fixturePath);
      });

      after(async function() {
        app.proc.kill('SIGTERM');
        await utils.cleanup(fixturePath);
      });

      it('should start', async function() {
        app = coffee.fork(eggBin, [ 'start', '--workers=2', '--title=egg-test', fixturePath ]);
        // app.debug();
        app.expect('code', 0);

        await sleep(waitTime);

        assert(app.stderr === '');
        assert(app.stdout.includes('--title=egg-test'));
        assert(app.stdout.includes('"title":"egg-test"'));
        assert(app.stdout.match(/custom-framework started on http:\/\/127\.0\.0\.1:7001/));
        assert(app.stdout.includes('app_worker#2:'));
        assert(!app.stdout.includes('app_worker#3:'));
        const result = await httpclient.request('http://127.0.0.1:7001');
        assert(result.data.toString() === 'hi, egg');
      });
    });

    describe('--port', () => {
      let app;

      before(async function() {
        await utils.cleanup(fixturePath);
      });

      after(async function() {
        app.proc.kill('SIGTERM');
        await utils.cleanup(fixturePath);
      });

      it('should start', async function() {
        app = coffee.fork(eggBin, [ 'start', '--port=7002', '--workers=2', fixturePath ]);
        // app.debug();
        app.expect('code', 0);

        await sleep(waitTime);

        assert(app.stderr === '');
        assert(app.stdout.match(/custom-framework started on http:\/\/127\.0\.0\.1:7002/));
        const result = await httpclient.request('http://127.0.0.1:7002');
        assert(result.data.toString() === 'hi, egg');
      });
    });

    describe('process.env.PORT', () => {
      let app;

      before(async function() {
        await utils.cleanup(fixturePath);
      });

      after(async function() {
        app.proc.kill('SIGTERM');
        await utils.cleanup(fixturePath);
      });

      it('should start', async function() {
        app = coffee.fork(eggBin, [ 'start', '--workers=2', fixturePath ], { env: Object.assign({}, process.env, { PORT: 7002 }) });
        // app.debug();
        app.expect('code', 0);

        await sleep(waitTime);

        assert(app.stderr === '');
        assert(app.stdout.match(/custom-framework started on http:\/\/127\.0\.0\.1:7002/));
        const result = await httpclient.request('http://127.0.0.1:7002');
        assert(result.data.toString() === 'hi, egg');
      });
    });

    describe('--env', () => {
      let app;

      before(async function() {
        await utils.cleanup(fixturePath);
      });

      after(async function() {
        app.proc.kill('SIGTERM');
        await utils.cleanup(fixturePath);
      });

      it('should start', async function() {
        app = coffee.fork(eggBin, [ 'start', '--workers=2', '--env=pre', fixturePath ]);
        // app.debug();
        app.expect('code', 0);

        await sleep(waitTime);

        assert(app.stderr === '');
        assert(app.stdout.match(/custom-framework started on http:\/\/127\.0\.0\.1:7001/));
        const result = await httpclient.request('http://127.0.0.1:7001/env');
        assert(result.data.toString() === 'pre, true');
      });
    });

    describe('custom env', () => {
      let app;

      before(async function() {
        await utils.cleanup(fixturePath);
      });

      after(async function() {
        app.proc.kill('SIGTERM');
        await utils.cleanup(fixturePath);
      });

      it('should start', async function() {
        mm(process.env, 'CUSTOM_ENV', 'pre');
        app = coffee.fork(eggBin, [ 'start', '--workers=2', fixturePath ]);
        // app.debug();
        app.expect('code', 0);

        await sleep(waitTime);

        assert(app.stderr === '');
        assert(app.stdout.includes('## EGG_SERVER_ENV is not pass'));
        assert(app.stdout.includes('## CUSTOM_ENV: pre'));
        assert(app.stdout.match(/custom-framework started on http:\/\/127\.0\.0\.1:7001/));
        let result = await httpclient.request('http://127.0.0.1:7001/env');
        assert(result.data.toString() === 'pre, true');
        result = await httpclient.request('http://127.0.0.1:7001/path');
        const appBinPath = path.join(fixturePath, 'node_modules/.bin');
        assert(result.data.toString().startsWith(`${appBinPath}${path.delimiter}`));
      });
    });

    describe('--stdout --stderr', () => {
      let app;

      before(async function() {
        await utils.cleanup(fixturePath);
        await rimraf(logDir);
        await rimraf(path.join(fixturePath, 'start-fail'));
        await mkdirp(logDir);
      });

      after(async function() {
        app.proc.kill('SIGTERM');
        await utils.cleanup(fixturePath);
        await rimraf(path.join(fixturePath, 'stdout.log'));
        await rimraf(path.join(fixturePath, 'stderr.log'));
        await rimraf(path.join(fixturePath, 'start-fail'));
      });

      it('should start', async function() {
        const stdout = path.join(fixturePath, 'stdout.log');
        const stderr = path.join(fixturePath, 'stderr.log');
        app = coffee.fork(eggBin, [ 'start', '--workers=1', '--daemon', `--stdout=${stdout}`, `--stderr=${stderr}`, fixturePath ]);
        // app.debug();
        app.expect('code', 0);

        await sleep(waitTime);

        let content = await fs.readFile(stdout, 'utf-8');
        assert(content.match(/custom-framework started on http:\/\/127\.0\.0\.1:7001/));

        content = await fs.readFile(stderr, 'utf-8');
        assert(content === '');
      });

      it('should start with insecurity --stderr argument', async function() {
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

        await sleep(waitTime);

        const content = await fs.readFile(stdout, 'utf-8');
        assert(!content.match(/custom-framework started on http:\/\/127\.0\.0\.1:7001/));
        let exists = await fs.exists(stderr);
        assert(!exists);
        exists = await fs.exists(malicious);
        assert(!exists);
      });
    });

    describe('--node', () => {
      let app;

      beforeEach(async function() {
        await utils.cleanup(fixturePath);
      });

      beforeEach(async function() {
        app && app.proc && app.proc.kill('SIGTERM');
        await utils.cleanup(fixturePath);
      });

      describe('daemon', () => {
        it('should start', async function() {
          app = coffee.fork(eggBin, [ 'start', '--daemon', '--framework=yadan', '--workers=2', `--node=${process.execPath}`, fixturePath ]);
          // app.debug();
          app.expect('code', 0);

          await sleep(waitTime);

          assert(app.stderr === '');
          assert(app.stdout.match(/yadan started on http:\/\/127\.0\.0\.1:7001/));
          const result = await httpclient.request('http://127.0.0.1:7001');
          assert(result.data.toString() === 'hi, yadan');
        });

        it('should error if node path invalid', async function() {
          app = coffee.fork(eggBin, [ 'start', '--daemon', '--framework=yadan', '--workers=2', '--node=invalid', fixturePath ]);
          // app.debug();
          app.expect('code', 1);

          await sleep(3000);
          assert(app.stderr.includes('spawn invalid ENOENT'));
        });
      });

      describe('not daemon', () => {
        it('should start', async function() {
          app = coffee.fork(eggBin, [ 'start', '--framework=yadan', '--workers=2', `--node=${process.execPath}`, fixturePath ]);
          // app.debug();
          app.expect('code', 0);

          await sleep(waitTime);

          assert(app.stderr === '');
          assert(app.stdout.match(/yadan started on http:\/\/127\.0\.0\.1:7001/));
          const result = await httpclient.request('http://127.0.0.1:7001');
          assert(result.data.toString() === 'hi, yadan');
        });

        it('should error if node path invalid', async function() {
          app = coffee.fork(eggBin, [ 'start', '--framework=yadan', '--workers=2', '--node=invalid', fixturePath ]);
          // app.debug();
          app.expect('code', 1);

          await sleep(3000);
          assert(app.stderr.includes('spawn invalid ENOENT'));
        });
      });
    });

    describe('read cluster config', () => {
      let app;
      let fixturePath;

      before(async function() {
        fixturePath = path.join(__dirname, 'fixtures/cluster-config');
        await utils.cleanup(fixturePath);
      });

      after(async function() {
        app.proc.kill('SIGTERM');
        await utils.cleanup(fixturePath);
      });

      it('should start', async function() {
        app = coffee.fork(eggBin, [ 'start', '--workers=2', fixturePath ]);
        // app.debug();
        app.expect('code', 0);

        await sleep(waitTime);

        assert(app.stderr === '');
        assert(app.stdout.match(/egg started on http:\/\/127\.0\.0\.1:8000/));
        assert(!app.stdout.includes('app_worker#3:'));
        const result = await httpclient.request('http://127.0.0.1:8000');
        assert(result.data.toString() === 'hi, egg');
      });
    });

    describe('read eggScriptsConfig', () => {
      let app;
      let fixturePath;

      before(async function() {
        fixturePath = path.join(__dirname, 'fixtures/egg-scripts-node-options');
        await utils.cleanup(fixturePath);
      });

      after(async function() {
        app.proc.kill('SIGTERM');
        await utils.cleanup(fixturePath);
      });

      it('should start', async function() {
        app = coffee.fork(eggBin, [ 'start', '--workers=1', fixturePath ]);
        app.debug();
        app.expect('code', 0);

        await sleep(waitTime);

        assert(app.stderr === '');
        assert(app.stdout.match(/maxHeaderSize: 20000/));
      });
    });

    describe('subDir as baseDir', () => {
      let app;
      const rootDir = path.join(__dirname, '..');
      const subDir = path.join(__dirname, 'fixtures/subdir-as-basedir/base-dir');

      before(async function() {
        await utils.cleanup(rootDir);
      });

      after(async function() {
        app.proc.kill('SIGTERM');
        await utils.cleanup(rootDir);
      });

      it('should start', async function() {
        app = coffee.fork(eggBin, [ 'start', '--workers=2', subDir ], { cwd: rootDir });
        // app.debug();
        app.expect('code', 0);

        await sleep(waitTime);

        assert(app.stderr === '');
        assert(app.stdout.match(/egg started on http:\/\/127\.0\.0\.1:7001/));
        const result = await httpclient.request('http://127.0.0.1:7001');
        assert(result.data.toString() === 'hi, egg');
      });
    });

    describe('auto set custom node dir to PATH', () => {
      let app;
      let fixturePath;

      before(async function() {
        fixturePath = path.join(__dirname, 'fixtures/custom-node-dir');
        await utils.cleanup(fixturePath);
      });

      after(async function() {
        app.proc.kill('SIGTERM');
        await utils.cleanup(fixturePath);
      });

      it('should start', async function() {
        const expectPATH = [
          path.join(fixturePath, 'node_modules/.bin'),
          path.join(fixturePath, '.node/bin'),
        ].join(path.delimiter) + path.delimiter;
        app = coffee.fork(eggBin, [ 'start', '--workers=2', '--port=7002', fixturePath ]);
        // app.debug();
        app.expect('code', 0);

        await sleep(waitTime);

        assert(app.stderr === '');
        assert(app.stdout.match(/egg started on http:\/\/127\.0\.0\.1:7002/));
        assert(!app.stdout.includes('app_worker#3:'));
        const result = await httpclient.request('http://127.0.0.1:7002');
        assert(result.data.toString().startsWith(`hi, ${expectPATH}`));
      });
    });

    describe('kill command', () => {
      let app;

      before(async function() {
        await utils.cleanup(fixturePath);
      });

      after(async function() {
        await utils.cleanup(fixturePath);
      });

      it('should wait child process exit', async function() {
        app = coffee.fork(eggBin, [ 'start', '--port=7007', '--workers=2', fixturePath ]);
        await sleep(waitTime);
        const exitEvent = awaitEvent(app.proc, 'exit');
        app.proc.kill('SIGTERM');
        const code = await exitEvent;
        if (isWin) {
          assert(code === null);
        } else {
          assert(code === 0);
        }
      });
    });
  });

  describe('start with daemon', () => {
    let cwd;
    beforeEach(async function() {
      if (cwd) await utils.cleanup(cwd);
      await rimraf(logDir);
      await mkdirp(logDir);
      await fs.writeFile(path.join(logDir, 'master-stdout.log'), 'just for test');
      await fs.writeFile(path.join(logDir, 'master-stderr.log'), 'just for test');
    });
    afterEach(async function() {
      await coffee.fork(eggBin, [ 'stop', cwd ])
      // .debug()
        .end();
      await utils.cleanup(cwd);
    });

    it('should start custom-framework', async function() {
      cwd = fixturePath;
      await coffee.fork(eggBin, [ 'start', '--daemon', '--workers=2', '--port=7002', cwd ])
      // .debug()
        .expect('stdout', /Starting custom-framework application/)
        .expect('stdout', /custom-framework started on http:\/\/127\.0\.0\.1:7002/)
        .expect('code', 0)
        .end();

      // master log
      const stdout = await fs.readFile(path.join(logDir, 'master-stdout.log'), 'utf-8');
      const stderr = await fs.readFile(path.join(logDir, 'master-stderr.log'), 'utf-8');
      assert(stderr === '');
      assert(stdout.match(/custom-framework started on http:\/\/127\.0\.0\.1:7002/));

      // should rotate log
      const fileList = await fs.readdir(logDir);
      assert(fileList.some(name => name.match(/master-stdout\.log\.\d+\.\d+/)));
      assert(fileList.some(name => name.match(/master-stderr\.log\.\d+\.\d+/)));

      const result = await httpclient.request('http://127.0.0.1:7002');
      assert(result.data.toString() === 'hi, egg');
    });

    it('should start default egg', async function() {
      cwd = path.join(__dirname, 'fixtures/egg-app');
      await coffee.fork(eggBin, [ 'start', '--daemon', '--workers=2', cwd ])
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

    after(async function() {
      await coffee.fork(eggBin, [ 'stop', cwd ])
        // .debug()
        .end();
      await utils.cleanup(cwd);
    });

    it('should status check success, exit with 0', async function() {
      mm(process.env, 'WAIT_TIME', 5000);
      await coffee.fork(eggBin, [ 'start', '--daemon', '--workers=1' ], { cwd })
      // .debug()
        .expect('stdout', /Wait Start: 5.../)
        .expect('stdout', /custom-framework started/)
        .expect('code', 0)
        .end();
    });

    it('should status check fail `--ignore-stderr`, exit with 0', async function() {
      mm(process.env, 'WAIT_TIME', 5000);
      mm(process.env, 'ERROR', 'error message');

      let stderr = path.join(homePath, 'logs/master-stderr.log');
      if (isWin) stderr = stderr.replace(/\\/g, '\\\\');

      const app = coffee.fork(eggBin, [ 'start', '--daemon', '--workers=1', '--ignore-stderr' ], { cwd });
      // app.debug();
      // TODO: find a windows replacement for tail command
      if (!isWin) app.expect('stderr', /nodejs.Error: error message/);
      await app.expect('stderr', new RegExp(`Start got error, see ${stderr}`))
        .expect('code', 0)
        .end();
    });

    it('should status check fail `--ignore-stderr` in package.json, exit with 0', async function() {
      cwd = path.join(__dirname, 'fixtures/egg-scripts-config');
      mm(process.env, 'WAIT_TIME', 5000);
      mm(process.env, 'ERROR', 'error message');

      let stderr = path.join(homePath, 'logs/master-stderr.log');
      if (isWin) stderr = stderr.replace(/\\/g, '\\\\');

      const app = coffee.fork(eggBin, [ 'start' ], { cwd });
      // app.debug();
      // TODO: find a windows replacement for tail command
      if (!isWin) app.expect('stderr', /nodejs.Error: error message/);
      await app.expect('stderr', new RegExp(`Start got error, see ${stderr}`))
        .expect('code', 0)
        .end();
    });

    it('should status check fail, exit with 1', async function() {
      mm(process.env, 'WAIT_TIME', 5000);
      mm(process.env, 'ERROR', 'error message');

      let stderr = path.join(homePath, 'logs/master-stderr.log');
      if (isWin) stderr = stderr.replace(/\\/g, '\\\\');

      const app = coffee.fork(eggBin, [ 'start', '--daemon', '--workers=1' ], { cwd });
      // app.debug();
      // TODO: find a windows replacement for tail command
      if (!isWin) app.expect('stderr', /nodejs.Error: error message/);
      await app.expect('stderr', new RegExp(`Start got error, see ${stderr}`))
        .expect('stderr', /Got error when startup/)
        .expect('code', 1)
        .end();
    });

    it('should status check timeout and exit with code 1', async function() {
      mm(process.env, 'WAIT_TIME', 10000);

      await coffee.fork(eggBin, [ 'start', '--daemon', '--workers=1', '--timeout=5000' ], { cwd })
      // .debug()
        .expect('stdout', /Wait Start: 1.../)
        .expect('stderr', /Start failed, 5s timeout/)
        .expect('code', 1)
        .end();
    });
  });
});
