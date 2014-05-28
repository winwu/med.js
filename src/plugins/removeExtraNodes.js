var removeExtraNodes = function (editor) {
  var removeExtraNode = function (ctx) {
    var el = ctx.element;
    var focus = ctx.editor.caret.focusElement();
    var nodes = el.childNodes;
    var len = nodes.length;
    var curr, prev, lastNode;

    var neetToCombine = function () {
      return prev
        && prev.nodeType === curr.nodeType
        && utils.isAllowedToHaveContent(prev);
    };
    
    while (len--) {
      curr = nodes[len];
      prev = nodes[len - 1];

      if (neetToCombine()) {
        
        // 目前要刪除的 element
        // 就是正被使用者 focus 的 element
        if (prev === focus) {
          lastNode = utils.lastNode(focus);
          ctx.focusTo = lastNode;
          ctx.focusOffset = lastNode.length;
        }

        if (utils.isTextNode(prev)) {
          prev.appendData(curr.data);
        } else if (utils.isElementNode(prev)) {
          utils.moveChildNodes(curr, prev);
        }

        curr.parentNode.removeChild(curr);
      }
    }
  };

  editor.on('walk', function (ctx) {
    if (utils.isType('paragraph', ctx.element)) {
      removeExtraNode(ctx);
    }
  });
};
