var middlewares = {};

middlewares.init = function () {
  return function (next) {
    var e = this.event;
    var code = e.keyCode || e.which;
    var mod = keyboard.modifiers[code];

    if (mod) {
      return;
    }

    this.ctrl = e.ctrlKey;
    this.option = this.alt = e.altKey;
    this.shift = e.shiftKey;
    this.command = this.meta = e.metaKey;
    this.code = code;
    this.key = keyboard.map[code];
    this.super = this[keyboard.super];
    this.event = e;
    
    if (this.key === 'backspace' && this.editor.isEmpty()) {
      this.prevent();
      return;
    }

    var els = editor.el.querySelectorAll('br[type="_med_placeholder"]');

    Array.prototype.forEach.call(els, function (el) {
      el.parentElement.removeChild(el);
    });

    next();
  };
};

middlewares.basic = function (editor) {
  return function (next) {
    var el = editor.caret.focusElement();

    if (el.tagName === 'SECTION') {
      return this.prevent();
    }

    if (this.key === 'enter' && !this.shift) {
      if (el.tagName !== 'P') {
        return next();
      }

      this.prevent();

      if (!(el.textContent || el.innerText || '').trim()) {
        // 目前這一行是空的
        // 需要建立一個新的 <section>
        var section = document.createElement('section');
        var currentSection = editor.caret.focusElement('section');

        el.innerHTML = '<br type="_med_placeholder">';

        if (currentSection) {
          if ((currentSection.textContent || currentSection.innerText || '').trim()) {
            section.appendChild(el);
            currentSection
              .parentElement
              .insertBefore(section, currentSection.nextSibling);
            editor.caret.moveToStart(el);
          } else {
            // 目前是在一個 <section> 下，而且 <section> 的內容是空的，
            // 就忽略這個動作
          }
        } else {
          section.appendChild(el);
          editor.el.appendChild(section);
          editor.caret.moveToStart(el);
        }
      } else if (editor.caret.textBefore(el).trim()) {
        // 指標前面有文字
        // 需要把目前所在的 <p> 分成了段
        // 把新 <p> 的 name 清空，等下次 scan 的時候自動命名
        var p = editor.caret.split(el);
        p.setAttribute('name', '');

        if (!(p.textContent || p.innerText)) {
          p.innerHTML = '<br type="_med_placeholder">';
        }
      } else if (el.previousElementSibling) {
        // 指標前面沒文字
        // 需要把目前所在的 <p> 分成兩段
        // 需要建立新 <section>
        var section = document.createElement('section');
        var currentSection = editor.caret.focusElement('section');
        var p = editor.caret.split(el);

        el = p.previousElementSibling;

        // 把新 <p> 的 name 清空，等下次 scan 的時候自動命名
        p.setAttribute('name', '');

        // 把新 <p> 移到 新 <section> 下
        section.appendChild(p);

        if (!(p.textContent || p.innerText)) {
          p.innerHTML = '<br type="_med_placeholder">';
        }

        if (currentSection) {
          currentSection
            .parentElement
            .insertBefore(section, currentSection.nextSibling);
        } else {
          editor.el.appendChild(section);
        }

        if (!(el.textContent || el.innerText || '').trim()) {
          el.parentElement.removeChild(el);
        }

        editor.caret.moveToStart(p);
      }
    }

    next();
  };
};
