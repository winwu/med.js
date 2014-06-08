'use strict';

var utils = require('../utils');

module.exports = function (editor) {
  editor.undoManager.save(editor.toJSON());

  editor.on('changed', function (data) {
    if (data.get('tag') === 'section') {
      // 等所有鄧作執行完再儲存
      setTimeout(function () {
        editor.undoManager.save(editor.toJSON());
      });
    };
  });

  return function (next) {
    if (!this.super) {
      return next();
    }

    if (this.key === 'z') {
      editor.canUndo()
        && editor.undo();
    } else if (this.key === 'y') {
      editor.canRedo()
        && editor.redo();
    } else {
      next();
    }
  };
};
