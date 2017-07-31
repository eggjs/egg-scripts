'use strict';

const BaseCommand = require('common-bin');
const Logger = require('zlogger');

class Command extends BaseCommand {
  constructor(rawArgv) {
    super(rawArgv);

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
