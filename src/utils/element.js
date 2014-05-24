utils.getTextContent = function (node) {
  var text;

  if (!node) {
    return '';
  }

  switch (node.nodeType) {
  case document.ELEMENT_NODE:
    text = node.textContent
      || node.innerText
      || '';
    break;
  case document.TEXT_NODE:
    text = node.data;
    break;
  default:
    text = '';
  }

  return text;
};

utils.isEmpty = function (el) {
  if (utils.isTag('br', el)) {
    return false;
  }
  return !utils.getTextContent(el).trim();
};

utils.isNotEmpty = function (el) {
  return !utils.isEmpty(el);
};

utils.isTag = function (tagName, el) {
  if (typeof tagName === 'string') {
    tagName = [tagName];
  }

  var toUpperCase = function (str) {
    return str.toUpperCase();
  };

  return !!~tagName
    .map(toUpperCase)
    .indexOf(el.tagName);
};

utils.isLastChild = function (el) {
  return el.parentELement.lastChild === el;
};

utils.removeEmptyElements = function (el) {
  utils.each(el.children, function (child) {
    if (utils.isEmpty(child)) {
      el.removeChild(child);
    } else {
      utils.removeEmptyElements(child);
    }
  });
};

utils.removeElement = function (el) {
  if (el.parentElement) {
    el.parentElement.removeChild(el);
  }
};

utils.moveChildren = function (src, dest) {
  var children = Array.prototype.slice.call(src.children);

  utils.each(children, function (child) {
    dest.appendChild(child);
  });
};

utils.moveChildNodes = function (src, dest) {
  var nodes = Array.prototype.slice.call(src.childNodes);

  utils.each(nodes, function (node) {
    dest.appendChild(node);
  });
};

utils.isType = function (types, el) {
  var s = utils.getElementSchema(el);

  if (typeof types === 'string') {
    types = [types];
  }

  return s && !!~types.indexOf(s.type);
};

utils.isElementNode = function (node) {
  return node.nodeType === document.ELEMENT_NODE;
};

utils.isTextNode = function (node) {
  return node.nodeType === document.TEXT_NODE;
};

utils.isAncestorOf = function (node, ancestor) {
  var childNodes = Array.prototype.slice.call(ancestor.chlidNodes || []);
  var child;

  if (!~childNodes.indexOf(child)) {
    while (child = childNodes.shift()) {
      if (utils.isAncestorOf(child)) {
        return true;
      }
    }

    return false;
  }

  return true;
};

utils.nodeContentLength = function (node) {
  return utils.getTextContent(node).length;
};

utils.lastNode = function (node) {
  return node.childNodes[node.childNodes.length - 1];
};

utils.lastTextNode = function (node) {
  if (utils.isTextNode(node)) {
    return node;
  }
  return utils.lastTextNode(utils.lastNode(node));
};

utils.lastElement = function (node) {
  return node.children[node.children.length - 1];
};

utils.firstNode = function (node) {
  return node.childNodes[0];
};

utils.firstTextNode = function (node) {
  if (utils.isTextNode(node)) {
    return node;
  }
  return utils.firstTextNode(utils.firstNode(node));
};

utils.firstElement = function (node) {
  return node.children[0];
};

utils.isLastElementOf = function (container, el) {
  var lastElement = utils.lastElement(container);
  return lastElement === el;
};

utils.isFirstElementOf = function (container, el) {
  var firstElement = utils.firstElement(container);
  return firstElement === el;
};
