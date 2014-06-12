'use strict';

module.exports = FigureType;

function FigureType(name, options) {
  this.options = options || {};
  this.name = name;
}

FigureType.prototype.updateData = function (el, data) {
  data.set('figureType', this.name);

  this.options.updateData
    && this.options.updateData(el, data);
};

FigureType.prototype.updateHTML = function (el, data) {
  el.setAttribute('type', this.name);

  this.options.updateHTML
    && this.options.updateHTML(el, data);
};
