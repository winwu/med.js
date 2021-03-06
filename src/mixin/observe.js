'use strict';

var Data = require('../data');
var utils = require('../utils');
var schema = require('../schema');

module.exports = Observe;

function Observe() {
  this.structure = null;
  this.data = {};
}

/**
 * @api public
 */
Observe.prototype.sync = function (shouldEmitChangedEvent) {
  var structure = {
    paragraphs: [],
    sections: []
  };

  var data = this.data;

  var shouldBeDelete = {};

  var context = {
    structure: structure,
    shouldBeDelete: shouldBeDelete,
    changedData: [],
    changed: false
  };

  Object
    .keys(data)
    .forEach(function (name) {
      shouldBeDelete[name] = 1;
    });

  utils.each(this.el.children, function (el) {
    Observe.scan.call(this, context, el);
  }.bind(this));

  Object
    .keys(shouldBeDelete)
    .forEach(function (name) {
      delete data[name];
    });

  this.structure = structure;

  if (context.changed && shouldEmitChangedEvent) {
    this.emit('changed', context.changedData);
  }

  return context;
};

/**
 * @param {Object} context
 * @param {Element} el
 * @returns {Data}
 * @api private
 */
Observe.scan = function (context, el) {
  var tagName = el.tagName.toLowerCase();
  var name = el.getAttribute('name');
  var data = this.data[name];
  var tagSchema = schema[tagName];
  
  if (!tagSchema) {
    el.parentElement.removeChild(el);
    return;
  }

  Observe.checkAndRemoveStrangeElement.call(this, el);

  if (name) {
    delete context.shouldBeDelete[name];
  }

  if (!data) {
    if (!name) {
      name = this.options.genName();
    }

    data = new Data(name);
    data.set('tag', tagName);
    this.data[name] = data;

    el.setAttribute('name', data.id);
  }

  Observe[tagSchema.type].call(this, context, el, data);

  tagSchema.attrs.forEach(function (attr) {
    Observe[attr.type].call(this, el, data, attr);
  }.bind(this));

  if (data.modified) {
    data.update();
    context.changedData.push(data);
    context.changed = true;
  }

  return data;
};

/**
 * @param {Object} context
 * @param {Element} el
 * @param {Data} data
 * @api private
 */
Observe.section = function (context, el, data) {
  var structure = context.structure;
  var p = [];

  utils.each(el.children, function (child) {
    var tagSchema = utils.getElementSchema(child);

    if (!tagSchema) {
      Observe.handleUnknownElement(child);
      return;
    }

    if (!~structure.sections.indexOf(data.id)) {
      structure.sections.push(data.id);
    }

    if (/^(paragraphs?|figure)$/.test(tagSchema.type)) {
      p.push(Observe.scan.call(this, context, child).id);
    }

  }.bind(this));

  data.set('start', structure.paragraphs.length);
  data.set('end', Array.prototype.push.apply(structure.paragraphs, p));
};

/**
 * @param {Object} context
 * @param {Element} el
 * @param {Data} data
 * @api private
 */
Observe.paragraphs = function (context, el, data) {
  var structure = context.structure;
  var p = [];

  utils.each(el.children, function (child) {
    var tagSchema = utils.getElementSchema(child);

    if (!tagSchema) {
      Observe.handleUnknownElement(child);
      return;
    }

    if (tagSchema.type === 'paragraph') {
      p.push(Observe.scan.call(this, context, child).id);
    }
  }.bind(this));

  data.set('start', structure.paragraphs.length);
  data.set('end', Array.prototype.push.apply(structure.paragraphs, p));
};

/**
 * @param {Object} context
 * @param {Element} el
 * @param {Data} data
 * @api private
 */
Observe.figure = function (context, el, data) {
  var figureType = this.getFigureType(el);
  figureType.updateData(el, data);
};

/**
 * @param {Object} context
 * @param {Element} el
 * @param {Data} data
 * @api private
 */
