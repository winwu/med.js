var removeExtraNodes = function () {
  var removeExtraNode = function (ctx) {
    var el = ctx.element;
    var focus = ctx.editor.caret.focusElement();
    var nodes = el.childNodes;
    var len = nodes.length;
    var curr, prev, lastNode;
    
    while (len--) {
      curr = nodes[len];
      prev = nodes[len - 1];

      if (prev && prev.nodeType === curr.nodeType) {
        if (prev === focus) {
          lastNode = utils.lastNode(focus);
          ctx.__removeExtraNode__focus = lastNode;
          ctx.__removeExtraNode__offset = lastNode.length;
        }
        
        if (utils.isTextNode(prev)) {
          prev.appendData(curr.data);
        } else if (utils.isElementNode(prev)) {
          prev.innerHTML += utils.getTextContent(curr);
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

  editor.on('walkEnd', function (ctx) {
    var el = ctx.__removeExtraNode__focus;
    var offset = ctx.__removeExtraNode__offset;

    if (el) {
      ctx.editor.caret.select(el, offset, el, offset);
    }
  });
};
