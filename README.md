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
    "start": "egg-scripts start",
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
$ egg-scripts start [options]
# Usage
# egg-scripts start --port=7001
```

**Options:**

- `baseDir` - directory of application, default to `process.cwd()`
- `port` - listening port, default to `process.env.PORT`, if unset, egg will use `7001` as default.
- `workers` - numbers of app workers, default to `process.env.EGG_WORKERS`, if unset, egg will use `os.cpus().length`  as default.
- `daemon` - whether run at daemon mode, default to true, use `--no-daemon` to run at foreground.
- `framework` - specify framework that can be absolute path or npm package, default to auto detect.
- `env` - egg server env, default to `process.env.EGG_SERVER_ENV || prod`

### stop

Stop egg gracefull.

```bash
# stop egg
$ egg-scripts stop [options]
```

**Options:**

- `baseDir` - directory of application, default to `process.cwd()`