var expect = require('chai').expect;

describe('Observe', function () {
  var els = [];

  after(function () {
    els.forEach(function (el) {
      el.parentElement.removeChild(el);
    });
  });

  var createElement = function () {
    var el = document.createElement('div');

    el.style.display = 'none';
    document.body.appendChild(el);
    els.push(el);

    return el;
  };

  describe('get values from element', function () {
    describe('.attribute(el, data, attr)', function () {
      it('should get attribute value from the element', function () {
        var el = document.createElement('div');
        var attr = { name: 'name' };
        var data = new Data();

        el.setAttribute(attr.name, 'test');
        Observe.attribute(el, data, attr);

        expect(data.get('name')).to.be.equal('test');
      });
    });

    describe('.dataset(el, data, attr)', function () {
      it('should get dataset value from the element', function () {
        var el = document.createElement('div');
        var attr = { name: 'name' };
        var data = new Data();

        el.setAttribute('data-' + attr.name, 'test');
        Observe.dataset(el, data, attr);

        expect(data.get('name')).to.be.equal('test');
      });
    });

    describe('.content(el, data, attr)', function () {
      it('should get text content from the element', function () {
        var el = document.createElement('div');
        var attr = { name: 'name' };
        var data = new Data();

        el.innerHTML = '<b>test</b>';
        Observe.content(el, data, attr);

        expect(data.get('name')).to.be.equal('test');
      });
    });

    describe('.handleUnknownElement(el)', function () {
      it('should clone the element content and remove that element', function () {
        var p = document.createElement('p');
        var b;

        p.innerHTML = 'no <b>child elements</b> here';
        b = p.children[0];

        Observe.handleUnknownElement(b);

        // ['no ', 'child elements', ' here']
        expect(p.childNodes.length).to.be.equal(3);
        expect(p.children.length).to.be.equal(0);
        expect(p.childNodes[1].nodeType).to.be.equal(document.TEXT_NODE);
        expect(p.innerHTML).to.be.equal('no child elements here');
      });
    });

    describe('.getOffset(el)', function () {
      it('should get offset of the element relative to that element\'s parent element', function () {
        var p = document.createElement('p');
        var b, offset;

        p.setAttribute('name', 'test');
        p.innerHTML = 'no <b>child elements</b> here';
        b = p.children[0];

        offset = Observe.getOffset(b);

        expect(offset.start).to.be.equal(3);
        expect(offset.end).to.be.equal(17);
      });
    });

    describe('.sync()', function () {
      it('should turn elements (except ul/ol) to data object', function () {
        var el = createElement();
        var med = new Med({ el: el });
        var firstSection, p, i, b;

        el.innerHTML = '<section><p>hello</p><p><i>world</i> <b>!</b></p></section><section><p>section 2</p></section>';
        
        med.sync();

        expect(med.structure.sections).to.have.length(2);
        expect(med.structure.paragraphs).to.have.length(3);

        firstSection = med.data[med.structure.sections[0]];
        expect(firstSection.get('start')).to.be.equal(0);
        expect(firstSection.get('end')).to.be.equal(2);

        p = med.data[med.structure.paragraphs[1]];
        i = med.data[p.get('detail')[0]];
        b = med.data[p.get('detail')[1]];

        expect(p.get('text')).to.be.equal('world !');
        expect(i.get('start')).to.be.equal(0);
        expect(i.get('end')).to.be.equal(5);
        expect(b.get('start')).to.be.equal(6);
        expect(b.get('end')).to.be.equal(7);
      });

      it('should turn ul/ol to data object', function () {
        var el = createElement();
        var med = new Med({ el: el });
        var li2;

        el.innerHTML = '<section><ul><li>item 1</li><li><b>item 2</b></li></ul></section>';
        
        med.sync();

        expect(med.structure.paragraphs).to.have.length(3);

        li2 = med.data[med.structure.paragraphs[0]];

        expect(li2.get('detail')).to.have.length(1);
        expect(li2.get('text')).to.be.equal('item 2');
      });
    });

    describe('#toJSON()', function () {
      it('should turn elements (except ol/ul) to JSON', function () {
        var el = createElement();
        var med = new Med({ el: el });
        var json;

        el.innerHTML = '<section><p>hello</p><p><i>world</i> <b>!</b></p></section><section><p>section 2</p></section>';
        
        med.sync();

        json = med.toJSON();

        expect(json.sections).to.have.length(2);
        expect(json.paragraphs).to.have.length(3);

        expect(json.sections[0].start).to.be.equal(0);
        expect(json.sections[0].end).to.be.equal(2);

        expect(json.paragraphs[1].text).to.be.equal('world !');
        expect(json.paragraphs[1].detail[0].start).to.be.equal(0);
        expect(json.paragraphs[1].detail[0].end).to.be.equal(5);
        expect(json.paragraphs[1].detail[1].start).to.be.equal(6);
        expect(json.paragraphs[1].detail[1].end).to.be.equal(7);
      });

      it('should turn ol/ul to JSON', function () {
        var el = createElement();
        var med = new Med({ el: el });
        var json;

        el.innerHTML = '<section><ul><li>item 1</li><li><b>item 2</b></li></ul></section>';
        
        med.sync();

        json = med.toJSON();

        expect(json.paragraphs).to.have.length(3);

        // paragraphs: [li, li, ul]
        expect(json.paragraphs[1].detail).to.have.length(1);
        expect(json.paragraphs[1].text).to.be.equal('item 2');
        console.log(json);
      });
    });
  });
});
