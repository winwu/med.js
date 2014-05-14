var expect = require('chai').expect;

describe('HtmlBuilder', function () {
  describe('.attribute()', function () {
    it('should update attribute value of element', function () {
      var el = document.createElement('div');

      HtmlBuilder.attribute(el, { test: 'value' }, { name: 'test' });

      expect(el.getAttribute('test')).to.be.equal('value');
    });
  });

  describe('.dataset()', function () {
    it('should update dataset value of element', function () {
      var el = document.createElement('div');

      HtmlBuilder.dataset(el, { test: 'value' }, { name: 'test' });

      expect(el.getAttribute('data-test')).to.be.equal('value');
    });
  });

  describe('.content()', function () {
    it('should update content of element', function () {
      var el = document.createElement('div');

      HtmlBuilder.content(el, { test: 'value' }, { name: 'test' });

      expect(el.textContent || el.innerText).to.be.equal('value');
    });
  });
});
