'use strict';

module.exports = UndoManager;

function UndoManager(size) {
  this.historySize = size || 50;
  this.history = [];
  this.historyRecordTimer = null;
};

UndoManager.prototype.undo = function () {
  var json = this.history.pop();
  this.fromJSON(json || {});
  this.handleEmpty();
  return json;
};

UndoManager.prototype.record = function (delay) {
  clearTimeout(this.historyRecordTimer);

  var history = this.history;
  var size = this.historySize;
  var len = history.length;

  this.historyRecordTimer = setTimeout(function () {
    if (len >= size) {
      history.shift();
    }
    history.push(this.toJSON());
  }.bind(this), delay | 500);

  return this;
};
