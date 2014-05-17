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

    while (node && node.nodeType !== document.ELEMENT_NODE) {
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
  var s;

  while (true) {
    if (!node) {
      break;
    }

    s = node && schema[node.tagName.toLowerCase()];

    if (s && s.type === type) {
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
    if (node.nodeType === document.ELEMENT_NODE) {
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
  
  if (node.nodeType === document.ELEMENT_NODE){
    return '';
  }
  
  return node.substringData(0, offset); 
};

Caret.prototype.textAfter = function () {
  var selection = document.getSelection();
  var node = selection.focusNode;
  var offset = selection.focusOffset;
  
  if (node.nodeType === document.ELEMENT_NODE){
    return '';
  }
  
  return node.substringData(offset, node.length - 1); 
};

Caret.prototype.moveToStart = function (el) {
  el.focus();
  document.getSelection().collapse(el, true);
};

Caret.prototype.moveToEnd = function (el) {
  var range = document.createRange();
  var selection = window.getSelection();
  range.selectNodeContents(el);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
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
