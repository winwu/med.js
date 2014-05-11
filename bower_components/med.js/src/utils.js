var utils = {};

utils.mixin = function (o1, o2) {
  Object
    .getOwnPropertyNames(o2)
    .forEach(function (name) {
      var desc = Object.getOwnPropertyDescriptor(o2, name);
      Object.defineProperty(o1, name, desc);
    });
  return o1;
};

utils.preventEvent = function (e) {
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
  if (typeof ctx === 'object' && typeof ctx.length === 'number') {
    Array.prototype.forEach.call(ctx, fn);
  }
  return ctx;
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
  if (null === obj || 'object' !== typeof obj) {
    return obj;
  }

  if (obj instanceof Date) {
    var copy = new Date();
    copy.setTime(obj.getTime());
    return copy;
  }

  if (obj instanceof Array) {
    return obj.slice();
  }

  var copy = {};

  for (var attr in obj) {
    if (obj.hasOwnProperty(attr)) {
      copy[attr] = utils.clone(obj[attr]);
    }
  }

  return copy;
};
