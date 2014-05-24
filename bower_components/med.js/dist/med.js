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

utils.isEmpty = function (el) {
  if (utils.isTag('br', el)) {
    return false;
  }
  return !utils.getTextContent(el).trim();
};

utils.isNotEmpty = function (el) {
  return !utils.isEmpty(el);
};

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

utils.isLastChild = function (el) {
  return el.parentELement.lastChild === el;
};

utils.removeEmptyElements = function (el) {
  utils.each(el.children, function (child) {
    if (utils.isEmpty(child)) {
      el.removeChild(child);
    } else {
      utils.removeEmptyElements(child);
    }
  });
};

utils.removeElement = function (el) {
  if (el.parentElement) {
    el.parentElement.removeChild(el);
  }
};

utils.moveChildren = function (src, dest) {
  var children = Array.prototype.slice.call(src.children);

  utils.each(children, function (child) {
    dest.appendChild(child);
  });
};

utils.moveChildNodes = function (src, dest) {
  var nodes = Array.prototype.slice.call(src.childNodes);

  utils.each(nodes, function (node) {
    dest.appendChild(node);
  });
};

utils.isType = function (types, el) {
  var s = utils.getElementSchema(el);

  if (typeof types === 'string') {
    types = [types];
  }

  return s && !!~types.indexOf(s.type);
};

utils.isElementNode = function (node) {
  return node.nodeType === document.ELEMENT_NODE;
};

utils.isTextNode = function (node) {
  return node.nodeType === document.TEXT_NODE;
};

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

