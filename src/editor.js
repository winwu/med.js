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
