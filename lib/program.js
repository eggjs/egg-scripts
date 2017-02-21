'use strict';

const path = require('path');
const BaseProgram = require('common-bin').Program;

class Program extends BaseProgram {
  constructor() {
    super();
    this.version = require('../package.json').version;
    this.addCommand('start', path.join(__dirname, 'start_command.js'));
  }
}

module.exports = Program;