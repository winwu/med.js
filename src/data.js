function Data(id) {
  this.id = id;
  this.modified = false;
  this.data = {};
  this.tmp = {};
}

/**
 * @param {String} key
 * @param {Mixed} key
 * @return {Data}
 * @api public
 */
Data.prototype.set = function (key, val) {
  if (!utils.equal(this.get(key), val)) {
    this.modified = true;
  }

  this.tmp[key] = val;

  return this;
};

/**
 * @param {String} key
 * @param {Mixed} key
 * @return {Data}
 * @api private
 */
Data.prototype._set = function (key, val) {
  var keys = utils.split(key, '.');
  var last = keys.pop();
  var data = this.data;

  while (key = keys.shift()) {
    if (data[key] === undefined) {
      data = data[key] = {};
    } else {
      data = data[key];
    }
  }

  data[last] = val;

  return this;
};

/**
 * @param {String} key
 * @return {Mixed}
 * @api public
 */
Data.prototype.get = function (key) {
  if (this.tmp[key]) {
    return this.tmp[key];
  }

  var keys = utils.split(key, '.');
  var data = this.data;

  while (key = keys.shift()) {
    if (data === undefined) {
      return;
    } else {
      data = data[key];
    }
  }

  return data;
};

/**
 * @return {Data}
 * @api public
 */
Data.prototype.update = function () {
  var tmp = this.tmp;

  Object.keys(tmp).forEach(function (key) {
    this._set(key, tmp[key]);
  }.bind(this));

  this.modified = false;
  this.tmp = {};

  return this;
};

/**
 * @return {Object}
 * @api public
 */
Data.prototype.toJSON = function () {
  return utils.clone(this.data);
};
