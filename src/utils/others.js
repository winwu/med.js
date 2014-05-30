'use strict';

module.exports = function (utils) {
  utils.mixin = function (o1, o2) {
    Object
      .getOwnPropertyNames(o2)
      .forEach(function (name) {
        var desc = Object.getOwnPropertyDescriptor(o2, name);
        Object.defineProperty(o1, name, desc);
      });
    return o1;
  };

  utils.preventDefault = function (e) {
    return e.preventDefault
      ? e.preventDefault()
      : e.returnValue = false;
  };

  utils.os = function () {
    var userAgent = navigator.userAgent;
    switch (true) {
      case /mac/i.test(userAgent):
        return 'mac';
      case /win/i.test(userAgent):
        return 'windows';
      case /linux/i.test(userAgent):
        return 'linux';
      default:
        return 'unknown';
    }
  };

  utils.each = function (ctx, fn) {
    if (utils.isArrayLike(ctx)) {
      Array.prototype.forEach.call(ctx, fn);
    }

    return ctx;
  };

  utils.isArrayLike = function (obj) {
    return typeof obj === 'object'
      && typeof obj.length === 'number';
  };

  utils.split = function (separator, limit) {
    var re = new RegExp('\\\\' + limit, 'g');

    return separator
      .replace(re, '\uffff')
      .split(limit)
      .map(function (str) {
        return str.replace(/\uffff/g, limit);
      });
  };

  utils.clone = function (obj) {
    return JSON.parse(JSON.stringify(obj));
  };

  utils.equal = function (a, b) {
    // primitive
    if (a === null || /^[sbn]/.test(typeof a)) {
      return a === b;
    }

    if (a instanceof Array) {
      if (b instanceof Array) {
        a = a.slice().sort();
        b = b.slice().sort();
        return a.join() === b.join();
      }
      return false;
    }

    if (typeof a === 'object') {
      if (typeof b !== 'object') {
        return false;
      }

      var prop, notEqual;

      for (prop in a) {
        if (a.hasOwnProperty(prop)) {
          notEqual = a.hasOwnProperty(prop)
            && b.hasOwnProperty(prop)
            && !utils.equal(a[prop], b[prop]);

          if (notEqual) {
            return false;
          }
        }
      }

      return true;
    }

    return false;
  };
};
