function Caret(editor) {
  this.editor = editor;
}

Caret.prototype.focusNode = function () {
  return document.getSelection().focusNode;
};

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

Caret.prototype.focusSection = function () {
  return this.focusType('section');
};

Caret.prototype.focusParagraph = function () {
  return this.focusType('paragraph');
};

Caret.prototype.focusParagraphs = function () {
  return this.focusType('paragraphs');
};

Caret.prototype.focusDetail = function () {
  return this.focusType('detail');
};

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

Caret.prototype.nextElement = function (node) {
  if (node) {
    node = node.nextSibling;
  } else {
    node = this.focusNode().nextSibling;
  }

  while (node) {
    if (utils.isElementNode(node)) {
      return node;
    }

    node = node.nextSibling;
  }

  return null;
};

Caret.prototype.focusTo = function (el) {
  if (el.innerHTML.trim()) {
    this.moveToStart(el);
  } else {
    el.innerHTML = '\uffff';
    this.moveToStart(el);
    el.innerHTML = '';
  };
};

Caret.prototype.textBefore = function () {
  var selection = document.getSelection();
  var node = selection.focusNode;
  var offset = selection.focusOffset;

  if (utils.isElementNode(node)) {
    return '';
  }
  
  return node.substringData(0, offset);
};

Caret.prototype.textAfter = function () {
  var selection = document.getSelection();
  var node = selection.focusNode;
  var offset = selection.focusOffset;

  if (utils.isElementNode(node)) {
    return '';
  }
  
  return node.substringData(offset, node.length - 1); 
};

Caret.prototype.moveToStart = function (el, offset) {
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

Caret.prototype.moveToEnd = function (el, offset) {
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

Caret.prototype.split = function (el) {
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

Caret.prototype.selectAllText = function (el) {
  var selection = window.getSelection();        
  var range = document.createRange();
  range.selectNodeContents(el);
  selection.removeAllRanges();
  selection.addRange(range);
};

// Example:
//   caret.select(node)
//   caret.select(node, offset)
//   caret.select(startNode, endNode)
//   caret.select(node, startOffset, endOffset)
//   caret.select(startNode, startOffset, endNode, endOffset)
Caret.prototype.select = function () {
  var selection = window.getSelection();
  var startNode, startOffset, endNode, endOffset;
  var range;

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
    } else {
      startNode = arguments[0];
      startOffset = 0;
      endNode = arguments[1];
      endOffset = utils.getTextContent(startNode).length;
    }
    break;
  case 3:
    startNode = arguments[0];
    endNode = arguments[1];
    startOffset = 0;
    endOffset = utils.getTextContent(startNode).length;
    break;
  case 4:
    startNode = arguments[0];
    startOffset = arguments[1];
    endNode = arguments[2];
    endOffset = arguments[3];
    break;
  }

  startOffset = startOffset | 0;
  endOffset = endOffset | 0;

  range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);

  selection.removeAllRanges();
  selection.addRange(range);
};

Caret.prototype.insertElement = function (el) {
  var selection = document.getSelection();
  var range = selection.getRangeAt(0);
  
  range.deleteContents();

  range.insertNode(el);
};

Caret.prototype.closestElement = function () {
  var node = this.focusNode();
  return this.nextElement(node);
};

Caret.prototype.atElementStart = function (el) {
  var selection = document.getSelection();
  var focusNode = selection.focusNode;
  var offset = selection.focusOffset;
  var range = document.createRange();

  range.setStart(el.childNodes[0], 0);
  range.setEnd(focusNode, offset);

  return !range.toString().trim();
};

Caret.prototype.atElementEnd = function (el) {
  var selection = document.getSelection();
  var focusNode = selection.focusNode;
  var offset = selection.focusOffset;
  var range = document.createRange();
  var lastNode = utils.lastTextNode(el);

  range.setStart(focusNode, offset);
  range.setEnd(lastNode, lastNode.length - 1);

  return !range.toString().trim();
};
