var preventDefault = function () {
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
