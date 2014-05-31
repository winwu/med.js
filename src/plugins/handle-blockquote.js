'use strict';

var utils = require('../utils');

module.exports = function (editor) {
  return function (next) {
    var el = this.paragraph;

    if (!utils.isTag('blockquote', el)) {
      return next();
    }

    // 目前只處理換段落的情況
    if (!(this.key === 'enter' && !this.shift)) {
      return next();
    }

    this.prevent();

    if (editor.caret.atElementEnd(el)) {

      // 所有行尾換行都要建立新 <p>
      // 沒有例外

      var p = document.createElement('p');

      p.innerHTML = '<br />';
      this.section.insertBefore(p, el.nextSibling);
      editor.caret.moveToStart(p);

    } else if (editor.caret.atElementStart(el)) {

      // 行首在前面插入 element
      var quote = document.createElement('blockquote');

      quote.innerHTML = '<br />';
      this.section.insertBefore(quote, el);
      //editor.caret.moveToStart(quote);

    } else {

      // 其他情況下都將現有的 blockquote 分割
      editor.caret.split(el);
    }

    next();
  };
};
