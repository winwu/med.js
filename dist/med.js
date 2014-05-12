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

utils.mixin = function (o1, o2) {
  Object
    .getOwnPropertyNames(o2)
    .forEach(function (name) {
      var desc = Object.getOwnPropertyDescriptor(o2, name);
      Object.defineProperty(o1, name, desc);
    });
  return o1;
};

utils.preventEvent = function (e) {
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
  if (typeof ctx === 'object' && typeof ctx.length === 'number') {
    Array.prototype.forEach.call(ctx, fn);
  }
  return ctx;
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
  if (null === obj || 'object' !== typeof obj) {
    return obj;
  }

  if (obj instanceof Date) {
    var copy = new Date();
    copy.setTime(obj.getTime());
    return copy;
  }

  if (obj instanceof Array) {
    return obj.slice();
  }

  var copy = {};

  for (var attr in obj) {
    if (obj.hasOwnProperty(attr)) {
      copy[attr] = utils.clone(obj[attr]);
    }
  }

  return copy;
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

  editor.on('walk', function (ctx) {
    var s = schema[ctx.el.tagName.toLowerCase()];
    if (s.type === 'paragraph') {
      removeExtraNode(ctx.el);
    }
  });
};

middlewares.handleEmptyParagraph = function (editor) {
  editor.on('walk', function (ctx) {
    var el = ctx.el;
    if (el.tagName === 'P' && !(el.textContent || el.innerText || '').trim()) {
      el.innerHTML = '<br class="_med_placeholder" />';
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

  while (len -= 1) {
    if (handler === list[len]) {
      list.split(len, 1);
    }
  }

  return this;
};

Emitter.prototype.emit = function () {
  var args = Array.prototype.slice.call(arguments);
  var event = args.shift();
  var list = this.events[event] || [];

  list.forEach(function (handler) {
    handler.apply(this, args);
  }.bind(this));

  return this;
};
function Caret(editor) {
  this.editor = editor;
}

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

    while (node && node.nodeType !== document.ELEMENT_NODE) {
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
  var s;

  while (true) {
    if (!node) {
      break;
    }

    s = node && schema[node.tagName.toLowerCase()];

    if (s && s.type === type) {
      return node;
    }

    node = node.parentElement;
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
  
  if (node.nodeType === document.ELEMENT_NODE){
    return '';
  }
  
  return node.substringData(0, offset); 
};

Caret.prototype.textAfter = function () {
  var selection = document.getSelection();
  var node = selection.focusNode;
  var offset = selection.focusOffset;
  
  if (node.nodeType === document.ELEMENT_NODE){
    return '';
  }
  
  return node.substringData(offset, node.length - 1); 
};

Caret.prototype.moveToStart = function (el) {
  el.focus();
  document.getSelection().collapse(el, true);
};

Caret.prototype.moveToEnd = function (el) {
  var range = document.createRange();
  var selection = window.getSelection();
  range.selectNodeContents(el);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
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

Caret.prototype.insertElement = function (el) {
  var selection = document.getSelection();
  var range = selection.getRangeAt(0);
  
  range.deleteContents();

  range.insertNode(el);
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
  this.tmp[key] = val;
  this.modified = true;
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

  if (data[last] !== val) {
    this.modified = true;
    data[last] = val;
  }

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

  Object.keys(data).forEach(function (name) {
    shouldBeDelete[name] = 1;
  });

  this._scan(this.el, structure, shouldBeDelete);

  Object.keys(shouldBeDelete).forEach(function (name) {
    delete data[name];
  });

  this.structure = structure;
};

Observe.prototype._scan = function (el, structure, shouldBeDelete) {
  var tagName = el.tagName.toLowerCase();
  var name = el.getAttribute('name');
  var data = this.data[name];
  var schema = this.schema[tagName];
  
  if (!schema) {
    utils.each(el.children, function (el) {
      this._scan(el, structure, shouldBeDelete);
    }.bind(this));
    return;
  }

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
    var schema = this.schema[child.tagName.toLowerCase()];

    if (!schema) {
      Observe.handleUnknownElement(child);
      return;
    }

    if (!~structure.sections.indexOf(data.id)) {
      structure.sections.push(data.id);
    }

    if (/^paragraph/.test(schema.type)) {
      p.push(this._scan(child, structure, shouldBeDelete).id);
    }

  }.bind(this));

  data.set('start', structure.paragraphs.length);
  data.set('end', Array.prototype.push.apply(structure.paragraphs, p));
};

Observe.paragraphs = function (el, data, structure, shouldBeDelete) {
  var p = [];

  utils.each(el.children, function (child) {
    var schema = this.schema[child.tagName.toLowerCase()];

    if (!schema) {
      Observe.handleUnknownElement(child);
      return;
    }

    if (schema.type === 'paragraph') {
      p.push(this._scan(child, structure, shouldBeDelete).id);
    }
  }.bind(this));

  data.set('start', structure.paragraphs.length);
  data.set('end', Array.prototype.push.apply(structure.paragraphs, p));
};

Observe.paragraph = function (el, data, structure, shouldBeDelete) {
  var detail = [];

  utils.each(el.children, function (child) {
    var schema = this.schema[child.tagName.toLowerCase()];

    if (!schema) {
      Observe.handleUnknownElement(child);
      return;
    }

    if (schema.type === 'detail') {
      detail.push(this._scan(child, structure, shouldBeDelete).id);
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
  var text = el.textContent || el.innerText;
  data.set(attr.name, text);
};

Observe.handleUnknownElement = function (el) {
  var text = el.textContent || el.innerText;
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
      && parentElement.nodeType === document.ELEMENT_NODE
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
    beforeText = tmp.textContent || tmp.innerText || '';
    offset.start -= beforeHTML.length - beforeText.length;
    offset.end = offset.start + (el.textContent || el.innerText || '').length;
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
function HtmlBuilder() {
}

HtmlBuilder.prototype.fromJSON = function (json) {
  var el = this.el;
  var sections = json.sections;
  var paragraphs = json.paragraphs;
  
  sections.forEach(function (section, i) {
    var $section = el.querySelector('[name="' + section.name + '"]');
    var prev = sections[i - 1];
    var $prev = prev && el.querySelector('[name="' + prev.name + '"]');
    var i, paragraph, $paragraph;

    if (!$section) {
      $section = document.createElement(section.tag);
      $section.setAttribute('name', section.name);
    }

    for (i = section.start; i < section.end; i += 1) {
      paragraph = paragraphs[i];
      $paragraph = $section.querySelector('[name="' + paragraph.name + '"]');

      if (!$paragraph) {
        $paragraph = document.createElement(paragraph.tag);
        $paragraph.setAttribute('name', paragraph.name);
      }

      HtmlBuilder.initElement.call(this, $paragraph, paragraph);
      HtmlBuilder.createDetail.call(this, $paragraph, paragraph);

      if (!$paragraph.parentElement) {
        $section.appendChild($paragraph);
      }
    }

    if (!$section.parentElement) {
      if ($prev) {
        $prev.parentElement.insertBefore($section, $prev.nextSibling);
      } else {
        this.el.appendChild($section);
      }
    }
  }.bind(this));

  this.handleEmpty();
};

HtmlBuilder.createDetail = function (el, data) {
  var text = el.textContent || el.innerText;
  var detail = data.detail || [];
  var html = '';
  var cursor = 0;

  detail.forEach(function (data) {
    var $detail = el.querySelector('[name="' + data.name + '"]');

    if (!$detail) {
      $detail = document.createElement(data.tag);
      $detail.setAttribute('name', data.name);
    }

    HtmlBuilder.initElement.call(this, $detail, data);

    if ($detail.textContent === undefined) {
      $detail.innerText = text.substr(data.start, data.end - data.start);
    } else {
      $detail.textContent = text.substr(data.start, data.end - data.start);
    }

    html += text.substr(cursor, data.start - cursor)
      + $detail.outerHTML;

    cursor = data.end;
  }.bind(this));

  html += text.substr(cursor, text.length - cursor);

  el.innerHTML = html;
};

HtmlBuilder.initElement = function (el, data) {
  var schema = this.schema[data.tag];

  schema.attrs.forEach(function (attr) {
    HtmlBuilder[attr.type].call(this, el, data, attr);
  });
};

HtmlBuilder.attribute = function (el, data, attr) {
  el.setAttribute(attr.name, data[attr.name]);
};

HtmlBuilder.dataset = function (el, data, attr) {
  el.setAttribute('data-' + attr.name, data[attr.name]);
};

HtmlBuilder.content = function (el, data, attr) {
  if (el.textContent === undefined) {
    el.innerText = data[attr.name];
  } else {
    el.textContent = data[attr.name];
  }
};
var defaultOptions = {
  genName: function () {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
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

  this.options = utils.mixin(Object.create(defaultOptions), options);
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

  this.use(middlewares.init());
}

Editor.prototype.default = function () {
  return this.compose([
    middlewares.p(this),
    middlewares.removeExtraNodes(this),
    middlewares.renameElements(this),
    middlewares.removeInlineStyle(this),
    middlewares.handleEmptyParagraph(this)
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
  var focus = this.caret.focusElement();
  var ctx;

  if (focus === this.el || focus === document.body) {
    utils.preventEvent(e);
    return;
  }

  this.handleEmpty();
  
  ctx = Object.create(this.context);
  ctx.event = e;
  ctx.prevent = utils.preventEvent.bind(null, e);

  setTimeout(function () {
    this.walk();
    this.sync();
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
    && !(first.textContent || first.innerText || '').trim();
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
    this.caret.focusTo(p);
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

  this.emit('walkStart', context);

  Array.prototype.forEach.call(els, function (el) {
    var childContext = Object.create(context);
    childContext.el = el;
    childContext.name = el.getAttribute('name');
    childContext.data = this.data[childContext.name];
    this.emit('walk', childContext);
  }.bind(this));

  this.emit('walkEnd', context);
};
})(this);
