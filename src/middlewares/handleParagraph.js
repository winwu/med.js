var handleParagraph = function (editor) {
  return function (next) {
    var el = this.element;

    if (this.modifier) {
      return next();
    }

    if (el === el.section) {
      return this.prevent();
    }

    if (!utils.isTag('p', el)) {
      return next();
    }

    if (this.key === 'enter' && !this.shift) {
      if (utils.isEmpty(el)) {
        this.prevent();

        var section = this.section;

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
        this.prevent();

        // 在行頭
        // 需要把 section 分段
        editor.caret.split(this.section);

        utils.removeEmptyElements(this.section);

        // 如果 <section> 是空的就不能把 <p> 移除
        // 移除會造成使用者直接輸入文字在 section 內
        if (utils.isNotEmpty(this.section.previousElementSibling)) {
          utils.removeEmptyElements(this.section.previousElementSibling);
        }

        next();
      }
    } else {
      next();
    }
  };
};
