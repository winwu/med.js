var commandA = function (editor) {
  return function (next) {
    if (this.super && this.key.toLowerCase() === 'a') {
      this.prevent();

      var firstNode = utils.firstNode(editor.el);
      var lastNode = utils.lastNode(editor.el);

      editor.caret.select(firstNode, lastNode);

    } else {
      next();
    }
  };
};
