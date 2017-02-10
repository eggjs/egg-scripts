# egg-scripts

deploy tool for egg project

## 快速入门

<!-- 在此次添加使用文档 -->

如需进一步了解，参见 [egg 文档][egg]。

### 本地开发
```bash
$ npm install
$ npm run dev
```

### 单元测试
- [egg-bin] 内置了 [mocha], [thunk-mocha], [power-assert], [istanbul] 等框架，让你可以专注于写单元测试，无需理会配套工具。
- 断言库非常推荐使用 [power-assert]。
- 具体参见 [egg 文档 -单元测试](https://eggjs.org/zh-cn/core/unittest)。

### 内置指令

- 使用 `npm run lint` 来做代码风格检查。
- 使用 `npm test` 来执行单元测试。
- 使用 `npm run autod` 来自动检测依赖更新，详细参见 [autod](https://www.npmjs.com/package/autod) 。

[mocha]: http://mochajs.org
[thunk-mocha]: https://npmjs.com/thunk-mocha
[power-assert]: https://github.com/power-assert-js/power-assert
[istanbul]: https://github.com/gotwarlost/istanbul
[egg-bin]: https://github.com/eggjs/egg-bin
[egg]: https://eggjs.org