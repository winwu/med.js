var handleBackspace = function (editor) {
  var shouldHandleBackspace = function (ctx) {
    var selection = document.getSelection();
    var el = ctx.element;

    return !(selection + '')
      && utils.isType(['paragraph', 'paragraphs', 'section'], el)
      // li 是一個 paragraph
      // 但 li 的預設刪除行為在這裡沒有問題
      // 所以把他忽略掉
      && !utils.isTag('li', el)
      && !editor.caret.textBefore(el);
  };

  return function (next) {
    if (this.key !== 'backspace') {
      return next();
    }

    var el = this.element;

    // 段落前面已經沒有文字
    // 需要刪除 element
    if (shouldHandleBackspace(this)) {
      this.prevent();

      var previous = this.element.previousElementSibling;
      var needToRemove, offset, childNodes, firstChild;

      if (previous) {
        needToRemove = this.element;
      } else {
        needToRemove = this.section;
      }

      previous = needToRemove.previousElementSibling;

      if (needToRemove && previous) {
        if (utils.isType('paragraphs', previous)) {
          // ul/ol 要特別處理
          
          if(previous.lastChild && utils.isTag('li', previous.lastChild)) {
            previous.lastChild.innerHTML += el.innerHTML;
            utils.removeElement(el);
            editor.caret.moveToStart(previous.lastChild);
          } else {
            // 忽略動作
          }
        } else {
          childNodes = Array.prototype.slice.call(needToRemove.childNodes);
          firstChild = needToRemove.firstChild;
          offset = utils.getTextContent(previous).length;

          utils.removeEmptyElements(previous);

          utils.each(childNodes, function (child) {
            previous.appendChild(child);
          });

          needToRemove.parentElement.removeChild(needToRemove);

          if (utils.isType('section', needToRemove)) {
            // section 的情況是要讓游標在畫面上跟著目前 element 移動
            editor.caret.moveToStart(firstChild);
          } else {
            // 段落的情況是要讓兩個 element 接起來後，游標移動到合併的位置
            editor.caret.moveToStart(previous.firstChild, offset);
          }
        }
      } else {
        previous = this.node.previousSibling;

        var previousIsBrTag = function () {
          return previous
            && utils.isElementNode(previous)
            && utils.isTag('br', previous);
        };
        
        if (previousIsBrTag()) {
          offset = utils.getTextContent(previous.previousSibling).length;
          previous.parentElement.removeChild(previous);
          editor.caret.moveToStart(this.node.previousSibling, offset);
        }
      }
    }

    next();
  };
};
