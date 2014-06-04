'use strict';

module.exports = function (editor) {
  var o = function (file) {
    require('med/src/commands/' + file + '.js')(editor);
  };

  o('select');
  o('selectAll');
};
