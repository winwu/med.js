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

middlewares.list = function (editor) {
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
      }
    }

    next();
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
        if (utils.isTextNode(prev)) {
          prev.appendData(curr.data);
        } else if (utils.isElementNode(prev)) {
          prev.innerHTML += curr.textContent || curr.innerHTML || '';
        }
        curr.parentNode.removeChild(curr);
      }
    }
  };

  editor.on('walk', function (ctx) {
    if (utils.isType('paragraph', ctx.element)) {
      removeExtraNode(ctx.element);
    }
  });
};

middlewares.handleEmptyParagraph = function (editor) {
  editor.on('walk', function (ctx) {
    var el = ctx.element;
    if (utils.isType('paragraph', el) && utils.isEmpty(el)) {
      el.innerHTML = '<br class="_med_placeholder" />';
    }
  });
};

middlewares.createNewParagraph = function () {
  return function (next) {
    var needToCreateElement = this.key === 'enter'
      && this.section === this.editor.caret.focusSection()
      && !this.shift
      && utils.isTag('p', this.element)
      && this.element.parentElement
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
      var el = this.element;

      var shouldHandleBackspace = function () {
        return !(selection + '')
          && utils.isType(['paragraph', 'paragraphs', 'section'], el)
          // li 的預設刪除行為在這裡沒有問題
          && !utils.isTag('li', el)
          && !editor.caret.textBefore(el);
      };

      // 段落前面已經沒有文字
      // 需要刪除 element
      if (shouldHandleBackspace()) {
        this.prevent();

        var previous = this.element.previousElementSibling;
        var needToRemove, offset, childNodes, firstChild;

        if (previous) {
          needToRemove = this.element;
        } else {
          needToRemove = this.section;
        }

        previous = needToRemove.previousElementSibling;

        if (needToRemove && previous) {
          childNodes = Array.prototype.slice.call(needToRemove.childNodes);
          firstChild = needToRemove.firstChild;
          offset = utils.getTextContent(previous).length;

          utils.removeEmptyElements(previous);

          utils.each(childNodes, function (child) {
            previous.appendChild(child);
          });

          needToRemove.parentElement.removeChild(needToRemove);

          if (utils.isType('section', needToRemove)) {
            // section 的情況是要讓游標在畫面上跟著目前 element 移動
            editor.caret.moveToStart(firstChild);
          } else {
            // 段落的情況是要讓兩個 element 接起來後，游標移動到合併的位置
            editor.caret.moveToStart(previous.firstChild, offset);
          }
        } else {
          previous = this.node.previousSibling;

          var previousIsBrTag = function () {
            return previous
              && utils.isElementNode(previous)
              && utils.isTag('br', previous);
          };
          
          if (previousIsBrTag()) {
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
