var removeExtraNodes = function () {
  var removeExtraNode = function (el) {
    var nodes = el.childNodes;
    var len = nodes.length;
    var curr, prev;
    
    while (len--) {
      curr = nodes[len];
      prev = nodes[len - 1];

      if (prev && prev.nodeType === curr.nodeType) {
        if (utils.isTextNode(prev)) {
          prev.appendData(curr.data);
        } else if (utils.isElementNode(prev)) {
          prev.innerHTML += curr.textContent || curr.innerHTML || '';
        }
        curr.parentNode.removeChild(curr);
      }
    }
  };

  editor.on('walk', function (ctx) {
    if (utils.isType('paragraph', ctx.element)) {
      removeExtraNode(ctx.element);
    }
  });
};
