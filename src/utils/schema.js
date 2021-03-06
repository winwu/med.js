'use strict';

var schema = require('../schema');

module.exports = function (utils) {
  utils.getType = function (el) {
    var s = utils.getElementSchema(el);
    return s ? s.type : null;
  };

  utils.getElementSchema = function (el) {
    return el
      && schema[el.tagName.toLowerCase()]
      || null;
  };
};
