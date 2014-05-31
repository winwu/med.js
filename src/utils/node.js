'use strict';

module.exports = function (utils) {
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
    if (!utils.isAllowedToHaveContent(el)) {
      return false;
    }
    return !utils.getTextContent(el).trim();
  };

  /**
   * @parame {Element} el
   * @returns {Boolean}
   * @api public
   */
  utils.isStrictEmpty = function (el) {
    if (!utils.isAllowedToHaveContent(el)) {
      return false;
    }
    return !el.innerHTML.trim();
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
   * @param {Element} el
   * @returns {Boolean}
   * @api public
   */
  utils.isNotStrictEmpty = function (el) {
    return !utils.isStrictEmpty(el);
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
    var shouldRemoveParagraphs = function (child) {
      return utils.isType('paragraphs', child)
        && utils.isEmpty(child);
    };

    var shouldRemoveP = function (child) {
      return utils.isTag('p', child)
        && !utils.isTag('figure', child.previousElementSibling)
        && utils.isEmpty(child)
        && !utils.isFirstElementOf(child.parentElement, child);
    };

    var shouldRemoveParagraph = function (child) {
      return utils.isType('paragraph', child)
        && utils.isStrictEmpty(child);
    };

    utils.each(el.children, function (child) {
      var shouldRemove = shouldRemoveParagraphs(child)
        || shouldRemoveP(child)
        || shouldRemoveParagraph(child);

      if (shouldRemove) {
        utils.removeElement(child);
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

  /**
   * @param {Node} node
   * @returns {Element[]}
   * @api public
   */
  utils.getParents = function (node) {
    var parents = [];
    var parentNode;

    if (!node) {
      return parents;
    }

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
    return node
      && node.childNodes[node.childNodes.length - 1];
  };

  /**
   * @param {Node} node
   * @returns {Text}
   * @api public
   */
  utils.lastTextNode = function (node) {
    if (!node) {
      return null;
    }

    if (utils.isTextNode(node)) {
      return node;
    }

    var nodes = Array.prototype.slice.call(node.childNodes);

    while (node = nodes.pop()) {
      if (node = utils.lastTextNode(node)) {
        return node;
      }
    }

    return null;
  };

  /**
   * @param {Node} node
   * @returns {Element}
   * @api public
   */
  utils.lastElement = function (node) {
    return node
      && node.children[node.children.length - 1];
  };

  /**
   * @param {Node} node
   * @returns {Node}
   * @api public
   */
  utils.firstNode = function (node) {
    return node
      && node.childNodes[0];
  };

  /**
   * @param {Node} node
   * @returns {Text}
   * @api public
   */
  utils.firstTextNode = function (node) {
    if (!node) {
      return null;
    }

    if (utils.isTextNode(node)) {
      return node;
    }

    var nodes = Array.prototype.slice.call(node.childNodes);

    while (node = nodes.shift()) {
      if (node = utils.firstTextNode(node)) {
        return node;
      }
    }

    return null;
  };

  /**
   * @param {Node} node
   * @returns {Element}
   * @api public
   */
  utils.firstElement = function (node) {
    return node
      && node.children[0];
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

  /**
   * by Stefan Lundström
   * http://stackoverflow.com/a/668058/2548809
   * 
   * @param {Node} node
   * @param {Boolean} skipChildren
   * @param {Node} endNode
   * @returns {Node}
   */
  utils.getNextNode = function (node, skipChildren, endNode) {
    if (endNode === node) {
      return null;
    }

    if (node.firstChild && !skipChildren) {
      return node.firstChild;
    }

    if (!node.parentNode){
      return null;
    }

    return node.nextSibling 
      || utils.getNextNode(node.parentNode, true, endNode); 
  };

  /**
   * @param {Range} range
   * @param {Function} fn
   */
  utils.eachNodeInRange = function (range, fn) {
    var startNode = range.startContainer;
    var endNode = range.endContainer;

    if (utils.isElementNode(startNode)) {
      startNode = startNode.childNodes[range.startOffset];
    }

    if (utils.isElementNode(endNode)) {
      endNode = startNode.childNodes[range.endOffset];
    }

    while (startNode = utils.getNextNode(startNode, endNode)) {
      fn(startNode);
    }
  };

  /**
   * @param {Range} range
   * @returns {Node}
   */
  utils.startNodeInRange = function (range) {
    var node = range.startContainer;

    if (utils.isElementNode(node)) {
      node = node.childNodes[range.startOffset];
    }

    return node;
  };

  /**
   * @param {Range} range
   * @returns {Node}
   */
  utils.endNodeInRange = function (range) {
    var node = range.endContainer;

    if (utils.isElementNode(node)) {
      node = node.childNodes[range.endOffset];
    }

    return node;
  };

  /**
   * @param {Element} el
   * @returns {Element}
   */
  utils.nextElement = function (el) {
    while (el && !el.nextElementSibling) {
      el = el.parentElement;
    }

    return el
      && el.nextElementSibling;
  };
};
