var expect = require('chai').expect;
var Data = require('../src/data');

describe('Data', function () {
  describe('#set(key, val)', function () {
    it('should set value to `.tmp`', function () {
      var data = new Data();
      data.set('test', 'test value');
      data.set('su.b', 'sub');
      expect(data.tmp.test).to.be.equal('test value');
      expect(data.tmp['su.b']).to.be.equal('sub');
    });

    it('should set value to `.data`', function () {
      var data = new Data();
      data._set('test', 'test value');
      data._set('su.b', 'sub');
      expect(data.data.test).to.be.equal('test value');
      expect(data.data.su.b).to.be.equal('sub');
    });
  });

  describe('#get(key)', function () {
    it('should get value from `.tmp`', function () {
      var data = new Data();
      data.tmp.test = 'tmp';
      data.data.test = 'data';
      expect(data.get('test')).to.be.equal('tmp');
    });

    it('should get value from `.data`', function () {
      var data = new Data();
      data.data.test = 'data';
      expect(data.get('test')).to.be.equal('data');
    });
  });

  describe('.modified', function () {
    it('should update `.modified` value when data has changed', function () {
      var data = new Data();
      
      data.set('h.e.l.l.o', 'hello');

      expect(data.modified).to.be.true;

      data.modified = false;
      data.set('h.e.l.l.o', 'hello');

      expect(data.modified).to.be.false;
    });
  });

  describe('#update()', function () {
    it('should copy all values from `.tmp` to `.data`', function () {
      var data = new Data();
      
      data.set('h.e.l.l.o', 'hello');
      data.set('test', 'test');

      expect(data.modified).to.be.true;

      data.update();

      expect(data.modified).to.be.false;
      expect(Object.keys(data.tmp)).to.have.length(0);
      expect(data.get('h.e.l.l.o', 'hello'));
      expect(data.get('test', 'test'));
    });
  });
});
