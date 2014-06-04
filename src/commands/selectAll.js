'use strict';

module.exports = function (editor) {
  editor.defineCommand('selectAll', function () {
    editor.caret.selectAll();
    return true;
  });
};
