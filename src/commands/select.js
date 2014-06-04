'use strict';

module.exports = function (editor) {
  editor.defineCommand('select', function () {
    var caret = editor.caret;
    caret.select.call(caret, arguments);
    return true;
  });
};
