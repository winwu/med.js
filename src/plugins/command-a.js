'use strict';

module.exports = function (editor) {
  return function (next) {
    if (this.super && this.key === 'a') {
      this.prevent();
      editor.caret.selectAll(editor.el);
    } else {
      next();
    }
  };
};
