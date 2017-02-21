'use strict';

const utils = require('egg-utils');
const BaseCommand = require('common-bin').Command;
const helper = require('./helper');

class Command extends BaseCommand {
  constructor() {
    super();
    this.helper = Object.assign({}, this.helper, helper);
  }

  run(/* cwd, args */) {
    throw new Error('Must impl this method');
  }

  help() {
    console.log('egg-scripts start');
  }

  get utils() {
    return utils;
  }
}

module.exports = Command;