var createNewParagraph = function () {
  return function (next) {
    var needToCreateElement = this.key === 'enter'
      && this.section === this.editor.caret.focusSection()
      && !this.shift
      && utils.isTag('p', this.element)
      && this.element.parentElement
      && !this.editor.caret.textAfter(this.element);

    if (needToCreateElement) {
      this.prevent();
      var el = document.createElement('p');
      this.element.parentElement.insertBefore(el, this.element.nextSibling);
      this.editor.caret.focusTo(el);
    }

    next();
  };
};
