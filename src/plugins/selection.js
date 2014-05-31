'use strict';

var utils = require('../utils');

module.exports = function (editor) {
  return function (next) {
    var selection = document.getSelection();
    var range = selection.getRangeAt(0);

    // 有選取內容
    if (!range.collapsed && !this.modifier) {
      var startNode = utils.startNodeInRange(range);
      var focus = range.startContainer;
      var focusOffset = range.startOffset;
      var nextElement;

      range.deleteContents();

      if (utils.isEmpty(editor.el)) {
        editor.el.innerHTML = ''
          + '<section>'
          + '  <p><br type="_med_placeholder" /></p>'
          + '</section>';

        editor.caret.focusTo(editor.el);
        // focus 到第一個 <p>
        editor.caret.focusTo(editor.el.querySelector('p'));
      } else {
        if (utils.isTextNode(startNode)) {
          startNode = startNode.parentElement;
        }

        nextElement = utils.nextElement(startNode);

        if (nextElement) {
          utils.moveChildNodes(nextElement, startNode);
          utils.removeElement(nextElement);
          editor.caret.select(
              focus,
              focusOffset,
              focus,
              focusOffset
          );
        }
      }
    } else {
      next();
    }
  };
};
