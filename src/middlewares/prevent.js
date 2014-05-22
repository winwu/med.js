var preventDefault = function () {
  return function (next) {
    if (this.key === 'backspace' && this.editor.isEmpty()) {
      this.prevent();
      return;
    }

    if (this.element === document.body) {
      utils.preventEvent(e);
      return;
    }

    next();
  };
};
