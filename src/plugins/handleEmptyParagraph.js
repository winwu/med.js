var handleEmptyParagraph = function (editor) {
  editor.on('walk', function (ctx) {
    var el = ctx.element;

    if (!el.innerHTML.trim()) {
      if (utils.isType('paragraph', el)) {
        el.innerHTML = '<br type="_med_placeholder" />';
      } else if (utils.isType('section', el)) {
        el.innerHTML = '<p><br type="_med_placeholder" /></p>';
      }
    }
  });
};
