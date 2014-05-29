/**
 * @param {Node} node
 * @returns {String}
 * @api public
 */
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

/**
 * @param {Node} node
 * @api public
 */
utils.setNodeContent = function (node, content) {
  if (utils.isTextNode(node)) {
    node.data = content;
  } else {
    node.innerHTML = content;
  }
};

/**
 * @param {Element} el
 * @returns {Boolean}
 * @api public
 */
utils.isEmpty = function (el) {
  if (utils.isTag('br', el)) {
    return false;
  }
  return !utils.getTextContent(el).trim();
};

/**
 * @param {Element} el
 * @returns {Boolean}
 * @api public
 */
utils.isNotEmpty = function (el) {
  return !utils.isEmpty(el);
};

/**
 * @param {String} tagName
 * @param {Element} el
 * @returns {Boolean}
 * @api public
 */
utils.isTag = function (tagName, el) {
  if (!el) {
    return false;
  }

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

utils.isAllowedToHaveContent = function (el) {
  return !utils.isTag([
    'br',
    'input',
    'img'
  ], el);
};

/**
 * @param {Element} el
 * @returns {Boolean}
 * @api public
 */
utils.isLastChild = function (el) {
  return el.parentELement.lastChild === el;
};

/**
 * @param {Element} el
 * @api public
 */
utils.removeEmptyElements = function (el) {
  var shouldIgnore = function (child) {
    return utils.isType('figure', child)
      || !utils.isAllowedToHaveContent(child);
  };

  utils.each(el.children, function (child) {
    if (shouldIgnore(child)) {
      return;
    }
    if (utils.isEmpty(child)) {
      el.removeChild(child);
    } else {
      utils.removeEmptyElements(child);
    }
  });
};

/**
 * @param {Element} el
 * @api public
 */
utils.removeElement = function (el) {
  if (el.parentElement) {
    el.parentElement.removeChild(el);
  }
};

/**
 * @param {Element} src
 * @param {Element} dest
 * @api public
 */
utils.moveChildren = function (src, dest) {
  var children = Array.prototype.slice.call(src.children);

  utils.each(children, function (child) {
    dest.appendChild(child);
  });
};

/**
 * @param {Element} src
 * @param {Element} dest
 * @api public
 */
utils.moveChildNodes = function (src, dest) {
  var nodes = Array.prototype.slice.call(src.childNodes);

  utils.each(nodes, function (node) {
    dest.appendChild(node);
  });
};

/**
 * @param {String|String[]} types
 * @param {Element} el
 * @returns {Boolean}
 * @api public
 */
utils.isType = function (types, el) {
  var s = utils.getElementSchema(el);

  if (typeof types === 'string') {
    types = [types];
  }

  return s && !!~types.indexOf(s.type);
};

/**
 * @param {Node} node
 * @returns {Boolean}
 * @api public
 */
utils.isElementNode = function (node) {
  return node && node.nodeType === document.ELEMENT_NODE;
};

/**
 * @param {Node} node
 * @returns {Boolean}
 * @api public
 */
utils.isTextNode = function (node) {
  return node && node.nodeType === document.TEXT_NODE;
};

/**
 * @param {Node} node
 * @param {Node} ancestor
 * @returns {Boolean}
 * @api public
 */
utils.isAncestorOf = function (node, ancestor) {
  var parents = utils.getParents(node);
  return !!~parents.indexOf(ancestor);
};

utils.getParents = function (node) {
  var parents = [];
  var parentNode;

  while (parentNode = node.parentNode) {
    parents.push(parentNode);
    node = parentNode;
  }

  return parents;
};

/**
 * @param {Node} node
 * @returns {Number}
 * @api public
 */
utils.nodeContentLength = function (node) {
  return utils.getTextContent(node).length;
};

/**
 * @param {Node} node
 * @returns {Node}
 * @api public
 */
utils.lastNode = function (node) {
  return node.childNodes[node.childNodes.length - 1];
};

/**
 * @param {Node} node
 * @returns {Text}
 * @api public
 */
utils.lastTextNode = function (node) {
  if (utils.isTextNode(node)) {
    return node;
  }
  return utils.lastTextNode(utils.lastNode(node));
};

/**
 * @param {Node} node
 * @returns {Element}
 * @api public
 */
utils.lastElement = function (node) {
  return node.children[node.children.length - 1];
};

/**
 * @param {Node} node
 * @returns {Node}
 * @api public
 */
utils.firstNode = function (node) {
  return node.childNodes[0];
};

/**
 * @param {Node} node
 * @returns {Text}
 * @api public
 */
utils.firstTextNode = function (node) {
  if (utils.isTextNode(node)) {
    return node;
  }
  return utils.firstTextNode(utils.firstNode(node));
};

/**
 * @param {Node} node
 * @returns {Element}
 * @api public
 */
utils.firstElement = function (node) {
  return node.children[0];
};

/**
 * @param {Element} container
 * @param {Element} el
 * @returns {Boolean}
 * @api public
 */
utils.isLastElementOf = function (container, el) {
  var lastElement = utils.lastElement(container);
  return lastElement === el;
};

/**
 * @param {Element} container
 * @param {Element} el
 * @returns {Boolean}
 * @api public
 */
utils.isFirstElementOf = function (container, el) {
  var firstElement = utils.firstElement(container);
  return firstElement === el;
};
