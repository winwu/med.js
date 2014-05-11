;(function (Function) {
  'use strict';

  Function.prototype.bind = Function.prototype.bind
    || function () {
      var args = Array.prototype.slice.call(arguments);
      var ctx = args.shift();
      var fn = this;
      return function () {
        var newArgs = args.concat(arguments);
        return fn.apply(ctx, newArgs);
      };
    };

})(Function);
