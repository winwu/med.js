if (typeof module !== 'undefined') {
  module.exports = Editor;
} else if (typeof define === 'function' && typeof define.amd === 'object') {
  define(function () {
    return Editor;
  });
} else {
  window.Med = Editor;
}
