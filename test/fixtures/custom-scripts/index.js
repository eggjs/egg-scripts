#!/usr/bin/env node

'use strict';

const path = require('path');
const Command = require('../../../index');

class MainCommand extends Command {
  constructor(rawArgv) {
    super(rawArgv);
    this.load(path.join(__dirname, 'cmd'));
  }
}

new MainCommand().start();
