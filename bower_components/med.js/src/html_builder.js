function HtmlBuilder() {
}

HtmlBuilder.prototype.fromJSON = function (json) {
  var el = this.el;
  var sections = json.sections;
  var paragraphs = json.paragraphs;
  
  sections.forEach(function (section, i) {
    var $section = el.querySelector('[name="' + section.name + '"]');
    var prev = sections[i - 1];
    var $prev = prev && el.querySelector('[name="' + prev.name + '"]');
    var i, paragraph, $paragraph;

    if (!$section) {
      $section = document.createElement(section.tag);
      $section.setAttribute('name', section.name);
    }

    for (i = section.start; i < section.end; i += 1) {
      paragraph = paragraphs[i];
      $paragraph = $section.querySelector('[name="' + paragraph.name + '"]');

      if (!$paragraph) {
        $paragraph = document.createElement(paragraph.tag);
        $paragraph.setAttribute('name', paragraph.name);
      }

      HtmlBuilder.initElement.call(this, $paragraph, paragraph);
      HtmlBuilder.createDetail.call(this, $paragraph, paragraph);

      if (!$paragraph.parentElement) {
        $section.appendChild($paragraph);
      }
    }

    if (!$section.parentElement) {
      if ($prev) {
        $prev.parentElement.insertBefore($section, $prev.nextSibling);
      } else {
        this.el.appendChild($section);
      }
    }
  }.bind(this));

  this.handleEmpty();
};

HtmlBuilder.createDetail = function (el, data) {
  var text = el.textContent || el.innerText;
  var detail = data.detail || [];
  var html = '';
  var cursor = 0;

  detail.forEach(function (data) {
    var $detail = el.querySelector('[name="' + data.name + '"]');

    if (!$detail) {
      $detail = document.createElement(data.tag);
      $detail.setAttribute('name', data.name);
    }

    HtmlBuilder.initElement.call(this, $detail, data);

    if ($detail.textContent === undefined) {
      $detail.innerText = text.substr(data.start, data.end - data.start);
    } else {
      $detail.textContent = text.substr(data.start, data.end - data.start);
    }

    html += text.substr(cursor, data.start - cursor)
      + $detail.outerHTML;

    cursor = data.end;
  }.bind(this));

  html += text.substr(cursor, text.length - cursor);

  el.innerHTML = html;
};

HtmlBuilder.initElement = function (el, data) {
  var schema = this.schema[data.tag];

  schema.attrs.forEach(function (attr) {
    HtmlBuilder[attr.type].call(this, el, data, attr);
  });
};

HtmlBuilder.attribute = function (el, data, attr) {
  el.setAttribute(attr.name, data[attr.name]);
};

HtmlBuilder.dataset = function (el, data, attr) {
  el.setAttribute('data-' + attr.name, data[attr.name]);
};

HtmlBuilder.content = function (el, data, attr) {
  if (el.textContent === undefined) {
    el.innerText = data[attr.name];
  } else {
    el.textContent = data[attr.name];
  }
};
