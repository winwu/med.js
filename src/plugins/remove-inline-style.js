'use strict';

module.exports = function (editor) {
  editor.on('walk', function (ctx) {
    // chrome
    ctx.el.setAttribute('style', '');
  });
};
