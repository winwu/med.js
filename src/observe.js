function Observe() {
  this.structure = null;
  this.data = {};
}

Observe.prototype.sync = function () {
  var structure = {
    paragraphs: [],
    sections: []
  };

  var data = this.data;

  var shouldBeDelete = {};

  Object.keys(data).forEach(function (name) {
    shouldBeDelete[name] = 1;
  });

  this._scan(this.el, structure, shouldBeDelete);

  Object.keys(shouldBeDelete).forEach(function (name) {
    delete data[name];
  });

  this.structure = structure;
};

Observe.prototype._scan = function (el, structure, shouldBeDelete) {
  var tagName = el.tagName.toLowerCase();
  var name = el.getAttribute('name');
  var data = this.data[name];
  var schema = this.schema[tagName];
  
  if (!schema) {
    utils.each(el.children, function (el) {
      this._scan(el, structure, shouldBeDelete);
    }.bind(this));
    return;
  }

  if (name) {
    delete shouldBeDelete[name];
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

  Observe[schema.type].call(this, el, data, structure, shouldBeDelete);

  schema.attrs.forEach(function (attr) {
    Observe[attr.type].call(this, el, data, attr);
  }.bind(this));

  if (data.modified) {
    data.update();
    this.emit('changed', data);
  }

  return data;
};

Observe.section = function (el, data, structure, shouldBeDelete) {
  var p = [];

  utils.each(el.children, function (child) {
    var schema = this.schema[child.tagName.toLowerCase()];

    if (!schema) {
      Observe.handleUnknownElement(child);
      return;
    }

    if (!~structure.sections.indexOf(data.id)) {
      structure.sections.push(data.id);
    }

    if (/^paragraph/.test(schema.type)) {
      p.push(this._scan(child, structure, shouldBeDelete).id);
    }

  }.bind(this));

  data.set('start', structure.paragraphs.length);
  data.set('end', Array.prototype.push.apply(structure.paragraphs, p));
};

Observe.paragraphs = function (el, data, structure, shouldBeDelete) {
  var p = [];

  utils.each(el.children, function (child) {
    var schema = this.schema[child.tagName.toLowerCase()];

    if (!schema) {
      Observe.handleUnknownElement(child);
      return;
    }

    if (schema.type === 'paragraph') {
      p.push(this._scan(child, structure, shouldBeDelete).id);
    }
  }.bind(this));

  data.set('start', structure.paragraphs.length);
  data.set('end', Array.prototype.push.apply(structure.paragraphs, p));
};

Observe.paragraph = function (el, data, structure, shouldBeDelete) {
  var detail = [];

  utils.each(el.children, function (child) {
    var schema = this.schema[child.tagName.toLowerCase()];

    if (!schema) {
      Observe.handleUnknownElement(child);
      return;
    }

    if (schema.type === 'detail') {
      detail.push(this._scan(child, structure, shouldBeDelete).id);
    }
  }.bind(this));

  data.set('detail', detail);
};

Observe.detail = function (el, data) {
  var offset = Observe.getOffset(el);
  data.set('start', offset.start);
  data.set('end', offset.end);
};

Observe.attribute = function (el, data, attr) {
  var val = el.getAttribute(attr.name);
  data.set(attr.name, val);
};

Observe.dataset = function (el, data, attr) {
  var val = el.getAttribute('data-' + attr.name);
  data.set(attr.name, val);
};

Observe.content = function (el, data, attr) {
  var text = el.textContent || el.innerText;
  data.set(attr.name, text);
};

Observe.handleUnknownElement = function (el) {
  var text = el.textContent || el.innerText;
  var node = document.createTextNode(text);
  el.parentElement.replaceChild(node, el);
};

Observe.getOffset = function (el) {
  var parentElement = el.parentNode;
  var beforeHTML, beforeText, tmp;
  var offset = {
    start: 0,
    end: 0
  };

  var check = function () {
    return parentElement
      && parentElement.nodeType === document.ELEMENT_NODE
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
    beforeText = tmp.textContent || tmp.innerText || '';
    offset.start -= beforeHTML.length - beforeText.length;
    offset.end = offset.start + (el.textContent || el.innerText || '').length;
  }

  return offset;
};

Observe.prototype.toJSON = function () {
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

    d.detail = (d.detail || []).map(detail);

    json.paragraphs.push(d);
  });

  function detail(name) {
    var detail = data[name];
    var d = detail && detail.toJSON() || {};
    
    d.name = name;

    return d;
  }

  return json;
};
