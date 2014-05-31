var expect = require('chai').expect;
var utils = require('../src/utils');

describe('utils', function () {
  describe('.mixin(obj1, obj2)', function () {
    it('should copy all obj2\'s property descriptor to obj1', function () {
      var obj1 = {
        p1: 1
      };
      
      var obj2 = {
        p2: 2,
        p3: 3,
        p4: 4
      };

      utils.mixin(obj1, obj2);

      var sum = Object.keys(obj1).reduce(function (sum, key) {
        return sum + obj1[key];
      }, 0);

      expect(sum).to.be.equal(10);
    });
  });

  describe('.each(ctx, fn)', function () {
    it('should work with arguments', function () {
      var sum = 0;

      var start = function () {
        utils.each(arguments, function (n) {
          sum += n;
        });
      };

      start(1, 2, 3, 4);

      expect(sum).to.be.equal(10);
    });

    it('should work with HTMLCollection', function () {
      var sum = 0;
      var doc = document.createElement('div');
      
      doc.innerHTML = '<div>1</div>'
        + '<div>2</div>'
        + '<div>3</div>'
        + '<div>4</div>';

      utils.each(doc.children, function (child) {
        sum += child.innerHTML | 0;
      });

      expect(sum).to.be.equal(10);
    });
  });

  describe('.splite(separator, limit)', function () {
    it('should ignore \'\\\\.\'', function () {
      var str = 'a.b.c\\.d';
      expect(utils.split(str, '.')).to.have.length(3);
    });
  });

  describe('.clone(obj)', function () {
    it('should work with Object', function () {
      var obj = { a: 1, b: 2 };
      var clone = utils.clone(obj);

      expect(clone).to.not.equal(obj);
      expect(clone).to.deep.equal(obj);
    });

    it('should work with Array', function () {
      var arr = [1, 2, 3];
      var clone = utils.clone(arr);

      expect(clone).to.be.instanceof(Array);
      expect(clone).to.not.equal(arr);
      expect(clone).to.deep.equal(arr);
    });
  });

  describe('.equal(a, b)', function () {
    it('should work with Object', function () {
      expect(utils.equal({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } })).to.be.true;
      expect(utils.equal({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 3 } })).to.be.false;
    });

    it('should work with Array', function () {
      expect(utils.equal([1, 2], [2, 1])).to.be.true;
      expect(utils.equal([1, 2], [2, 3])).to.be.false;
    });

    it('should work with primitive value', function () {
      expect(utils.equal(1, 1)).to.be.true;
      expect(utils.equal(2, 1)).to.be.false;

      expect(utils.equal('str', 'str')).to.be.true;
      expect(utils.equal('st', 'str')).to.be.false;
    });
  });
});
