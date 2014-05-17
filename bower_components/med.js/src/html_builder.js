function HtmlBuilder() {
}

HtmlBuilder.prototype.fromJSON = function (json) {
  HtmlBuilder.importData.call(this, json);
  HtmlBuilder.buildHTML.call(this);
};

HtmlBuilder.importData = function (json) {
  json = utils.clone(json);

  var data = this.data = {};
  var structure = this.structure = {};
  var sections = structure.sections = [];
  var paragraphs = structure.paragraphs = [];

  (json.sections || []).forEach(function (section) {
    var name = section.name;
    var d = data[name] = new Data(name);

    delete section.name;
    d.data = section;
    d.update();

    sections.push(name);
  });

  (json.paragraphs || []).forEach(function (paragraph) {
    var name = paragraph.name;
    var d = data[name] = new Data(name);

    delete paragraph.name;

    d.data = paragraph;
    paragraph.detail = (paragraph.detail || []).map(detail);
    d.update();

    paragraphs.push(name);
  });

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

HtmlBuilder.buildHTML = function () {
  var docfrag = document.createDocumentFragment();
  var el = this.el;
  var html = '';

  HtmlBuilder.createElements(docfrag, this.structure, this.data);

  utils.each(docfrag.childNodes, function (child) {
    html += child.outerHTML;
  });

  el.innerHTML = html;
};

HtmlBuilder.createElements = function (container, structure, data) {
  HtmlBuilder.createSections(container, structure, data);
};

HtmlBuilder.createSections = function (container, structure, data) {
  structure.sections.forEach(function (name) {
    var section = data[name];
    var el = HtmlBuilder.createElement(section);

    HtmlBuilder.createParagraphs(section, el, structure, data);

    container.appendChild(el);
  });
};

HtmlBuilder.createParagraphs = function (section, container, structure, data) {
  structure
    .paragraphs
    .slice(section.get('start'), section.get('end'))
    .forEach(function (name) {
      var paragraph = data[name];
      var el = HtmlBuilder.createElement(paragraph);

      var s = schema[paragraph.get('tag')];

      if (s.type === 'paragraphs') {
        HtmlBuilder.createParagraphs(paragraph, el, structure, data);
      } else if (!paragraph.get('in-paragraphs')) {
        HtmlBuilder.createDetails(paragraph, el, structure, data);
      }

      container.appendChild(el);
    });
};

HtmlBuilder.createDetails = function (paragraph, container, structure, data) {
  var detail = paragraph.get('detail');
  var text = paragraph.get('text');
  var pointer = 0;

  container.innerHTML = '';

  detail.forEach(function (name) {
    var d = data[name];
    var el = HtmlBuilder.createElement(d);
    var start = d.get('start');
    var end = d.get('end');

    if (pointer !== start) {
      container.appendChild(document.createTextNode(text.slice(pointer, start)));
    }

    el.innerHTML = text.slice(start, end);
    container.appendChild(el);

    pointer = end;
  });

  if (pointer !== text.length) {
    container.appendChild(document.createTextNode(text.slice(pointer, text.length)));
  }
};

HtmlBuilder.createElement = function (data) {
  var tagName = data.get('tag');
  var el = document.createElement(tagName);

  el.setAttribute('name', data.id);
  HtmlBuilder.initElement(el, data);

  return el;
};

HtmlBuilder.initElement = function (el, data) {
  var s = schema[data.get('tag')];

  s.attrs.forEach(function (attr) {
    HtmlBuilder[attr.type].call(this, el, data, attr);
  });
};

HtmlBuilder.attribute = function (el, data, attr) {
  el.setAttribute(attr.name, data.get(attr.name));
};

HtmlBuilder.dataset = function (el, data, attr) {
  el.setAttribute('data-' + attr.name, data.get(attr.name));
};

HtmlBuilder.content = function (el, data, attr) {
  if (el.textContent === undefined) {
    el.innerText = data.get(attr.name);
  } else {
    el.textContent = data.get(attr.name);
  }
};
