function Caret(editor) {
  this.editor = editor;
}

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
    if (document.getSelection){
      node = document.getSelection().focusNode;

      while (node && node.nodeType !== document.ELEMENT_NODE) {
        node = node.parentNode;
      }

      return node;
    } else {
      return document.selection.createRange().parentElement();
    }
  }
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
  if (document.getSelection){
    el.focus();
    document.getSelection().collapse(el, true);
  } else {
    var range = document.body.createTextRange();
    range.moveToElementText(el);
    range.collapse(true);
    range.select();
  }
};

Caret.prototype.moveToEnd = function (el) {
  if (document.getSelection) {
    var range = document.createRange();
    var selection = window.getSelection();
    range.selectNodeContents(el);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  } else {
    el.focus();
    var textRange = document.body.createTextRange();
    textRange.moveToElementText(el);
    textRange.collapse(false);
    textRange.select();
  }
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
  if (document.getSelection) {
    var selection = window.getSelection();        
    var range = document.createRange();
    range.selectNodeContents(el);
    selection.removeAllRanges();
    selection.addRange(range);
  } else {
    var range = document.body.createTextRange();
    range.moveToElementText(element);
    range.select();
  }
};
