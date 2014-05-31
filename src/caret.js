'use strict';

var utils = require('./utils');

module.exports = Caret;

function Caret(editor) {
  this.editor = editor;
}

/**
 * @returns {Node}
 * @api public
 */
Caret.prototype.focusNode = function () {
  return document.getSelection().focusNode;
};

/**
 * @param {String} tagName
 * @returns {Element}
 * @api public
 */
Caret.prototype.focusElement = function (tagName) {
  var node;

  if (tagName) {
    node = this.focusElement();

    tagName = tagName.toUpperCase();

    while (node && node.tagName !== tagName) {
      node = node.parentElement;
    }

    return (node && node.tagName === tagName)
      ? node
      : null;
  } else {
    node = document.getSelection().focusNode;

    while (node && !utils.isElementNode(node)) {
      node = node.parentNode;
    }

    return node;
  }
};

/**
 * @returns {Element}
 * @api public
 */
Caret.prototype.focusSection = function () {
  return this.focusType('section');
};

/**
 * @returns {Element}
 * @api public
 */
Caret.prototype.focusParagraph = function () {
  return this.focusType('paragraph');
};

/**
 * @returns {Element}
 * @api public
 */
Caret.prototype.focusParagraphs = function () {
  return this.focusType('paragraphs');
};

/**
 * @returns {Element}
 * @api public
 */
Caret.prototype.focusFigure = function () {
  return this.focusType('figure');
};

/**
 * @returns {Element}
 * @api public
 */
Caret.prototype.focusDetail = function () {
  return this.focusType('detail');
};

/**
 * @param {String} type
 * @returns {Element}
 * @api public
 */
Caret.prototype.focusType = function (type) {
  var node = this.focusElement();
  var elType;

  while (true) {
    if (!node) {
      break;
    }

    elType = utils.getType(node);

    if (elType === type) {
      return node;
    }

    node = node.parentElement;
  }

  return null;
};

/**
 * @param {Node} node
 * @returns {Element}
 * @api public
 */
Caret.prototype.nextElement = function (node) {
  if (node) {
    node = node.nextSibling;
  } else {
    node = this.focusNode();
    node = node && node.nextSibling;
  }

  while (node) {
    if (utils.isElementNode(node)) {
      return node;
    }

    node = node.nextSibling;
  }

  return null;
};

/**
 * @param {Element} el
 * @api public
 */
Caret.prototype.focusTo = function (el) {
  if (!el) {
    return;
  }

  if (el.innerHTML.trim()) {
    this.moveToStart(el);
  } else {
    el.innerHTML = '\uffff';
    this.moveToStart(el);
    el.innerHTML = '';
  }
};

/**
 * @returns {String}
 * @api public
 */
Caret.prototype.textBefore = function () {
  var selection = document.getSelection();
  var node = selection.focusNode;
  var offset = selection.focusOffset;

  if (utils.isElementNode(node)) {
    return '';
  }
  
  return node.substringData(0, offset);
};

/**
 * @returns {String}
 * @api public
 */
Caret.prototype.textAfter = function () {
  var selection = document.getSelection();
  var node = selection.focusNode;
  var offset = selection.focusOffset;

  if (utils.isElementNode(node)) {
    return '';
  }
  
  return node.substringData(offset, node.length - 1); 
};

/**
 * @param {Element} el
 * @param {Number} offset
 * @api public
 */
Caret.prototype.moveToStart = function (el, offset) {
  if (!el) {
    return;
  }

  var selection = document.getSelection();
  var range = document.createRange();
  var len;

  if (utils.isTextNode(el)) {
    len = utils.getTextContent(el).length;
  } else {
    len = el.childNodes.length;
  }

  offset = offset | 0;

  if (offset < 0) {
    offset = 0;
  } else if (offset >= len) {
    offset = len;
  }

  range.setStart(el, offset);
  range.setEnd(el, offset);

  selection.removeAllRanges();
  selection.addRange(range);
  selection.collapseToStart();
};

/**
 * @param {Element} el
 * @param {Number} offset
 * @api public
 */
Caret.prototype.moveToEnd = function (el, offset) {
  if (!el) {
    return;
  }

  var range = document.createRange();
  var selection = window.getSelection();
  var len;

  if (utils.isTextNode(el)) {
    len = utils.getTextContent(el).length;
  } else {
    len = el.childNodes.length;
  }

  offset = len - (offset | 0);

  if (offset < 0) {
    offset = 0;
  }

  range.setStart(el, offset);
  range.setEnd(el, offset);

  selection.removeAllRanges();
  selection.addRange(range);
  selection.collapseToEnd();
};

/**
 * @param {Element} el
 * @returns {Element}
 * @api public
 */
Caret.prototype.split = function (el) {
  if (!el) {
    return null;
  }

  var selection = document.getSelection();
  var node = selection.focusNode;
  var offset = selection.focusOffset;
  var range = document.createRange();
  var parentIndex = Array.prototype.indexOf.call(el.parentNode.childNodes, el);

  range.setStart(el.parentNode, parentIndex);
  range.setEnd(node, offset);

  var left = range.extractContents();

  el.parentNode.insertBefore(left, el);

  return el;
};

