function Middleware() {
  this.middleware = [];
}

/**
 * @param {Function} fn
 * @return {Editor}
 * @api public
 */
Middleware.prototype.use = function (fn) {
  if (typeof fn !== 'function') {
    throw new Error('The first argument must me a function.');
  }

  this.middleware.push(fn);

  return this;
};

/**
 * @param {Object} ctx
 * @param {Function} cb
 * @api public
 */
Middleware.prototype.exec = function (ctx, cb) {
  var fn = this.compose(this.middleware);
  fn.call(ctx, cb);
};

/**
 * @param {Function[]} fns
 * @return {Function}
 * @api public
 */
Middleware.prototype.compose = function (fns) {
  return function (cb) {
    var i = 0;

    var next = (function (err) {
      if (err) {
        return cb(err);
      }
      
      var fn = fns[i++];
      
      if (!fn) {
        return cb();
      }

      try {
        fn.call(this, next);
      } catch (e) {
        cb(e);
      }
    }).bind(this);

    next();
  };
};
