'use strict';

var utils = require('../utils');

module.exports = function (editor) {
  return function (next) {
    var selection = document.getSelection();
    var range = selection.getRangeAt(0);

    // 有選取內容
    if (!range.collapsed && !this.modifier) {
      range.deleteContents();

      if (utils.isEmpty(editor.el)) {
        editor.el.innerHTML = '<section><p><br type="_med_placeholder" /></p></section>';
        editor.caret.focusTo(editor.el);
        // focus 到第一個 <p>
        editor.caret.focusTo(editor.el.firstChild.firstChild);
      }
    } else {
      next();
    }
  };
};
