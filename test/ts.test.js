'use strict';

const path = require('path');
const assert = require('assert');
const cp = require('child_process');
const sleep = require('mz-modules/sleep');
const rimraf = require('mz-modules/rimraf');
const mkdirp = require('mz-modules/mkdirp');
const coffee = require('coffee');
const httpclient = require('urllib');
const mm = require('mm');
const utils = require('./utils');
const isWin = process.platform === 'win32';

describe('test/ts.test.js', () => {
  const eggBin = require.resolve('../bin/egg-scripts.js');
  const homePath = path.join(__dirname, 'fixtures/home');
  const waitTime = '10s';
  let fixturePath;

  beforeEach(() => mm(process.env, 'MOCK_HOME_DIR', homePath));
  afterEach(mm.restore);

  before(() => mkdirp(homePath));
  after(() => rimraf(homePath));

  describe('should display correct stack traces', () => {
    let app;
    beforeEach(async () => {
      fixturePath = path.join(__dirname, 'fixtures/ts');
      await utils.cleanup(fixturePath);
      const result = cp.spawnSync('npm', [ 'run', isWin ? 'windows-build' : 'build' ], { cwd: fixturePath, shell: isWin });
      assert(!result.stderr.toString());
    });

    afterEach(async () => {
      app && app.proc.kill('SIGTERM');
      await utils.cleanup(fixturePath);
    });

    it('--ts', async () => {
      app = coffee.fork(eggBin, [ 'start', '--workers=1', '--ts', fixturePath ]);
      app.debug();
      app.expect('code', 0);

      await sleep(waitTime);

      assert.equal(app.stderr, '');
      assert(app.stdout.match(/egg started on http:\/\/127\.0\.0\.1:7001/));
      const result = await httpclient.request('http://127.0.0.1:7001', { dataType: 'json' });
      // console.log(result.data);
      assert(result.data.stack.includes(path.normalize('app/controller/home.ts:6:13')));
    });

    it('--typescript', async () => {
      app = coffee.fork(eggBin, [ 'start', '--workers=1', '--typescript', fixturePath ]);
      // app.debug();
      app.expect('code', 0);

      await sleep(waitTime);

      assert.equal(app.stderr, '');
      assert(app.stdout.match(/egg started on http:\/\/127\.0\.0\.1:7001/));
      const result = await httpclient.request('http://127.0.0.1:7001', { dataType: 'json' });
      // console.log(result.data);
      assert(result.data.stack.includes(path.normalize('app/controller/home.ts:6:13')));
    });

    it('--sourcemap', async () => {
      app = coffee.fork(eggBin, [ 'start', '--workers=1', '--sourcemap', fixturePath ]);
      // app.debug();
      app.expect('code', 0);

      await sleep(waitTime);

      assert.equal(app.stderr, '');
      assert(app.stdout.match(/egg started on http:\/\/127\.0\.0\.1:7001/));
      const result = await httpclient.request('http://127.0.0.1:7001', { dataType: 'json' });
      // console.log(result.data);
      assert(result.data.stack.includes(path.normalize('app/controller/home.ts:6:13')));
    });
  });

  describe('pkg.egg.typescript', () => {
    let app;
    beforeEach(async () => {
      fixturePath = path.join(__dirname, 'fixtures/ts-pkg');
      await utils.cleanup(fixturePath);
      const result = cp.spawnSync('npm', [ 'run', isWin ? 'windows-build' : 'build' ], { cwd: fixturePath, shell: isWin });
      assert(!result.stderr.toString());
    });

    afterEach(async () => {
      app && app.proc.kill('SIGTERM');
      await utils.cleanup(fixturePath);
    });

    it('should got correct stack', async () => {
      app = coffee.fork(eggBin, [ 'start', '--workers=1', fixturePath ]);
      // app.debug();
      app.expect('code', 0);

      await sleep(waitTime);

      assert.equal(app.stderr, '');
      assert(app.stdout.match(/egg started on http:\/\/127\.0\.0\.1:7001/));
      const result = await httpclient.request('http://127.0.0.1:7001', { dataType: 'json' });
      // console.log(result.data);
      assert(result.data.stack.includes(path.normalize('app/controller/home.ts:6:13')));
    });
  });
});

