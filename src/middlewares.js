var middlewares = {};

middlewares.init = function () {
  return function (next) {
    var e = this.event;
    var code = e.keyCode || e.which;
    var mod = keyboard.modifiers[code];

    var editor = this.editor;

    this.modifier = mod;
    this.ctrl = e.ctrlKey;
    this.option = this.alt = e.altKey;
    this.shift = e.shiftKey;
    this.command = this.meta = e.metaKey;
    this.code = code;
    this.key = keyboard.map[code];
    this.super = this[keyboard.super];
    this.node = editor.caret.focusNode();
    this.element = editor.caret.focusElement();
    this.nextElement = editor.caret.nextElement();
    this.section = editor.caret.focusSection();
    this.paragraph = editor.caret.focusParagraph();
    this.paragraphs = editor.caret.focusParagraphs();
    this.detail = editor.caret.focusDetail();

    var els = editor.el.querySelectorAll('br[type="_med_placeholder"]');

    Array.prototype.forEach.call(els, function (el) {
      el.parentElement.removeChild(el);
    });

    next();
  };
};

middlewares.prevent = function () {
  return function (next) {
    if (this.key === 'backspace' && this.editor.isEmpty()) {
      this.prevent();
      return;
    }

    if (this.element === document.body) {
      utils.preventEvent(e);
      return;
    }

    next();
  };
};

middlewares.p = function (editor) {
  return function (next) {
    var el = this.element;

    if (this.modifier) {
      return next();
    }

    if (el === el.section) {
      return this.prevent();
    }

    if (el.tagName !== 'P') {
      return next();
    }

    if (this.key === 'enter' && !this.shift) {
      if (utils.isEmpty(el)) {
        this.prevent();

        // 目前這一行是空的
        // 需要建立一個新的 <section>
        var section = document.createElement('section');

        if (this.section) {
          if (utils.isNotEmpty(this.section)) {
            section.appendChild(el);
            this.section
              .parentElement
              .insertBefore(section, this.section.nextSibling);
            
            setTimeout(function () {
              editor.caret.moveToStart(el);
            });

            next();
          }
        } else {
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

middlewares.renameElements = function (editor) {
  editor.on('walkStart', function (ctx) {
    ctx.names = {};
  });

  editor.on('walk', function (ctx) {
    if (ctx.names[ctx.name]) {
      ctx.el.setAttribute('name', '');
    } else {
      ctx.names[ctx.name] = 1;
    }
  });
};

middlewares.removeInlineStyle = function () {
  editor.on('walk', function (ctx) {
    // chrome
    ctx.el.setAttribute('style', '');
  });
};

middlewares.removeExtraNodes = function () {
  var removeExtraNode = function (el) {
    var nodes = el.childNodes;
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

  editor.on('walk', function (ctx) {
    var s = schema[ctx.el.tagName.toLowerCase()];
    if (s.type === 'paragraph') {
      removeExtraNode(ctx.el);
    }
  });
};

middlewares.handleEmptyParagraph = function (editor) {
  editor.on('walk', function (ctx) {
    var el = ctx.element;
    if (el.tagName === 'P' && !(el.textContent || el.innerText || '').trim()) {
      el.innerHTML = '<br class="_med_placeholder" />';
    }
  });
};

middlewares.createNewParagraph = function () {
  return function (next) {
    var needToCreateElement = this.key === 'enter'
      && this.section === this.editor.caret.focusSection()
      && !this.shift
      && this.element === this.paragraph
      && !this.editor.caret.textAfter(this.element);

    if (needToCreateElement) {
      this.prevent();
      var el = document.createElement('p');
      this.element.parentElement.insertBefore(el, this.element.nextSibling);
      this.editor.caret.focusTo(el);
    }

    next();
  };
};

middlewares.delete = function (editor) {
  return function (next) {
    if (this.key === 'backspace') {
      var selection = document.getSelection();

      // 段落前面已經沒有文字
      // 需要刪除 element
      if (!(selection + '') && utils.isType(['paragraph', 'paragraphs'], this.element) && !editor.caret.textBefore(this.element)) {
        this.prevent();
        var previous = this.element.previousElementSibling;
        var needToRemove, offset;

        if (previous) {
          needToRemove = this.element;
        } else {
          needToRemove = this.section;
        }

        previous = needToRemove.previousElementSibling;

        if (needToRemove && previous) {
          offset = utils.getTextContent(previous).length;

          utils.each(needToRemove.childNodes, function (child) {
            previous.appendChild(child);
          });

          needToRemove.parentElement.removeChild(needToRemove);

          editor.caret.moveToStart(previous.firstChild, offset);
        } else {
          previous = this.node.previousSibling;
          
          if (previous && previous.nodeType === document.ELEMENT_NODE && utils.isTag('br', previous)) {
            offset = utils.getTextContent(previous.previousSibling).length;
            previous.parentElement.removeChild(previous);
            editor.caret.moveToStart(this.node.previousSibling, offset);
          }
        }
      }
    }

    next();
  };
};
