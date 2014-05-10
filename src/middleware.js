function Middleware() {
  this.middleware = [];
}

Middleware.prototype.use = function (fn) {
  if (typeof fn !== 'function') {
    throw new Error('The first argument must me a function.');
  }

  this.middleware.push(fn);

  return this;
};

Middleware.prototype.exec = function (ctx, cb) {
  var fns = this.middleware;
  var i = 0;

  var next = function (err) {
    if (err) {
      return cb(err);
    }
    
    var fn = fns[i++];
    
    if (!fn) {
      return cb();
    }

    try {
      fn.call(ctx, next);
    } catch (e) {
      cb(e);
    }
  };

  next();
};
