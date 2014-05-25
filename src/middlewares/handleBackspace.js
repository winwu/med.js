var handleBackspace = function (editor) {
  var shouldHandleBackspace = function (ctx) {
    var selection = document.getSelection();
    var el = ctx.paragraph;

    return !(selection + '')
      && utils.isType(['paragraph', 'paragraphs', 'section'], el)
      && editor.caret.atElementStart(el);
  };

  var handleList = function (ctx) {
    var el = ctx.paragraph;
    var paragraphs = ctx.paragraphs;

    if (paragraphs && utils.isFirstElementOf(paragraphs, el)) {
      ctx.prevent();

      var p = document.createElement('p');

      utils.moveChildNodes(el, p);
      utils.removeElement(el);

      ctx.section.insertBefore(p, paragraphs);

      if (utils.isEmpty(paragraphs)) {
        utils.removeElement(paragraphs);
      }

      editor.caret.moveToStart(p);
    }
  };

  var handleOthers = function (ctx) {
    ctx.prevent();

    var el = ctx.paragraph;
    var previous = el.previousElementSibling;
    var needToRemove, offset, firstChild, lastNode;

    if (previous) {
      needToRemove = el;
    } else {
      needToRemove = ctx.section;
    }

    previous = needToRemove.previousElementSibling;

    if (needToRemove && previous) {
      if (utils.isType('paragraphs', previous)) {

        // ul/ol 要特別處理
        // 如果使用跟其他地方相同方式的作法
        // 會造成 ul/ol 多出一個 br
        if(previous.lastChild && utils.isTag('li', previous.lastChild)) {
          var focus = previous.lastChild.lastChild;

          utils.moveChildNodes(el, previous.lastChild);
          utils.removeElement(el);

          if (focus) {
            editor.caret.moveToEnd(focus);
          } else {

            // 原本的 li 是空的
            // 所以直接把指標移到 li 最前面就可以了
            editor.caret.moveToStart(previous.lastChild);
          }
        } else {
          // 忽略動作
        }
      } else {
        firstChild = needToRemove.firstChild;
        lastNode = previous.childNodes[previous.childNodes.length - 1];
        offset = utils.getTextContent(lastNode).length;

        utils.removeEmptyElements(previous);

        utils.moveChildNodes(needToRemove, previous);

        needToRemove.parentElement.removeChild(needToRemove);

        if (utils.isType('section', needToRemove)) {
          // section 的情況是要讓游標在畫面上跟著目前 element 移動
          editor.caret.moveToStart(firstChild);
        } else {
          // 段落的情況是要讓兩個 element 接起來後，游標移動到合併的位置
          editor.caret.moveToStart(lastNode, offset);
        }
      }
    } else {
      previous = ctx.node.previousSibling;

      var previousIsBrTag = function () {
        return previous
          && utils.isElementNode(previous)
          && utils.isTag('br', previous);
      };
      
      if (previousIsBrTag()) {
        offset = utils.getTextContent(previous.previousSibling).length;
        previous.parentElement.removeChild(previous);
        editor.caret.moveToStart(ctx.node.previousSibling, offset);
      }
    }
  };

  return function (next) {
    if (this.key !== 'backspace') {
      return next();
    }

    var el = this.paragraph;

    // 段落前面已經沒有文字
    // 需要刪除 element
    if (shouldHandleBackspace(this)) {
      if (utils.isTag('li', el)) {
        handleList(this, next);
      } else {
        handleOthers(this, next);
      }
    }

    next();
  };
};
