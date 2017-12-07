'use strict';

const Command = require('../../../../index').StartCommand;

class StartCommand extends Command {
  constructor(rawArgv) {
    super(rawArgv);
    this.failOnStdErr = true;
  }
}

module.exports = StartCommand;
