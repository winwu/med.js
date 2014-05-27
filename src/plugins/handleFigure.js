var handleFigure = function (editor) {
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
