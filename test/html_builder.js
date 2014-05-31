var expect = require('chai').expect;
var Med = require('../src/main');
var HtmlBuilder = require('../src/mixin/html-builder');
var Data = require('../src/data');

var createName = (function () {
  var n = 0;
  return function () {
    return ++n;
  };
})();

var json = {
  sections: [
    {
      tag: 'section',
      name: createName(),
      start: 0,
      end: 2
    }
  ],
  paragraphs: [
    {
      name: createName(),
      tag: 'p',
      text: 'abc',
      detail: [
        {
          name: createName(),
          start: 0,
          end: 1,
          tag: 'i'
        }
      ]
    },
    {
      name: createName(),
      tag: 'p',
      text: '123',
      detail: []
    }
  ]
};

describe('HtmlBuilder', function () {
  var els = [];

  after(function () {
    els.forEach(function (el) {
      el.parentElement.removeChild(el);
    });
  });

  describe('.importData(json)', function () {
    it('should turn JSON to `Data`', function () {
      var el = document.createElement('div');

      document.body.appendChild(el);

      var med = new Med({ el: el });
      var p, d;

      els.push(el);

      HtmlBuilder.importData.call(med, json);
      
      expect(med.structure.sections).to.have.length(1);
      expect(med.structure.paragraphs).to.have.length(2);

      p = med.data[med.structure.paragraphs[0]];

      expect(p).to.be.an.instanceof(Data);
      expect(p.get('text')).to.be.equal('abc');

      d = med.data[p.get('detail')[0]];

      expect(d).to.be.an.instanceof(Data);
      expect(d.get('start')).to.be.equal(0);
      expect(d.get('end')).to.be.equal(1);
    });
  });

  describe('.fromJSON(json)', function () {
    it('should turn JSON to HTML', function () {
      var el = document.createElement('div');

      document.body.appendChild(el);

      var med = new Med({ el: el });
      var html = ''
        + '<section name="1">'
          + '<p name="2"><i name="3">a</i>bc</p>'
          + '<p name="4">123</p>'
        + '</section>';

      els.push(el);

      med.fromJSON(json);

      expect(med.el.innerHTML).to.be.equal(html);
    });
  });

  describe('.attribute()', function () {
    it('should update attribute value of element', function () {
      var el = document.createElement('div');
      var data = new Data();

      data.set('test', 'value');

      HtmlBuilder.attribute(el, data, { name: 'test' });

      expect(el.getAttribute('test')).to.be.equal('value');
    });
  });

  describe('.dataset()', function () {
    it('should update dataset value of element', function () {
      var el = document.createElement('div');
      var data = new Data();

      data.set('test', 'value');

      HtmlBuilder.dataset(el, data, { name: 'test' });

      expect(el.getAttribute('data-test')).to.be.equal('value');
    });
  });

  describe('.content()', function () {
    it('should update content of element', function () {
      var el = document.createElement('div');
      var data = new Data();

      data.set('test', 'value');

      HtmlBuilder.content(el, data, { name: 'test' });

      expect(el.textContent || el.innerText).to.be.equal('value');
    });
  });
});
