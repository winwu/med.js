var handleList = function (editor) {
  var leaveList = function (ctx) {
    ctx.prevent();

    var el = ctx.paragraph;
    var p = document.createElement('p');

    p.innerHTML = '<br />';

    if (utils.isLastElementOf(ctx.paragraphs, el)) {
      // 是最後一個 item
      // 需要把新 p 塞到 list 後面

      ctx.section.insertBefore(p, ctx.paragraphs.nextSibling);
      utils.removeElement(el);
    } else {
      // 在 list 中間
      // 需要把 list 分半，然後在中間插入新 p

      utils.removeElement(el);
      editor.caret.split(ctx.paragraphs);
      ctx.section.insertBefore(p, ctx.paragraphs);
    }

    editor.caret.moveToStart(p);
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
        editor.caret.split(el);

      } else if (editor.caret.atElementStart(el)) {
        
        // 行首換行跳離 <ul>/<ol>
        this.prevent();
        leaveAndMoveContentToNewElement(this);

      }
    }

    next();
  };
};