utils.nodeContentLength = function (node) {
  return utils.getTextContent(node).length;
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
    var el = ctx.element;

    return !(selection + '')
      && utils.isType(['paragraph', 'paragraphs', 'section'], el)
      // li 是一個 paragraph
      // 但 li 的預設刪除行為在這裡沒有問題
      // 所以把他忽略掉
      && !utils.isTag('li', el)
      && editor.caret.atElementStart(el);
  };

  return function (next) {
    if (this.key !== 'backspace') {
      return next();
    }

    var el = this.element;

    // 段落前面已經沒有文字
    // 需要刪除 element
    if (shouldHandleBackspace(this)) {
      this.prevent();

      var previous = this.element.previousElementSibling;
      var needToRemove, offset, firstChild;

      if (previous) {
        needToRemove = this.element;
      } else {
        needToRemove = this.section;
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
          offset = utils.getTextContent(previous).length;

          utils.removeEmptyElements(previous);

          utils.moveChildNodes(needToRemove, previous);

          needToRemove.parentElement.removeChild(needToRemove);

          if (utils.isType('section', needToRemove)) {
            // section 的情況是要讓游標在畫面上跟著目前 element 移動
            editor.caret.moveToStart(firstChild);
          } else {
            // 段落的情況是要讓兩個 element 接起來後，游標移動到合併的位置
            editor.caret.moveToStart(previous.firstChild, offset);
          }
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

    next();
  };
};
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
          prev.innerHTML += utils.getTextContent(curr);
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

Emitter.prototype.on = function (event, handler) {
  var list = this.events[event] || [];
  list.push(handler);
  this.events[event] = list;
  return this;
};

Emitter.prototype.once = function (event, handler) {
  handler._once = true;
  this.on(event, handler);
  return this;
};

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

Caret.prototype.focusNode = function () {
  return document.getSelection().focusNode;
};

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

Caret.prototype.focusSection = function () {
  return this.focusType('section');
};

Caret.prototype.focusParagraph = function () {
  return this.focusType('paragraph');
};

Caret.prototype.focusParagraphs = function () {
  return this.focusType('paragraphs');
};

Caret.prototype.focusDetail = function () {
  return this.focusType('detail');
};

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

Caret.prototype.focusTo = function (el) {
  if (el.innerHTML.trim()) {
    this.moveToStart(el);
  } else {
    el.innerHTML = '\uffff';
    this.moveToStart(el);
    el.innerHTML = '';
  };
};

Caret.prototype.textBefore = function () {
  var selection = document.getSelection();
  var node = selection.focusNode;
  var offset = selection.focusOffset;

  if (utils.isElementNode(node)) {
    return '';
  }
  
  return node.substringData(0, offset);
};

Caret.prototype.textAfter = function () {
  var selection = document.getSelection();
  var node = selection.focusNode;
  var offset = selection.focusOffset;

  if (utils.isElementNode(node)) {
    return '';
  }
  
  return node.substringData(offset, node.length - 1); 
};

Caret.prototype.moveToStart = function (el, offset) {
  this.select(el, offset | 0);
};

Caret.prototype.moveToEnd = function (el, offset) {
  var len = utils.nodeContentLength(el);

  offset = len - (offset | 0);

  if (offset < 0) {
    offset = 0;
  }

  this.select(el, offset);
};

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

Caret.prototype.selectAllText = function (el) {
  var selection = window.getSelection();        
  var range = document.createRange();
  range.selectNodeContents(el);
  selection.removeAllRanges();
  selection.addRange(range);
};

// Example:
//   caret.select(node)
//   caret.select(node, offset)
//   caret.select(startNode, endNode)
//   caret.select(node, startOffset, endOffset)
//   caret.select(startNode, startOffset, endNode, endOffset)
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

Caret.prototype.insertElement = function (el) {
  var selection = document.getSelection();
  var range = selection.getRangeAt(0);
  
  range.deleteContents();

  range.insertNode(el);
};

Caret.prototype.closestElement = function () {
  var node = this.focusNode();
  return this.nextElement(node);
};

Caret.prototype.atElementStart = function (el) {
  var selection = document.getSelection();
  var focusNode = selection.focusNode;
  var offset = selection.focusOffset;
  var range = document.createRange();

  range.setStart(el.childNodes[0], 0);
  range.setEnd(focusNode, offset);

  return !range.toString().trim();
};

Caret.prototype.atElementEnd = function (el) {
  var selection = document.getSelection();
  var focusNode = selection.focusNode;
  var offset = selection.focusOffset;
  var range = document.createRange();
  var lastNode = el.childNodes[el.childNodes.length - 1];

  range.setStart(focusNode, offset);
  range.setEnd(lastNode, lastNode.length - 1);

  return !range.toString().trim();
};
function Middleware() {
  this.middleware = [];
}

Middleware.prototype.use = function (fn) {
  if (typeof fn !== 'function') {
    throw new Error('The first argument must me a function.');
  }

  this.middleware.push(fn);

  return this;
};

Middleware.prototype.exec = function (ctx, cb) {
  var fn = this.compose(this.middleware);
  fn.call(ctx, cb);
};

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

Data.prototype.set = function (key, val) {
  if (!utils.equal(this.get(key), val)) {
    this.modified = true;
  }

  this.tmp[key] = val;

  return this;
};

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

Data.prototype.update = function () {
  var tmp = this.tmp;

  Object.keys(tmp).forEach(function (key) {
    this._set(key, tmp[key]);
  }.bind(this));

  this.modified = false;
  this.tmp = {};

  return this;
};

Data.prototype.toJSON = function () {
  return utils.clone(this.data);
};
function Observe() {
  this.structure = null;
  this.data = {};
}

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

Observe.detail = function (el, data) {
  var offset = Observe.getOffset(el);
  data.set('start', offset.start);
  data.set('end', offset.end);
};

Observe.attribute = function (el, data, attr) {
  var val = el.getAttribute(attr.name);
  data.set(attr.name, val);
};

Observe.dataset = function (el, data, attr) {
  var val = el.getAttribute('data-' + attr.name);
  data.set(attr.name, val);
};

Observe.content = function (el, data, attr) {
  var text = utils.getTextContent(el);
  data.set(attr.name, text);
};

Observe.handleUnknownElement = function (el) {
  var text = utils.getTextContent(el);
  var node = document.createTextNode(text);
  el.parentElement.replaceChild(node, el);
};

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

HtmlBuilder.prototype.fromJSON = function (json) {
  HtmlBuilder.importData.call(this, json);
  HtmlBuilder.buildHTML.call(this);
};

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

HtmlBuilder.createElements = function (container, structure, data) {
  HtmlBuilder.createSections(container, structure, data);
};

HtmlBuilder.createSections = function (container, structure, data) {
  structure.sections.forEach(function (name) {
    var section = data[name];
    var el = HtmlBuilder.createElement(section);

    HtmlBuilder.createParagraphs(section, el, structure, data);

    container.appendChild(el);
  });
};

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

HtmlBuilder.createElement = function (data) {
  var tagName = data.get('tag');
  var el = document.createElement(tagName);

  el.setAttribute('name', data.id);
  HtmlBuilder.initElement(el, data);

  return el;
};

HtmlBuilder.initElement = function (el, data) {
  var s = schema[data.get('tag')];

  s.attrs.forEach(function (attr) {
    HtmlBuilder[attr.type].call(this, el, data, attr);
  });
};

HtmlBuilder.attribute = function (el, data, attr) {
  el.setAttribute(attr.name, data.get(attr.name));
};

HtmlBuilder.dataset = function (el, data, attr) {
  el.setAttribute('data-' + attr.name, data.get(attr.name));
};

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

Editor.prototype.default = function () {
  removeExtraNodes(this);
  renameElements(this);
  removeInlineStyle(this);
  handleEmptyParagraph(this);

  return this.compose([
    preventDefault(),
    handleParagraph(this),
    handleList(this),
    handleBackspace(this),
    createNewParagraph()
  ]);
};

Editor.prototype.schema = schema;

Editor.prototype.bindEvents = function () {
  var el = this.el;
  var bind = el.addEventListener.bind(el);

  bind('keydown', this.onKeydown.bind(this));
  bind('keyup', this.handleEmpty.bind(this));
  bind('blur', this.handleEmpty.bind(this));
  bind('focus', this.handleEmpty.bind(this));
};

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

Editor.prototype.isEmpty = function () {
  var children = this.el.children;
  var first = children[0];
  return children.length <= 1
    && !utils.getTextContent(first).trim();
};

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

Editor.prototype.walk = function () {
  var els = editor.el.querySelectorAll('[name]');
  var context = {};

  context.editor = this;

  this.emit('walkStart', context);

  Array.prototype.forEach.call(els, function (el) {
    var childContext = Object.create(context);
    childContext.el = el;
    childContext.element = el;
    childContext.name = el.getAttribute('name');
    childContext.data = this.data[childContext.name];
    this.emit('walk', childContext);
  }.bind(this));

  this.emit('walkEnd', context);
};
})(this);
