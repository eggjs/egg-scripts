'use strict';

const BaseCommand = require('common-bin');
const Logger = require('zlogger');
const helper = require('./helper');

class Command extends BaseCommand {
  constructor(rawArgv) {
    super(rawArgv);

    Object.assign(this.helper, helper);

    this.parserOptions = {
      removeAlias: true,
      removeCamelCase: true,
      execArgv: true,
    };

    this.logger = new Logger({
      prefix: '[egg-scripts] ',
      time: false,
    });
  }
}

module.exports = Command;
