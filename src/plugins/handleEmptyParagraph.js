var handleEmptyParagraph = function (editor) {
  editor.on('walk', function (ctx) {
    var el = ctx.element;
    if (utils.isType('paragraph', el) && utils.isEmpty(el)) {
      el.innerHTML = '<br type="_med_placeholder" />';
    }
  });
};
