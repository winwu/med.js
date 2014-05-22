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
    } else {
      return false;
    }
  }

  if (typeof a === 'object') {
    if (typeof b === 'object') {
      var prop, notEqual;

      for (prop in a) {
        notEqual = a.hasOwnProperty(prop)
          && b.hasOwnProperty(prop)
          && !utils.equal(a[prop], b[prop]);

        if (notEqual) {
          return false;
        }
      }

      return true;
    }

    return false;
  }

  return false;
};

utils.getTextContent = function (el) {
  return el
    && el.textContent
    || el.innerText
    || '';
};

utils.isEmpty = function (el) {
  if (utils.isTag('br', el)) {
    return false;
  }
  return !utils.getTextContent(el).trim();
};

utils.isNotEmpty = function (el) {
  return !utils.isEmpty(el);
};

utils.isTag = function (tagName, el) {
  if (typeof tagName === 'string') {
    tagName = [tagName];
  }

  var toUpperCase = function (str) {
    return str.toUpperCase();
  };

  return !!~tagName
    .map(toUpperCase)
    .indexOf(el.tagName);
};

utils.isLastChild = function (el) {
  return el.parentELement.lastChild === el;
};

utils.removeEmptyElements = function (el) {
  utils.each(el.children, function (child) {
    if (utils.isEmpty(child)) {
      el.removeChild(child);
    } else {
      utils.removeEmptyElements(child);
    }
  });
};

utils.removeElement = function (el) {
  if (el.parentElement) {
    el.parentElement.removeChild(el);
  }
};

utils.isType = function (types, el) {
  var s = utils.getElementSchema(el);

  if (typeof types === 'string') {
    types = [types];
  }

  return s && !!~types.indexOf(s.type);
};

utils.getType = function (el) {
  var s = utils.getElementSchema(el);
  return s ? s.type : null;
};

utils.getElementSchema = function (el) {
  return el
    && schema[el.tagName.toLowerCase()]
    || null;
};

utils.isElementNode = function (node) {
  return node.nodeType === document.ELEMENT_NODE;
};

utils.isTextNode = function (node) {
  return node.nodeType === document.TEXT_NODE;
};
