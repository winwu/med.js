var expect = require('chai').expect;
var Middleware = require('../src/mixin/middleware');

describe('middleware', function () {
  describe('#use(fn)', function () {
    it('should work', function () {
      var med = new Middleware();
      med.middleware = [];
      med.use(function () {});
      expect(med.middleware).to.have.length(1);
    });
  });

  describe('#compose(fns)', function () {
    it('should execute all functions', function (done) {
      var med = new Middleware();
      var fns = [];

      fns.push(function (next) {
        next();
      });

      fns.push(function (next) {
        next();
      });

      med.compose(fns)(done);
    });
  });

  describe('#exec(ctx, cb)', function () {
    it('should execute all middlewares', function (done) {
      var med = new Middleware();
      var ctx = {};

      med.middleware = [function (next) {
        expect(ctx).to.be.equal(this);
        next();
      }];

      med.exec(ctx, done);
    });
  });
});
