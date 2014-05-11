;(function (window) {
  if (typeof module !== 'undefined') {
    module.exports = toolbar;
  } else if (typeof define === 'function' && typeof define.amd === 'object') {
    define(function () {
      return toolbar;
    });
  } else {
    window.medToolbar = toolbar;
  }

  function toolbar(editor) {
    var tb = new Toolbar(editor);

    document.body.appendChild(tb.el);

    editor.el.addEventListener('mouseup', function () {
      if ((document.getSelection() + '').length) {
        tb.checkActive();
        tb.show();
      }
    });

    editor.el.addEventListener('mousedown', function () {
      var selection = document.getSelection();

      if (selection.empty) {
        selection.empty();
      } else {
        selection.removeAllRanges();
      }

      tb.hide();
    });

    editor.el.addEventListener('blur', function () {
      tb.hide();
    });

    editor.toolbar = tb;
  }

  function Toolbar(editor) {
    var $toolbar = document.createElement('div');
    var $tri = document.createElement('div');
    var $ul = document.createElement('ul');

    $tri.classList.add('med-toolbar-triangle');
    $toolbar.classList.add('med-toolbar');
    $toolbar.appendChild($ul);
    $toolbar.appendChild($tri);
    
    this.editor = editor;
    this.list = $ul;
    this.el = $toolbar;

    this.buttons = [];
  }

  Toolbar.prototype.updatePosition = function () {
    var el = this.el;
    var selection = document.getSelection();
    var focusNode = selection.focusNode;
    var range = document.createRange();
    var pos = { left: 0, top: 0 };
    var rect, elRect;

    if (!focusNode) {
      return;
    }

    range.selectNodeContents(focusNode);
    rect = range.getClientRects()[0];

    if (!rect) {
      return;
    }

    elRect = el.getBoundingClientRect();

    pos.left = rect.left + rect.width / 2 - elRect.width / 2;
    pos.top = rect.top - elRect.height - 6;

    el.setAttribute('style', 'left: ' + pos.left + 'px; top: ' + pos.top + 'px');
  };

  Toolbar.prototype.show = function () {
    var el = this.el;

    clearTimeout(this._timeout);

    el.classList.add('is-visible');
    this.updatePosition();

    setTimeout(function () {
      el.classList.add('do-transition');
    });

    return this;
  };

  Toolbar.prototype.hide = function () {
    var el = this.el;

    clearTimeout(this._timeout);

    this._timeout = setTimeout(function () {
      el.classList.remove('do-transition', 'is-visible');
    }, 300);

    return this;
  };

  Toolbar.prototype.createButton = function (html, action, isActive) {
    var $li = document.createElement('li');
    var $button = document.createElement('button');

    $button.innerHTML = html || 'New Button';
    $li.appendChild($button);
    this.list.appendChild($li);

    $li.addEventListener('click', function (e) {
      clearTimeout(this._timeout);
      e.preventDefault();
      action.call(this, e, isActive());
      this.checkActive();
      this.updatePosition();
    }.bind(this));

    this.buttons.push({
      el: $li,
      isActive: isActive
    });

    return this;
  };

  Toolbar.prototype.checkActive = function () {
    this.buttons.forEach(function (btn) {
      if (btn.isActive()) {
        btn.el.classList.add('active');
      } else {
        btn.el.classList.remove('active');
      }
    });
  };
})(this);
