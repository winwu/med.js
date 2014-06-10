'use strict';

var utils = require('../utils');

module.exports = function (editor) {
  return function (next) {
    if (!this.super) {
      return next();
    }

    if (this.key === 'z') {
      this.prevent();
      this.dontEmitChangedEvent = true;

      editor.canUndo()
        && editor.undo();
    } else if (this.key === 'y') {
      this.prevent();
      this.dontEmitChangedEvent = true;

      editor.canRedo()
        && editor.redo();
    } else {
      return next();
    }

    this.preventEmitChangedEvent = true;
    this.preventEditorDefault = true;
  };
};
