var middlewares = {};

middlewares.init = function () {
  return function (next) {
    var e = this.event;
    var code = e.keyCode || e.which;
    var mod = keyboard.modifiers[code];

    if (mod) {
      return;
    }

    var editor = this.editor;

    this.ctrl = e.ctrlKey;
    this.option = this.alt = e.altKey;
    this.shift = e.shiftKey;
    this.command = this.meta = e.metaKey;
    this.code = code;
    this.key = keyboard.map[code];
    this.super = this[keyboard.super];
    this.element = editor.caret.focusElement();
    this.section = editor.caret.focusSection();
    this.paragraph = editor.caret.focusParagraph();
    this.paragraphs = editor.caret.focusParagraphs();
    this.detail = editor.caret.focusDetail();
    
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

middlewares.p = function (editor) {

  editor.el.addEventListener('blur', function () {
    var el = editor.caret.focusElement('p');

    if (el && !(el.textContent || el.innerText || '').trim()) {
      el.innerHTML = '<br type="_med_placeholder">';
    }
  });

  return function (next) {
    var el = this.element;

    if (el.tagName === 'SECTION') {
      return this.prevent();
    }

    if (el.tagName !== 'P') {
      return next();
    }

    if (this.key === 'enter' && !this.shift) {
      if (!(el.textContent || el.innerText || '').trim()) {
        this.prevent();

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
      }
    }

    next();
  };
};

middlewares.walker = function (editor) {
  var removeExtraNode = function (el) {
    var nodes = el.children;
    var len = nodes.length;
    var curr, prev;
    
    while (len--) {
      curr = nodes[len];
      prev = nodes[len - 1];

      if (prev && prev.nodeType === curr.nodeType) {
        if (prev.nodeType === document.TEXT_NODE) {
          prev.appendData(curr.data);
        } else if (prev.nodeType === document.ELEMENT_NODE) {
          prev.innerHTML += curr.textContent || curr.innerHTML || '';
        }
        curr.parentNode.removeChild(curr);
      }
    }
  };

  return function (next) {
    setTimeout(function () {
      var els = editor.el.querySelectorAll('[name]');
      var names = {};
      
      Array.prototype.forEach.call(els, function (el) {
        var name = el.getAttribute('name');
        var s = schema[el.tagName.toLowerCase()];
        
        if (names[name]) {
          el.setAttribute('name', '');
        } else {
          names[name] = 1;
        }

        // chrome
        el.setAttribute('style', '');

        if (s.type === 'paragraph') {
          removeExtraNode(el);
        }
      });
    }.bind(this));

    next();
  };
};
