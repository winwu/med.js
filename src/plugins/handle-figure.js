'use strict';

var utils = require('../utils');

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

  if (editor.isSupported()) {
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
  }
};
