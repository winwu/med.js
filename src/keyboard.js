'use strict';

var utils = require('./utils');

var keyboard = module.exports = {};

keyboard.modifiers = {
  224: 'command',
  91: 'command',
  93: 'command',
  18: 'alt',
  17: 'ctrl',
  16: 'shift'
};

keyboard.map = {
  8: 'backspace',
  9: 'tab',
  13: 'enter',
  20: 'capslock',
  27: 'esc',
  32: 'space',
  37: 'left',
  38: 'up',
  39: 'right',
  40: 'down'
};

keyboard.super = utils.os() === 'mac'
  ? 'command'
  : 'ctrl';
