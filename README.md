# egg-scripts

deploy tool for egg project.

**Note: Windows is partially supported, see [#22](https://github.com/eggjs/egg-scripts/pull/22)**

## Install

```bash
$ npm i egg-scripts --save
```

## Usage

Add `eggctl` to `package.json` scripts:

```json
{
  "scripts": {
    "start": "eggctl start --daemon",
    "stop": "eggctl stop"
  }
}
```

Then run as:

- `npm start`
- `npm stop`

**Note:** `egg-scripts` is not recommended to install global, you should install and use it as npm scripts.

## Command

### start

Start egg at prod mode.

```bash
$ eggctl start [options] [baseDir]
# Usage
# eggctl start --port=7001
# eggctl start ./server
```

- **Arguments**
  - `baseDir` - directory of application, default to `process.cwd()`.
- **Options**
  - `port` - listening port, default to `process.env.PORT`, if unset, egg will use `7001` as default.
  - `title` - process title description, use for kill grep, default to `egg-server-${APP_NAME}`.
  - `workers` - numbers of app workers, default to `process.env.EGG_WORKERS`, if unset, egg will use `os.cpus().length`  as default.
  - `daemon` - whether run at background daemon mode, don't use it if in docker mode.
  - `framework` - specify framework that can be absolute path or npm package, default to auto detect.
  - `env` - server env, default to `process.env.EGG_SERVER_ENV`, recommended to keep empty then use framwork default env.
  - `stdout` - customize stdout file, default to `$HOME/logs/master-stdout.log`.
  - `stderr` - customize stderr file, default to `$HOME/logs/master-stderr.log`.
  - `timeout` - the maximum timeout when app starts, default to 300s.
  - `ignore-stderr` - whether ignore stderr when app starts.
  - `sourcemap` / `typescript` / `ts` - provides source map support for stack traces.
  - `node` - customize node command path, default will find node from $PATH

### stop

Stop egg gracefull.

**Note:** if exec without `--title`, it will kill all egg process.

```bash
$ eggctl stop [options]
# Usage
# eggctl stop --title=example
```

- **Options**
  - `title` - process title description, use for kill grep.
  - `timeout` - the maximum timeout when app stop, default to 5s.

## Options in `package.json`

In addition to the command line specification, options can also be specified in `package.json`. However, the command line designation takes precedence.

```js
{
  "eggScriptsConfig": {
    "port": 1234,
    "ignore-stderr": true,
    // will pass as `node --max-http-header-size=20000`
    "node-options--max-http-header-size": "20000"
  }
}
```


## Questions & Suggestions

Please open an issue [here](https://github.com/eggjs/egg/issues?q=is%3Aissue+is%3Aopen+sort%3Aupdated-desc).

## License

[MIT](LICENSE)

<!-- GITCONTRIBUTOR_START -->

## Contributors

|[<img src="https://avatars.githubusercontent.com/u/227713?v=4" width="100px;"/><br/><sub><b>atian25</b></sub>](https://github.com/atian25)<br/>|[<img src="https://avatars.githubusercontent.com/u/360661?v=4" width="100px;"/><br/><sub><b>popomore</b></sub>](https://github.com/popomore)<br/>|[<img src="https://avatars.githubusercontent.com/u/156269?v=4" width="100px;"/><br/><sub><b>fengmk2</b></sub>](https://github.com/fengmk2)<br/>|[<img src="https://avatars.githubusercontent.com/u/985607?v=4" width="100px;"/><br/><sub><b>dead-horse</b></sub>](https://github.com/dead-horse)<br/>|[<img src="https://avatars.githubusercontent.com/u/2842176?v=4" width="100px;"/><br/><sub><b>XadillaX</b></sub>](https://github.com/XadillaX)<br/>|[<img src="https://avatars.githubusercontent.com/u/19908330?v=4" width="100px;"/><br/><sub><b>hyj1991</b></sub>](https://github.com/hyj1991)<br/>|
| :---: | :---: | :---: | :---: | :---: | :---: |
|[<img src="https://avatars.githubusercontent.com/u/6897780?v=4" width="100px;"/><br/><sub><b>killagu</b></sub>](https://github.com/killagu)<br/>|[<img src="https://avatars.githubusercontent.com/u/17738556?v=4" width="100px;"/><br/><sub><b>BaffinLee</b></sub>](https://github.com/BaffinLee)<br/>|[<img src="https://avatars.githubusercontent.com/u/546535?v=4" width="100px;"/><br/><sub><b>leoner</b></sub>](https://github.com/leoner)<br/>|[<img src="https://avatars.githubusercontent.com/u/4994682?v=4" width="100px;"/><br/><sub><b>plusmancn</b></sub>](https://github.com/plusmancn)<br/>|[<img src="https://avatars.githubusercontent.com/u/19830601?v=4" width="100px;"/><br/><sub><b>shuidian</b></sub>](https://github.com/shuidian)<br/>|[<img src="https://avatars.githubusercontent.com/u/24246985?v=4" width="100px;"/><br/><sub><b>zhennann</b></sub>](https://github.com/zhennann)<br/>|
[<img src="https://avatars.githubusercontent.com/u/8005864?v=4" width="100px;"/><br/><sub><b>liyanlong</b></sub>](https://github.com/liyanlong)<br/>

This project follows the git-contributor [spec](https://github.com/xudafeng/git-contributor), auto updated at `Tue Mar 08 2022 09:52:13 GMT+0800`.

<!-- GITCONTRIBUTOR_END -->
