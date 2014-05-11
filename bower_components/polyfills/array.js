;(function (Array) {
  'use strict';

  Array.prototype.indexOf = Array.prototype.indexOf
    || function (searchElement, fromIndex) {
      var len = this.length | 0;
      fromIndex = fromIndex | 0;
      
      if (fromIndex < 0) {
        fromIndex += len;
        fromIndex < 0 && (fromIndex = 0);
      }

      for (;fromIndex < len; fromIndex += 1) {
        if (this[fromIndex] === searchElement) {
          return fromIndex;
        }
      }

      return -1;
    };

})(Array);
