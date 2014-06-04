'use strict';

module.exports = Command;

function Command() {
  this.commands = {};
}

Command.prototype.defineCommand = function (command, handler) {
  this.commands[command] = handler;
  return this;
};

Command.prototype.execCommand = function () {
  var args = Array.prototype.slice.call(arguments);
  var name = args.shift();
  var command = this.commands[name];

  if (!command) {
    throw new Error('Command not found.');
  }

  return command.apply(this, args);
};
