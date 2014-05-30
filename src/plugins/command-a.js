'use strict';

module.exports = function (editor) {
  return function (next) {
    if (this.super && this.key.toLowerCase() === 'a') {
      this.prevent();
      editor.caret.selectAll(editor.el);
    } else {
      next();
    }
  };
};
