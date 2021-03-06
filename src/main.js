'use strict';

module.exports = Editor;

var Emitter = require('./emitter');
var Caret = require('./caret');
var UndoManager = require('./undo-manager');
var Middleware = require('./mixin/middleware');
var Observe = require('./mixin/observe');
var HtmlBuilder = require('./mixin/html-builder');
var Command = require('./mixin/command');
var Figure = require('./mixin/figure');
var utils = require('./utils');
var plugins = require('./plugins');
var defaultOptions = require('./default-options');
var defineCommands = require('./commands');

// extends
Editor.prototype = Object.create(Emitter.prototype);

// mixin
utils.mixin(Editor.prototype, Middleware.prototype);
utils.mixin(Editor.prototype, Observe.prototype);
utils.mixin(Editor.prototype, HtmlBuilder.prototype);
utils.mixin(Editor.prototype, Figure.prototype);
utils.mixin(Editor.prototype, Command.prototype);

function Editor(options) {
  this.options = utils.mixin(Object.create(defaultOptions), options || {});
  this.context = {};
  this.context.editor = this;
  this.context.preventEmitChangedEvent = false;

  // parent
  Emitter.call(this);

  // init mixin
  Middleware.call(this);
  Observe.call(this);
  HtmlBuilder.call(this);
  Figure.call(this);
  Command.call(this);

  var el = this.options.el;

  if (!el) {
    el = document.createElement('div');
  }

  el.classList.add('med');
  this.el = el;
  this.caret = new Caret(this);
  this.undoManager = new UndoManager();

  // delegate
  utils.delegate(this, this.undoManager)
    ('canUndo')
    ('canRedo');

  defineCommands(this);

  if (this.isSupported()) {

    this.bindEvents();
    this.handleEmpty();

    this.use(plugins.initContext());

    plugins.removeExtraNodes(this);
    plugins.renameElements(this);
    plugins.removeInlineStyle(this);
    plugins.handleEmptyParagraph(this);
    plugins.handleFigure(this);
    plugins.refocus(this);

    el.setAttribute('contenteditable', true);

    if (el.parentElement) {
      this.sync();
    }
  }
}

Editor.prototype.utils = utils;

/**
 * @api public
 */
Editor.prototype.start = function () {
  return this.compose([
    plugins.preventDefault(),
    plugins.selection(this),
    plugins.commandA(this),
    plugins.undo(this),
    plugins.handleParagraph(this),
    plugins.handleList(this),
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
  var walkResult, syncResult1;
  var hold;

  this.handleEmpty();
  
  ctx = Object.create(this.context);
  ctx.event = e;
  ctx.prevent = utils.preventDefault.bind(null, e);

  // 執行前先儲存狀態
  hold = this.toJSON();

  this.exec(ctx, function (e) {
    if (e) {
      this.emit('error', e);
    }
  }.bind(this));

  if (ctx.preventEditorDefault) {
    return;
  }

  // 必須在畫面 render 前把動作執行完
  // 所以必須先 sync 一次
  syncResult1 = this.sync(!ctx.preventEmitChangedEvent);
  walkResult = this.walk();

  // 預設動作結束後必須在 sync 一次
  // 因為預設動作也會改變 html 結構
  setTimeout(function () {
    var syncResult2 = this.sync(!ctx.preventEmitChangedEvent);
    var changed = syncResult1.changed
        || syncResult2.changed;

    this.emit('finished', {
      walk: walkResult,
      sync: {
        beforeWalk: syncResult1,
        afterWalk: syncResult2
      },
      changed: changed
    });

    if (changed) {
      this.undoManager.save(hold);
    }
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
    editor: this,
    htmlHasChanged: false
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

  return context;
};

/**
 * @api public
 */
Editor.prototype.isSupported = function () {
  var userAgent = navigator.userAgent.toLowerCase();
  return !/msie/.test(userAgent);
};

Editor.prototype.undo = function () {
  var json = this.undoManager.undo();
  this.fromJSON(json);
  return this;
};

Editor.prototype.redo = function () {
  var json = this.undoManager.redo();
  this.fromJSON(json);
  return this;
};
