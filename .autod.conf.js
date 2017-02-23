'use strict';

module.exports = {
  write: true,
  prefix: '^',
  test: [
    'test',
    'benchmark',
  ],
  dep: [
  ],
  devdep: [
    'egg',
    'egg-ci',
    'egg-bin',
    'coffee',
    'mm',
    'autod',
    'eslint',
    'eslint-config-egg',
    'supertest',
    'webstorm-disable-index',
  ],
  exclude: [
    './test/fixtures',
    './dist',
  ],
  registry: 'https://r.cnpmjs.org',
};