/**
 * @api public
 */
Caret.prototype.save = function () {
  var selection = document.getSelection();
  var range;

  if (!selection) {
    return;
  }

  if (selection.rangeCount) {
    range = selection.getRangeAt(0);
  }

  this._range = range;
};

/**
 * @api public
 */
Caret.prototype.restore = function () {
  var range = this._range;

  if (range) {
    var r = document.createRange();
    var selection = document.getSelection();

    r.setStart(range.startContainer, range.startOffset);
    r.setEnd(range.endContainer, range.endOffset);
    selection.removeAllRanges();
    selection.addRange(r);
  }
};

/**
 * @param {Element} el
 * @api public
 */
Caret.prototype.selectAllText = function (el) {
  var selection = window.getSelection();        
  var range = document.createRange();
  range.selectNodeContents(el);
  selection.removeAllRanges();
  selection.addRange(range);
};

/**
 * @param {Element} el
 * @api public
 */
Caret.prototype.selectAll = function (el) {
  var firstNode = utils.firstTextNode(el);
  var lastNode = utils.lastTextNode(el);

  this.select(firstNode, lastNode);
};

/**
 *     caret.select(node)
 *     caret.select(node, offset)
 *     caret.select(startNode, endNode)
 *     caret.select(node, startOffset, endOffset)
 *     caret.select(startNode, startOffset, endNode, endOffset)
 *
 * @api public
 */
Caret.prototype.select = function () {
  var selection = window.getSelection();
  var startNode, startOffset, endNode, endOffset;
  var range;

  // Chrome 無法選取空 TextNode
  // 所以這邊填入 \uffff 當作 placeholder

  var insertPlaceholder = function () {
    if (startNode && utils.isEmpty(startNode)) {
      utils.setNodeContent(startNode, '\uffff');
    }

    if (endNode && utils.isEmpty(endNode)) {
      utils.setNodeContent(endNode, '\uffff');
    }
  };

  var removePlaceholder = function () {
    var startNodeContent = utils.getTextContent(startNode);
    var endNodeContent = utils.getTextContent(endNode);
    var placeholder = /\uffff/g;

    startNodeContent = startNodeContent.replace(placeholder, '');
    endNodeContent = endNodeContent.replace(placeholder, '');

    utils.setNodeContent(startNode, startNodeContent);
    utils.setNodeContent(endNode, endNodeContent);
  };

  switch (arguments.length) {
  case 1:
    startNode = endNode = arguments[0];
    startOffset = 0;
    endOffset = utils.getTextContent(startNode).length;
    break;
  case 2:
    if (typeof arguments[1] === 'number') {
      startNode = endNode = arguments[0];
      startOffset = endOffset = arguments[1];
      insertPlaceholder();
    } else {
      startNode = arguments[0];
      startOffset = 0;
      endNode = arguments[1];
      insertPlaceholder();
      endOffset = utils.getTextContent(endNode).length;
    }
    break;
  case 3:
    startNode = arguments[0];
    endNode = arguments[1];
    insertPlaceholder();
    startOffset = 0;
    endOffset = utils.getTextContent(startNode).length;
    break;
  case 4:
    startNode = arguments[0];
    startOffset = arguments[1];
    endNode = arguments[2];
    endOffset = arguments[3];
    insertPlaceholder();
    break;
  }

  startOffset = startOffset | 0;
  endOffset = endOffset | 0;

  range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);

  selection.removeAllRanges();
  selection.addRange(range);

  removePlaceholder();
};

/**
 * @param {Element} el
 * @api public
 */
Caret.prototype.insertElement = function (el) {
  var selection = document.getSelection();
  var range = selection.getRangeAt(0);
  
  range.deleteContents();

  range.insertNode(el);
};

/**
 * @api public
 */
Caret.prototype.closestElement = function () {
  var node = this.focusNode();
  return this.nextElement(node);
};

/**
 * @param {Element} el
 * @returns {Boolean}
 * @api public
 */
Caret.prototype.atElementStart = function (el) {
  if (!el.childNodes.length) {
    return true;
  }

  var selection = document.getSelection();
  var focusNode = selection.focusNode;
  var offset = selection.focusOffset;
  var range = document.createRange();

  range.setStart(el.childNodes[0], 0);
  range.setEnd(focusNode, offset);

  return !range.toString().trim();
};

/**
 * @param {Element} el
 * @returns {Boolean}
 * @api public
 */
Caret.prototype.atElementEnd = function (el) {
  if (!el.childNodes.length) {
    return true;
  }

  var selection = document.getSelection();
  var focusNode = selection.focusNode;
  var offset = selection.focusOffset;
  var range = document.createRange();
  var lastNode = utils.lastTextNode(el);

  if (!lastNode) {
    return true;
  }

  range.setStart(focusNode, offset);
  range.setEnd(lastNode, lastNode.length);

  return !range.toString().trim();
};
