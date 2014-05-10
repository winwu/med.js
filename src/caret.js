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

    return node.tagName === tagName
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
