'use strict';

var Data = require('../data');
var schema = require('../schema');
var utils = require('../utils');

module.exports = HtmlBuilder;

function HtmlBuilder() {
}

/**
 * @param {Object} json
 * @api public
 */
HtmlBuilder.prototype.fromJSON = function (json) {
  HtmlBuilder.importData.call(this, json);
  HtmlBuilder.buildHTML.call(this);
};

/**
 * @param {Object} json
 * @api private
 */
HtmlBuilder.importData = function (json) {
  json = utils.clone(json);

  var data = this.data = {};
  var structure = this.structure = {};
  var sections = structure.sections = [];
  var paragraphs = structure.paragraphs = [];

  // section
  (json.sections || []).forEach(function (section) {
    var name = section.name;
    var d = data[name] = new Data(name);

    delete section.name;
    d.data = section;
    d.update();

    sections.push(name);
  });

  // paragraphs, paragraph and figure
  (json.paragraphs || []).forEach(function (paragraph) {
    var name = paragraph.name;
    var d = data[name] = new Data(name);

    delete paragraph.name;

    d.data = paragraph;
    
    // figure 沒有 detail
    if (d.get('type') !== 'figure') {
      paragraph.detail = (paragraph.detail || []).map(detail);
    }
    
    d.update();

    paragraphs.push(name);
  });

  // detail
  function detail(detail) {
    var name = detail.name;
    var d = data[name] = new Data(name);

    delete detail.name;
    d.data = detail;
    d.update();

    return name;
  }

  return this;
};

/**
 * @api private
 */
HtmlBuilder.buildHTML = function () {
  var docfrag = document.createDocumentFragment();
  var el = this.el;
  var html = '';

  HtmlBuilder.createElements.call(this, docfrag);

  utils.each(docfrag.childNodes, function (child) {
    html += child.outerHTML;
  });

  el.innerHTML = html;
};

/**
 * @param {DocumentFragment|Element} container
 * @api private
 */
HtmlBuilder.createElements = function (container) {
  HtmlBuilder.createSections.call(this, container);
};

/**
 * @param {DocumentFragment|Element} container
 * @api private
 */
HtmlBuilder.createSections = function (container) {
  var structure = this.structure;
  var data = this.data;

  structure.sections.forEach(function (name) {
    var section = data[name];
    var el = HtmlBuilder.createElement(section);

    HtmlBuilder.createParagraphs.call(this, section, el);

    container.appendChild(el);
  }.bind(this));
};

/**
 * @param {Object} section
 * @param {DocumentFragment|Element} container
 * @api private
 */
HtmlBuilder.createParagraphs = function (section, container) {
  var structure = this.structure;
  var data = this.data;

  structure
    .paragraphs
    .slice(section.get('start'), section.get('end'))
    .forEach(function (name) {
      var paragraph = data[name];
      var el = HtmlBuilder.createElement(paragraph);

      var type = utils.getType(el);

      if (type === 'paragraphs') {
        HtmlBuilder.createParagraphs.call(this, paragraph, el);
      } else if (!paragraph.get('in-paragraphs')) {
        if (utils.isType('figure', el)) {
          HtmlBuilder.createFigure.call(this, paragraph, el);
        } else {
          HtmlBuilder.createDetails.call(this, paragraph, el);
        }
      }

      container.appendChild(el);
    }.bind(this));
};

/**
 * @param {Data} figure
 * @param {DocumentFragment|Element} figureElement
 * @api private
 */
HtmlBuilder.createFigure = function (figure, figureElement) {
  var figureType = this.getFigureType(figure.get('type'));
  figureType.updateHTML(figureElement, figure);
};

/**
 * @param {Data} paragraph
 * @param {DocumentFragment|Element} container
 * @api private
 */
HtmlBuilder.createDetails = function (paragraph, container) {
  var data = this.data;
  var detail = paragraph.get('detail');
  var text = paragraph.get('text');
  var content, node;
  var pointer = 0;

  container.innerHTML = '';

  detail.forEach(function (name) {
    var d = data[name];
    var el = HtmlBuilder.createElement(d);
    var start = d.get('start');
    var end = d.get('end');

    if (pointer !== start) {
      content = text.slice(pointer, start);
      node = document.createTextNode(content);
      container.appendChild(node);
    }

    el.innerHTML = text.slice(start, end);
    container.appendChild(el);

    pointer = end;
  });

  if (pointer !== text.length) {
    content = text.slice(pointer, text.length);
    node = document.createTextNode(content);
    container.appendChild(node);
  }
};

/**
 * @param {Data} data
 * @returns {Element}
 * @api private
 */
HtmlBuilder.createElement = function (data) {
  var tagName = data.get('tag');
  var el = document.createElement(tagName);

  el.setAttribute('name', data.id);
  HtmlBuilder.initElement(el, data);

  return el;
};

/**
 * @param {Element} el
 * @param {Data} data
 * @api private
 */
HtmlBuilder.initElement = function (el, data) {
  var s = schema[data.get('tag')];

  s.attrs.forEach(function (attr) {
    HtmlBuilder[attr.type](el, data, attr);
  });
};

/**
 * @param {Element} el
 * @param {Data} data
 * @param {Object} attr
 * @api private
 */
HtmlBuilder.attribute = function (el, data, attr) {
  el.setAttribute(attr.name, data.get(attr.name));
};

/**
 * @param {Element} el
 * @param {Data} data
 * @param {Object} attr
 * @api private
 */
HtmlBuilder.dataset = function (el, data, attr) {
  el.setAttribute('data-' + attr.name, data.get(attr.name));
};

/**
 * @param {Element} el
 * @param {Data} data
 * @param {Object} attr
 * @api private
 */
HtmlBuilder.content = function (el, data, attr) {
  if (el.textContent === undefined) {
    el.innerText = data.get(attr.name);
  } else {
    el.textContent = data.get(attr.name);
  }
};
