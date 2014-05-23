var handleList = function (editor) {
  return function (next) {
    var el = this.element;

    if (!utils.isTag('li', el)) {
      return next();
    }

    // li 上換行有可能自動插入 <p>
    // 所以必須自己處理換行動作
    if (this.key === 'enter' && !this.shift) {
      if (utils.isEmpty(el)) {
        // 空行，要讓使用者跳離 ul/ol

        this.prevent();

        var p = document.createElement('p');

        this.section.insertBefore(p, this.paragraphs.nextSibling);
        utils.removeElement(el);

        setTimeout(function () {
          editor.caret.moveToStart(p);
        });
      } else if (!editor.caret.textAfter().trim()) {
        // 行尾換行預設動作會自動插入 <p>

        this.prevent();

        editor.caret.split(el);
        editor.caret.moveToStart(el);
      } else if (!editor.caret.textBefore().trim()) {
        // 行首換行跳離 <ul>/<ol>

        this.prevent();

        var p = document.createElement('p');

        p.innerHTML = el.innerHTML;
        utils.removeElement(el);

        this.section.insertBefore(p, this.paragraphs.nextSibling);

        editor.caret.moveToStart(p);
      }
    }

    next();
  };
};
