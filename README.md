# egg-scripts

deploy tool for egg project.

## Install

```bash
$ npm i egg-scripts --save
```

## Usage

Add `egg-scripts` to `package.json` scripts:

```json
{
  "scripts": {
    "start": "egg-scripts start --daemon",
    "stop": "egg-scripts stop"
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
$ egg-scripts start [options] [baseDir]
# Usage
# egg-scripts start --port=7001
# egg-scripts start ./server
```

- **Arguments**
  - `baseDir` - directory of application, default to `process.cwd()`.
- **Options**
  - `port` - listening port, default to `process.env.PORT`, if unset, egg will use `7001` as default.
  - `title` - process title description, use for kill grep, default to `egg-server-APPNAME`.
  - `workers` - numbers of app workers, default to `process.env.EGG_WORKERS`, if unset, egg will use `os.cpus().length`  as default.
  - `daemon` - whether run at background daemon mode.
  - `framework` - specify framework that can be absolute path or npm package, default to auto detect.
  - `env` - egg server env, default to `process.env.EGG_SERVER_ENV`, recommended to keep empty then use framwork default env.

### stop

Stop egg gracefull.

**Note:** **Windows is not supported yet**, try to kill master process which command contains `start-cluster` or `--title=egg-server` yourself, good luck.

```bash
# stop egg
$ egg-scripts stop [baseDir]
# egg-scripts stop ./server
```

- **Arguments**
  - `baseDir` - directory of application, default to `process.cwd()`.