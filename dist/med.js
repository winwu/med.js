/**
 * med.js
 * http://github.com/poying/med.js
 *
 * (c) 2014 http://poying.me
 * MIT licensed
 */

;(function(){

/**
 * Require the module at `name`.
 *
 * @param {String} name
 * @return {Object} exports
 * @api public
 */

function require(name) {
  var module = require.modules[name];
  if (!module) throw new Error('failed to require "' + name + '"');

  if (!('exports' in module) && typeof module.definition === 'function') {
    module.client = module.component = true;
    module.definition.call(this, module.exports = {}, module);
    delete module.definition;
  }

  return module.exports;
}

/**
 * Registered modules.
 */

require.modules = {};

/**
 * Register module at `name` with callback `definition`.
 *
 * @param {String} name
 * @param {Function} definition
 * @api private
 */

require.register = function (name, definition) {
  require.modules[name] = {
    definition: definition
  };
};

/**
 * Define a module's exports immediately with `exports`.
 *
 * @param {String} name
 * @param {Generic} exports
 * @api private
 */

require.define = function (name, exports) {
  require.modules[name] = {
    exports: exports
  };
};
require.register("med", function (exports, module) {
'use strict';

module.exports = Editor;

var Emitter = require("med/src/emitter.js");
var Caret = require("med/src/caret.js");
var Middleware = require("med/src/mixin/middleware.js");
var Observe = require("med/src/mixin/observe.js");
var HtmlBuilder = require("med/src/mixin/html-builder.js");
var Figure = require("med/src/mixin/figure.js");
var utils = require("med/src/utils/index.js");
var plugins = require("med/src/plugins/index.js");
var defaultOptions = require("med/src/default-options.js");

// extends
Editor.prototype = Object.create(Emitter.prototype);

// mixin
utils.mixin(Editor.prototype, Middleware.prototype);
utils.mixin(Editor.prototype, Observe.prototype);
utils.mixin(Editor.prototype, HtmlBuilder.prototype);
utils.mixin(Editor.prototype, Figure.prototype);

function Editor(options) {
  // parent
  Emitter.call(this);

  // init mixin
  Middleware.call(this);
  Observe.call(this);
  HtmlBuilder.call(this);
  Figure.call(this);

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

  this.use(plugins.initContext());

  plugins.removeExtraNodes(this);
  plugins.renameElements(this);
  plugins.removeInlineStyle(this);
  plugins.handleEmptyParagraph(this);
  plugins.refocus(this);
}

/**
 * @api public
 */
Editor.prototype.start = function () {
  return this.compose([
    plugins.preventDefault(),
    plugins.commandA(this),
    plugins.handleParagraph(this),
    plugins.handleList(this),
    plugins.handleFigure(this),
    plugins.handleBlockquote(this),
    plugins.handleBackspace(this)
  ]);
};

/**
 * @api public
 */
Editor.prototype.end = function () {
  return this.compose([
    plugins.createNewParagraph()
  ]);
};

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

  this.exec(ctx, function (e) {
    if (e) {
      this.emit('error', e);
    }
  }.bind(this));

  this.sync();
  this.walk();


  // 預設動作結束後必須在 sync 一次
  // 因為預設動作也會改變 html 結構
  setTimeout(function () {
    this.sync();
  }.bind(this));
};

/**
 * @returns {Boolean}
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
  var els = this.el.querySelectorAll('[name]');
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

});

require.register("med/src/caret.js", function (exports, module) {
'use strict';

var utils = require("med/src/utils/index.js");

module.exports = Caret;

function Caret(editor) {
  this.editor = editor;
}

/**
 * @returns {Node}
 * @api public
 */
Caret.prototype.focusNode = function () {
  return document.getSelection().focusNode;
};

/**
 * @param {String} tagName
 * @returns {Element}
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
 * @returns {Element}
 * @api public
 */
Caret.prototype.focusSection = function () {
  return this.focusType('section');
};

/**
 * @returns {Element}
 * @api public
 */
Caret.prototype.focusParagraph = function () {
  return this.focusType('paragraph');
};

/**
 * @returns {Element}
 * @api public
 */
Caret.prototype.focusParagraphs = function () {
  return this.focusType('paragraphs');
};

/**
 * @returns {Element}
 * @api public
 */
Caret.prototype.focusFigure = function () {
  return this.focusType('figure');
};

/**
 * @returns {Element}
 * @api public
 */
Caret.prototype.focusDetail = function () {
  return this.focusType('detail');
};

/**
 * @param {String} type
 * @returns {Element}
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
 * @returns {Element}
 * @api public
 */
Caret.prototype.nextElement = function (node) {
  if (node) {
    node = node.nextSibling;
  } else {
    node = this.focusNode();
    node = node && node.nextSibling;
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
  if (!el) {
    return;
  }

  if (el.innerHTML.trim()) {
    this.moveToStart(el);
  } else {
    el.innerHTML = '\uffff';
    this.moveToStart(el);
    el.innerHTML = '';
  }
};

/**
 * @returns {String}
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
 * @returns {String}
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
  if (!el) {
    return;
  }

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
  if (!el) {
    return;
  }

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
 * @returns {Element}
 * @api public
 */
Caret.prototype.split = function (el) {
  if (!el) {
    return null;
  }

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
 * @param {Element} el
 * @api public
 */
Caret.prototype.selectAll = function (el) {
  var firstNode = utils.firstTextNode(el);
  var lastNode = utils.lastTextNode(el);

  this.select(firstNode, lastNode);
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

  // Chrome 無法選取空 TextNode
  // 所以這邊填入 \uffff 當作 placeholder

  var insertPlaceholder = function () {
    if (startNode && utils.isEmpty(startNode)) {
      utils.setNodeContent(startNode, '\uffff');
    }

    if (endNode && utils.isEmpty(endNode)) {
      utils.setNodeContent(endNode, '\uffff');
    }
  };

  var removePlaceholder = function () {
    var startNodeContent = utils.getTextContent(startNode);
    var endNodeContent = utils.getTextContent(endNode);
    var placeholder = /\uffff/g;

    startNodeContent = startNodeContent.replace(placeholder, '');
    endNodeContent = endNodeContent.replace(placeholder, '');

    utils.setNodeContent(startNode, startNodeContent);
    utils.setNodeContent(endNode, endNodeContent);
  };

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
      insertPlaceholder();
    } else {
      startNode = arguments[0];
      startOffset = 0;
      endNode = arguments[1];
      insertPlaceholder();
      endOffset = utils.getTextContent(endNode).length;
    }
    break;
  case 3:
    startNode = arguments[0];
    endNode = arguments[1];
    insertPlaceholder();
    startOffset = 0;
    endOffset = utils.getTextContent(startNode).length;
    break;
  case 4:
    startNode = arguments[0];
    startOffset = arguments[1];
    endNode = arguments[2];
    endOffset = arguments[3];
    insertPlaceholder();
    break;
  }

  startOffset = startOffset | 0;
  endOffset = endOffset | 0;

  range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);

  selection.removeAllRanges();
  selection.addRange(range);

  removePlaceholder();
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
 * @returns {Boolean}
 * @api public
 */
Caret.prototype.atElementStart = function (el) {
  if (!el.childNodes.length) {
    return true;
  }

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
 * @returns {Boolean}
 * @api public
 */
Caret.prototype.atElementEnd = function (el) {
  if (!el.childNodes.length) {
    return true;
  }

  var selection = document.getSelection();
  var focusNode = selection.focusNode;
  var offset = selection.focusOffset;
  var range = document.createRange();
  var lastNode = utils.lastTextNode(el);

  if (!lastNode) {
    return true;
  }

  range.setStart(focusNode, offset);
  range.setEnd(lastNode, lastNode.length);

  return !range.toString().trim();
};

});

require.register("med/src/data.js", function (exports, module) {
'use strict';

var utils = require("med/src/utils/index.js");

module.exports = Data;

function Data(id) {
  this.id = id;
  this.modified = false;
  this.data = {};
  this.tmp = {};
}

/**
 * @param {String} key
 * @param {Mixed} key
 * @returns {Data}
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
 * @returns {Data}
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
 * @returns {Mixed}
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
 * @returns {Data}
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
 * @returns {Object}
 * @api public
 */
Data.prototype.toJSON = function () {
  return utils.clone(this.data);
};

});

require.register("med/src/default-options.js", function (exports, module) {
'use strict';

module.exports = {
  genName: function () {
    var format = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
    return format.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
};

});

require.register("med/src/emitter.js", function (exports, module) {
'use strict';

module.exports = Emitter;

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
      if (this.events.hasOwnProperty(event)) {
        this.off(event, handler);
      }
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

});

require.register("med/src/figure-type.js", function (exports, module) {
'use strict';

module.exports = FigureType;

function FigureType(name, options) {
  this.options = options || (options = {});
  this.name = name;
}

FigureType.prototype.updateData = function (el, data) {
  data.set('figureType', this.name);

  this.options.updateData
    && this.options.updateData(el, data);
};

FigureType.prototype.updateHTML = function (el, data) {
  el.setAttribute('type', this.name);

  this.options.updateHTML
    && this.options.updateHTML(el, data);
};

});

require.register("med/src/keyboard.js", function (exports, module) {
'use strict';

var utils = require("med/src/utils/index.js");

var keyboard = module.exports = {};

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

});

require.register("med/src/schema.js", function (exports, module) {
'use strict';

var schema = module.exports = {
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
    type: 'figure'
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

});

require.register("med/src/mixin/figure.js", function (exports, module) {
'use strict';

var FigureType = require("med/src/figure-type.js");
var utils = require("med/src/utils/index.js");

module.exports = Figure;

function Figure() {
  this.figureTypes = {};
  this.registerFigureType('default', {
    updateData: function (el, data) {
      data.set('html', el.innerHTML);
    },
    updateHTML: function (el, data) {
      el.innerHTML = data.get('html');
    }
  });
}

Figure.prototype.registerFigureType = function (name, options) {
  var type = new FigureType(name, options);
  this.figureTypes[name] = type;
  return this;
};

Figure.prototype.getFigureType = function (name) {
  if (utils.isElementNode(name)) {
    name = name.getAttribute('type');
  }

  return this.figureTypes[name]
    || this.figureTypes.default;
};

});

require.register("med/src/mixin/html-builder.js", function (exports, module) {
'use strict';

var Data = require("med/src/data.js");
var schema = require("med/src/schema.js");
var utils = require("med/src/utils/index.js");

module.exports = HtmlBuilder;

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

  // section
  (json.sections || []).forEach(function (section) {
    var name = section.name;
    var d = data[name] = new Data(name);

    delete section.name;
    d.data = section;
    d.update();

    sections.push(name);
  });

  // paragraphs, paragraph and figure
  (json.paragraphs || []).forEach(function (paragraph) {
    var name = paragraph.name;
    var d = data[name] = new Data(name);

    delete paragraph.name;

    d.data = paragraph;
    
    // figure 沒有 detail
    if (d.get('type') !== 'figure') {
      paragraph.detail = (paragraph.detail || []).map(detail);
    }
    
    d.update();

    paragraphs.push(name);
  });

  // detail
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

  HtmlBuilder.createElements.call(this, docfrag);

  utils.each(docfrag.childNodes, function (child) {
    html += child.outerHTML;
  });

  el.innerHTML = html;
};

/**
 * @param {DocumentFragment|Element} container
 * @api private
 */
HtmlBuilder.createElements = function (container) {
  HtmlBuilder.createSections.call(this, container);
};

/**
 * @param {DocumentFragment|Element} container
 * @api private
 */
HtmlBuilder.createSections = function (container) {
  var structure = this.structure;
  var data = this.data;

  structure.sections.forEach(function (name) {
    var section = data[name];
    var el = HtmlBuilder.createElement(section);

    HtmlBuilder.createParagraphs.call(this, section, el);

    container.appendChild(el);
  }.bind(this));
};

/**
 * @param {Object} section
 * @param {DocumentFragment|Element} container
 * @api private
 */
HtmlBuilder.createParagraphs = function (section, container) {
  var structure = this.structure;
  var data = this.data;

  structure
    .paragraphs
    .slice(section.get('start'), section.get('end'))
    .forEach(function (name) {
      var paragraph = data[name];
      var el = HtmlBuilder.createElement(paragraph);

      var type = utils.getType(el);

      if (type === 'paragraphs') {
        HtmlBuilder.createParagraphs.call(this, paragraph, el);
      } else if (!paragraph.get('in-paragraphs')) {
        if (utils.isType('figure', el)) {
          HtmlBuilder.createFigure.call(this, paragraph, el);
        } else {
          HtmlBuilder.createDetails.call(this, paragraph, el);
        }
      }

      container.appendChild(el);
    }.bind(this));
};

/**
 * @param {Data} figure
 * @param {DocumentFragment|Element} figureElement
 * @api private
 */
HtmlBuilder.createFigure = function (figure, figureElement) {
  var figureType = this.getFigureType(figure.get('type'));
  figureType.updateHTML(figureElement, figure);
};

/**
 * @param {Data} paragraph
 * @param {DocumentFragment|Element} container
 * @api private
 */
HtmlBuilder.createDetails = function (paragraph, container) {
  var data = this.data;
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
 * @returns {Element}
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
    HtmlBuilder[attr.type](el, data, attr);
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

});

require.register("med/src/mixin/middleware.js", function (exports, module) {
'use strict';

module.exports = Middleware;

function Middleware() {
  this.middleware = [];
}

/**
 * @param {Function} fn
 * @returns {Editor}
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
 * @returns {Function}
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

});

require.register("med/src/mixin/observe.js", function (exports, module) {
'use strict';

var Data = require("med/src/data.js");
var utils = require("med/src/utils/index.js");
var schema = require("med/src/schema.js");

module.exports = Observe;

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

  var context = {
    structure: structure,
    shouldBeDelete: shouldBeDelete
  };

  Object
    .keys(data)
    .forEach(function (name) {
      shouldBeDelete[name] = 1;
    });

  utils.each(this.el.children, function (el) {
    Observe.scan.call(this, context, el);
  }.bind(this));

  Object
    .keys(shouldBeDelete)
    .forEach(function (name) {
      delete data[name];
    });

  this.structure = structure;
};

/**
 * @param {Object} context
 * @param {Element} el
 * @returns {Data}
 * @api private
 */
Observe.scan = function (context, el) {
  var tagName = el.tagName.toLowerCase();
  var name = el.getAttribute('name');
  var data = this.data[name];
  var tagSchema = schema[tagName];
  
  if (!tagSchema) {
    el.parentElement.removeChild(el);
    return;
  }

  Observe.checkAndRemoveStrangeElement.call(this, el);

  if (name) {
    delete context.shouldBeDelete[name];
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

  Observe[tagSchema.type].call(this, context, el, data);

  tagSchema.attrs.forEach(function (attr) {
    Observe[attr.type].call(this, el, data, attr);
  }.bind(this));

  if (data.modified) {
    data.update();
    this.emit('changed', data);
  }

  return data;
};

/**
 * @param {Object} context
 * @param {Element} el
 * @param {Data} data
 * @api private
 */
Observe.section = function (context, el, data) {
  var structure = context.structure;
  var p = [];

  utils.each(el.children, function (child) {
    var tagSchema = utils.getElementSchema(child);

    if (!tagSchema) {
      Observe.handleUnknownElement(child);
      return;
    }

    if (!~structure.sections.indexOf(data.id)) {
      structure.sections.push(data.id);
    }

    if (/^(paragraphs?|figure)$/.test(tagSchema.type)) {
      p.push(Observe.scan.call(this, context, child).id);
    }

  }.bind(this));

  data.set('start', structure.paragraphs.length);
  data.set('end', Array.prototype.push.apply(structure.paragraphs, p));
};

/**
 * @param {Object} context
 * @param {Element} el
 * @param {Data} data
 * @api private
 */
Observe.paragraphs = function (context, el, data) {
  var structure = context.structure;
  var p = [];

  utils.each(el.children, function (child) {
    var tagSchema = utils.getElementSchema(child);

    if (!tagSchema) {
      Observe.handleUnknownElement(child);
      return;
    }

    if (tagSchema.type === 'paragraph') {
      p.push(Observe.scan.call(this, context, child).id);
    }
  }.bind(this));

  data.set('start', structure.paragraphs.length);
  data.set('end', Array.prototype.push.apply(structure.paragraphs, p));
};

/**
 * @param {Object} context
 * @param {Element} el
 * @param {Data} data
 * @api private
 */
Observe.figure = function (context, el, data) {
  var figureType = this.getFigureType(el);
  figureType.updateData(el, data);
};

/**
 * @param {Object} context
 * @param {Element} el
 * @param {Data} data
 * @api private
 */
Observe.paragraph = function (context, el, data) {
  var detail = [];

  utils.each(el.children, function (child) {
    var tagSchema = utils.getElementSchema(child);

    if (!tagSchema) {
      Observe.handleUnknownElement(child);
      return;
    }

    if (tagSchema.type === 'detail') {
      detail.push(Observe.scan.call(this, context, child).id);
    }
  }.bind(this));

  data.set('detail', detail);
};

/**
 * @param {Object} context
 * @param {Element} el
 * @param {Data} data
 * @api private
 */
Observe.detail = function (context, el, data) {
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
 * @returns {Number}
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
 * @returns {Object}
 * @api public
 */
Observe.prototype.toJSON = function () {
  if (!this.structure) {
    this.sync();
  }

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

    d.detail = (d.detail || []).map(getDetailData);

    json.paragraphs.push(d);
  });

  function getDetailData(name) {
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
    paragraphs: 1,
    figure: 1
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

});

require.register("med/src/plugins/index.js", function (exports, module) {
'use strict';

var plugins = module.exports = {};

plugins.commandA = require("med/src/plugins/command-a.js");
plugins.preventDefault = require("med/src/plugins/prevent-default.js");
plugins.createNewParagraph = require("med/src/plugins/create-new-paragraph.js");
plugins.handleBackspace = require("med/src/plugins/handle-backspace.js");
plugins.handleBlockquote = require("med/src/plugins/handle-blockquote.js");
plugins.handleEmptyParagraph = require("med/src/plugins/handle-empty-paragraph.js");
plugins.handleFigure = require("med/src/plugins/handle-figure.js");
plugins.handleList = require("med/src/plugins/handle-list.js");
plugins.handleParagraph = require("med/src/plugins/handle-paragraph.js");
plugins.initContext = require("med/src/plugins/init-context.js");
plugins.refocus = require("med/src/plugins/refocus.js");
plugins.removeExtraNodes = require("med/src/plugins/remove-extra-nodes.js");
plugins.removeInlineStyle = require("med/src/plugins/remove-inline-style.js");
plugins.renameElements = require("med/src/plugins/rename-elements.js");

});

require.register("med/src/plugins/command-a.js", function (exports, module) {
'use strict';

module.exports = function (editor) {
  return function (next) {
    if (this.super && this.key.toLowerCase() === 'a') {
      this.prevent();
      editor.caret.selectAll(editor.el);
    } else {
      next();
    }
  };
};

});

require.register("med/src/plugins/prevent-default.js", function (exports, module) {
'use strict';

module.exports = function () {
  return function (next) {
    var el = this.element;

    if (this.key === 'backspace' && this.editor.isEmpty()) {
      this.prevent();
      return;
    }

    if (!!~[document.body, this.section].indexOf(el)) {
      this.prevent();
      return;
    }

    next();
  };
};

});

require.register("med/src/plugins/create-new-paragraph.js", function (exports, module) {
'use strict';

var utils = require("med/src/utils/index.js");

module.exports = function () {
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

});

require.register("med/src/plugins/handle-backspace.js", function (exports, module) {
'use strict';

var utils = require("med/src/utils/index.js");

module.exports = function (editor) {
  var atElementStart = function (ctx) {
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

        if (utils.isElementNode(lastNode) && utils.isTag('br', lastNode)) {
          utils.removeElement(lastNode);
          lastNode = null;
        }

        utils.removeEmptyElements(previous);

        utils.moveChildNodes(needToRemove, previous);

        needToRemove.parentElement.removeChild(needToRemove);

        if (utils.isType('section', needToRemove)) {
          // section 的情況是要讓游標在畫面上跟著目前 element 移動
          editor.caret.focusTo(firstChild);
        } else if (lastNode) {
          // 段落的情況是要讓兩個 element 接起來後，游標移動到合併的位置
          editor.caret.moveToStart(lastNode, offset);
        } else {
          editor.caret.moveToStart(previous);
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

  var shouldCombineList = function () {
    var el = editor.caret.focusParagraphs();
    var next = el && el.nextElementSibling;
    
    return next
      && next.tagName === el.tagName;
  };

  var combineList = function () {
    var el = editor.caret.focusParagraphs();
    var next = el.nextElementSibling;
    
    utils.moveChildNodes(next, el);
    utils.removeElement(next);
  };

  return function (next) {
    if (this.key !== 'backspace') {
      return next();
    }

    var el = this.paragraph;

    if (atElementStart(this)) {
      // 段落前面已經沒有文字
      // 需要刪除 element
      if (utils.isTag('li', el)) {
        handleList(this, next);
      } else {
        handleOthers(this, next);
      }
    } else if (this.figure) {
      this.prevent();

      var previous = this.figure.previousElementSibling;

      utils.removeElement(this.figure);
      editor.caret.moveToEnd(previous);
    }

    // 兩個 list 相鄰的時候應該要合併他們
    if (shouldCombineList()) {
      combineList();
    }

    next();
  };
};

});

require.register("med/src/plugins/handle-blockquote.js", function (exports, module) {
'use strict';

var utils = require("med/src/utils/index.js");

module.exports = function (editor) {
  return function (next) {
    var el = this.paragraph;

    if (!utils.isTag('blockquote', el)) {
      return next();
    }

    // 目前只處理換段落的情況
    if (!(this.key === 'enter' && !this.shift)) {
      return next();
    }

    this.prevent();

    if (editor.caret.atElementEnd(el)) {

      // 所有行尾換行都要建立新 <p>
      // 沒有例外

      var p = document.createElement('p');

      p.innerHTML = '<br />';
      this.section.insertBefore(p, el.nextSibling);
      editor.caret.moveToStart(p);

    } else if (editor.caret.atElementStart(el)) {

      // 行首在前面插入 element
      var quote = document.createElement('blockquote');

      quote.innerHTML = '<br />';
      this.section.insertBefore(quote, el);
      //editor.caret.moveToStart(quote);

    } else {

      // 其他情況下都將現有的 blockquote 分割
      editor.caret.split(el);
    }

    next();
  };
};

});

require.register("med/src/plugins/handle-empty-paragraph.js", function (exports, module) {
'use strict';

var utils = require("med/src/utils/index.js");

module.exports = function (editor) {
  editor.on('walk', function (ctx) {
    var el = ctx.element;

    if (!el.innerHTML.trim()) {
      if (utils.isType('paragraph', el)) {
        el.innerHTML = '<br type="_med_placeholder" />';
      } else if (utils.isType('section', el)) {
        el.innerHTML = '<p><br type="_med_placeholder" /></p>';
      }
    }
  });
};

});

require.register("med/src/plugins/handle-figure.js", function (exports, module) {
'use strict';

var utils = require("med/src/utils/index.js");

module.exports = function (editor) {
  var klass = 'is-active';

  var removeActive = function (el) {
    var figure = editor.el.querySelector('figure.is-active');

    if (figure && figure !== el) {
      figure.classList.remove(klass);
    }
  };

  editor.on('walkEnd', function () {
    var figure = editor.caret.focusFigure();

    if (figure) {
      figure.classList.add(klass);
    }

    removeActive(figure);
  });

  editor.el.addEventListener('mousedown', function (e) {
    var el = e.target;
    
    if (!utils.isAncestorOf(editor.caret.focusNode(), editor.el)) {
      editor.caret.moveToStart(el);
    }

    while (1) {
      if (!el || el === editor.el) {
        el = null;
        break;
      }

      if (utils.isTag('figure', el)) {
        break;
      }

      el = el.parentElement;
    }

    if (el) {
      el.classList.add(klass);
    }

    removeActive(el);
  });

  editor.el.addEventListener('blur', function () {
    removeActive();
  });

  return function (next) {
    next();
  };
};

});

require.register("med/src/plugins/handle-list.js", function (exports, module) {
'use strict';

var utils = require("med/src/utils/index.js");

module.exports = function (editor) {
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

      } else if (editor.caret.atElementStart(el)
          && utils.isLastElementOf(this.paragraphs, el)) {
        
        // 行首換行跳離 <ul>/<ol>
        this.prevent();
        leaveAndMoveContentToNewElement(this);

      }
    }

    next();
  };
};

});

require.register("med/src/plugins/handle-paragraph.js", function (exports, module) {
'use strict';

var utils = require("med/src/utils/index.js");

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

module.exports = function () {
  return function (next) {
    if (!shouldHandleThis(this)) {
      return next();
    }

    createNewLine(this, next);
  };
};

});

require.register("med/src/plugins/init-context.js", function (exports, module) {
'use strict';

var keyboard = require("med/src/keyboard.js");
var utils = require("med/src/utils/index.js");

module.exports = function () {
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
    this.key = keyboard.map[code] || String.fromCharCode(code);
    this.super = this[keyboard.super];
    this.node = editor.caret.focusNode();
    this.element = editor.caret.focusElement();
    this.nextElement = editor.caret.nextElement();
    this.section = editor.caret.focusSection();
    this.paragraph = editor.caret.focusParagraph();
    this.paragraphs = editor.caret.focusParagraphs();
    this.figure = editor.el.querySelector('figure.is-active');
    this.detail = editor.caret.focusDetail();

    var els = editor.el.querySelectorAll('br[type="_med_placeholder"]');

    Array.prototype.forEach.call(els, function (el) {
      utils.removeElement(el);
    });

    next();
  };
};

});

require.register("med/src/plugins/refocus.js", function (exports, module) {
'use strict';

module.exports = function (editor) {
  editor.on('walkEnd', function (ctx) {
    var node = ctx.focusTo;
    var offset = ctx.focusOffset;

    if (node) {
      ctx.editor.caret.select(node, offset, node, offset);
    }
  });
};

});

require.register("med/src/plugins/remove-extra-nodes.js", function (exports, module) {
'use strict';

var utils = require("med/src/utils/index.js");

module.exports = function (editor) {
  var removeExtraNode = function (ctx) {
    var el = ctx.element;
    var focus = ctx.editor.caret.focusElement();
    var nodes = el.childNodes;
    var len = nodes.length;
    var curr, prev, lastNode;

    var neetToCombine = function () {
      return prev
        && prev.nodeType === curr.nodeType
        && utils.isAllowedToHaveContent(prev);
    };
    
    while (len--) {
      curr = nodes[len];
      prev = nodes[len - 1];

      if (neetToCombine()) {
        
        // 目前要刪除的 element
        // 就是正被使用者 focus 的 element
        if (prev === focus) {
          lastNode = utils.lastNode(focus);
          ctx.focusTo = lastNode;
          ctx.focusOffset = lastNode.length;
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
};

});

require.register("med/src/plugins/remove-inline-style.js", function (exports, module) {
'use strict';

module.exports = function (editor) {
  editor.on('walk', function (ctx) {
    // chrome
    ctx.el.setAttribute('style', '');
  });
};

});

require.register("med/src/plugins/rename-elements.js", function (exports, module) {
'use strict';

module.exports = function (editor) {
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

});

require.register("med/src/utils/index.js", function (exports, module) {
'use strict';

var utils = module.exports = {};

require("med/src/utils/node.js")(utils);
require("med/src/utils/others.js")(utils);
require("med/src/utils/schema.js")(utils);

});

require.register("med/src/utils/node.js", function (exports, module) {
'use strict';

module.exports = function (utils) {
  /**
   * @param {Node} node
   * @returns {String}
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
   * @param {Node} node
   * @api public
   */
  utils.setNodeContent = function (node, content) {
    if (utils.isTextNode(node)) {
      node.data = content;
    } else {
      node.innerHTML = content;
    }
  };

  /**
   * @param {Element} el
   * @returns {Boolean}
   * @api public
   */
  utils.isEmpty = function (el) {
    if (!utils.isAllowedToHaveContent(el)) {
      return false;
    }
    return !utils.getTextContent(el).trim();
  };

  /**
   * @parame {Element} el
   * @returns {Boolean}
   * @api public
   */
  utils.isStrictEmpty = function (el) {
    if (!utils.isAllowedToHaveContent(el)) {
      return false;
    }
    return !el.innerHTML.trim();
  };

  /**
   * @param {Element} el
   * @returns {Boolean}
   * @api public
   */
  utils.isNotEmpty = function (el) {
    return !utils.isEmpty(el);
  };

  /**
   * @param {Element} el
   * @returns {Boolean}
   * @api public
   */
  utils.isNotStrictEmpty = function (el) {
    return !utils.isStrictEmpty(el);
  };

  /**
   * @param {String} tagName
   * @param {Element} el
   * @returns {Boolean}
   * @api public
   */
  utils.isTag = function (tagName, el) {
    if (!el) {
      return false;
    }

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

  utils.isAllowedToHaveContent = function (el) {
    return !utils.isTag([
      'br',
      'input',
      'img'
    ], el);
  };

  /**
   * @param {Element} el
   * @returns {Boolean}
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
    var shouldRemoveParagraphs = function (child) {
      return utils.isType('paragraphs', child)
        && utils.isEmpty(child);
    };

    var shouldRemoveP = function (child) {
      return utils.isTag('p', child)
        && utils.isEmpty(child)
        && !utils.isFirstElementOf(child.parentElement, child);
    };

    var shouldRemoveParagraph = function (child) {
      return utils.isType('paragraph', child)
        && utils.isStrictEmpty(child);
    };

    utils.each(el.children, function (child) {
      var shouldRemove = shouldRemoveParagraphs(child)
        || shouldRemoveP(child)
        || shouldRemoveParagraph(child);

      if (shouldRemove) {
        utils.removeElement(child);
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
   * @returns {Boolean}
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
   * @returns {Boolean}
   * @api public
   */
  utils.isElementNode = function (node) {
    return node && node.nodeType === document.ELEMENT_NODE;
  };

  /**
   * @param {Node} node
   * @returns {Boolean}
   * @api public
   */
  utils.isTextNode = function (node) {
    return node && node.nodeType === document.TEXT_NODE;
  };

  /**
   * @param {Node} node
   * @param {Node} ancestor
   * @returns {Boolean}
   * @api public
   */
  utils.isAncestorOf = function (node, ancestor) {
    var parents = utils.getParents(node);
    return !!~parents.indexOf(ancestor);
  };

  /**
   * @param {Node} node
   * @returns {Element[]}
   * @api public
   */
  utils.getParents = function (node) {
    var parents = [];
    var parentNode;

    if (!node) {
      return parents;
    }

    while (parentNode = node.parentNode) {
      parents.push(parentNode);
      node = parentNode;
    }

    return parents;
  };

  /**
   * @param {Node} node
   * @returns {Number}
   * @api public
   */
  utils.nodeContentLength = function (node) {
    return utils.getTextContent(node).length;
  };

  /**
   * @param {Node} node
   * @returns {Node}
   * @api public
   */
  utils.lastNode = function (node) {
    return node
      && node.childNodes[node.childNodes.length - 1];
  };

  /**
   * @param {Node} node
   * @returns {Text}
   * @api public
   */
  utils.lastTextNode = function (node) {
    if (!node) {
      return null;
    }

    if (utils.isTextNode(node)) {
      return node;
    }

    var nodes = Array.prototype.slice.call(node.childNodes);

    while (node = nodes.pop()) {
      if (node = utils.lastTextNode(node)) {
        return node;
      }
    }

    return null;
  };

  /**
   * @param {Node} node
   * @returns {Element}
   * @api public
   */
  utils.lastElement = function (node) {
    return node
      && node.children[node.children.length - 1];
  };

  /**
   * @param {Node} node
   * @returns {Node}
   * @api public
   */
  utils.firstNode = function (node) {
    return node
      && node.childNodes[0];
  };

  /**
   * @param {Node} node
   * @returns {Text}
   * @api public
   */
  utils.firstTextNode = function (node) {
    if (!node) {
      return null;
    }

    if (utils.isTextNode(node)) {
      return node;
    }

    var nodes = Array.prototype.slice.call(node.childNodes);

    while (node = nodes.shift()) {
      if (node = utils.lastTextNode(node)) {
        return node;
      }
    }

    return null;
  };

  /**
   * @param {Node} node
   * @returns {Element}
   * @api public
   */
  utils.firstElement = function (node) {
    return node
      && node.children[0];
  };

  /**
   * @param {Element} container
   * @param {Element} el
   * @returns {Boolean}
   * @api public
   */
  utils.isLastElementOf = function (container, el) {
    var lastElement = utils.lastElement(container);
    return lastElement === el;
  };

  /**
   * @param {Element} container
   * @param {Element} el
   * @returns {Boolean}
   * @api public
   */
  utils.isFirstElementOf = function (container, el) {
    var firstElement = utils.firstElement(container);
    return firstElement === el;
  };
};

});

require.register("med/src/utils/others.js", function (exports, module) {
'use strict';

module.exports = function (utils) {
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
      }
      return false;
    }

    if (typeof a === 'object') {
      if (typeof b !== 'object') {
        return false;
      }

      var prop, notEqual;

      for (prop in a) {
        if (a.hasOwnProperty(prop)) {
          notEqual = a.hasOwnProperty(prop)
            && b.hasOwnProperty(prop)
            && !utils.equal(a[prop], b[prop]);

          if (notEqual) {
            return false;
          }
        }
      }

      return true;
    }

    return false;
  };
};

});

require.register("med/src/utils/schema.js", function (exports, module) {
'use strict';

var schema = require("med/src/schema.js");

module.exports = function (utils) {
  utils.getType = function (el) {
    var s = utils.getElementSchema(el);
    return s ? s.type : null;
  };

  utils.getElementSchema = function (el) {
    return el
      && schema[el.tagName.toLowerCase()]
      || null;
  };
};

});

if (typeof exports == "object") {
  module.exports = require("med");
} else if (typeof define == "function" && define.amd) {
  define([], function(){ return require("med"); });
} else {
  this["Med"] = require("med");
}
})()
