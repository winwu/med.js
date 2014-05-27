var refocus = function (editor) {
  editor.on('walkEnd', function (ctx) {
    var node = ctx.focusTo;
    var offset = ctx.focusOffset;

    if (node) {
      ctx.editor.caret.select(node, offset, node, offset);
    }
  });
};
