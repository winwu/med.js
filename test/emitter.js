var expect = require('chai').expect;
var Med = require('../dist/med');

describe('Emitter', function () {
  describe('#on(event, handler)', function () {
    it('should work', function () {
      var emitter = new Med({});
      var handler = function () {};
      emitter.on('test', handler);
      expect(emitter.events.test).to.have.length(1);
    });
  });

  describe('#off(event, handler)', function () {
    it('should remove the handler', function () {
      var emitter = new Med({});
      var handler = function () {};

      emitter.on('test', handler);
      emitter.off('test', handler);

      expect(emitter.events.test).to.have.length(0);
    });
  });


  describe('#emit(event, [arg1], [arg2], [...])', function () {
    it('should work', function () {
      var emitter = new Med({});
      var arg1 = {}, arg2 = {};

      emitter.on('test', function (a1, a2) {
        expect(a1).to.be.equal(arg1);
        expect(a2).to.be.equal(arg2);
      });

      emitter.emit('test', arg1, arg2);
    });
  });

  describe('#once(event, handler)', function () {
    it('should execute the handler only once', function () {
      var emitter = new Med({});
      var counter = 0;

      emitter.once('test', function () {
        counter += 1;
      });

      emitter.emit('test');
      emitter.emit('test');

      expect(counter).to.be.equal(1);
    });
  });
});
