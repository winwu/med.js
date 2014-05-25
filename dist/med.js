/**
 * med.js
 * http://github.com/poying/med.js
 *
 * (c) 2014 http://poying.me
 * MIT licensed
 */
;(function (window) {
  'use strict';
if (typeof module !== 'undefined') {
  module.exports = Editor;
} else if (typeof define === 'function' && typeof define.amd === 'object') {
  define(function () {
    return Editor;
  });
} else {
  window.Med = Editor;
}
var utils = {};
/**
 * @param {Node} node
 * @return {String}
 * @api public
 */
utils.getTextContent = function (node) {
  var text;

  if (!node) {
    return '';
  }

  switch (node.nodeType) {
  case document.ELEMENT_NODE:
    text = node.textContent
      || node.innerText
      || '';
    break;
  case document.TEXT_NODE:
    text = node.data;
    break;
  default:
    text = '';
  }

  return text;
};

/**
 * @param {Element} el
 * @return {Boolean}
 * @api public
 */
utils.isEmpty = function (el) {
  if (utils.isTag('br', el)) {
    return false;
  }
  return !utils.getTextContent(el).trim();
};

/**
 * @param {Element} el
 * @return {Boolean}
 * @api public
 */
utils.isNotEmpty = function (el) {
  return !utils.isEmpty(el);
};

/**
 * @param {String} tagName
 * @param {Element} el
 * @return {Boolean}
 * @api public
 */
utils.isTag = function (tagName, el) {
  if (typeof tagName === 'string') {
    tagName = [tagName];
  }

  var toUpperCase = function (str) {
    return str.toUpperCase();
  };

  return !!~tagName
    .map(toUpperCase)
    .indexOf(el.tagName);
};

/**
 * @param {Element} el
 * @return {Boolean}
 * @api public
 */
utils.isLastChild = function (el) {
  return el.parentELement.lastChild === el;
};

/**
 * @param {Element} el
 * @api public
 */
utils.removeEmptyElements = function (el) {
  utils.each(el.children, function (child) {
    if (utils.isEmpty(child)) {
      el.removeChild(child);
    } else {
      utils.removeEmptyElements(child);
    }
  });
};

/**
 * @param {Element} el
 * @api public
 */
utils.removeElement = function (el) {
  if (el.parentElement) {
    el.parentElement.removeChild(el);
  }
};

/**
 * @param {Element} src
 * @param {Element} dest
 * @api public
 */
utils.moveChildren = function (src, dest) {
  var children = Array.prototype.slice.call(src.children);

  utils.each(children, function (child) {
    dest.appendChild(child);
  });
};

/**
 * @param {Element} src
 * @param {Element} dest
 * @api public
 */
utils.moveChildNodes = function (src, dest) {
  var nodes = Array.prototype.slice.call(src.childNodes);

  utils.each(nodes, function (node) {
    dest.appendChild(node);
  });
};

/**
 * @param {String|String[]} types
 * @param {Element} el
 * @return {Boolean}
 * @api public
 */
utils.isType = function (types, el) {
  var s = utils.getElementSchema(el);

  if (typeof types === 'string') {
    types = [types];
  }

  return s && !!~types.indexOf(s.type);
};

/**
 * @param {Node} node
 * @return {Boolean}
 * @api public
 */
utils.isElementNode = function (node) {
  return node.nodeType === document.ELEMENT_NODE;
};

/**
 * @param {Node} node
 * @return {Boolean}
 * @api public
 */
utils.isTextNode = function (node) {
  return node.nodeType === document.TEXT_NODE;
};

/**
 * @param {Node} node
 * @param {Node} ancestor
 * @return {Boolean}
 * @api public
 */
utils.isAncestorOf = function (node, ancestor) {
  var childNodes = Array.prototype.slice.call(ancestor.chlidNodes || []);
  var child;

  if (!~childNodes.indexOf(child)) {
    while (child = childNodes.shift()) {
      if (utils.isAncestorOf(child)) {
        return true;
      }
    }

    return false;
  }

  return true;
};

/**
 * @param {Node} node
 * @return {Number}
 * @api public
 */
utils.nodeContentLength = function (node) {
  return utils.getTextContent(node).length;
};

/**
 * @param {Node} node
 * @return {Node}
 * @api public
 */
utils.lastNode = function (node) {
  return node.childNodes[node.childNodes.length - 1];
};

/**
 * @param {Node} node
 * @return {Text}
 * @api public
 */
utils.lastTextNode = function (node) {
  if (utils.isTextNode(node)) {
    return node;
  }
  return utils.lastTextNode(utils.lastNode(node));
};

/**
 * @param {Node} node
 * @return {Element}
 * @api public
 */
utils.lastElement = function (node) {
  return node.children[node.children.length - 1];
};

/**
 * @param {Node} node
 * @return {Node}
 * @api public
 */
utils.firstNode = function (node) {
  return node.childNodes[0];
};

/**
 * @param {Node} node
 * @return {Text}
 * @api public
 */
utils.firstTextNode = function (node) {
  if (utils.isTextNode(node)) {
    return node;
  }
  return utils.firstTextNode(utils.firstNode(node));
};

/**
 * @param {Node} node
 * @return {Element}
 * @api public
 */
utils.firstElement = function (node) {
  return node.children[0];
};

/**
 * @param {Element} container
 * @param {Element} el
 * @return {Boolean}
 * @api public
 */
utils.isLastElementOf = function (container, el) {
  var lastElement = utils.lastElement(container);
  return lastElement === el;
};

/**
 * @param {Element} container
 * @param {Element} el
 * @return {Boolean}
 * @api public
 */
utils.isFirstElementOf = function (container, el) {
  var firstElement = utils.firstElement(container);
  return firstElement === el;
};
utils.mixin = function (o1, o2) {
  Object
    .getOwnPropertyNames(o2)
    .forEach(function (name) {
      var desc = Object.getOwnPropertyDescriptor(o2, name);
      Object.defineProperty(o1, name, desc);
    });
  return o1;
};

utils.preventDefault = function (e) {
  return e.preventDefault
    ? e.preventDefault()
    : e.returnValue = false;
};

utils.os = function () {
  var userAgent = navigator.userAgent;
  switch (true) {
    case /mac/i.test(userAgent):
      return 'mac';
    case /win/i.test(userAgent):
      return 'windows';
    case /linux/i.test(userAgent):
      return 'linux';
    default:
      return 'unknown';
  }
};

utils.each = function (ctx, fn) {
  if (utils.isArrayLike(ctx)) {
    Array.prototype.forEach.call(ctx, fn);
  }

  return ctx;
};

utils.isArrayLike = function (obj) {
  return typeof obj === 'object'
    && typeof obj.length === 'number';
};

utils.split = function (separator, limit) {
  var re = new RegExp('\\\\' + limit, 'g');

  return separator
    .replace(re, '\uffff')
    .split(limit)
    .map(function (str) {
      return str.replace(/\uffff/g, limit);
    });
};

utils.clone = function (obj) {
  return JSON.parse(JSON.stringify(obj));
};

utils.equal = function (a, b) {
  // primitive
  if (a === null || /^[sbn]/.test(typeof a)) {
    return a === b;
  }

  if (a instanceof Array) {
    if (b instanceof Array) {
      a = a.slice().sort();
      b = b.slice().sort();
      return a.join() === b.join();
    } else {
      return false;
    }
  }

  if (typeof a === 'object') {
    if (typeof b === 'object') {
      var prop, notEqual;

      for (prop in a) {
        notEqual = a.hasOwnProperty(prop)
          && b.hasOwnProperty(prop)
          && !utils.equal(a[prop], b[prop]);

        if (notEqual) {
          return false;
        }
      }

      return true;
    }

    return false;
  }

  return false;
};
utils.getType = function (el) {
  var s = utils.getElementSchema(el);
  return s ? s.type : null;
};

utils.getElementSchema = function (el) {
  return el
    && schema[el.tagName.toLowerCase()]
    || null;
};
var keyboard = {};

keyboard.modifiers = {
  224: 'command',
  91: 'command',
  93: 'command',
  18: 'alt',
  17: 'ctrl',
  16: 'shift'
};

keyboard.map = {
  8: 'backspace',
  9: 'tab',
  13: 'enter',
  20: 'capslock',
  27: 'esc',
  32: 'space',
  37: 'left',
  38: 'up',
  39: 'right',
  40: 'down'
};

keyboard.super = utils.os() === 'mac'
  ? 'command'
  : 'ctrl';
var createNewParagraph = function () {
  return function (next) {
    var needToCreateElement = this.key === 'enter'
      && this.section === this.editor.caret.focusSection()
      && !this.shift
      && utils.isTag('p', this.element)
      && this.element.parentElement
      && this.editor.caret.atElementEnd(this.element);

    if (needToCreateElement) {
      this.prevent();
      var el = document.createElement('p');
      this.element.parentElement.insertBefore(el, this.element.nextSibling);
      this.editor.caret.focusTo(el);
    }

    next();
  };
};
var handleBackspace = function (editor) {
  var shouldHandleBackspace = function (ctx) {
    var selection = document.getSelection();
    var el = ctx.paragraph;

    return !(selection + '')
      && utils.isType(['paragraph', 'paragraphs', 'section'], el)
      && editor.caret.atElementStart(el);
  };

  var handleList = function (ctx) {
    var el = ctx.paragraph;
    var paragraphs = ctx.paragraphs;

    if (paragraphs && utils.isFirstElementOf(paragraphs, el)) {
      ctx.prevent();

      var p = document.createElement('p');

      utils.moveChildNodes(el, p);
      utils.removeElement(el);

      ctx.section.insertBefore(p, paragraphs);

      if (utils.isEmpty(paragraphs)) {
        utils.removeElement(paragraphs);
      }

      editor.caret.moveToStart(p);
    }
  };

  var handleOthers = function (ctx) {
    ctx.prevent();

    var el = ctx.paragraph;
    var previous = el.previousElementSibling;
    var needToRemove, offset, firstChild, lastNode;

    if (previous) {
      needToRemove = el;
    } else {
      needToRemove = ctx.section;
    }

    previous = needToRemove.previousElementSibling;

    if (needToRemove && previous) {
      if (utils.isType('paragraphs', previous)) {

        // ul/ol 要特別處理
        // 如果使用跟其他地方相同方式的作法
        // 會造成 ul/ol 多出一個 br
        if(previous.lastChild && utils.isTag('li', previous.lastChild)) {
          var focus = previous.lastChild.lastChild;

          utils.moveChildNodes(el, previous.lastChild);
          utils.removeElement(el);

          if (focus) {
            editor.caret.moveToEnd(focus);
          } else {

            // 原本的 li 是空的
            // 所以直接把指標移到 li 最前面就可以了
            editor.caret.moveToStart(previous.lastChild);
          }
        } else {
          // 忽略動作
        }
      } else {
        firstChild = needToRemove.firstChild;
        lastNode = previous.childNodes[previous.childNodes.length - 1];
        offset = utils.getTextContent(lastNode).length;

        utils.removeEmptyElements(previous);

        utils.moveChildNodes(needToRemove, previous);

        needToRemove.parentElement.removeChild(needToRemove);

        if (utils.isType('section', needToRemove)) {
          // section 的情況是要讓游標在畫面上跟著目前 element 移動
          editor.caret.moveToStart(firstChild);
        } else {
          // 段落的情況是要讓兩個 element 接起來後，游標移動到合併的位置
          editor.caret.moveToStart(lastNode, offset);
        }
      }
    } else {
      previous = ctx.node.previousSibling;

      var previousIsBrTag = function () {
        return previous
          && utils.isElementNode(previous)
          && utils.isTag('br', previous);
      };
      
      if (previousIsBrTag()) {
        offset = utils.getTextContent(previous.previousSibling).length;
        previous.parentElement.removeChild(previous);
        editor.caret.moveToStart(ctx.node.previousSibling, offset);
      }
    }
  };

  return function (next) {
    if (this.key !== 'backspace') {
      return next();
    }

    var el = this.paragraph;

    // 段落前面已經沒有文字
    // 需要刪除 element
    if (shouldHandleBackspace(this)) {
      if (utils.isTag('li', el)) {
        handleList(this, next);
      } else {
        handleOthers(this, next);
      }
    }

    next();
  };
};
var handleBlockquote = function (editor) {
  return function (next) {
    var el = this.paragraph;

    if (!utils.isTag('blockquote', el)) {
      return next();
    }

    // 目前只處理換段落的情況
    if (!(this.key === 'enter' && !this.shift)) {
      return next();
    }

    if (editor.caret.atElementEnd(el)) {
      // 所有行尾換行都要建立新 <p>
      // 沒有例外

      this.prevent();

      var p = document.createElement('p');

      p.innerHTML = '<br />';

      this.section.insertBefore(p, el.nextSibling);

      editor.caret.moveToStart(p);
    } else {
      // 其他情況下都將現有的 blockquote 分割

      this.prevent();

      editor.caret.split(el);
    }

    next();
  };
};
var handleList = function (editor) {
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

        this.prevent();

        var p = document.createElement('p');

        this.section.insertBefore(p, this.paragraphs.nextSibling);
        utils.removeElement(el);

        setTimeout(function () {
          editor.caret.moveToStart(p);
        });
      } else if (editor.caret.atElementEnd(el)) {
        // 行尾換行預設動作會自動插入 <p>

        this.prevent();

        editor.caret.split(el);
        editor.caret.moveToStart(el);
      } else if (editor.caret.atElementStart(el)) {
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
var handleParagraph = (function () {
  var shouldHandleThis = function (ctx) {
    return !ctx.modifier
      && utils.isTag('p', ctx.paragraph)
      && isCreateNewLineAction(ctx);
  };

  var isCreateNewLineAction = function (ctx) {
    return ctx.key === 'enter'
      && !ctx.shift;
  };

  var createNewLine = function (ctx, next) {
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
var initContext = function () {
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
var preventDefault = function () {
  return function (next) {
    if (this.key === 'backspace' && this.editor.isEmpty()) {
      this.prevent();
      return;
    }

    if (this.element === document.body) {
      utils.preventDefault(e);
      return;
    }

    if (el === el.section) {
      return this.prevent();
    }

    next();
  };
};
var handleEmptyParagraph = function (editor) {
  editor.on('walk', function (ctx) {
    var el = ctx.element;
    if (utils.isType('paragraph', el) && utils.isEmpty(el)) {
      el.innerHTML = '<br class="_med_placeholder" />';
    }
  });
};
var removeExtraNodes = function () {
  var removeExtraNode = function (ctx) {
    var el = ctx.element;
    var focus = ctx.editor.caret.focusElement();
    var nodes = el.childNodes;
    var len = nodes.length;
    var curr, prev, lastNode;
    
    while (len--) {
      curr = nodes[len];
      prev = nodes[len - 1];

      if (prev && prev.nodeType === curr.nodeType) {
        if (prev === focus) {
          lastNode = utils.lastNode(focus);
          ctx.__removeExtraNode__focus = lastNode;
          ctx.__removeExtraNode__offset = lastNode.length;
        }
        
        if (utils.isTextNode(prev)) {
          prev.appendData(curr.data);
        } else if (utils.isElementNode(prev)) {
          utils.moveChildNodes(curr, prev);
        }

        curr.parentNode.removeChild(curr);
      }
    }
  };

  editor.on('walk', function (ctx) {
    if (utils.isType('paragraph', ctx.element)) {
      removeExtraNode(ctx);
    }
  });

  editor.on('walkEnd', function (ctx) {
    var node = ctx.__removeExtraNode__focus;
    var offset = ctx.__removeExtraNode__offset;

    if (node) {
      ctx.editor.caret.select(node, offset, node, offset);
    }
  });
};
var removeInlineStyle = function () {
  editor.on('walk', function (ctx) {
    // chrome
    ctx.el.setAttribute('style', '');
  });
};
var renameElements = function (editor) {
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
var schema = {
  section: {
    type: 'section'
  },

  h1: {
    type: 'paragraph',
    text: 'content'
  },

  h2: {
    type: 'paragraph',
    text: 'content'
  },

  h3: {
    type: 'paragraph',
    text: 'content'
  },

  h4: {
    type: 'paragraph',
    text: 'content'
  },

  h5: {
    type: 'paragraph',
    text: 'content'
  },

  h6: {
    type: 'paragraph',
    text: 'content'
  },

  p: {
    type: 'paragraph',
    text: 'content'
  },

  blockquote: {
    type: 'paragraph',
    text: 'content',
    quoteTpye: 'dataset:type'
  },

  figure: {
    type: 'paragraph',
    figureType: 'dataset:type',
    content: 'dataset:content'
  },

  ol: {
    type: 'paragraphs'
  },

  ul: {
    type: 'paragraphs'
  },

  li: {
    type: 'paragraph',
    text: 'content'
  },

  a: {
    type: 'detail',
    href: 'attribute',
    title: 'attribute'
  },

  b: {
    type: 'detail'
  },

  i: {
    type: 'detail'
  },

  br: {
    type: 'detail'
  }
};

Object.keys(schema).forEach(function (tagName) {
  var tag = schema[tagName];
  var type = tag.type;
  var attrs = [];

  delete tag.type;

  Object.keys(tag).forEach(function (attrName) {
    var attr = tag[attrName];
    var args = attr.split(':');
    var attrType = args.shift();

    attrs.push({
      name: args[0] || attrName,
      type: attrType,
      args: args
    });
  });

  schema[tagName] = {
    type: type,
    attrs: attrs
  };
});
function Emitter() {
  this.events = {};
}

/**
 * @param {String} event
 * @param {Function} handler
 * @api public
 */
Emitter.prototype.on = function (event, handler) {
  var list = this.events[event] || [];
  list.push(handler);
  this.events[event] = list;
  return this;
};

/**
 * @param {String} event
 * @param {Function} handler
 * @api public
 */
Emitter.prototype.once = function (event, handler) {
  handler._once = true;
  this.on(event, handler);
  return this;
};

/**
 * @param {String} event
 * @param {Function} handler
 * @api public
 */
Emitter.prototype.off = function (event, handler) {
  if (typeof event === 'function') {
    handler = event;
    for (event in this.events) {
      this.off(event, handler);
    }
    return this;
  }

  var list = this.events[event];
  var len = list.length;

  while (len--) {
    if (handler === list[len]) {
      list.splice(len, 1);
    }
  }

  return this;
};

/**
 * @param {String} event
 * @param {...Mixed} args
 * @api public
 */
Emitter.prototype.emit = function () {
  var args = Array.prototype.slice.call(arguments);
  var event = args.shift();
  var list = this.events[event] || [];
  var len = list.length;
  var handler;

  if (event === 'error' && !len) {
    throw args[0];
  }

  while (len--) {
    handler = list[len];
    handler.apply(this, args);
    if (handler._once) {
      list.splice(len, 1);
    }
  }

  return this;
};
function Caret(editor) {
  this.editor = editor;
}

/**
 * @return {Node}
 * @api public
 */
Caret.prototype.focusNode = function () {
  return document.getSelection().focusNode;
};

/**
 * @param {String} tagName
 * @return {Element}
 * @api public
 */
Caret.prototype.focusElement = function (tagName) {
  var node;

  if (tagName) {
    node = this.focusElement();

    tagName = tagName.toUpperCase();

    while (node && node.tagName !== tagName) {
      node = node.parentElement;
    }

    return (node && node.tagName === tagName)
      ? node
      : null;
  } else {
    node = document.getSelection().focusNode;

    while (node && !utils.isElementNode(node)) {
      node = node.parentNode;
    }

    return node;
  }
};

/**
 * @return {Element}
 * @api public
 */
Caret.prototype.focusSection = function () {
  return this.focusType('section');
};

/**
 * @return {Element}
 * @api public
 */
Caret.prototype.focusParagraph = function () {
  return this.focusType('paragraph');
};

/**
 * @return {Element}
 * @api public
 */
Caret.prototype.focusParagraphs = function () {
  return this.focusType('paragraphs');
};

/**
 * @return {Element}
 * @api public
 */
Caret.prototype.focusDetail = function () {
  return this.focusType('detail');
};

/**
 * @param {String} type
 * @return {Element}
 * @api public
 */
Caret.prototype.focusType = function (type) {
  var node = this.focusElement();
  var elType;

  while (true) {
    if (!node) {
      break;
    }

    elType = utils.getType(node);

    if (elType === type) {
      return node;
    }

    node = node.parentElement;
  }

  return null;
};

/**
 * @param {Node} node
 * @return {Element}
 * @api public
 */
Caret.prototype.nextElement = function (node) {
  if (node) {
    node = node.nextSibling;
  } else {
    node = this.focusNode().nextSibling;
  }

  while (node) {
    if (utils.isElementNode(node)) {
      return node;
    }

    node = node.nextSibling;
  }

  return null;
};

/**
 * @param {Element} el
 * @api public
 */
Caret.prototype.focusTo = function (el) {
  if (el.innerHTML.trim()) {
    this.moveToStart(el);
  } else {
    el.innerHTML = '\uffff';
    this.moveToStart(el);
    el.innerHTML = '';
  };
};

/**
 * @return {String}
 * @api public
 */
Caret.prototype.textBefore = function () {
  var selection = document.getSelection();
  var node = selection.focusNode;
  var offset = selection.focusOffset;

  if (utils.isElementNode(node)) {
    return '';
  }
  
  return node.substringData(0, offset);
};

/**
 * @return {String}
 * @api public
 */
Caret.prototype.textAfter = function () {
  var selection = document.getSelection();
  var node = selection.focusNode;
  var offset = selection.focusOffset;

  if (utils.isElementNode(node)) {
    return '';
  }
  
  return node.substringData(offset, node.length - 1); 
};

/**
 * @param {Element} el
 * @param {Number} offset
 * @api public
 */
Caret.prototype.moveToStart = function (el, offset) {
  var selection = document.getSelection();
  var range = document.createRange();
  var len;

  if (utils.isTextNode(el)) {
    len = utils.getTextContent(el).length;
  } else {
    len = el.childNodes.length;
  }

  offset = offset | 0;

  if (offset < 0) {
    offset = 0;
  } else if (offset >= len) {
    offset = len;
  }

  range.setStart(el, offset);
  range.setEnd(el, offset);

  selection.removeAllRanges();
  selection.addRange(range);
  selection.collapseToStart();
};

/**
 * @param {Element} el
 * @param {Number} offset
 * @api public
 */
Caret.prototype.moveToEnd = function (el, offset) {
  var range = document.createRange();
  var selection = window.getSelection();
  var len;

  if (utils.isTextNode(el)) {
    len = utils.getTextContent(el).length;
  } else {
    len = el.childNodes.length;
  }

  offset = len - (offset | 0);

  if (offset < 0) {
    offset = 0;
  }

  range.setStart(el, offset);
  range.setEnd(el, offset);

  selection.removeAllRanges();
  selection.addRange(range);
  selection.collapseToEnd();
};

/**
 * @param {Element} el
 * @return {Element}
 * @api public
 */
Caret.prototype.split = function (el) {
  var selection = document.getSelection();
  var node = selection.focusNode;
  var offset = selection.focusOffset;
  var range = document.createRange();
  var parentIndex = Array.prototype.indexOf.call(el.parentNode.childNodes, el);

  range.setStart(el.parentNode, parentIndex);
  range.setEnd(node, offset);

  var left = range.extractContents();

  el.parentNode.insertBefore(left, el);

  return el;
};

/**
 * @api public
 */
Caret.prototype.save = function () {
  var selection = document.getSelection();
  var range;

  if (!selection) {
    return;
  }

  if (selection.rangeCount) {
    range = selection.getRangeAt(0);
  }

  this._range = range;
};

/**
 * @api public
 */
Caret.prototype.restore = function () {
  var range = this._range;

  if (range) {
    var r = document.createRange();
    var selection = document.getSelection();

    r.setStart(range.startContainer, range.startOffset);
    r.setEnd(range.endContainer, range.endOffset);
    selection.removeAllRanges();
    selection.addRange(r);
  }
};

/**
 * @param {Element} el
 * @api public
 */
Caret.prototype.selectAllText = function (el) {
  var selection = window.getSelection();        
  var range = document.createRange();
  range.selectNodeContents(el);
  selection.removeAllRanges();
  selection.addRange(range);
};

/**
 *     caret.select(node)
 *     caret.select(node, offset)
 *     caret.select(startNode, endNode)
 *     caret.select(node, startOffset, endOffset)
 *     caret.select(startNode, startOffset, endNode, endOffset)
 *
 * @api public
 */
Caret.prototype.select = function () {
  var selection = window.getSelection();
  var startNode, startOffset, endNode, endOffset;
  var range;

  switch (arguments.length) {
  case 1:
    startNode = endNode = arguments[0];
    startOffset = 0;
    endOffset = utils.getTextContent(startNode).length;
    break;
  case 2:
    if (typeof arguments[1] === 'number') {
      startNode = endNode = arguments[0];
      startOffset = endOffset = arguments[1];
    } else {
      startNode = arguments[0];
      startOffset = 0;
      endNode = arguments[1];
      endOffset = utils.getTextContent(startNode).length;
    }
    break;
  case 3:
    startNode = arguments[0];
    endNode = arguments[1];
    startOffset = 0;
    endOffset = utils.getTextContent(startNode).length;
    break;
  case 4:
    startNode = arguments[0];
    startOffset = arguments[1];
    endNode = arguments[2];
    endOffset = arguments[3];
    break;
  }

  startOffset = startOffset | 0;
  endOffset = endOffset | 0;

  range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);

  selection.removeAllRanges();
  selection.addRange(range);
};

/**
 * @param {Element} el
 * @api public
 */
Caret.prototype.insertElement = function (el) {
  var selection = document.getSelection();
  var range = selection.getRangeAt(0);
  
  range.deleteContents();

  range.insertNode(el);
};

/**
 * @api public
 */
Caret.prototype.closestElement = function () {
  var node = this.focusNode();
  return this.nextElement(node);
};

/**
 * @param {Element} el
 * @return {Boolean}
 * @api public
 */
Caret.prototype.atElementStart = function (el) {
  var selection = document.getSelection();
  var focusNode = selection.focusNode;
  var offset = selection.focusOffset;
  var range = document.createRange();

  range.setStart(el.childNodes[0], 0);
  range.setEnd(focusNode, offset);

  return !range.toString().trim();
};

/**
 * @param {Element} el
 * @return {Boolean}
 * @api public
 */
Caret.prototype.atElementEnd = function (el) {
  var selection = document.getSelection();
  var focusNode = selection.focusNode;
  var offset = selection.focusOffset;
  var range = document.createRange();
  var lastNode = utils.lastTextNode(el);

  range.setStart(focusNode, offset);
  range.setEnd(lastNode, lastNode.length);

  return !range.toString().trim();
};
function Middleware() {
  this.middleware = [];
}

/**
 * @param {Function} fn
 * @return {Editor}
 * @api public
 */
Middleware.prototype.use = function (fn) {
  if (typeof fn !== 'function') {
    throw new Error('The first argument must me a function.');
  }

  this.middleware.push(fn);

  return this;
};

/**
 * @param {Object} ctx
 * @param {Function} cb
 * @api public
 */
Middleware.prototype.exec = function (ctx, cb) {
  var fn = this.compose(this.middleware);
  fn.call(ctx, cb);
};

/**
 * @param {Function[]} fns
 * @return {Function}
 * @api public
 */
Middleware.prototype.compose = function (fns) {
  return function (cb) {
    var i = 0;

    var next = (function (err) {
      if (err) {
        return cb(err);
      }
      
      var fn = fns[i++];
      
      if (!fn) {
        return cb();
      }

      try {
        fn.call(this, next);
      } catch (e) {
        cb(e);
      }
    }).bind(this);

    next();
  };
};
function Data(id) {
  this.id = id;
  this.modified = false;
  this.data = {};
  this.tmp = {};
}

/**
 * @param {String} key
 * @param {Mixed} key
 * @return {Data}
 * @api public
 */
Data.prototype.set = function (key, val) {
  if (!utils.equal(this.get(key), val)) {
    this.modified = true;
  }

  this.tmp[key] = val;

  return this;
};

/**
 * @param {String} key
 * @param {Mixed} key
 * @return {Data}
 * @api private
 */
Data.prototype._set = function (key, val) {
  var keys = utils.split(key, '.');
  var last = keys.pop();
  var data = this.data;

  while (key = keys.shift()) {
    if (data[key] === undefined) {
      data = data[key] = {};
    } else {
      data = data[key];
    }
  }

  data[last] = val;

  return this;
};

/**
 * @param {String} key
 * @return {Mixed}
 * @api public
 */
Data.prototype.get = function (key) {
  if (this.tmp[key]) {
    return this.tmp[key];
  }

  var keys = utils.split(key, '.');
  var data = this.data;

  while (key = keys.shift()) {
    if (data === undefined) {
      return;
    } else {
      data = data[key];
    }
  }

  return data;
};

/**
 * @return {Data}
 * @api public
 */
Data.prototype.update = function () {
  var tmp = this.tmp;

  Object.keys(tmp).forEach(function (key) {
    this._set(key, tmp[key]);
  }.bind(this));

  this.modified = false;
  this.tmp = {};

  return this;
};

/**
 * @return {Object}
 * @api public
 */
Data.prototype.toJSON = function () {
  return utils.clone(this.data);
};
function Observe() {
  this.structure = null;
  this.data = {};
}

/**
 * @api public
 */
Observe.prototype.sync = function () {
  var structure = {
    paragraphs: [],
    sections: []
  };

  var data = this.data;

  var shouldBeDelete = {};

  Object
    .keys(data)
    .forEach(function (name) {
      shouldBeDelete[name] = 1;
    });

  utils.each(this.el.children, function (el) {
    Observe.scan.call(this, el, structure, shouldBeDelete);
  }.bind(this));

  Object
    .keys(shouldBeDelete)
    .forEach(function (name) {
      delete data[name];
    });

  this.structure = structure;
};

/**
 * @param {Element} el
 * @param {Object} structure
 * @param {Object} shouldBeDelete
 * @return {Data}
 * @api private
 */
Observe.scan = function (el, structure, shouldBeDelete) {
  var tagName = el.tagName.toLowerCase();
  var name = el.getAttribute('name');
  var data = this.data[name];
  var schema = this.schema[tagName];
  
  if (!schema) {
    el.parentElement.removeChild(el);
    return;
  }

  Observe.checkAndRemoveStrangeElement.call(this, el);

  if (name) {
    delete shouldBeDelete[name];
  }

  if (!data) {
    if (!name) {
      name = this.options.genName();
    }

    data = new Data(name);
    data.set('tag', tagName);
    this.data[name] = data;

    el.setAttribute('name', data.id);
  }

  Observe[schema.type].call(this, el, data, structure, shouldBeDelete);

  schema.attrs.forEach(function (attr) {
    Observe[attr.type].call(this, el, data, attr);
  }.bind(this));

  if (data.modified) {
    data.update();
    this.emit('changed', data);
  }

  return data;
};

/**
 * @param {Element} el
 * @param {Data} data
 * @param {Object} structure
 * @param {Object} shouldBeDelete
 * @api private
 */
Observe.section = function (el, data, structure, shouldBeDelete) {
  var p = [];

  utils.each(el.children, function (child) {
    var schema = utils.getElementSchema(child);

    if (!schema) {
      Observe.handleUnknownElement(child);
      return;
    }

    if (!~structure.sections.indexOf(data.id)) {
      structure.sections.push(data.id);
    }

    if (/^paragraph/.test(schema.type)) {
      p.push(Observe.scan.call(this, child, structure, shouldBeDelete).id);
    }

  }.bind(this));

  data.set('start', structure.paragraphs.length);
  data.set('end', Array.prototype.push.apply(structure.paragraphs, p));
};

/**
 * @param {Element} el
 * @param {Data} data
 * @param {Object} structure
 * @param {Object} shouldBeDelete
 * @api private
 */
Observe.paragraphs = function (el, data, structure, shouldBeDelete) {
  var p = [];

  utils.each(el.children, function (child) {
    var schema = utils.getElementSchema(child);

    if (!schema) {
      Observe.handleUnknownElement(child);
      return;
    }

    if (schema.type === 'paragraph') {
      p.push(Observe.scan.call(this, child, structure, shouldBeDelete).id);
    }
  }.bind(this));

  data.set('start', structure.paragraphs.length);
  data.set('end', Array.prototype.push.apply(structure.paragraphs, p));
};

/**
 * @param {Element} el
 * @param {Data} data
 * @param {Object} structure
 * @param {Object} shouldBeDelete
 * @api private
 */
Observe.paragraph = function (el, data, structure, shouldBeDelete) {
  var detail = [];

  utils.each(el.children, function (child) {
    var schema = utils.getElementSchema(child);

    if (!schema) {
      Observe.handleUnknownElement(child);
      return;
    }

    if (schema.type === 'detail') {
      detail.push(Observe.scan.call(this, child, structure, shouldBeDelete).id);
    }
  }.bind(this));

  data.set('detail', detail);
};

/**
 * @param {Element} el
 * @param {Data} data
 * @api private
 */
Observe.detail = function (el, data) {
  var offset = Observe.getOffset(el);
  data.set('start', offset.start);
  data.set('end', offset.end);
};

/**
 * @param {Element} el
 * @param {Data} data
 * @param {Object} attr
 * @api private
 */
Observe.attribute = function (el, data, attr) {
  var val = el.getAttribute(attr.name);
  data.set(attr.name, val);
};

/**
 * @param {Element} el
 * @param {Data} data
 * @param {Object} attr
 * @api private
 */
Observe.dataset = function (el, data, attr) {
  var val = el.getAttribute('data-' + attr.name);
  data.set(attr.name, val);
};

/**
 * @param {Element} el
 * @param {Data} data
 * @param {Object} attr
 * @api private
 */
Observe.content = function (el, data, attr) {
  var text = utils.getTextContent(el);
  data.set(attr.name, text);
};

/**
 * @param {Element} el
 * @api private
 */
Observe.handleUnknownElement = function (el) {
  var text = utils.getTextContent(el);
  var node = document.createTextNode(text);
  el.parentElement.replaceChild(node, el);
};

/**
 * @param {Element} el
 * @return {Number}
 * @api private
 */
Observe.getOffset = function (el) {
  var parentElement = el.parentNode;
  var beforeHTML, beforeText, tmp;
  var offset = {
    start: 0,
    end: 0
  };

  var check = function () {
    return parentElement
      && utils.isElementNode(parentElement)
      && !parentElement.getAttribute('name');
  };

  while (check()) {
    parentElement = parentElement.parentElement;
  }

  if (parentElement) {
    tmp = document.createElement('div');
    offset.start = parentElement.innerHTML.indexOf(el.outerHTML);
    beforeHTML = parentElement.innerHTML.substr(0, offset.start);
    tmp.innerHTML = beforeHTML;
    beforeText = utils.getTextContent(tmp);
    offset.start -= beforeHTML.length - beforeText.length;
    offset.end = offset.start + utils.getTextContent(el).length;
  }

  return offset;
};

/**
 * @return {Object}
 * @api public
 */
Observe.prototype.toJSON = function () {
  var structure = this.structure;
  var sections = structure.sections;
  var paragraphs = structure.paragraphs;
  var data = this.data;

  var json = {
    sections: [],
    paragraphs: []
  };

  sections.forEach(function (name) {
    var section = data[name];
    var d = section && section.toJSON() || {};

    d.name = name;

    json.sections.push(d);
  });

  paragraphs.forEach(function (name) {
    var paragraph = data[name];
    var d = paragraph && paragraph.toJSON() || {};
    
    d.name = name;

    d.detail = (d.detail || []).map(detail);

    json.paragraphs.push(d);
  });

  function detail(name) {
    var detail = data[name];
    var d = detail && detail.toJSON() || {};
    
    d.name = name;

    return d;
  }

  return json;
};

Observe.rules = {
  section: {
    paragraph: 1,
    paragraphs: 1
  },

  paragraphs: {
    paragraph: 1
  },

  paragraph: {
    detail: 1
  },

  detail: {}
};

/**
 * @param {Element} el
 * @api private
 */
Observe.checkAndRemoveStrangeElement = function (el) {
  var type = utils.getType(el);
  var parentType = utils.getType(el.parentElement);
  var shouldRemove = true;

  if (type && parentType) {
    if (Observe.rules[parentType][type]) {
      shouldRemove = false;
    }
  } else if (el.parentElement === this.el) {
    if (type === 'section') {
      shouldRemove = false;
    }
  }

  if (shouldRemove) {
    el.parentElement.removeChild(el);
  }
};
function HtmlBuilder() {
}

/**
 * @param {Object} json
 * @api public
 */
HtmlBuilder.prototype.fromJSON = function (json) {
  HtmlBuilder.importData.call(this, json);
  HtmlBuilder.buildHTML.call(this);
};

/**
 * @param {Object} json
 * @api private
 */
HtmlBuilder.importData = function (json) {
  json = utils.clone(json);

  var data = this.data = {};
  var structure = this.structure = {};
  var sections = structure.sections = [];
  var paragraphs = structure.paragraphs = [];

  (json.sections || []).forEach(function (section) {
    var name = section.name;
    var d = data[name] = new Data(name);

    delete section.name;
    d.data = section;
    d.update();

    sections.push(name);
  });

  (json.paragraphs || []).forEach(function (paragraph) {
    var name = paragraph.name;
    var d = data[name] = new Data(name);

    delete paragraph.name;

    d.data = paragraph;
    paragraph.detail = (paragraph.detail || []).map(detail);
    d.update();

    paragraphs.push(name);
  });

  function detail(detail) {
    var name = detail.name;
    var d = data[name] = new Data(name);

    delete detail.name;
    d.data = detail;
    d.update();

    return name;
  }

  return this;
};

/**
 * @api private
 */
HtmlBuilder.buildHTML = function () {
  var docfrag = document.createDocumentFragment();
  var el = this.el;
  var html = '';

  HtmlBuilder.createElements(docfrag, this.structure, this.data);

  utils.each(docfrag.childNodes, function (child) {
    html += child.outerHTML;
  });

  el.innerHTML = html;
};

/**
 * @param {DocumentFragment|Element} container
 * @param {Object} structure
 * @param {Object} data
 * @api private
 */
HtmlBuilder.createElements = function (container, structure, data) {
  HtmlBuilder.createSections(container, structure, data);
};

/**
 * @param {DocumentFragment|Element} container
 * @param {Object} structure
 * @param {Object} data
 * @api private
 */
HtmlBuilder.createSections = function (container, structure, data) {
  structure.sections.forEach(function (name) {
    var section = data[name];
    var el = HtmlBuilder.createElement(section);

    HtmlBuilder.createParagraphs(section, el, structure, data);

    container.appendChild(el);
  });
};

/**
 * @param {Object} section
 * @param {DocumentFragment|Element} container
 * @param {Object} structure
 * @param {Object} data
 * @api private
 */
HtmlBuilder.createParagraphs = function (section, container, structure, data) {
  structure
    .paragraphs
    .slice(section.get('start'), section.get('end'))
    .forEach(function (name) {
      var paragraph = data[name];
      var el = HtmlBuilder.createElement(paragraph);

      var s = schema[paragraph.get('tag')];

      if (s.type === 'paragraphs') {
        HtmlBuilder.createParagraphs(paragraph, el, structure, data);
      } else if (!paragraph.get('in-paragraphs')) {
        HtmlBuilder.createDetails(paragraph, el, structure, data);
      }

      container.appendChild(el);
    });
};

/**
 * @param {Object} paragraph
 * @param {DocumentFragment|Element} container
 * @param {Object} structure
 * @param {Object} data
 * @api private
 */
HtmlBuilder.createDetails = function (paragraph, container, structure, data) {
  var detail = paragraph.get('detail');
  var text = paragraph.get('text');
  var content, node;
  var pointer = 0;

  container.innerHTML = '';

  detail.forEach(function (name) {
    var d = data[name];
    var el = HtmlBuilder.createElement(d);
    var start = d.get('start');
    var end = d.get('end');

    if (pointer !== start) {
      content = text.slice(pointer, start);
      node = document.createTextNode(content);
      container.appendChild(node);
    }

    el.innerHTML = text.slice(start, end);
    container.appendChild(el);

    pointer = end;
  });

  if (pointer !== text.length) {
    content = text.slice(pointer, text.length);
    node = document.createTextNode(content);
    container.appendChild(node);
  }
};

/**
 * @param {Data} data
 * @return {Element}
 * @api private
 */
HtmlBuilder.createElement = function (data) {
  var tagName = data.get('tag');
  var el = document.createElement(tagName);

  el.setAttribute('name', data.id);
  HtmlBuilder.initElement(el, data);

  return el;
};

/**
 * @param {Element} el
 * @param {Data} data
 * @api private
 */
HtmlBuilder.initElement = function (el, data) {
  var s = schema[data.get('tag')];

  s.attrs.forEach(function (attr) {
    HtmlBuilder[attr.type].call(this, el, data, attr);
  });
};

/**
 * @param {Element} el
 * @param {Data} data
 * @param {Object} attr
 * @api private
 */
HtmlBuilder.attribute = function (el, data, attr) {
  el.setAttribute(attr.name, data.get(attr.name));
};

/**
 * @param {Element} el
 * @param {Data} data
 * @param {Object} attr
 * @api private
 */
HtmlBuilder.dataset = function (el, data, attr) {
  el.setAttribute('data-' + attr.name, data.get(attr.name));
};

/**
 * @param {Element} el
 * @param {Data} data
 * @param {Object} attr
 * @api private
 */
HtmlBuilder.content = function (el, data, attr) {
  if (el.textContent === undefined) {
    el.innerText = data.get(attr.name);
  } else {
    el.textContent = data.get(attr.name);
  }
};
var defaultOptions = {
  genName: function () {
    var format = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
    return format.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
};
Editor.prototype = Object.create(Emitter.prototype);
utils.mixin(Editor.prototype, Middleware.prototype);
utils.mixin(Editor.prototype, Observe.prototype);
utils.mixin(Editor.prototype, HtmlBuilder.prototype);

function Editor(options) {
  Emitter.call(this);
  Middleware.call(this);
  Observe.call(this);
  HtmlBuilder.call(this);

  this.options = utils.mixin(Object.create(defaultOptions), options || {});
  this.context = {};
  this.context.editor = this;

  var el = this.options.el;

  if (!el) {
    el = document.createElement('div');
  }

  el.setAttribute('contenteditable', true);
  el.classList.add('med');

  this.el = el;
  this.caret = new Caret(this);

  this.bindEvents();
  this.handleEmpty();

  this.use(initContext());
}

/**
 * @api public
 */
Editor.prototype.default = function () {
  removeExtraNodes(this);
  renameElements(this);
  removeInlineStyle(this);
  handleEmptyParagraph(this);

  return this.compose([
    preventDefault(),
    handleParagraph(this),
    handleList(this),
    handleBlockquote(this),
    handleBackspace(this),
    createNewParagraph()
  ]);
};

Editor.prototype.schema = schema;

/**
 * @api private
 */
Editor.prototype.bindEvents = function () {
  var el = this.el;
  var bind = el.addEventListener.bind(el);

  bind('keydown', this.onKeydown.bind(this));
  bind('keyup', this.handleEmpty.bind(this));
  bind('blur', this.handleEmpty.bind(this));
  bind('focus', this.handleEmpty.bind(this));
};

/**
 * @param {KeyboardEvent} e
 * @api private
 */
Editor.prototype.onKeydown = function (e) {
  var ctx;

  this.handleEmpty();
  
  ctx = Object.create(this.context);
  ctx.event = e;
  ctx.prevent = utils.preventDefault.bind(null, e);

  setTimeout(function () {
    this.sync();
    this.walk();
  }.bind(this));

  this.exec(ctx, function (e) {
    if (e) {
      this.emit('error', e);
    }
  }.bind(this));
};

/**
 * @return {Boolean}
 * @api public
 */
Editor.prototype.isEmpty = function () {
  var children = this.el.children;
  var first = children[0];
  return children.length <= 1
    && !utils.getTextContent(first).trim();
};

/**
 * @api private
 */
Editor.prototype.handleEmpty = function () {
  var first = this.el.children[0];

  if (!first) {
    var p = document.createElement('p');
    first = document.createElement('section');
    p.innerHTML = '<br type="_med_placeholder">';
    first.appendChild(p);
    this.el.appendChild(first);
    this.sync(this.el);

    setTimeout(function () {
      this.caret.focusTo(p);
    }.bind(this));
  }

  if (this.isEmpty()) {
    this.el.classList.add('is-empty');
  } else {
    this.el.classList.remove('is-empty');
  }
};

/**
 * @api private
 */
Editor.prototype.walk = function () {
  var els = editor.el.querySelectorAll('[name]');
  var context = {
    editor: this
  };

  context.editor = this;

  this.emit('walkStart', context);

  Array.prototype.forEach.call(els, function (el) {
    context.el = el;
    context.element = el;
    context.name = el.getAttribute('name');
    context.data = this.data[context.name];
    this.emit('walk', context);
  }.bind(this));

  this.emit('walkEnd', context);
};
})(this);
