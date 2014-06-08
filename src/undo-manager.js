'use strict';

module.exports = UndoManager;

function UndoManager(max) {
  this.max = (max | 0) || 50;
  this.stack = [];
  this.stackPosition = 0;
}

UndoManager.prototype.at = function (index) {
  return this.stack[index | 0];
};

UndoManager.prototype.save = function (data) {
  var stack = this.stack;
  var position = this.stackPosition;
  var numberOfDataShouldBeDeleted = stack.length - this.stackPosition;

  stack.splice(this.stackPosition, numberOfDataShouldBeDeleted, data);
  this.stackPosition = stack.length;

  return this;
};

UndoManager.prototype.canUndo = function () {
  return this.stackPosition > 0;
};

UndoManager.prototype.undo = function () {
  this.stackPosition -= 1;
  return this.stack[this.stackPosition];
};

UndoManager.prototype.canRedo = function () {
  return this.stackPosition < this.length - 1;
};

UndoManager.prototype.redo = function () {
  this.stackPosition += 1;
  return this.stack[this.stackPosition];
};
