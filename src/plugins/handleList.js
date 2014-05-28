var handleList = function (editor) {
  var leaveList = function (ctx) {
    ctx.prevent();

    var p = document.createElement('p');

    ctx.section.insertBefore(p, ctx.paragraphs.nextSibling);
    utils.removeElement(ctx.paragraph);

    setTimeout(function () {
      editor.caret.moveToStart(p);
    });
  };

  var splitAndMoveToStart = function (ctx) {
    editor.caret.split(ctx.paragraph);
    editor.caret.moveToStart(ctx.paragraph);
  };

  var leaveAndMoveContentToNewElement = function (ctx) {
    var el = ctx.paragraph;
    var p = document.createElement('p');

    p.innerHTML = el.innerHTML;
    utils.removeElement(el);

    ctx.section.insertBefore(p, ctx.paragraphs.nextSibling);

    editor.caret.moveToStart(p);
  };

  return function (next) {
    var el = this.paragraph;

    if (!utils.isTag('li', el)) {
      return next();
    }

    // li 上換行有可能自動插入 <p>
    // 所以必須自己處理換行動作
    if (this.key === 'enter' && !this.shift) {
      if (utils.isEmpty(el)) {

        // 空行，要讓使用者跳離 ul/ol
        leaveList(this);

      } else if (editor.caret.atElementEnd(el)) {

        // 行尾換行預設動作會自動插入 <p>
        this.prevent();
        splitAndMoveToStart(this);

      } else if (editor.caret.atElementStart(el)) {
        
        // 行首換行跳離 <ul>/<ol>
        this.prevent();
        leaveAndMoveContentToNewElement(this);

      }
    }

    next();
  };
};
