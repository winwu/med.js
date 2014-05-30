'use strict';

module.exports = Emitter;

function Emitter() {
  this.events = {};
}

/**
 * @param {String} event
 * @param {Function} handler
 * @api public
 */
Emitter.prototype.on = function (event, handler) {
  var list = this.events[event] || [];
  list.push(handler);
  this.events[event] = list;
  return this;
};

/**
 * @param {String} event
 * @param {Function} handler
 * @api public
 */
Emitter.prototype.once = function (event, handler) {
  handler._once = true;
  this.on(event, handler);
  return this;
};

/**
 * @param {String} event
 * @param {Function} handler
 * @api public
 */
Emitter.prototype.off = function (event, handler) {
  if (typeof event === 'function') {
    handler = event;

    for (event in this.events) {
      if (this.events.hasOwnProperty(event)) {
        this.off(event, handler);
      }
    }

    return this;
  }

  var list = this.events[event];
  var len = list.length;

  while (len--) {
    if (handler === list[len]) {
      list.splice(len, 1);
    }
  }

  return this;
};

/**
 * @param {String} event
 * @param {...Mixed} args
 * @api public
 */
Emitter.prototype.emit = function () {
  var args = Array.prototype.slice.call(arguments);
  var event = args.shift();
  var list = this.events[event] || [];
  var len = list.length;
  var handler;

  if (event === 'error' && !len) {
    throw args[0];
  }

  while (len--) {
    handler = list[len];
    handler.apply(this, args);
    if (handler._once) {
      list.splice(len, 1);
    }
  }

  return this;
};
