'use strict';

var FigureType = require('../figure-type');
var utils = require('../utils');

module.exports = Figure;

function Figure() {
  this.figureTypes = {};
  this.registerFigureType('default', {
    updateData: function (el, data) {
      data.set('html', el.innerHTML);
    },
    updateHTML: function (el, data) {
      el.innerHTML = data.get('html');
    }
  });
}

Figure.prototype.registerFigureType = function (name, options) {
  var type = new FigureType(name, options);
  this.figureTypes[name] = type;
  return this;
};

Figure.prototype.getFigureType = function (name) {
  if (utils.isElementNode(name)) {
    name = name.getAttribute('type');
  }

  return this.figureTypes[name]
    || this.figureTypes.default;
};
