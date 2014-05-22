var handleParagraph = (function () {
  var shouldHandleThis = function (ctx) {
    return !ctx.modifier
      && utils.isTag('p', ctx.element)
      && isCreateNewLineAction(ctx);
  };

  var isCreateNewLineAction = function (ctx) {
    return ctx.key === 'enter'
      && !ctx.shift;
  };

  var createNewLine = function (ctx, next) {
    var editor = ctx.editor;
    var el = ctx.element;

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
          section.innerHTML = '<p><br /></p>';

          p = section.querySelector('p');

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
    } else if (!editor.caret.textBefore(el)) {
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

  // middleware
  return function () {
    return function (next) {
      if (!shouldHandleThis(this)) {
        return next();
      }

      createNewLine(this, next);
    };
  };
})();