Observe.paragraph = function (context, el, data) {
  var detail = [];

  utils.each(el.children, function (child) {
    var tagSchema = utils.getElementSchema(child);

    if (!tagSchema) {
      Observe.handleUnknownElement(child);
      return;
    }

    if (tagSchema.type === 'detail') {
      detail.push(Observe.scan.call(this, context, child).id);
    }
  }.bind(this));

  data.set('detail', detail);
};

/**
 * @param {Object} context
 * @param {Element} el
 * @param {Data} data
 * @api private
 */
Observe.detail = function (context, el, data) {
  var offset = Observe.getOffset(el);
  data.set('start', offset.start);
  data.set('end', offset.end);
};

/**
 * @param {Element} el
 * @param {Data} data
 * @param {Object} attr
 * @api private
 */
Observe.attribute = function (el, data, attr) {
  var val = el.getAttribute(attr.name);
  data.set(attr.name, val);
};

/**
 * @param {Element} el
 * @param {Data} data
 * @param {Object} attr
 * @api private
 */
Observe.dataset = function (el, data, attr) {
  var val = el.getAttribute('data-' + attr.name);
  data.set(attr.name, val);
};

/**
 * @param {Element} el
 * @param {Data} data
 * @param {Object} attr
 * @api private
 */
Observe.content = function (el, data, attr) {
  var text = utils.getTextContent(el);
  data.set(attr.name, text);
};

/**
 * @param {Element} el
 * @api private
 */
Observe.handleUnknownElement = function (el) {
  var text = utils.getTextContent(el);
  var node = document.createTextNode(text);
  el.parentElement.replaceChild(node, el);
};

/**
 * @param {Element} el
 * @returns {Number}
 * @api private
 */
Observe.getOffset = function (el) {
  var parentElement = el.parentNode;
  var beforeHTML, beforeText, tmp;
  var offset = {
    start: 0,
    end: 0
  };

  var check = function () {
    return parentElement
      && utils.isElementNode(parentElement)
      && !parentElement.getAttribute('name');
  };

  while (check()) {
    parentElement = parentElement.parentElement;
  }

  if (parentElement) {
    tmp = document.createElement('div');
    offset.start = parentElement.innerHTML.indexOf(el.outerHTML);
    beforeHTML = parentElement.innerHTML.substr(0, offset.start);
    tmp.innerHTML = beforeHTML;
    beforeText = utils.getTextContent(tmp);
    offset.start -= beforeHTML.length - beforeText.length;
    offset.end = offset.start + utils.getTextContent(el).length;
  }

  return offset;
};

/**
 * @returns {Object}
 * @api public
 */
Observe.prototype.toJSON = function () {
  if (!this.structure) {
    this.sync();
  }

  var structure = this.structure;
  var sections = structure.sections;
  var paragraphs = structure.paragraphs;
  var data = this.data;

  var json = {
    sections: [],
    paragraphs: []
  };

  sections.forEach(function (name) {
    var section = data[name];
    var d = section && section.toJSON() || {};

    d.name = name;

    json.sections.push(d);
  });

  paragraphs.forEach(function (name) {
    var paragraph = data[name];
    var d = paragraph && paragraph.toJSON() || {};
    
    d.name = name;

    d.detail = (d.detail || []).map(getDetailData);

    json.paragraphs.push(d);
  });

  function getDetailData(name) {
    var detail = data[name];
    var d = detail && detail.toJSON() || {};
    
    d.name = name;

    return d;
  }

  return json;
};

Observe.rules = {
  section: {
    paragraph: 1,
    paragraphs: 1,
    figure: 1
  },

  paragraphs: {
    paragraph: 1
  },

  paragraph: {
    detail: 1
  },

  detail: {}
};

/**
 * @param {Element} el
 * @api private
 */
Observe.checkAndRemoveStrangeElement = function (el) {
  var type = utils.getType(el);
  var parentType = utils.getType(el.parentElement);
  var shouldRemove = true;

  if (type && parentType) {
    if (Observe.rules[parentType][type]) {
      shouldRemove = false;
    }
  } else if (el.parentElement === this.el) {
    if (type === 'section') {
      shouldRemove = false;
    }
  }

  if (shouldRemove) {
    el.parentElement.removeChild(el);
  }
};
