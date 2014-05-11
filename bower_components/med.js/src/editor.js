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
    middlewares.walker(this)
  ]);
};

Editor.prototype.schema = schema;

Editor.prototype.bindEvents = function () {
  var el = this.el;
  var bind = el.addEventListener.bind(el);

  bind('keydown', this.onKeydown.bind(this));
  bind('keyup', this.sync.bind(this));
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
