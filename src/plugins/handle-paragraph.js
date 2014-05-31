'use strict';

var utils = require('../utils');

var isPTag = function (ctx) {
  return !ctx.modifier
    && utils.isTag('p', ctx.paragraph)
    && isCreateNewLineAction(ctx);
};

var isCreateNewLineAction = function (ctx) {
  return ctx.key === 'enter'
    && !ctx.shift;
};

var createNewP = function (ctx, next) {
  var editor = ctx.editor;
  var el = ctx.paragraph;

  if (utils.isEmpty(el)) {
    ctx.prevent();

    var section = ctx.section;

    // 目前這一行是空的
    // 需要建立一個新的 <section>

    if (section) {
      if (utils.isNotEmpty(section)) {
        var p;

        utils.removeEmptyElements(section);
        editor.caret.split(section);

        p = document.createElement('p');
        p.innerHTML = '<br />';

        section.insertBefore(p, section.firstChild);

        editor.caret.moveToStart(p);

        next();
      }
    } else {
      section = document.createElement('section');

      section.appendChild(el);
      editor.el.appendChild(section);
      editor.caret.moveToStart(el);

      next();
    }
  } else if (editor.caret.atElementStart(el)) {
    ctx.prevent();

    // 在行頭
    // 需要把 section 分段
    editor.caret.split(ctx.section);

    utils.removeEmptyElements(ctx.section);

    // 如果 <section> 是空的就不能把 <p> 移除
    // 移除會造成使用者直接輸入文字在 section 內
    if (utils.isNotEmpty(ctx.section.previousElementSibling)) {
      utils.removeEmptyElements(ctx.section.previousElementSibling);
    }

    next();
  }
};

var shouldHandleCreateNewParagraphAction = function (ctx) {
  var el = ctx.paragraph;
  return el
    && !utils.isTag(['li', 'paragraph'], el)
    && isCreateNewLineAction(ctx);
};

var whatElementWeShouldCreate = function (el) {
  if (/^h\d$/i.test(el.tagName)) {
    return 'p';
  }
  return el.tagName;
};

var createNewParagraph = function (ctx, next) {
  var el = ctx.paragraph;

  if (ctx.editor.caret.atElementEnd(el)) {
    ctx.prevent();

    var tagName = whatElementWeShouldCreate(el);
    var p = document.createElement(tagName);
    p.innerHTML = '<br />';
    
    el.parentElement.insertBefore(p, el.nextElementSibling);

    ctx.editor.caret.focusTo(p);
  }

  next();
};

module.exports = function () {
  return function (next) {
    if (isPTag(this)) {
      // p 的動作比較特別，需要獨立處理
      createNewP(this, next);
    } else if (shouldHandleCreateNewParagraphAction(this)) {
      // 主要是避免換行的時候產生一些我們看不懂的 tag
      createNewParagraph(this, next);
    } else {
      next();
    }
  };
};
