(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = Buffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192

/**
 * If `Buffer._useTypedArrays`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (compatible down to IE6)
 */
Buffer._useTypedArrays = (function () {
  // Detect if browser supports Typed Arrays. Supported browsers are IE 10+, Firefox 4+,
  // Chrome 7+, Safari 5.1+, Opera 11.6+, iOS 4.2+. If the browser does not support adding
  // properties to `Uint8Array` instances, then that's the same as no `Uint8Array` support
  // because we need to be able to add all the node Buffer API methods. This is an issue
  // in Firefox 4-29. Now fixed: https://bugzilla.mozilla.org/show_bug.cgi?id=695438
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return 42 === arr.foo() &&
        typeof arr.subarray === 'function' // Chrome 9-10 lack `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding, noZero) {
  if (!(this instanceof Buffer))
    return new Buffer(subject, encoding, noZero)

  var type = typeof subject

  // Workaround: node's base64 implementation allows for non-padded strings
  // while base64-js does not.
  if (encoding === 'base64' && type === 'string') {
    subject = stringtrim(subject)
    while (subject.length % 4 !== 0) {
      subject = subject + '='
    }
  }

  // Find the length
  var length
  if (type === 'number')
    length = coerce(subject)
  else if (type === 'string')
    length = Buffer.byteLength(subject, encoding)
  else if (type === 'object')
    length = coerce(subject.length) // assume that object is array-like
  else
    throw new Error('First argument needs to be a number, array or string.')

  var buf
  if (Buffer._useTypedArrays) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    buf = Buffer._augment(new Uint8Array(length))
  } else {
    // Fallback: Return THIS instance of Buffer (created by `new`)
    buf = this
    buf.length = length
    buf._isBuffer = true
  }

  var i
  if (Buffer._useTypedArrays && typeof subject.byteLength === 'number') {
    // Speed optimization -- use set if we're copying from a typed array
    buf._set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    if (Buffer.isBuffer(subject)) {
      for (i = 0; i < length; i++)
        buf[i] = subject.readUInt8(i)
    } else {
      for (i = 0; i < length; i++)
        buf[i] = ((subject[i] % 256) + 256) % 256
    }
  } else if (type === 'string') {
    buf.write(subject, 0, encoding)
  } else if (type === 'number' && !Buffer._useTypedArrays && !noZero) {
    for (i = 0; i < length; i++) {
      buf[i] = 0
    }
  }

  return buf
}

// STATIC METHODS
// ==============

Buffer.isEncoding = function (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.isBuffer = function (b) {
  return !!(b !== null && b !== undefined && b._isBuffer)
}

Buffer.byteLength = function (str, encoding) {
  var ret
  str = str.toString()
  switch (encoding || 'utf8') {
    case 'hex':
      ret = str.length / 2
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8ToBytes(str).length
      break
    case 'ascii':
    case 'binary':
    case 'raw':
      ret = str.length
      break
    case 'base64':
      ret = base64ToBytes(str).length
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = str.length * 2
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.concat = function (list, totalLength) {
  assert(isArray(list), 'Usage: Buffer.concat(list[, length])')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (totalLength === undefined) {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

Buffer.compare = function (a, b) {
  assert(Buffer.isBuffer(a) && Buffer.isBuffer(b), 'Arguments must be Buffers')
  var x = a.length
  var y = b.length
  for (var i = 0, len = Math.min(x, y); i < len && a[i] === b[i]; i++) {}
  if (i !== len) {
    x = a[i]
    y = b[i]
  }
  if (x < y) {
    return -1
  }
  if (y < x) {
    return 1
  }
  return 0
}

// BUFFER INSTANCE METHODS
// =======================

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  assert(strLen % 2 === 0, 'Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16)
    assert(!isNaN(byte), 'Invalid hex string')
    buf[offset + i] = byte
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  var charsWritten = blitBuffer(utf8ToBytes(string), buf, offset, length)
  return charsWritten
}

function asciiWrite (buf, string, offset, length) {
  var charsWritten = blitBuffer(asciiToBytes(string), buf, offset, length)
  return charsWritten
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  var charsWritten = blitBuffer(base64ToBytes(string), buf, offset, length)
  return charsWritten
}

function utf16leWrite (buf, string, offset, length) {
  var charsWritten = blitBuffer(utf16leToBytes(string), buf, offset, length)
  return charsWritten
}

Buffer.prototype.write = function (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0
  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  var ret
  switch (encoding) {
    case 'hex':
      ret = hexWrite(this, string, offset, length)
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8Write(this, string, offset, length)
      break
    case 'ascii':
      ret = asciiWrite(this, string, offset, length)
      break
    case 'binary':
      ret = binaryWrite(this, string, offset, length)
      break
    case 'base64':
      ret = base64Write(this, string, offset, length)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = utf16leWrite(this, string, offset, length)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toString = function (encoding, start, end) {
  var self = this

  encoding = String(encoding || 'utf8').toLowerCase()
  start = Number(start) || 0
  end = (end === undefined) ? self.length : Number(end)

  // Fastpath empty strings
  if (end === start)
    return ''

  var ret
  switch (encoding) {
    case 'hex':
      ret = hexSlice(self, start, end)
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8Slice(self, start, end)
      break
    case 'ascii':
      ret = asciiSlice(self, start, end)
      break
    case 'binary':
      ret = binarySlice(self, start, end)
      break
    case 'base64':
      ret = base64Slice(self, start, end)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = utf16leSlice(self, start, end)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toJSON = function () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

Buffer.prototype.equals = function (b) {
  assert(Buffer.isBuffer(b), 'Argument must be a Buffer')
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.compare = function (b) {
  assert(Buffer.isBuffer(b), 'Argument must be a Buffer')
  return Buffer.compare(this, b)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function (target, target_start, start, end) {
  var source = this

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (!target_start) target_start = 0

  // Copy 0 bytes; we're done
  if (end === start) return
  if (target.length === 0 || source.length === 0) return

  // Fatal error conditions
  assert(end >= start, 'sourceEnd < sourceStart')
  assert(target_start >= 0 && target_start < target.length,
      'targetStart out of bounds')
  assert(start >= 0 && start < source.length, 'sourceStart out of bounds')
  assert(end >= 0 && end <= source.length, 'sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length)
    end = this.length
  if (target.length - target_start < end - start)
    end = target.length - target_start + start

  var len = end - start

  if (len < 100 || !Buffer._useTypedArrays) {
    for (var i = 0; i < len; i++) {
      target[i + target_start] = this[i + start]
    }
  } else {
    target._set(this.subarray(start, start + len), target_start)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function binarySlice (buf, start, end) {
  return asciiSlice(buf, start, end)
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function (start, end) {
  var len = this.length
  start = clamp(start, len, 0)
  end = clamp(end, len, len)

  if (Buffer._useTypedArrays) {
    return Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    var newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
    return newBuf
  }
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

Buffer.prototype.readUInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  return this[offset]
}

function readUInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    val = buf[offset]
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
  } else {
    val = buf[offset] << 8
    if (offset + 1 < len)
      val |= buf[offset + 1]
  }
  return val
}

Buffer.prototype.readUInt16LE = function (offset, noAssert) {
  return readUInt16(this, offset, true, noAssert)
}

Buffer.prototype.readUInt16BE = function (offset, noAssert) {
  return readUInt16(this, offset, false, noAssert)
}

function readUInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    if (offset + 2 < len)
      val = buf[offset + 2] << 16
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
    val |= buf[offset]
    if (offset + 3 < len)
      val = val + (buf[offset + 3] << 24 >>> 0)
  } else {
    if (offset + 1 < len)
      val = buf[offset + 1] << 16
    if (offset + 2 < len)
      val |= buf[offset + 2] << 8
    if (offset + 3 < len)
      val |= buf[offset + 3]
    val = val + (buf[offset] << 24 >>> 0)
  }
  return val
}

Buffer.prototype.readUInt32LE = function (offset, noAssert) {
  return readUInt32(this, offset, true, noAssert)
}

Buffer.prototype.readUInt32BE = function (offset, noAssert) {
  return readUInt32(this, offset, false, noAssert)
}

Buffer.prototype.readInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null,
        'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  var neg = this[offset] & 0x80
  if (neg)
    return (0xff - this[offset] + 1) * -1
  else
    return this[offset]
}

function readInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = readUInt16(buf, offset, littleEndian, true)
  var neg = val & 0x8000
  if (neg)
    return (0xffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt16LE = function (offset, noAssert) {
  return readInt16(this, offset, true, noAssert)
}

Buffer.prototype.readInt16BE = function (offset, noAssert) {
  return readInt16(this, offset, false, noAssert)
}

function readInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = readUInt32(buf, offset, littleEndian, true)
  var neg = val & 0x80000000
  if (neg)
    return (0xffffffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt32LE = function (offset, noAssert) {
  return readInt32(this, offset, true, noAssert)
}

Buffer.prototype.readInt32BE = function (offset, noAssert) {
  return readInt32(this, offset, false, noAssert)
}

function readFloat (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 23, 4)
}

Buffer.prototype.readFloatLE = function (offset, noAssert) {
  return readFloat(this, offset, true, noAssert)
}

Buffer.prototype.readFloatBE = function (offset, noAssert) {
  return readFloat(this, offset, false, noAssert)
}

function readDouble (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 7 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 52, 8)
}

Buffer.prototype.readDoubleLE = function (offset, noAssert) {
  return readDouble(this, offset, true, noAssert)
}

Buffer.prototype.readDoubleBE = function (offset, noAssert) {
  return readDouble(this, offset, false, noAssert)
}

Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'trying to write beyond buffer length')
    verifuint(value, 0xff)
  }

  if (offset >= this.length) return

  this[offset] = value
  return offset + 1
}

function writeUInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 2); i < j; i++) {
    buf[offset + i] =
        (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
            (littleEndian ? i : 1 - i) * 8
  }
  return offset + 2
}

Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
  return writeUInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
  return writeUInt16(this, value, offset, false, noAssert)
}

function writeUInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffffffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 4); i < j; i++) {
    buf[offset + i] =
        (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
  return offset + 4
}

Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
  return writeUInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
  return writeUInt32(this, value, offset, false, noAssert)
}

Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7f, -0x80)
  }

  if (offset >= this.length)
    return

  if (value >= 0)
    this.writeUInt8(value, offset, noAssert)
  else
    this.writeUInt8(0xff + value + 1, offset, noAssert)
  return offset + 1
}

function writeInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fff, -0x8000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    writeUInt16(buf, value, offset, littleEndian, noAssert)
  else
    writeUInt16(buf, 0xffff + value + 1, offset, littleEndian, noAssert)
  return offset + 2
}

Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
  return writeInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
  return writeInt16(this, value, offset, false, noAssert)
}

function writeInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fffffff, -0x80000000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    writeUInt32(buf, value, offset, littleEndian, noAssert)
  else
    writeUInt32(buf, 0xffffffff + value + 1, offset, littleEndian, noAssert)
  return offset + 4
}

Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
  return writeInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
  return writeInt32(this, value, offset, false, noAssert)
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 7 < buf.length,
        'Trying to write beyond buffer length')
    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  assert(end >= start, 'end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  assert(start >= 0 && start < this.length, 'start out of bounds')
  assert(end >= 0 && end <= this.length, 'end out of bounds')

  var i
  if (typeof value === 'number') {
    for (i = start; i < end; i++) {
      this[i] = value
    }
  } else {
    var bytes = utf8ToBytes(value.toString())
    var len = bytes.length
    for (i = start; i < end; i++) {
      this[i] = bytes[i % len]
    }
  }

  return this
}

Buffer.prototype.inspect = function () {
  var out = []
  var len = this.length
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i])
    if (i === exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...'
      break
    }
  }
  return '<Buffer ' + out.join(' ') + '>'
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer._useTypedArrays) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1) {
        buf[i] = this[i]
      }
      return buf.buffer
    }
  } else {
    throw new Error('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function (arr) {
  arr._isBuffer = true

  // save reference to original Uint8Array get/set methods before overwriting
  arr._get = arr.get
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.equals = BP.equals
  arr.compare = BP.compare
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

// slice(start, end)
function clamp (index, len, defaultValue) {
  if (typeof index !== 'number') return defaultValue
  index = ~~index;  // Coerce to integer.
  if (index >= len) return len
  if (index >= 0) return index
  index += len
  if (index >= 0) return index
  return 0
}

function coerce (length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length)
  return length < 0 ? 0 : length
}

function isArray (subject) {
  return (Array.isArray || function (subject) {
    return Object.prototype.toString.call(subject) === '[object Array]'
  })(subject)
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    var b = str.charCodeAt(i)
    if (b <= 0x7F) {
      byteArray.push(b)
    } else {
      var start = i
      if (b >= 0xD800 && b <= 0xDFFF) i++
      var h = encodeURIComponent(str.slice(start, i+1)).substr(1).split('%')
      for (var j = 0; j < h.length; j++) {
        byteArray.push(parseInt(h[j], 16))
      }
    }
  }
  return byteArray
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(str)
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length))
      break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

/*
 * We have to make sure that the value is a valid integer. This means that it
 * is non-negative. It has no fractional component and that it does not
 * exceed the maximum allowed value.
 */
function verifuint (value, max) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value >= 0, 'specified a negative value for writing an unsigned value')
  assert(value <= max, 'value is larger than maximum value for type')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifsint (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifIEEE754 (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
}

function assert (test, message) {
  if (!test) throw new Error(message || 'Failed assertion')
}

},{"base64-js":2,"ieee754":3}],2:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var ZERO   = '0'.charCodeAt(0)
	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS)
			return 62 // '+'
		if (code === SLASH)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	module.exports.toByteArray = b64ToByteArray
	module.exports.fromByteArray = uint8ToBase64
}())

},{}],3:[function(require,module,exports){
exports.read = function(buffer, offset, isLE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isLE ? (nBytes - 1) : 0,
      d = isLE ? -1 : 1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isLE ? 0 : (nBytes - 1),
      d = isLE ? 1 : -1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

},{}],4:[function(require,module,exports){
module.exports = require('./lib/chai');

},{"./lib/chai":5}],5:[function(require,module,exports){
/*!
 * chai
 * Copyright(c) 2011-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

var used = []
  , exports = module.exports = {};

/*!
 * Chai version
 */

exports.version = '1.9.1';

/*!
 * Assertion Error
 */

exports.AssertionError = require('assertion-error');

/*!
 * Utils for plugins (not exported)
 */

var util = require('./chai/utils');

/**
 * # .use(function)
 *
 * Provides a way to extend the internals of Chai
 *
 * @param {Function}
 * @returns {this} for chaining
 * @api public
 */

exports.use = function (fn) {
  if (!~used.indexOf(fn)) {
    fn(this, util);
    used.push(fn);
  }

  return this;
};

/*!
 * Configuration
 */

var config = require('./chai/config');
exports.config = config;

/*!
 * Primary `Assertion` prototype
 */

var assertion = require('./chai/assertion');
exports.use(assertion);

/*!
 * Core Assertions
 */

var core = require('./chai/core/assertions');
exports.use(core);

/*!
 * Expect interface
 */

var expect = require('./chai/interface/expect');
exports.use(expect);

/*!
 * Should interface
 */

var should = require('./chai/interface/should');
exports.use(should);

/*!
 * Assert interface
 */

var assert = require('./chai/interface/assert');
exports.use(assert);

},{"./chai/assertion":6,"./chai/config":7,"./chai/core/assertions":8,"./chai/interface/assert":9,"./chai/interface/expect":10,"./chai/interface/should":11,"./chai/utils":22,"assertion-error":31}],6:[function(require,module,exports){
/*!
 * chai
 * http://chaijs.com
 * Copyright(c) 2011-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

var config = require('./config');

module.exports = function (_chai, util) {
  /*!
   * Module dependencies.
   */

  var AssertionError = _chai.AssertionError
    , flag = util.flag;

  /*!
   * Module export.
   */

  _chai.Assertion = Assertion;

  /*!
   * Assertion Constructor
   *
   * Creates object for chaining.
   *
   * @api private
   */

  function Assertion (obj, msg, stack) {
    flag(this, 'ssfi', stack || arguments.callee);
    flag(this, 'object', obj);
    flag(this, 'message', msg);
  }

  Object.defineProperty(Assertion, 'includeStack', {
    get: function() {
      console.warn('Assertion.includeStack is deprecated, use chai.config.includeStack instead.');
      return config.includeStack;
    },
    set: function(value) {
      console.warn('Assertion.includeStack is deprecated, use chai.config.includeStack instead.');
      config.includeStack = value;
    }
  });

  Object.defineProperty(Assertion, 'showDiff', {
    get: function() {
      console.warn('Assertion.showDiff is deprecated, use chai.config.showDiff instead.');
      return config.showDiff;
    },
    set: function(value) {
      console.warn('Assertion.showDiff is deprecated, use chai.config.showDiff instead.');
      config.showDiff = value;
    }
  });

  Assertion.addProperty = function (name, fn) {
    util.addProperty(this.prototype, name, fn);
  };

  Assertion.addMethod = function (name, fn) {
    util.addMethod(this.prototype, name, fn);
  };

  Assertion.addChainableMethod = function (name, fn, chainingBehavior) {
    util.addChainableMethod(this.prototype, name, fn, chainingBehavior);
  };

  Assertion.overwriteProperty = function (name, fn) {
    util.overwriteProperty(this.prototype, name, fn);
  };

  Assertion.overwriteMethod = function (name, fn) {
    util.overwriteMethod(this.prototype, name, fn);
  };

  Assertion.overwriteChainableMethod = function (name, fn, chainingBehavior) {
    util.overwriteChainableMethod(this.prototype, name, fn, chainingBehavior);
  };

  /*!
   * ### .assert(expression, message, negateMessage, expected, actual)
   *
   * Executes an expression and check expectations. Throws AssertionError for reporting if test doesn't pass.
   *
   * @name assert
   * @param {Philosophical} expression to be tested
   * @param {String} message to display if fails
   * @param {String} negatedMessage to display if negated expression fails
   * @param {Mixed} expected value (remember to check for negation)
   * @param {Mixed} actual (optional) will default to `this.obj`
   * @api private
   */

  Assertion.prototype.assert = function (expr, msg, negateMsg, expected, _actual, showDiff) {
    var ok = util.test(this, arguments);
    if (true !== showDiff) showDiff = false;
    if (true !== config.showDiff) showDiff = false;

    if (!ok) {
      var msg = util.getMessage(this, arguments)
        , actual = util.getActual(this, arguments);
      throw new AssertionError(msg, {
          actual: actual
        , expected: expected
        , showDiff: showDiff
      }, (config.includeStack) ? this.assert : flag(this, 'ssfi'));
    }
  };

  /*!
   * ### ._obj
   *
   * Quick reference to stored `actual` value for plugin developers.
   *
   * @api private
   */

  Object.defineProperty(Assertion.prototype, '_obj',
    { get: function () {
        return flag(this, 'object');
      }
    , set: function (val) {
        flag(this, 'object', val);
      }
  });
};

},{"./config":7}],7:[function(require,module,exports){
module.exports = {

  /**
   * ### config.includeStack
   *
   * User configurable property, influences whether stack trace
   * is included in Assertion error message. Default of false
   * suppresses stack trace in the error message.
   *
   *     chai.config.includeStack = true;  // enable stack on error
   *
   * @param {Boolean}
   * @api public
   */

   includeStack: false,

  /**
   * ### config.showDiff
   *
   * User configurable property, influences whether or not
   * the `showDiff` flag should be included in the thrown
   * AssertionErrors. `false` will always be `false`; `true`
   * will be true when the assertion has requested a diff
   * be shown.
   *
   * @param {Boolean}
   * @api public
   */

  showDiff: true,

  /**
   * ### config.truncateThreshold
   *
   * User configurable property, sets length threshold for actual and
   * expected values in assertion errors. If this threshold is exceeded,
   * the value is truncated.
   *
   * Set it to zero if you want to disable truncating altogether.
   *
   *     chai.config.truncateThreshold = 0;  // disable truncating
   *
   * @param {Number}
   * @api public
   */

  truncateThreshold: 40

};

},{}],8:[function(require,module,exports){
/*!
 * chai
 * http://chaijs.com
 * Copyright(c) 2011-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

module.exports = function (chai, _) {
  var Assertion = chai.Assertion
    , toString = Object.prototype.toString
    , flag = _.flag;

  /**
   * ### Language Chains
   *
   * The following are provided as chainable getters to
   * improve the readability of your assertions. They
   * do not provide testing capabilities unless they
   * have been overwritten by a plugin.
   *
   * **Chains**
   *
   * - to
   * - be
   * - been
   * - is
   * - that
   * - and
   * - has
   * - have
   * - with
   * - at
   * - of
   * - same
   *
   * @name language chains
   * @api public
   */

  [ 'to', 'be', 'been'
  , 'is', 'and', 'has', 'have'
  , 'with', 'that', 'at'
  , 'of', 'same' ].forEach(function (chain) {
    Assertion.addProperty(chain, function () {
      return this;
    });
  });

  /**
   * ### .not
   *
   * Negates any of assertions following in the chain.
   *
   *     expect(foo).to.not.equal('bar');
   *     expect(goodFn).to.not.throw(Error);
   *     expect({ foo: 'baz' }).to.have.property('foo')
   *       .and.not.equal('bar');
   *
   * @name not
   * @api public
   */

  Assertion.addProperty('not', function () {
    flag(this, 'negate', true);
  });

  /**
   * ### .deep
   *
   * Sets the `deep` flag, later used by the `equal` and
   * `property` assertions.
   *
   *     expect(foo).to.deep.equal({ bar: 'baz' });
   *     expect({ foo: { bar: { baz: 'quux' } } })
   *       .to.have.deep.property('foo.bar.baz', 'quux');
   *
   * @name deep
   * @api public
   */

  Assertion.addProperty('deep', function () {
    flag(this, 'deep', true);
  });

  /**
   * ### .a(type)
   *
   * The `a` and `an` assertions are aliases that can be
   * used either as language chains or to assert a value's
   * type.
   *
   *     // typeof
   *     expect('test').to.be.a('string');
   *     expect({ foo: 'bar' }).to.be.an('object');
   *     expect(null).to.be.a('null');
   *     expect(undefined).to.be.an('undefined');
   *
   *     // language chain
   *     expect(foo).to.be.an.instanceof(Foo);
   *
   * @name a
   * @alias an
   * @param {String} type
   * @param {String} message _optional_
   * @api public
   */

  function an (type, msg) {
    if (msg) flag(this, 'message', msg);
    type = type.toLowerCase();
    var obj = flag(this, 'object')
      , article = ~[ 'a', 'e', 'i', 'o', 'u' ].indexOf(type.charAt(0)) ? 'an ' : 'a ';

    this.assert(
        type === _.type(obj)
      , 'expected #{this} to be ' + article + type
      , 'expected #{this} not to be ' + article + type
    );
  }

  Assertion.addChainableMethod('an', an);
  Assertion.addChainableMethod('a', an);

  /**
   * ### .include(value)
   *
   * The `include` and `contain` assertions can be used as either property
   * based language chains or as methods to assert the inclusion of an object
   * in an array or a substring in a string. When used as language chains,
   * they toggle the `contain` flag for the `keys` assertion.
   *
   *     expect([1,2,3]).to.include(2);
   *     expect('foobar').to.contain('foo');
   *     expect({ foo: 'bar', hello: 'universe' }).to.include.keys('foo');
   *
   * @name include
   * @alias contain
   * @param {Object|String|Number} obj
   * @param {String} message _optional_
   * @api public
   */

  function includeChainingBehavior () {
    flag(this, 'contains', true);
  }

  function include (val, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    var expected = false;
    if (_.type(obj) === 'array' && _.type(val) === 'object') {
      for (var i in obj) {
        if (_.eql(obj[i], val)) {
          expected = true;
          break;
        }
      }
    } else if (_.type(val) === 'object') {
      if (!flag(this, 'negate')) {
        for (var k in val) new Assertion(obj).property(k, val[k]);
        return;
      }
      var subset = {}
      for (var k in val) subset[k] = obj[k]
      expected = _.eql(subset, val);
    } else {
      expected = obj && ~obj.indexOf(val)
    }
    this.assert(
        expected
      , 'expected #{this} to include ' + _.inspect(val)
      , 'expected #{this} to not include ' + _.inspect(val));
  }

  Assertion.addChainableMethod('include', include, includeChainingBehavior);
  Assertion.addChainableMethod('contain', include, includeChainingBehavior);

  /**
   * ### .ok
   *
   * Asserts that the target is truthy.
   *
   *     expect('everthing').to.be.ok;
   *     expect(1).to.be.ok;
   *     expect(false).to.not.be.ok;
   *     expect(undefined).to.not.be.ok;
   *     expect(null).to.not.be.ok;
   *
   * @name ok
   * @api public
   */

  Assertion.addProperty('ok', function () {
    this.assert(
        flag(this, 'object')
      , 'expected #{this} to be truthy'
      , 'expected #{this} to be falsy');
  });

  /**
   * ### .true
   *
   * Asserts that the target is `true`.
   *
   *     expect(true).to.be.true;
   *     expect(1).to.not.be.true;
   *
   * @name true
   * @api public
   */

  Assertion.addProperty('true', function () {
    this.assert(
        true === flag(this, 'object')
      , 'expected #{this} to be true'
      , 'expected #{this} to be false'
      , this.negate ? false : true
    );
  });

  /**
   * ### .false
   *
   * Asserts that the target is `false`.
   *
   *     expect(false).to.be.false;
   *     expect(0).to.not.be.false;
   *
   * @name false
   * @api public
   */

  Assertion.addProperty('false', function () {
    this.assert(
        false === flag(this, 'object')
      , 'expected #{this} to be false'
      , 'expected #{this} to be true'
      , this.negate ? true : false
    );
  });

  /**
   * ### .null
   *
   * Asserts that the target is `null`.
   *
   *     expect(null).to.be.null;
   *     expect(undefined).not.to.be.null;
   *
   * @name null
   * @api public
   */

  Assertion.addProperty('null', function () {
    this.assert(
        null === flag(this, 'object')
      , 'expected #{this} to be null'
      , 'expected #{this} not to be null'
    );
  });

  /**
   * ### .undefined
   *
   * Asserts that the target is `undefined`.
   *
   *     expect(undefined).to.be.undefined;
   *     expect(null).to.not.be.undefined;
   *
   * @name undefined
   * @api public
   */

  Assertion.addProperty('undefined', function () {
    this.assert(
        undefined === flag(this, 'object')
      , 'expected #{this} to be undefined'
      , 'expected #{this} not to be undefined'
    );
  });

  /**
   * ### .exist
   *
   * Asserts that the target is neither `null` nor `undefined`.
   *
   *     var foo = 'hi'
   *       , bar = null
   *       , baz;
   *
   *     expect(foo).to.exist;
   *     expect(bar).to.not.exist;
   *     expect(baz).to.not.exist;
   *
   * @name exist
   * @api public
   */

  Assertion.addProperty('exist', function () {
    this.assert(
        null != flag(this, 'object')
      , 'expected #{this} to exist'
      , 'expected #{this} to not exist'
    );
  });


  /**
   * ### .empty
   *
   * Asserts that the target's length is `0`. For arrays, it checks
   * the `length` property. For objects, it gets the count of
   * enumerable keys.
   *
   *     expect([]).to.be.empty;
   *     expect('').to.be.empty;
   *     expect({}).to.be.empty;
   *
   * @name empty
   * @api public
   */

  Assertion.addProperty('empty', function () {
    var obj = flag(this, 'object')
      , expected = obj;

    if (Array.isArray(obj) || 'string' === typeof object) {
      expected = obj.length;
    } else if (typeof obj === 'object') {
      expected = Object.keys(obj).length;
    }

    this.assert(
        !expected
      , 'expected #{this} to be empty'
      , 'expected #{this} not to be empty'
    );
  });

  /**
   * ### .arguments
   *
   * Asserts that the target is an arguments object.
   *
   *     function test () {
   *       expect(arguments).to.be.arguments;
   *     }
   *
   * @name arguments
   * @alias Arguments
   * @api public
   */

  function checkArguments () {
    var obj = flag(this, 'object')
      , type = Object.prototype.toString.call(obj);
    this.assert(
        '[object Arguments]' === type
      , 'expected #{this} to be arguments but got ' + type
      , 'expected #{this} to not be arguments'
    );
  }

  Assertion.addProperty('arguments', checkArguments);
  Assertion.addProperty('Arguments', checkArguments);

  /**
   * ### .equal(value)
   *
   * Asserts that the target is strictly equal (`===`) to `value`.
   * Alternately, if the `deep` flag is set, asserts that
   * the target is deeply equal to `value`.
   *
   *     expect('hello').to.equal('hello');
   *     expect(42).to.equal(42);
   *     expect(1).to.not.equal(true);
   *     expect({ foo: 'bar' }).to.not.equal({ foo: 'bar' });
   *     expect({ foo: 'bar' }).to.deep.equal({ foo: 'bar' });
   *
   * @name equal
   * @alias equals
   * @alias eq
   * @alias deep.equal
   * @param {Mixed} value
   * @param {String} message _optional_
   * @api public
   */

  function assertEqual (val, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    if (flag(this, 'deep')) {
      return this.eql(val);
    } else {
      this.assert(
          val === obj
        , 'expected #{this} to equal #{exp}'
        , 'expected #{this} to not equal #{exp}'
        , val
        , this._obj
        , true
      );
    }
  }

  Assertion.addMethod('equal', assertEqual);
  Assertion.addMethod('equals', assertEqual);
  Assertion.addMethod('eq', assertEqual);

  /**
   * ### .eql(value)
   *
   * Asserts that the target is deeply equal to `value`.
   *
   *     expect({ foo: 'bar' }).to.eql({ foo: 'bar' });
   *     expect([ 1, 2, 3 ]).to.eql([ 1, 2, 3 ]);
   *
   * @name eql
   * @alias eqls
   * @param {Mixed} value
   * @param {String} message _optional_
   * @api public
   */

  function assertEql(obj, msg) {
    if (msg) flag(this, 'message', msg);
    this.assert(
        _.eql(obj, flag(this, 'object'))
      , 'expected #{this} to deeply equal #{exp}'
      , 'expected #{this} to not deeply equal #{exp}'
      , obj
      , this._obj
      , true
    );
  }

  Assertion.addMethod('eql', assertEql);
  Assertion.addMethod('eqls', assertEql);

  /**
   * ### .above(value)
   *
   * Asserts that the target is greater than `value`.
   *
   *     expect(10).to.be.above(5);
   *
   * Can also be used in conjunction with `length` to
   * assert a minimum length. The benefit being a
   * more informative error message than if the length
   * was supplied directly.
   *
   *     expect('foo').to.have.length.above(2);
   *     expect([ 1, 2, 3 ]).to.have.length.above(2);
   *
   * @name above
   * @alias gt
   * @alias greaterThan
   * @param {Number} value
   * @param {String} message _optional_
   * @api public
   */

  function assertAbove (n, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    if (flag(this, 'doLength')) {
      new Assertion(obj, msg).to.have.property('length');
      var len = obj.length;
      this.assert(
          len > n
        , 'expected #{this} to have a length above #{exp} but got #{act}'
        , 'expected #{this} to not have a length above #{exp}'
        , n
        , len
      );
    } else {
      this.assert(
          obj > n
        , 'expected #{this} to be above ' + n
        , 'expected #{this} to be at most ' + n
      );
    }
  }

  Assertion.addMethod('above', assertAbove);
  Assertion.addMethod('gt', assertAbove);
  Assertion.addMethod('greaterThan', assertAbove);

  /**
   * ### .least(value)
   *
   * Asserts that the target is greater than or equal to `value`.
   *
   *     expect(10).to.be.at.least(10);
   *
   * Can also be used in conjunction with `length` to
   * assert a minimum length. The benefit being a
   * more informative error message than if the length
   * was supplied directly.
   *
   *     expect('foo').to.have.length.of.at.least(2);
   *     expect([ 1, 2, 3 ]).to.have.length.of.at.least(3);
   *
   * @name least
   * @alias gte
   * @param {Number} value
   * @param {String} message _optional_
   * @api public
   */

  function assertLeast (n, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    if (flag(this, 'doLength')) {
      new Assertion(obj, msg).to.have.property('length');
      var len = obj.length;
      this.assert(
          len >= n
        , 'expected #{this} to have a length at least #{exp} but got #{act}'
        , 'expected #{this} to have a length below #{exp}'
        , n
        , len
      );
    } else {
      this.assert(
          obj >= n
        , 'expected #{this} to be at least ' + n
        , 'expected #{this} to be below ' + n
      );
    }
  }

  Assertion.addMethod('least', assertLeast);
  Assertion.addMethod('gte', assertLeast);

  /**
   * ### .below(value)
   *
   * Asserts that the target is less than `value`.
   *
   *     expect(5).to.be.below(10);
   *
   * Can also be used in conjunction with `length` to
   * assert a maximum length. The benefit being a
   * more informative error message than if the length
   * was supplied directly.
   *
   *     expect('foo').to.have.length.below(4);
   *     expect([ 1, 2, 3 ]).to.have.length.below(4);
   *
   * @name below
   * @alias lt
   * @alias lessThan
   * @param {Number} value
   * @param {String} message _optional_
   * @api public
   */

  function assertBelow (n, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    if (flag(this, 'doLength')) {
      new Assertion(obj, msg).to.have.property('length');
      var len = obj.length;
      this.assert(
          len < n
        , 'expected #{this} to have a length below #{exp} but got #{act}'
        , 'expected #{this} to not have a length below #{exp}'
        , n
        , len
      );
    } else {
      this.assert(
          obj < n
        , 'expected #{this} to be below ' + n
        , 'expected #{this} to be at least ' + n
      );
    }
  }

  Assertion.addMethod('below', assertBelow);
  Assertion.addMethod('lt', assertBelow);
  Assertion.addMethod('lessThan', assertBelow);

  /**
   * ### .most(value)
   *
   * Asserts that the target is less than or equal to `value`.
   *
   *     expect(5).to.be.at.most(5);
   *
   * Can also be used in conjunction with `length` to
   * assert a maximum length. The benefit being a
   * more informative error message than if the length
   * was supplied directly.
   *
   *     expect('foo').to.have.length.of.at.most(4);
   *     expect([ 1, 2, 3 ]).to.have.length.of.at.most(3);
   *
   * @name most
   * @alias lte
   * @param {Number} value
   * @param {String} message _optional_
   * @api public
   */

  function assertMost (n, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    if (flag(this, 'doLength')) {
      new Assertion(obj, msg).to.have.property('length');
      var len = obj.length;
      this.assert(
          len <= n
        , 'expected #{this} to have a length at most #{exp} but got #{act}'
        , 'expected #{this} to have a length above #{exp}'
        , n
        , len
      );
    } else {
      this.assert(
          obj <= n
        , 'expected #{this} to be at most ' + n
        , 'expected #{this} to be above ' + n
      );
    }
  }

  Assertion.addMethod('most', assertMost);
  Assertion.addMethod('lte', assertMost);

  /**
   * ### .within(start, finish)
   *
   * Asserts that the target is within a range.
   *
   *     expect(7).to.be.within(5,10);
   *
   * Can also be used in conjunction with `length` to
   * assert a length range. The benefit being a
   * more informative error message than if the length
   * was supplied directly.
   *
   *     expect('foo').to.have.length.within(2,4);
   *     expect([ 1, 2, 3 ]).to.have.length.within(2,4);
   *
   * @name within
   * @param {Number} start lowerbound inclusive
   * @param {Number} finish upperbound inclusive
   * @param {String} message _optional_
   * @api public
   */

  Assertion.addMethod('within', function (start, finish, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object')
      , range = start + '..' + finish;
    if (flag(this, 'doLength')) {
      new Assertion(obj, msg).to.have.property('length');
      var len = obj.length;
      this.assert(
          len >= start && len <= finish
        , 'expected #{this} to have a length within ' + range
        , 'expected #{this} to not have a length within ' + range
      );
    } else {
      this.assert(
          obj >= start && obj <= finish
        , 'expected #{this} to be within ' + range
        , 'expected #{this} to not be within ' + range
      );
    }
  });

  /**
   * ### .instanceof(constructor)
   *
   * Asserts that the target is an instance of `constructor`.
   *
   *     var Tea = function (name) { this.name = name; }
   *       , Chai = new Tea('chai');
   *
   *     expect(Chai).to.be.an.instanceof(Tea);
   *     expect([ 1, 2, 3 ]).to.be.instanceof(Array);
   *
   * @name instanceof
   * @param {Constructor} constructor
   * @param {String} message _optional_
   * @alias instanceOf
   * @api public
   */

  function assertInstanceOf (constructor, msg) {
    if (msg) flag(this, 'message', msg);
    var name = _.getName(constructor);
    this.assert(
        flag(this, 'object') instanceof constructor
      , 'expected #{this} to be an instance of ' + name
      , 'expected #{this} to not be an instance of ' + name
    );
  };

  Assertion.addMethod('instanceof', assertInstanceOf);
  Assertion.addMethod('instanceOf', assertInstanceOf);

  /**
   * ### .property(name, [value])
   *
   * Asserts that the target has a property `name`, optionally asserting that
   * the value of that property is strictly equal to  `value`.
   * If the `deep` flag is set, you can use dot- and bracket-notation for deep
   * references into objects and arrays.
   *
   *     // simple referencing
   *     var obj = { foo: 'bar' };
   *     expect(obj).to.have.property('foo');
   *     expect(obj).to.have.property('foo', 'bar');
   *
   *     // deep referencing
   *     var deepObj = {
   *         green: { tea: 'matcha' }
   *       , teas: [ 'chai', 'matcha', { tea: 'konacha' } ]
   *     };

   *     expect(deepObj).to.have.deep.property('green.tea', 'matcha');
   *     expect(deepObj).to.have.deep.property('teas[1]', 'matcha');
   *     expect(deepObj).to.have.deep.property('teas[2].tea', 'konacha');
   *
   * You can also use an array as the starting point of a `deep.property`
   * assertion, or traverse nested arrays.
   *
   *     var arr = [
   *         [ 'chai', 'matcha', 'konacha' ]
   *       , [ { tea: 'chai' }
   *         , { tea: 'matcha' }
   *         , { tea: 'konacha' } ]
   *     ];
   *
   *     expect(arr).to.have.deep.property('[0][1]', 'matcha');
   *     expect(arr).to.have.deep.property('[1][2].tea', 'konacha');
   *
   * Furthermore, `property` changes the subject of the assertion
   * to be the value of that property from the original object. This
   * permits for further chainable assertions on that property.
   *
   *     expect(obj).to.have.property('foo')
   *       .that.is.a('string');
   *     expect(deepObj).to.have.property('green')
   *       .that.is.an('object')
   *       .that.deep.equals({ tea: 'matcha' });
   *     expect(deepObj).to.have.property('teas')
   *       .that.is.an('array')
   *       .with.deep.property('[2]')
   *         .that.deep.equals({ tea: 'konacha' });
   *
   * @name property
   * @alias deep.property
   * @param {String} name
   * @param {Mixed} value (optional)
   * @param {String} message _optional_
   * @returns value of property for chaining
   * @api public
   */

  Assertion.addMethod('property', function (name, val, msg) {
    if (msg) flag(this, 'message', msg);

    var descriptor = flag(this, 'deep') ? 'deep property ' : 'property '
      , negate = flag(this, 'negate')
      , obj = flag(this, 'object')
      , value = flag(this, 'deep')
        ? _.getPathValue(name, obj)
        : obj[name];

    if (negate && undefined !== val) {
      if (undefined === value) {
        msg = (msg != null) ? msg + ': ' : '';
        throw new Error(msg + _.inspect(obj) + ' has no ' + descriptor + _.inspect(name));
      }
    } else {
      this.assert(
          undefined !== value
        , 'expected #{this} to have a ' + descriptor + _.inspect(name)
        , 'expected #{this} to not have ' + descriptor + _.inspect(name));
    }

    if (undefined !== val) {
      this.assert(
          val === value
        , 'expected #{this} to have a ' + descriptor + _.inspect(name) + ' of #{exp}, but got #{act}'
        , 'expected #{this} to not have a ' + descriptor + _.inspect(name) + ' of #{act}'
        , val
        , value
      );
    }

    flag(this, 'object', value);
  });


  /**
   * ### .ownProperty(name)
   *
   * Asserts that the target has an own property `name`.
   *
   *     expect('test').to.have.ownProperty('length');
   *
   * @name ownProperty
   * @alias haveOwnProperty
   * @param {String} name
   * @param {String} message _optional_
   * @api public
   */

  function assertOwnProperty (name, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    this.assert(
        obj.hasOwnProperty(name)
      , 'expected #{this} to have own property ' + _.inspect(name)
      , 'expected #{this} to not have own property ' + _.inspect(name)
    );
  }

  Assertion.addMethod('ownProperty', assertOwnProperty);
  Assertion.addMethod('haveOwnProperty', assertOwnProperty);

  /**
   * ### .length(value)
   *
   * Asserts that the target's `length` property has
   * the expected value.
   *
   *     expect([ 1, 2, 3]).to.have.length(3);
   *     expect('foobar').to.have.length(6);
   *
   * Can also be used as a chain precursor to a value
   * comparison for the length property.
   *
   *     expect('foo').to.have.length.above(2);
   *     expect([ 1, 2, 3 ]).to.have.length.above(2);
   *     expect('foo').to.have.length.below(4);
   *     expect([ 1, 2, 3 ]).to.have.length.below(4);
   *     expect('foo').to.have.length.within(2,4);
   *     expect([ 1, 2, 3 ]).to.have.length.within(2,4);
   *
   * @name length
   * @alias lengthOf
   * @param {Number} length
   * @param {String} message _optional_
   * @api public
   */

  function assertLengthChain () {
    flag(this, 'doLength', true);
  }

  function assertLength (n, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    new Assertion(obj, msg).to.have.property('length');
    var len = obj.length;

    this.assert(
        len == n
      , 'expected #{this} to have a length of #{exp} but got #{act}'
      , 'expected #{this} to not have a length of #{act}'
      , n
      , len
    );
  }

  Assertion.addChainableMethod('length', assertLength, assertLengthChain);
  Assertion.addMethod('lengthOf', assertLength, assertLengthChain);

  /**
   * ### .match(regexp)
   *
   * Asserts that the target matches a regular expression.
   *
   *     expect('foobar').to.match(/^foo/);
   *
   * @name match
   * @param {RegExp} RegularExpression
   * @param {String} message _optional_
   * @api public
   */

  Assertion.addMethod('match', function (re, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    this.assert(
        re.exec(obj)
      , 'expected #{this} to match ' + re
      , 'expected #{this} not to match ' + re
    );
  });

  /**
   * ### .string(string)
   *
   * Asserts that the string target contains another string.
   *
   *     expect('foobar').to.have.string('bar');
   *
   * @name string
   * @param {String} string
   * @param {String} message _optional_
   * @api public
   */

  Assertion.addMethod('string', function (str, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    new Assertion(obj, msg).is.a('string');

    this.assert(
        ~obj.indexOf(str)
      , 'expected #{this} to contain ' + _.inspect(str)
      , 'expected #{this} to not contain ' + _.inspect(str)
    );
  });


  /**
   * ### .keys(key1, [key2], [...])
   *
   * Asserts that the target has exactly the given keys, or
   * asserts the inclusion of some keys when using the
   * `include` or `contain` modifiers.
   *
   *     expect({ foo: 1, bar: 2 }).to.have.keys(['foo', 'bar']);
   *     expect({ foo: 1, bar: 2, baz: 3 }).to.contain.keys('foo', 'bar');
   *
   * @name keys
   * @alias key
   * @param {String...|Array} keys
   * @api public
   */

  function assertKeys (keys) {
    var obj = flag(this, 'object')
      , str
      , ok = true;

    keys = keys instanceof Array
      ? keys
      : Array.prototype.slice.call(arguments);

    if (!keys.length) throw new Error('keys required');

    var actual = Object.keys(obj)
      , len = keys.length;

    // Inclusion
    ok = keys.every(function(key){
      return ~actual.indexOf(key);
    });

    // Strict
    if (!flag(this, 'negate') && !flag(this, 'contains')) {
      ok = ok && keys.length == actual.length;
    }

    // Key string
    if (len > 1) {
      keys = keys.map(function(key){
        return _.inspect(key);
      });
      var last = keys.pop();
      str = keys.join(', ') + ', and ' + last;
    } else {
      str = _.inspect(keys[0]);
    }

    // Form
    str = (len > 1 ? 'keys ' : 'key ') + str;

    // Have / include
    str = (flag(this, 'contains') ? 'contain ' : 'have ') + str;

    // Assertion
    this.assert(
        ok
      , 'expected #{this} to ' + str
      , 'expected #{this} to not ' + str
    );
  }

  Assertion.addMethod('keys', assertKeys);
  Assertion.addMethod('key', assertKeys);

  /**
   * ### .throw(constructor)
   *
   * Asserts that the function target will throw a specific error, or specific type of error
   * (as determined using `instanceof`), optionally with a RegExp or string inclusion test
   * for the error's message.
   *
   *     var err = new ReferenceError('This is a bad function.');
   *     var fn = function () { throw err; }
   *     expect(fn).to.throw(ReferenceError);
   *     expect(fn).to.throw(Error);
   *     expect(fn).to.throw(/bad function/);
   *     expect(fn).to.not.throw('good function');
   *     expect(fn).to.throw(ReferenceError, /bad function/);
   *     expect(fn).to.throw(err);
   *     expect(fn).to.not.throw(new RangeError('Out of range.'));
   *
   * Please note that when a throw expectation is negated, it will check each
   * parameter independently, starting with error constructor type. The appropriate way
   * to check for the existence of a type of error but for a message that does not match
   * is to use `and`.
   *
   *     expect(fn).to.throw(ReferenceError)
   *        .and.not.throw(/good function/);
   *
   * @name throw
   * @alias throws
   * @alias Throw
   * @param {ErrorConstructor} constructor
   * @param {String|RegExp} expected error message
   * @param {String} message _optional_
   * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error#Error_types
   * @returns error for chaining (null if no error)
   * @api public
   */

  function assertThrows (constructor, errMsg, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    new Assertion(obj, msg).is.a('function');

    var thrown = false
      , desiredError = null
      , name = null
      , thrownError = null;

    if (arguments.length === 0) {
      errMsg = null;
      constructor = null;
    } else if (constructor && (constructor instanceof RegExp || 'string' === typeof constructor)) {
      errMsg = constructor;
      constructor = null;
    } else if (constructor && constructor instanceof Error) {
      desiredError = constructor;
      constructor = null;
      errMsg = null;
    } else if (typeof constructor === 'function') {
      name = constructor.prototype.name || constructor.name;
      if (name === 'Error' && constructor !== Error) {
        name = (new constructor()).name;
      }
    } else {
      constructor = null;
    }

    try {
      obj();
    } catch (err) {
      // first, check desired error
      if (desiredError) {
        this.assert(
            err === desiredError
          , 'expected #{this} to throw #{exp} but #{act} was thrown'
          , 'expected #{this} to not throw #{exp}'
          , (desiredError instanceof Error ? desiredError.toString() : desiredError)
          , (err instanceof Error ? err.toString() : err)
        );

        flag(this, 'object', err);
        return this;
      }

      // next, check constructor
      if (constructor) {
        this.assert(
            err instanceof constructor
          , 'expected #{this} to throw #{exp} but #{act} was thrown'
          , 'expected #{this} to not throw #{exp} but #{act} was thrown'
          , name
          , (err instanceof Error ? err.toString() : err)
        );

        if (!errMsg) {
          flag(this, 'object', err);
          return this;
        }
      }

      // next, check message
      var message = 'object' === _.type(err) && "message" in err
        ? err.message
        : '' + err;

      if ((message != null) && errMsg && errMsg instanceof RegExp) {
        this.assert(
            errMsg.exec(message)
          , 'expected #{this} to throw error matching #{exp} but got #{act}'
          , 'expected #{this} to throw error not matching #{exp}'
          , errMsg
          , message
        );

        flag(this, 'object', err);
        return this;
      } else if ((message != null) && errMsg && 'string' === typeof errMsg) {
        this.assert(
            ~message.indexOf(errMsg)
          , 'expected #{this} to throw error including #{exp} but got #{act}'
          , 'expected #{this} to throw error not including #{act}'
          , errMsg
          , message
        );

        flag(this, 'object', err);
        return this;
      } else {
        thrown = true;
        thrownError = err;
      }
    }

    var actuallyGot = ''
      , expectedThrown = name !== null
        ? name
        : desiredError
          ? '#{exp}' //_.inspect(desiredError)
          : 'an error';

    if (thrown) {
      actuallyGot = ' but #{act} was thrown'
    }

    this.assert(
        thrown === true
      , 'expected #{this} to throw ' + expectedThrown + actuallyGot
      , 'expected #{this} to not throw ' + expectedThrown + actuallyGot
      , (desiredError instanceof Error ? desiredError.toString() : desiredError)
      , (thrownError instanceof Error ? thrownError.toString() : thrownError)
    );

    flag(this, 'object', thrownError);
  };

  Assertion.addMethod('throw', assertThrows);
  Assertion.addMethod('throws', assertThrows);
  Assertion.addMethod('Throw', assertThrows);

  /**
   * ### .respondTo(method)
   *
   * Asserts that the object or class target will respond to a method.
   *
   *     Klass.prototype.bar = function(){};
   *     expect(Klass).to.respondTo('bar');
   *     expect(obj).to.respondTo('bar');
   *
   * To check if a constructor will respond to a static function,
   * set the `itself` flag.
   *
   *     Klass.baz = function(){};
   *     expect(Klass).itself.to.respondTo('baz');
   *
   * @name respondTo
   * @param {String} method
   * @param {String} message _optional_
   * @api public
   */

  Assertion.addMethod('respondTo', function (method, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object')
      , itself = flag(this, 'itself')
      , context = ('function' === _.type(obj) && !itself)
        ? obj.prototype[method]
        : obj[method];

    this.assert(
        'function' === typeof context
      , 'expected #{this} to respond to ' + _.inspect(method)
      , 'expected #{this} to not respond to ' + _.inspect(method)
    );
  });

  /**
   * ### .itself
   *
   * Sets the `itself` flag, later used by the `respondTo` assertion.
   *
   *     function Foo() {}
   *     Foo.bar = function() {}
   *     Foo.prototype.baz = function() {}
   *
   *     expect(Foo).itself.to.respondTo('bar');
   *     expect(Foo).itself.not.to.respondTo('baz');
   *
   * @name itself
   * @api public
   */

  Assertion.addProperty('itself', function () {
    flag(this, 'itself', true);
  });

  /**
   * ### .satisfy(method)
   *
   * Asserts that the target passes a given truth test.
   *
   *     expect(1).to.satisfy(function(num) { return num > 0; });
   *
   * @name satisfy
   * @param {Function} matcher
   * @param {String} message _optional_
   * @api public
   */

  Assertion.addMethod('satisfy', function (matcher, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    this.assert(
        matcher(obj)
      , 'expected #{this} to satisfy ' + _.objDisplay(matcher)
      , 'expected #{this} to not satisfy' + _.objDisplay(matcher)
      , this.negate ? false : true
      , matcher(obj)
    );
  });

  /**
   * ### .closeTo(expected, delta)
   *
   * Asserts that the target is equal `expected`, to within a +/- `delta` range.
   *
   *     expect(1.5).to.be.closeTo(1, 0.5);
   *
   * @name closeTo
   * @param {Number} expected
   * @param {Number} delta
   * @param {String} message _optional_
   * @api public
   */

  Assertion.addMethod('closeTo', function (expected, delta, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    this.assert(
        Math.abs(obj - expected) <= delta
      , 'expected #{this} to be close to ' + expected + ' +/- ' + delta
      , 'expected #{this} not to be close to ' + expected + ' +/- ' + delta
    );
  });

  function isSubsetOf(subset, superset, cmp) {
    return subset.every(function(elem) {
      if (!cmp) return superset.indexOf(elem) !== -1;

      return superset.some(function(elem2) {
        return cmp(elem, elem2);
      });
    })
  }

  /**
   * ### .members(set)
   *
   * Asserts that the target is a superset of `set`,
   * or that the target and `set` have the same strictly-equal (===) members.
   * Alternately, if the `deep` flag is set, set members are compared for deep
   * equality.
   *
   *     expect([1, 2, 3]).to.include.members([3, 2]);
   *     expect([1, 2, 3]).to.not.include.members([3, 2, 8]);
   *
   *     expect([4, 2]).to.have.members([2, 4]);
   *     expect([5, 2]).to.not.have.members([5, 2, 1]);
   *
   *     expect([{ id: 1 }]).to.deep.include.members([{ id: 1 }]);
   *
   * @name members
   * @param {Array} set
   * @param {String} message _optional_
   * @api public
   */

  Assertion.addMethod('members', function (subset, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');

    new Assertion(obj).to.be.an('array');
    new Assertion(subset).to.be.an('array');

    var cmp = flag(this, 'deep') ? _.eql : undefined;

    if (flag(this, 'contains')) {
      return this.assert(
          isSubsetOf(subset, obj, cmp)
        , 'expected #{this} to be a superset of #{act}'
        , 'expected #{this} to not be a superset of #{act}'
        , obj
        , subset
      );
    }

    this.assert(
        isSubsetOf(obj, subset, cmp) && isSubsetOf(subset, obj, cmp)
        , 'expected #{this} to have the same members as #{act}'
        , 'expected #{this} to not have the same members as #{act}'
        , obj
        , subset
    );
  });
};

},{}],9:[function(require,module,exports){
/*!
 * chai
 * Copyright(c) 2011-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */


module.exports = function (chai, util) {

  /*!
   * Chai dependencies.
   */

  var Assertion = chai.Assertion
    , flag = util.flag;

  /*!
   * Module export.
   */

  /**
   * ### assert(expression, message)
   *
   * Write your own test expressions.
   *
   *     assert('foo' !== 'bar', 'foo is not bar');
   *     assert(Array.isArray([]), 'empty arrays are arrays');
   *
   * @param {Mixed} expression to test for truthiness
   * @param {String} message to display on error
   * @name assert
   * @api public
   */

  var assert = chai.assert = function (express, errmsg) {
    var test = new Assertion(null, null, chai.assert);
    test.assert(
        express
      , errmsg
      , '[ negation message unavailable ]'
    );
  };

  /**
   * ### .fail(actual, expected, [message], [operator])
   *
   * Throw a failure. Node.js `assert` module-compatible.
   *
   * @name fail
   * @param {Mixed} actual
   * @param {Mixed} expected
   * @param {String} message
   * @param {String} operator
   * @api public
   */

  assert.fail = function (actual, expected, message, operator) {
    message = message || 'assert.fail()';
    throw new chai.AssertionError(message, {
        actual: actual
      , expected: expected
      , operator: operator
    }, assert.fail);
  };

  /**
   * ### .ok(object, [message])
   *
   * Asserts that `object` is truthy.
   *
   *     assert.ok('everything', 'everything is ok');
   *     assert.ok(false, 'this will fail');
   *
   * @name ok
   * @param {Mixed} object to test
   * @param {String} message
   * @api public
   */

  assert.ok = function (val, msg) {
    new Assertion(val, msg).is.ok;
  };

  /**
   * ### .notOk(object, [message])
   *
   * Asserts that `object` is falsy.
   *
   *     assert.notOk('everything', 'this will fail');
   *     assert.notOk(false, 'this will pass');
   *
   * @name notOk
   * @param {Mixed} object to test
   * @param {String} message
   * @api public
   */

  assert.notOk = function (val, msg) {
    new Assertion(val, msg).is.not.ok;
  };

  /**
   * ### .equal(actual, expected, [message])
   *
   * Asserts non-strict equality (`==`) of `actual` and `expected`.
   *
   *     assert.equal(3, '3', '== coerces values to strings');
   *
   * @name equal
   * @param {Mixed} actual
   * @param {Mixed} expected
   * @param {String} message
   * @api public
   */

  assert.equal = function (act, exp, msg) {
    var test = new Assertion(act, msg, assert.equal);

    test.assert(
        exp == flag(test, 'object')
      , 'expected #{this} to equal #{exp}'
      , 'expected #{this} to not equal #{act}'
      , exp
      , act
    );
  };

  /**
   * ### .notEqual(actual, expected, [message])
   *
   * Asserts non-strict inequality (`!=`) of `actual` and `expected`.
   *
   *     assert.notEqual(3, 4, 'these numbers are not equal');
   *
   * @name notEqual
   * @param {Mixed} actual
   * @param {Mixed} expected
   * @param {String} message
   * @api public
   */

  assert.notEqual = function (act, exp, msg) {
    var test = new Assertion(act, msg, assert.notEqual);

    test.assert(
        exp != flag(test, 'object')
      , 'expected #{this} to not equal #{exp}'
      , 'expected #{this} to equal #{act}'
      , exp
      , act
    );
  };

  /**
   * ### .strictEqual(actual, expected, [message])
   *
   * Asserts strict equality (`===`) of `actual` and `expected`.
   *
   *     assert.strictEqual(true, true, 'these booleans are strictly equal');
   *
   * @name strictEqual
   * @param {Mixed} actual
   * @param {Mixed} expected
   * @param {String} message
   * @api public
   */

  assert.strictEqual = function (act, exp, msg) {
    new Assertion(act, msg).to.equal(exp);
  };

  /**
   * ### .notStrictEqual(actual, expected, [message])
   *
   * Asserts strict inequality (`!==`) of `actual` and `expected`.
   *
   *     assert.notStrictEqual(3, '3', 'no coercion for strict equality');
   *
   * @name notStrictEqual
   * @param {Mixed} actual
   * @param {Mixed} expected
   * @param {String} message
   * @api public
   */

  assert.notStrictEqual = function (act, exp, msg) {
    new Assertion(act, msg).to.not.equal(exp);
  };

  /**
   * ### .deepEqual(actual, expected, [message])
   *
   * Asserts that `actual` is deeply equal to `expected`.
   *
   *     assert.deepEqual({ tea: 'green' }, { tea: 'green' });
   *
   * @name deepEqual
   * @param {Mixed} actual
   * @param {Mixed} expected
   * @param {String} message
   * @api public
   */

  assert.deepEqual = function (act, exp, msg) {
    new Assertion(act, msg).to.eql(exp);
  };

  /**
   * ### .notDeepEqual(actual, expected, [message])
   *
   * Assert that `actual` is not deeply equal to `expected`.
   *
   *     assert.notDeepEqual({ tea: 'green' }, { tea: 'jasmine' });
   *
   * @name notDeepEqual
   * @param {Mixed} actual
   * @param {Mixed} expected
   * @param {String} message
   * @api public
   */

  assert.notDeepEqual = function (act, exp, msg) {
    new Assertion(act, msg).to.not.eql(exp);
  };

  /**
   * ### .isTrue(value, [message])
   *
   * Asserts that `value` is true.
   *
   *     var teaServed = true;
   *     assert.isTrue(teaServed, 'the tea has been served');
   *
   * @name isTrue
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isTrue = function (val, msg) {
    new Assertion(val, msg).is['true'];
  };

  /**
   * ### .isFalse(value, [message])
   *
   * Asserts that `value` is false.
   *
   *     var teaServed = false;
   *     assert.isFalse(teaServed, 'no tea yet? hmm...');
   *
   * @name isFalse
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isFalse = function (val, msg) {
    new Assertion(val, msg).is['false'];
  };

  /**
   * ### .isNull(value, [message])
   *
   * Asserts that `value` is null.
   *
   *     assert.isNull(err, 'there was no error');
   *
   * @name isNull
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isNull = function (val, msg) {
    new Assertion(val, msg).to.equal(null);
  };

  /**
   * ### .isNotNull(value, [message])
   *
   * Asserts that `value` is not null.
   *
   *     var tea = 'tasty chai';
   *     assert.isNotNull(tea, 'great, time for tea!');
   *
   * @name isNotNull
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isNotNull = function (val, msg) {
    new Assertion(val, msg).to.not.equal(null);
  };

  /**
   * ### .isUndefined(value, [message])
   *
   * Asserts that `value` is `undefined`.
   *
   *     var tea;
   *     assert.isUndefined(tea, 'no tea defined');
   *
   * @name isUndefined
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isUndefined = function (val, msg) {
    new Assertion(val, msg).to.equal(undefined);
  };

  /**
   * ### .isDefined(value, [message])
   *
   * Asserts that `value` is not `undefined`.
   *
   *     var tea = 'cup of chai';
   *     assert.isDefined(tea, 'tea has been defined');
   *
   * @name isDefined
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isDefined = function (val, msg) {
    new Assertion(val, msg).to.not.equal(undefined);
  };

  /**
   * ### .isFunction(value, [message])
   *
   * Asserts that `value` is a function.
   *
   *     function serveTea() { return 'cup of tea'; };
   *     assert.isFunction(serveTea, 'great, we can have tea now');
   *
   * @name isFunction
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isFunction = function (val, msg) {
    new Assertion(val, msg).to.be.a('function');
  };

  /**
   * ### .isNotFunction(value, [message])
   *
   * Asserts that `value` is _not_ a function.
   *
   *     var serveTea = [ 'heat', 'pour', 'sip' ];
   *     assert.isNotFunction(serveTea, 'great, we have listed the steps');
   *
   * @name isNotFunction
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isNotFunction = function (val, msg) {
    new Assertion(val, msg).to.not.be.a('function');
  };

  /**
   * ### .isObject(value, [message])
   *
   * Asserts that `value` is an object (as revealed by
   * `Object.prototype.toString`).
   *
   *     var selection = { name: 'Chai', serve: 'with spices' };
   *     assert.isObject(selection, 'tea selection is an object');
   *
   * @name isObject
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isObject = function (val, msg) {
    new Assertion(val, msg).to.be.a('object');
  };

  /**
   * ### .isNotObject(value, [message])
   *
   * Asserts that `value` is _not_ an object.
   *
   *     var selection = 'chai'
   *     assert.isNotObject(selection, 'tea selection is not an object');
   *     assert.isNotObject(null, 'null is not an object');
   *
   * @name isNotObject
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isNotObject = function (val, msg) {
    new Assertion(val, msg).to.not.be.a('object');
  };

  /**
   * ### .isArray(value, [message])
   *
   * Asserts that `value` is an array.
   *
   *     var menu = [ 'green', 'chai', 'oolong' ];
   *     assert.isArray(menu, 'what kind of tea do we want?');
   *
   * @name isArray
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isArray = function (val, msg) {
    new Assertion(val, msg).to.be.an('array');
  };

  /**
   * ### .isNotArray(value, [message])
   *
   * Asserts that `value` is _not_ an array.
   *
   *     var menu = 'green|chai|oolong';
   *     assert.isNotArray(menu, 'what kind of tea do we want?');
   *
   * @name isNotArray
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isNotArray = function (val, msg) {
    new Assertion(val, msg).to.not.be.an('array');
  };

  /**
   * ### .isString(value, [message])
   *
   * Asserts that `value` is a string.
   *
   *     var teaOrder = 'chai';
   *     assert.isString(teaOrder, 'order placed');
   *
   * @name isString
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isString = function (val, msg) {
    new Assertion(val, msg).to.be.a('string');
  };

  /**
   * ### .isNotString(value, [message])
   *
   * Asserts that `value` is _not_ a string.
   *
   *     var teaOrder = 4;
   *     assert.isNotString(teaOrder, 'order placed');
   *
   * @name isNotString
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isNotString = function (val, msg) {
    new Assertion(val, msg).to.not.be.a('string');
  };

  /**
   * ### .isNumber(value, [message])
   *
   * Asserts that `value` is a number.
   *
   *     var cups = 2;
   *     assert.isNumber(cups, 'how many cups');
   *
   * @name isNumber
   * @param {Number} value
   * @param {String} message
   * @api public
   */

  assert.isNumber = function (val, msg) {
    new Assertion(val, msg).to.be.a('number');
  };

  /**
   * ### .isNotNumber(value, [message])
   *
   * Asserts that `value` is _not_ a number.
   *
   *     var cups = '2 cups please';
   *     assert.isNotNumber(cups, 'how many cups');
   *
   * @name isNotNumber
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isNotNumber = function (val, msg) {
    new Assertion(val, msg).to.not.be.a('number');
  };

  /**
   * ### .isBoolean(value, [message])
   *
   * Asserts that `value` is a boolean.
   *
   *     var teaReady = true
   *       , teaServed = false;
   *
   *     assert.isBoolean(teaReady, 'is the tea ready');
   *     assert.isBoolean(teaServed, 'has tea been served');
   *
   * @name isBoolean
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isBoolean = function (val, msg) {
    new Assertion(val, msg).to.be.a('boolean');
  };

  /**
   * ### .isNotBoolean(value, [message])
   *
   * Asserts that `value` is _not_ a boolean.
   *
   *     var teaReady = 'yep'
   *       , teaServed = 'nope';
   *
   *     assert.isNotBoolean(teaReady, 'is the tea ready');
   *     assert.isNotBoolean(teaServed, 'has tea been served');
   *
   * @name isNotBoolean
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isNotBoolean = function (val, msg) {
    new Assertion(val, msg).to.not.be.a('boolean');
  };

  /**
   * ### .typeOf(value, name, [message])
   *
   * Asserts that `value`'s type is `name`, as determined by
   * `Object.prototype.toString`.
   *
   *     assert.typeOf({ tea: 'chai' }, 'object', 'we have an object');
   *     assert.typeOf(['chai', 'jasmine'], 'array', 'we have an array');
   *     assert.typeOf('tea', 'string', 'we have a string');
   *     assert.typeOf(/tea/, 'regexp', 'we have a regular expression');
   *     assert.typeOf(null, 'null', 'we have a null');
   *     assert.typeOf(undefined, 'undefined', 'we have an undefined');
   *
   * @name typeOf
   * @param {Mixed} value
   * @param {String} name
   * @param {String} message
   * @api public
   */

  assert.typeOf = function (val, type, msg) {
    new Assertion(val, msg).to.be.a(type);
  };

  /**
   * ### .notTypeOf(value, name, [message])
   *
   * Asserts that `value`'s type is _not_ `name`, as determined by
   * `Object.prototype.toString`.
   *
   *     assert.notTypeOf('tea', 'number', 'strings are not numbers');
   *
   * @name notTypeOf
   * @param {Mixed} value
   * @param {String} typeof name
   * @param {String} message
   * @api public
   */

  assert.notTypeOf = function (val, type, msg) {
    new Assertion(val, msg).to.not.be.a(type);
  };

  /**
   * ### .instanceOf(object, constructor, [message])
   *
   * Asserts that `value` is an instance of `constructor`.
   *
   *     var Tea = function (name) { this.name = name; }
   *       , chai = new Tea('chai');
   *
   *     assert.instanceOf(chai, Tea, 'chai is an instance of tea');
   *
   * @name instanceOf
   * @param {Object} object
   * @param {Constructor} constructor
   * @param {String} message
   * @api public
   */

  assert.instanceOf = function (val, type, msg) {
    new Assertion(val, msg).to.be.instanceOf(type);
  };

  /**
   * ### .notInstanceOf(object, constructor, [message])
   *
   * Asserts `value` is not an instance of `constructor`.
   *
   *     var Tea = function (name) { this.name = name; }
   *       , chai = new String('chai');
   *
   *     assert.notInstanceOf(chai, Tea, 'chai is not an instance of tea');
   *
   * @name notInstanceOf
   * @param {Object} object
   * @param {Constructor} constructor
   * @param {String} message
   * @api public
   */

  assert.notInstanceOf = function (val, type, msg) {
    new Assertion(val, msg).to.not.be.instanceOf(type);
  };

  /**
   * ### .include(haystack, needle, [message])
   *
   * Asserts that `haystack` includes `needle`. Works
   * for strings and arrays.
   *
   *     assert.include('foobar', 'bar', 'foobar contains string "bar"');
   *     assert.include([ 1, 2, 3 ], 3, 'array contains value');
   *
   * @name include
   * @param {Array|String} haystack
   * @param {Mixed} needle
   * @param {String} message
   * @api public
   */

  assert.include = function (exp, inc, msg) {
    new Assertion(exp, msg, assert.include).include(inc);
  };

  /**
   * ### .notInclude(haystack, needle, [message])
   *
   * Asserts that `haystack` does not include `needle`. Works
   * for strings and arrays.
   *i
   *     assert.notInclude('foobar', 'baz', 'string not include substring');
   *     assert.notInclude([ 1, 2, 3 ], 4, 'array not include contain value');
   *
   * @name notInclude
   * @param {Array|String} haystack
   * @param {Mixed} needle
   * @param {String} message
   * @api public
   */

  assert.notInclude = function (exp, inc, msg) {
    new Assertion(exp, msg, assert.notInclude).not.include(inc);
  };

  /**
   * ### .match(value, regexp, [message])
   *
   * Asserts that `value` matches the regular expression `regexp`.
   *
   *     assert.match('foobar', /^foo/, 'regexp matches');
   *
   * @name match
   * @param {Mixed} value
   * @param {RegExp} regexp
   * @param {String} message
   * @api public
   */

  assert.match = function (exp, re, msg) {
    new Assertion(exp, msg).to.match(re);
  };

  /**
   * ### .notMatch(value, regexp, [message])
   *
   * Asserts that `value` does not match the regular expression `regexp`.
   *
   *     assert.notMatch('foobar', /^foo/, 'regexp does not match');
   *
   * @name notMatch
   * @param {Mixed} value
   * @param {RegExp} regexp
   * @param {String} message
   * @api public
   */

  assert.notMatch = function (exp, re, msg) {
    new Assertion(exp, msg).to.not.match(re);
  };

  /**
   * ### .property(object, property, [message])
   *
   * Asserts that `object` has a property named by `property`.
   *
   *     assert.property({ tea: { green: 'matcha' }}, 'tea');
   *
   * @name property
   * @param {Object} object
   * @param {String} property
   * @param {String} message
   * @api public
   */

  assert.property = function (obj, prop, msg) {
    new Assertion(obj, msg).to.have.property(prop);
  };

  /**
   * ### .notProperty(object, property, [message])
   *
   * Asserts that `object` does _not_ have a property named by `property`.
   *
   *     assert.notProperty({ tea: { green: 'matcha' }}, 'coffee');
   *
   * @name notProperty
   * @param {Object} object
   * @param {String} property
   * @param {String} message
   * @api public
   */

  assert.notProperty = function (obj, prop, msg) {
    new Assertion(obj, msg).to.not.have.property(prop);
  };

  /**
   * ### .deepProperty(object, property, [message])
   *
   * Asserts that `object` has a property named by `property`, which can be a
   * string using dot- and bracket-notation for deep reference.
   *
   *     assert.deepProperty({ tea: { green: 'matcha' }}, 'tea.green');
   *
   * @name deepProperty
   * @param {Object} object
   * @param {String} property
   * @param {String} message
   * @api public
   */

  assert.deepProperty = function (obj, prop, msg) {
    new Assertion(obj, msg).to.have.deep.property(prop);
  };

  /**
   * ### .notDeepProperty(object, property, [message])
   *
   * Asserts that `object` does _not_ have a property named by `property`, which
   * can be a string using dot- and bracket-notation for deep reference.
   *
   *     assert.notDeepProperty({ tea: { green: 'matcha' }}, 'tea.oolong');
   *
   * @name notDeepProperty
   * @param {Object} object
   * @param {String} property
   * @param {String} message
   * @api public
   */

  assert.notDeepProperty = function (obj, prop, msg) {
    new Assertion(obj, msg).to.not.have.deep.property(prop);
  };

  /**
   * ### .propertyVal(object, property, value, [message])
   *
   * Asserts that `object` has a property named by `property` with value given
   * by `value`.
   *
   *     assert.propertyVal({ tea: 'is good' }, 'tea', 'is good');
   *
   * @name propertyVal
   * @param {Object} object
   * @param {String} property
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.propertyVal = function (obj, prop, val, msg) {
    new Assertion(obj, msg).to.have.property(prop, val);
  };

  /**
   * ### .propertyNotVal(object, property, value, [message])
   *
   * Asserts that `object` has a property named by `property`, but with a value
   * different from that given by `value`.
   *
   *     assert.propertyNotVal({ tea: 'is good' }, 'tea', 'is bad');
   *
   * @name propertyNotVal
   * @param {Object} object
   * @param {String} property
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.propertyNotVal = function (obj, prop, val, msg) {
    new Assertion(obj, msg).to.not.have.property(prop, val);
  };

  /**
   * ### .deepPropertyVal(object, property, value, [message])
   *
   * Asserts that `object` has a property named by `property` with value given
   * by `value`. `property` can use dot- and bracket-notation for deep
   * reference.
   *
   *     assert.deepPropertyVal({ tea: { green: 'matcha' }}, 'tea.green', 'matcha');
   *
   * @name deepPropertyVal
   * @param {Object} object
   * @param {String} property
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.deepPropertyVal = function (obj, prop, val, msg) {
    new Assertion(obj, msg).to.have.deep.property(prop, val);
  };

  /**
   * ### .deepPropertyNotVal(object, property, value, [message])
   *
   * Asserts that `object` has a property named by `property`, but with a value
   * different from that given by `value`. `property` can use dot- and
   * bracket-notation for deep reference.
   *
   *     assert.deepPropertyNotVal({ tea: { green: 'matcha' }}, 'tea.green', 'konacha');
   *
   * @name deepPropertyNotVal
   * @param {Object} object
   * @param {String} property
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.deepPropertyNotVal = function (obj, prop, val, msg) {
    new Assertion(obj, msg).to.not.have.deep.property(prop, val);
  };

  /**
   * ### .lengthOf(object, length, [message])
   *
   * Asserts that `object` has a `length` property with the expected value.
   *
   *     assert.lengthOf([1,2,3], 3, 'array has length of 3');
   *     assert.lengthOf('foobar', 5, 'string has length of 6');
   *
   * @name lengthOf
   * @param {Mixed} object
   * @param {Number} length
   * @param {String} message
   * @api public
   */

  assert.lengthOf = function (exp, len, msg) {
    new Assertion(exp, msg).to.have.length(len);
  };

  /**
   * ### .throws(function, [constructor/string/regexp], [string/regexp], [message])
   *
   * Asserts that `function` will throw an error that is an instance of
   * `constructor`, or alternately that it will throw an error with message
   * matching `regexp`.
   *
   *     assert.throw(fn, 'function throws a reference error');
   *     assert.throw(fn, /function throws a reference error/);
   *     assert.throw(fn, ReferenceError);
   *     assert.throw(fn, ReferenceError, 'function throws a reference error');
   *     assert.throw(fn, ReferenceError, /function throws a reference error/);
   *
   * @name throws
   * @alias throw
   * @alias Throw
   * @param {Function} function
   * @param {ErrorConstructor} constructor
   * @param {RegExp} regexp
   * @param {String} message
   * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error#Error_types
   * @api public
   */

  assert.Throw = function (fn, errt, errs, msg) {
    if ('string' === typeof errt || errt instanceof RegExp) {
      errs = errt;
      errt = null;
    }

    var assertErr = new Assertion(fn, msg).to.Throw(errt, errs);
    return flag(assertErr, 'object');
  };

  /**
   * ### .doesNotThrow(function, [constructor/regexp], [message])
   *
   * Asserts that `function` will _not_ throw an error that is an instance of
   * `constructor`, or alternately that it will not throw an error with message
   * matching `regexp`.
   *
   *     assert.doesNotThrow(fn, Error, 'function does not throw');
   *
   * @name doesNotThrow
   * @param {Function} function
   * @param {ErrorConstructor} constructor
   * @param {RegExp} regexp
   * @param {String} message
   * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error#Error_types
   * @api public
   */

  assert.doesNotThrow = function (fn, type, msg) {
    if ('string' === typeof type) {
      msg = type;
      type = null;
    }

    new Assertion(fn, msg).to.not.Throw(type);
  };

  /**
   * ### .operator(val1, operator, val2, [message])
   *
   * Compares two values using `operator`.
   *
   *     assert.operator(1, '<', 2, 'everything is ok');
   *     assert.operator(1, '>', 2, 'this will fail');
   *
   * @name operator
   * @param {Mixed} val1
   * @param {String} operator
   * @param {Mixed} val2
   * @param {String} message
   * @api public
   */

  assert.operator = function (val, operator, val2, msg) {
    if (!~['==', '===', '>', '>=', '<', '<=', '!=', '!=='].indexOf(operator)) {
      throw new Error('Invalid operator "' + operator + '"');
    }
    var test = new Assertion(eval(val + operator + val2), msg);
    test.assert(
        true === flag(test, 'object')
      , 'expected ' + util.inspect(val) + ' to be ' + operator + ' ' + util.inspect(val2)
      , 'expected ' + util.inspect(val) + ' to not be ' + operator + ' ' + util.inspect(val2) );
  };

  /**
   * ### .closeTo(actual, expected, delta, [message])
   *
   * Asserts that the target is equal `expected`, to within a +/- `delta` range.
   *
   *     assert.closeTo(1.5, 1, 0.5, 'numbers are close');
   *
   * @name closeTo
   * @param {Number} actual
   * @param {Number} expected
   * @param {Number} delta
   * @param {String} message
   * @api public
   */

  assert.closeTo = function (act, exp, delta, msg) {
    new Assertion(act, msg).to.be.closeTo(exp, delta);
  };

  /**
   * ### .sameMembers(set1, set2, [message])
   *
   * Asserts that `set1` and `set2` have the same members.
   * Order is not taken into account.
   *
   *     assert.sameMembers([ 1, 2, 3 ], [ 2, 1, 3 ], 'same members');
   *
   * @name sameMembers
   * @param {Array} superset
   * @param {Array} subset
   * @param {String} message
   * @api public
   */

  assert.sameMembers = function (set1, set2, msg) {
    new Assertion(set1, msg).to.have.same.members(set2);
  }

  /**
   * ### .includeMembers(superset, subset, [message])
   *
   * Asserts that `subset` is included in `superset`.
   * Order is not taken into account.
   *
   *     assert.includeMembers([ 1, 2, 3 ], [ 2, 1 ], 'include members');
   *
   * @name includeMembers
   * @param {Array} superset
   * @param {Array} subset
   * @param {String} message
   * @api public
   */

  assert.includeMembers = function (superset, subset, msg) {
    new Assertion(superset, msg).to.include.members(subset);
  }

  /*!
   * Undocumented / untested
   */

  assert.ifError = function (val, msg) {
    new Assertion(val, msg).to.not.be.ok;
  };

  /*!
   * Aliases.
   */

  (function alias(name, as){
    assert[as] = assert[name];
    return alias;
  })
  ('Throw', 'throw')
  ('Throw', 'throws');
};

},{}],10:[function(require,module,exports){
/*!
 * chai
 * Copyright(c) 2011-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

module.exports = function (chai, util) {
  chai.expect = function (val, message) {
    return new chai.Assertion(val, message);
  };
};


},{}],11:[function(require,module,exports){
/*!
 * chai
 * Copyright(c) 2011-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

module.exports = function (chai, util) {
  var Assertion = chai.Assertion;

  function loadShould () {
    // explicitly define this method as function as to have it's name to include as `ssfi`
    function shouldGetter() {
      if (this instanceof String || this instanceof Number) {
        return new Assertion(this.constructor(this), null, shouldGetter);
      } else if (this instanceof Boolean) {
        return new Assertion(this == true, null, shouldGetter);
      }
      return new Assertion(this, null, shouldGetter);
    }
    function shouldSetter(value) {
      // See https://github.com/chaijs/chai/issues/86: this makes
      // `whatever.should = someValue` actually set `someValue`, which is
      // especially useful for `global.should = require('chai').should()`.
      //
      // Note that we have to use [[DefineProperty]] instead of [[Put]]
      // since otherwise we would trigger this very setter!
      Object.defineProperty(this, 'should', {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
    // modify Object.prototype to have `should`
    Object.defineProperty(Object.prototype, 'should', {
      set: shouldSetter
      , get: shouldGetter
      , configurable: true
    });

    var should = {};

    should.equal = function (val1, val2, msg) {
      new Assertion(val1, msg).to.equal(val2);
    };

    should.Throw = function (fn, errt, errs, msg) {
      new Assertion(fn, msg).to.Throw(errt, errs);
    };

    should.exist = function (val, msg) {
      new Assertion(val, msg).to.exist;
    }

    // negation
    should.not = {}

    should.not.equal = function (val1, val2, msg) {
      new Assertion(val1, msg).to.not.equal(val2);
    };

    should.not.Throw = function (fn, errt, errs, msg) {
      new Assertion(fn, msg).to.not.Throw(errt, errs);
    };

    should.not.exist = function (val, msg) {
      new Assertion(val, msg).to.not.exist;
    }

    should['throw'] = should['Throw'];
    should.not['throw'] = should.not['Throw'];

    return should;
  };

  chai.should = loadShould;
  chai.Should = loadShould;
};

},{}],12:[function(require,module,exports){
/*!
 * Chai - addChainingMethod utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Module dependencies
 */

var transferFlags = require('./transferFlags');
var flag = require('./flag');
var config = require('../config');

/*!
 * Module variables
 */

// Check whether `__proto__` is supported
var hasProtoSupport = '__proto__' in Object;

// Without `__proto__` support, this module will need to add properties to a function.
// However, some Function.prototype methods cannot be overwritten,
// and there seems no easy cross-platform way to detect them (@see chaijs/chai/issues/69).
var excludeNames = /^(?:length|name|arguments|caller)$/;

// Cache `Function` properties
var call  = Function.prototype.call,
    apply = Function.prototype.apply;

/**
 * ### addChainableMethod (ctx, name, method, chainingBehavior)
 *
 * Adds a method to an object, such that the method can also be chained.
 *
 *     utils.addChainableMethod(chai.Assertion.prototype, 'foo', function (str) {
 *       var obj = utils.flag(this, 'object');
 *       new chai.Assertion(obj).to.be.equal(str);
 *     });
 *
 * Can also be accessed directly from `chai.Assertion`.
 *
 *     chai.Assertion.addChainableMethod('foo', fn, chainingBehavior);
 *
 * The result can then be used as both a method assertion, executing both `method` and
 * `chainingBehavior`, or as a language chain, which only executes `chainingBehavior`.
 *
 *     expect(fooStr).to.be.foo('bar');
 *     expect(fooStr).to.be.foo.equal('foo');
 *
 * @param {Object} ctx object to which the method is added
 * @param {String} name of method to add
 * @param {Function} method function to be used for `name`, when called
 * @param {Function} chainingBehavior function to be called every time the property is accessed
 * @name addChainableMethod
 * @api public
 */

module.exports = function (ctx, name, method, chainingBehavior) {
  if (typeof chainingBehavior !== 'function') {
    chainingBehavior = function () { };
  }

  var chainableBehavior = {
      method: method
    , chainingBehavior: chainingBehavior
  };

  // save the methods so we can overwrite them later, if we need to.
  if (!ctx.__methods) {
    ctx.__methods = {};
  }
  ctx.__methods[name] = chainableBehavior;

  Object.defineProperty(ctx, name,
    { get: function () {
        chainableBehavior.chainingBehavior.call(this);

        var assert = function assert() {
          var old_ssfi = flag(this, 'ssfi');
          if (old_ssfi && config.includeStack === false)
            flag(this, 'ssfi', assert);
          var result = chainableBehavior.method.apply(this, arguments);
          return result === undefined ? this : result;
        };

        // Use `__proto__` if available
        if (hasProtoSupport) {
          // Inherit all properties from the object by replacing the `Function` prototype
          var prototype = assert.__proto__ = Object.create(this);
          // Restore the `call` and `apply` methods from `Function`
          prototype.call = call;
          prototype.apply = apply;
        }
        // Otherwise, redefine all properties (slow!)
        else {
          var asserterNames = Object.getOwnPropertyNames(ctx);
          asserterNames.forEach(function (asserterName) {
            if (!excludeNames.test(asserterName)) {
              var pd = Object.getOwnPropertyDescriptor(ctx, asserterName);
              Object.defineProperty(assert, asserterName, pd);
            }
          });
        }

        transferFlags(this, assert);
        return assert;
      }
    , configurable: true
  });
};

},{"../config":7,"./flag":15,"./transferFlags":29}],13:[function(require,module,exports){
/*!
 * Chai - addMethod utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

var config = require('../config');

/**
 * ### .addMethod (ctx, name, method)
 *
 * Adds a method to the prototype of an object.
 *
 *     utils.addMethod(chai.Assertion.prototype, 'foo', function (str) {
 *       var obj = utils.flag(this, 'object');
 *       new chai.Assertion(obj).to.be.equal(str);
 *     });
 *
 * Can also be accessed directly from `chai.Assertion`.
 *
 *     chai.Assertion.addMethod('foo', fn);
 *
 * Then can be used as any other assertion.
 *
 *     expect(fooStr).to.be.foo('bar');
 *
 * @param {Object} ctx object to which the method is added
 * @param {String} name of method to add
 * @param {Function} method function to be used for name
 * @name addMethod
 * @api public
 */
var flag = require('./flag');

module.exports = function (ctx, name, method) {
  ctx[name] = function () {
    var old_ssfi = flag(this, 'ssfi');
    if (old_ssfi && config.includeStack === false)
      flag(this, 'ssfi', ctx[name]);
    var result = method.apply(this, arguments);
    return result === undefined ? this : result;
  };
};

},{"../config":7,"./flag":15}],14:[function(require,module,exports){
/*!
 * Chai - addProperty utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### addProperty (ctx, name, getter)
 *
 * Adds a property to the prototype of an object.
 *
 *     utils.addProperty(chai.Assertion.prototype, 'foo', function () {
 *       var obj = utils.flag(this, 'object');
 *       new chai.Assertion(obj).to.be.instanceof(Foo);
 *     });
 *
 * Can also be accessed directly from `chai.Assertion`.
 *
 *     chai.Assertion.addProperty('foo', fn);
 *
 * Then can be used as any other assertion.
 *
 *     expect(myFoo).to.be.foo;
 *
 * @param {Object} ctx object to which the property is added
 * @param {String} name of property to add
 * @param {Function} getter function to be used for name
 * @name addProperty
 * @api public
 */

module.exports = function (ctx, name, getter) {
  Object.defineProperty(ctx, name,
    { get: function () {
        var result = getter.call(this);
        return result === undefined ? this : result;
      }
    , configurable: true
  });
};

},{}],15:[function(require,module,exports){
/*!
 * Chai - flag utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### flag(object ,key, [value])
 *
 * Get or set a flag value on an object. If a
 * value is provided it will be set, else it will
 * return the currently set value or `undefined` if
 * the value is not set.
 *
 *     utils.flag(this, 'foo', 'bar'); // setter
 *     utils.flag(this, 'foo'); // getter, returns `bar`
 *
 * @param {Object} object (constructed Assertion
 * @param {String} key
 * @param {Mixed} value (optional)
 * @name flag
 * @api private
 */

module.exports = function (obj, key, value) {
  var flags = obj.__flags || (obj.__flags = Object.create(null));
  if (arguments.length === 3) {
    flags[key] = value;
  } else {
    return flags[key];
  }
};

},{}],16:[function(require,module,exports){
/*!
 * Chai - getActual utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * # getActual(object, [actual])
 *
 * Returns the `actual` value for an Assertion
 *
 * @param {Object} object (constructed Assertion)
 * @param {Arguments} chai.Assertion.prototype.assert arguments
 */

module.exports = function (obj, args) {
  return args.length > 4 ? args[4] : obj._obj;
};

},{}],17:[function(require,module,exports){
/*!
 * Chai - getEnumerableProperties utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### .getEnumerableProperties(object)
 *
 * This allows the retrieval of enumerable property names of an object,
 * inherited or not.
 *
 * @param {Object} object
 * @returns {Array}
 * @name getEnumerableProperties
 * @api public
 */

module.exports = function getEnumerableProperties(object) {
  var result = [];
  for (var name in object) {
    result.push(name);
  }
  return result;
};

},{}],18:[function(require,module,exports){
/*!
 * Chai - message composition utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Module dependancies
 */

var flag = require('./flag')
  , getActual = require('./getActual')
  , inspect = require('./inspect')
  , objDisplay = require('./objDisplay');

/**
 * ### .getMessage(object, message, negateMessage)
 *
 * Construct the error message based on flags
 * and template tags. Template tags will return
 * a stringified inspection of the object referenced.
 *
 * Message template tags:
 * - `#{this}` current asserted object
 * - `#{act}` actual value
 * - `#{exp}` expected value
 *
 * @param {Object} object (constructed Assertion)
 * @param {Arguments} chai.Assertion.prototype.assert arguments
 * @name getMessage
 * @api public
 */

module.exports = function (obj, args) {
  var negate = flag(obj, 'negate')
    , val = flag(obj, 'object')
    , expected = args[3]
    , actual = getActual(obj, args)
    , msg = negate ? args[2] : args[1]
    , flagMsg = flag(obj, 'message');

  msg = msg || '';
  msg = msg
    .replace(/#{this}/g, objDisplay(val))
    .replace(/#{act}/g, objDisplay(actual))
    .replace(/#{exp}/g, objDisplay(expected));

  return flagMsg ? flagMsg + ': ' + msg : msg;
};

},{"./flag":15,"./getActual":16,"./inspect":23,"./objDisplay":24}],19:[function(require,module,exports){
/*!
 * Chai - getName utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * # getName(func)
 *
 * Gets the name of a function, in a cross-browser way.
 *
 * @param {Function} a function (usually a constructor)
 */

module.exports = function (func) {
  if (func.name) return func.name;

  var match = /^\s?function ([^(]*)\(/.exec(func);
  return match && match[1] ? match[1] : "";
};

},{}],20:[function(require,module,exports){
/*!
 * Chai - getPathValue utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * @see https://github.com/logicalparadox/filtr
 * MIT Licensed
 */

/**
 * ### .getPathValue(path, object)
 *
 * This allows the retrieval of values in an
 * object given a string path.
 *
 *     var obj = {
 *         prop1: {
 *             arr: ['a', 'b', 'c']
 *           , str: 'Hello'
 *         }
 *       , prop2: {
 *             arr: [ { nested: 'Universe' } ]
 *           , str: 'Hello again!'
 *         }
 *     }
 *
 * The following would be the results.
 *
 *     getPathValue('prop1.str', obj); // Hello
 *     getPathValue('prop1.att[2]', obj); // b
 *     getPathValue('prop2.arr[0].nested', obj); // Universe
 *
 * @param {String} path
 * @param {Object} object
 * @returns {Object} value or `undefined`
 * @name getPathValue
 * @api public
 */

var getPathValue = module.exports = function (path, obj) {
  var parsed = parsePath(path);
  return _getPathValue(parsed, obj);
};

/*!
 * ## parsePath(path)
 *
 * Helper function used to parse string object
 * paths. Use in conjunction with `_getPathValue`.
 *
 *      var parsed = parsePath('myobject.property.subprop');
 *
 * ### Paths:
 *
 * * Can be as near infinitely deep and nested
 * * Arrays are also valid using the formal `myobject.document[3].property`.
 *
 * @param {String} path
 * @returns {Object} parsed
 * @api private
 */

function parsePath (path) {
  var str = path.replace(/\[/g, '.[')
    , parts = str.match(/(\\\.|[^.]+?)+/g);
  return parts.map(function (value) {
    var re = /\[(\d+)\]$/
      , mArr = re.exec(value)
    if (mArr) return { i: parseFloat(mArr[1]) };
    else return { p: value };
  });
};

/*!
 * ## _getPathValue(parsed, obj)
 *
 * Helper companion function for `.parsePath` that returns
 * the value located at the parsed address.
 *
 *      var value = getPathValue(parsed, obj);
 *
 * @param {Object} parsed definition from `parsePath`.
 * @param {Object} object to search against
 * @returns {Object|Undefined} value
 * @api private
 */

function _getPathValue (parsed, obj) {
  var tmp = obj
    , res;
  for (var i = 0, l = parsed.length; i < l; i++) {
    var part = parsed[i];
    if (tmp) {
      if ('undefined' !== typeof part.p)
        tmp = tmp[part.p];
      else if ('undefined' !== typeof part.i)
        tmp = tmp[part.i];
      if (i == (l - 1)) res = tmp;
    } else {
      res = undefined;
    }
  }
  return res;
};

},{}],21:[function(require,module,exports){
/*!
 * Chai - getProperties utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### .getProperties(object)
 *
 * This allows the retrieval of property names of an object, enumerable or not,
 * inherited or not.
 *
 * @param {Object} object
 * @returns {Array}
 * @name getProperties
 * @api public
 */

module.exports = function getProperties(object) {
  var result = Object.getOwnPropertyNames(subject);

  function addProperty(property) {
    if (result.indexOf(property) === -1) {
      result.push(property);
    }
  }

  var proto = Object.getPrototypeOf(subject);
  while (proto !== null) {
    Object.getOwnPropertyNames(proto).forEach(addProperty);
    proto = Object.getPrototypeOf(proto);
  }

  return result;
};

},{}],22:[function(require,module,exports){
/*!
 * chai
 * Copyright(c) 2011 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Main exports
 */

var exports = module.exports = {};

/*!
 * test utility
 */

exports.test = require('./test');

/*!
 * type utility
 */

exports.type = require('./type');

/*!
 * message utility
 */

exports.getMessage = require('./getMessage');

/*!
 * actual utility
 */

exports.getActual = require('./getActual');

/*!
 * Inspect util
 */

exports.inspect = require('./inspect');

/*!
 * Object Display util
 */

exports.objDisplay = require('./objDisplay');

/*!
 * Flag utility
 */

exports.flag = require('./flag');

/*!
 * Flag transferring utility
 */

exports.transferFlags = require('./transferFlags');

/*!
 * Deep equal utility
 */

exports.eql = require('deep-eql');

/*!
 * Deep path value
 */

exports.getPathValue = require('./getPathValue');

/*!
 * Function name
 */

exports.getName = require('./getName');

/*!
 * add Property
 */

exports.addProperty = require('./addProperty');

/*!
 * add Method
 */

exports.addMethod = require('./addMethod');

/*!
 * overwrite Property
 */

exports.overwriteProperty = require('./overwriteProperty');

/*!
 * overwrite Method
 */

exports.overwriteMethod = require('./overwriteMethod');

/*!
 * Add a chainable method
 */

exports.addChainableMethod = require('./addChainableMethod');

/*!
 * Overwrite chainable method
 */

exports.overwriteChainableMethod = require('./overwriteChainableMethod');


},{"./addChainableMethod":12,"./addMethod":13,"./addProperty":14,"./flag":15,"./getActual":16,"./getMessage":18,"./getName":19,"./getPathValue":20,"./inspect":23,"./objDisplay":24,"./overwriteChainableMethod":25,"./overwriteMethod":26,"./overwriteProperty":27,"./test":28,"./transferFlags":29,"./type":30,"deep-eql":32}],23:[function(require,module,exports){
// This is (almost) directly from Node.js utils
// https://github.com/joyent/node/blob/f8c335d0caf47f16d31413f89aa28eda3878e3aa/lib/util.js

var getName = require('./getName');
var getProperties = require('./getProperties');
var getEnumerableProperties = require('./getEnumerableProperties');

module.exports = inspect;

/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Boolean} showHidden Flag that shows hidden (not enumerable)
 *    properties of objects.
 * @param {Number} depth Depth in which to descend in object. Default is 2.
 * @param {Boolean} colors Flag to turn on ANSI escape codes to color the
 *    output. Default is false (no coloring).
 */
function inspect(obj, showHidden, depth, colors) {
  var ctx = {
    showHidden: showHidden,
    seen: [],
    stylize: function (str) { return str; }
  };
  return formatValue(ctx, obj, (typeof depth === 'undefined' ? 2 : depth));
}

// https://gist.github.com/1044128/
var getOuterHTML = function(element) {
  if ('outerHTML' in element) return element.outerHTML;
  var ns = "http://www.w3.org/1999/xhtml";
  var container = document.createElementNS(ns, '_');
  var elemProto = (window.HTMLElement || window.Element).prototype;
  var xmlSerializer = new XMLSerializer();
  var html;
  if (document.xmlVersion) {
    return xmlSerializer.serializeToString(element);
  } else {
    container.appendChild(element.cloneNode(false));
    html = container.innerHTML.replace('><', '>' + element.innerHTML + '<');
    container.innerHTML = '';
    return html;
  }
};

// Returns true if object is a DOM element.
var isDOMElement = function (object) {
  if (typeof HTMLElement === 'object') {
    return object instanceof HTMLElement;
  } else {
    return object &&
      typeof object === 'object' &&
      object.nodeType === 1 &&
      typeof object.nodeName === 'string';
  }
};

function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (value && typeof value.inspect === 'function' &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes);
    if (typeof ret !== 'string') {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // If it's DOM elem, get outer HTML.
  if (isDOMElement(value)) {
    return getOuterHTML(value);
  }

  // Look up the keys of the object.
  var visibleKeys = getEnumerableProperties(value);
  var keys = ctx.showHidden ? getProperties(value) : visibleKeys;

  // Some type of object without properties can be shortcutted.
  // In IE, errors have a single `stack` property, or if they are vanilla `Error`,
  // a `stack` plus `description` property; ignore those for consistency.
  if (keys.length === 0 || (isError(value) && (
      (keys.length === 1 && keys[0] === 'stack') ||
      (keys.length === 2 && keys[0] === 'description' && keys[1] === 'stack')
     ))) {
    if (typeof value === 'function') {
      var name = getName(value);
      var nameSuffix = name ? ': ' + name : '';
      return ctx.stylize('[Function' + nameSuffix + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toUTCString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (typeof value === 'function') {
    var name = getName(value);
    var nameSuffix = name ? ': ' + name : '';
    base = ' [Function' + nameSuffix + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    return formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  switch (typeof value) {
    case 'undefined':
      return ctx.stylize('undefined', 'undefined');

    case 'string':
      var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                               .replace(/'/g, "\\'")
                                               .replace(/\\"/g, '"') + '\'';
      return ctx.stylize(simple, 'string');

    case 'number':
      return ctx.stylize('' + value, 'number');

    case 'boolean':
      return ctx.stylize('' + value, 'boolean');
  }
  // For some reason typeof null is "object", so special case here.
  if (value === null) {
    return ctx.stylize('null', 'null');
  }
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (Object.prototype.hasOwnProperty.call(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str;
  if (value.__lookupGetter__) {
    if (value.__lookupGetter__(key)) {
      if (value.__lookupSetter__(key)) {
        str = ctx.stylize('[Getter/Setter]', 'special');
      } else {
        str = ctx.stylize('[Getter]', 'special');
      }
    } else {
      if (value.__lookupSetter__(key)) {
        str = ctx.stylize('[Setter]', 'special');
      }
    }
  }
  if (visibleKeys.indexOf(key) < 0) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(value[key]) < 0) {
      if (recurseTimes === null) {
        str = formatValue(ctx, value[key], null);
      } else {
        str = formatValue(ctx, value[key], recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (typeof name === 'undefined') {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}

function isArray(ar) {
  return Array.isArray(ar) ||
         (typeof ar === 'object' && objectToString(ar) === '[object Array]');
}

function isRegExp(re) {
  return typeof re === 'object' && objectToString(re) === '[object RegExp]';
}

function isDate(d) {
  return typeof d === 'object' && objectToString(d) === '[object Date]';
}

function isError(e) {
  return typeof e === 'object' && objectToString(e) === '[object Error]';
}

function objectToString(o) {
  return Object.prototype.toString.call(o);
}

},{"./getEnumerableProperties":17,"./getName":19,"./getProperties":21}],24:[function(require,module,exports){
/*!
 * Chai - flag utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Module dependancies
 */

var inspect = require('./inspect');
var config = require('../config');

/**
 * ### .objDisplay (object)
 *
 * Determines if an object or an array matches
 * criteria to be inspected in-line for error
 * messages or should be truncated.
 *
 * @param {Mixed} javascript object to inspect
 * @name objDisplay
 * @api public
 */

module.exports = function (obj) {
  var str = inspect(obj)
    , type = Object.prototype.toString.call(obj);

  if (config.truncateThreshold && str.length >= config.truncateThreshold) {
    if (type === '[object Function]') {
      return !obj.name || obj.name === ''
        ? '[Function]'
        : '[Function: ' + obj.name + ']';
    } else if (type === '[object Array]') {
      return '[ Array(' + obj.length + ') ]';
    } else if (type === '[object Object]') {
      var keys = Object.keys(obj)
        , kstr = keys.length > 2
          ? keys.splice(0, 2).join(', ') + ', ...'
          : keys.join(', ');
      return '{ Object (' + kstr + ') }';
    } else {
      return str;
    }
  } else {
    return str;
  }
};

},{"../config":7,"./inspect":23}],25:[function(require,module,exports){
/*!
 * Chai - overwriteChainableMethod utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### overwriteChainableMethod (ctx, name, fn)
 *
 * Overwites an already existing chainable method
 * and provides access to the previous function or
 * property.  Must return functions to be used for
 * name.
 *
 *     utils.overwriteChainableMethod(chai.Assertion.prototype, 'length',
 *       function (_super) {
 *       }
 *     , function (_super) {
 *       }
 *     );
 *
 * Can also be accessed directly from `chai.Assertion`.
 *
 *     chai.Assertion.overwriteChainableMethod('foo', fn, fn);
 *
 * Then can be used as any other assertion.
 *
 *     expect(myFoo).to.have.length(3);
 *     expect(myFoo).to.have.length.above(3);
 *
 * @param {Object} ctx object whose method / property is to be overwritten
 * @param {String} name of method / property to overwrite
 * @param {Function} method function that returns a function to be used for name
 * @param {Function} chainingBehavior function that returns a function to be used for property
 * @name overwriteChainableMethod
 * @api public
 */

module.exports = function (ctx, name, method, chainingBehavior) {
  var chainableBehavior = ctx.__methods[name];

  var _chainingBehavior = chainableBehavior.chainingBehavior;
  chainableBehavior.chainingBehavior = function () {
    var result = chainingBehavior(_chainingBehavior).call(this);
    return result === undefined ? this : result;
  };

  var _method = chainableBehavior.method;
  chainableBehavior.method = function () {
    var result = method(_method).apply(this, arguments);
    return result === undefined ? this : result;
  };
};

},{}],26:[function(require,module,exports){
/*!
 * Chai - overwriteMethod utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### overwriteMethod (ctx, name, fn)
 *
 * Overwites an already existing method and provides
 * access to previous function. Must return function
 * to be used for name.
 *
 *     utils.overwriteMethod(chai.Assertion.prototype, 'equal', function (_super) {
 *       return function (str) {
 *         var obj = utils.flag(this, 'object');
 *         if (obj instanceof Foo) {
 *           new chai.Assertion(obj.value).to.equal(str);
 *         } else {
 *           _super.apply(this, arguments);
 *         }
 *       }
 *     });
 *
 * Can also be accessed directly from `chai.Assertion`.
 *
 *     chai.Assertion.overwriteMethod('foo', fn);
 *
 * Then can be used as any other assertion.
 *
 *     expect(myFoo).to.equal('bar');
 *
 * @param {Object} ctx object whose method is to be overwritten
 * @param {String} name of method to overwrite
 * @param {Function} method function that returns a function to be used for name
 * @name overwriteMethod
 * @api public
 */

module.exports = function (ctx, name, method) {
  var _method = ctx[name]
    , _super = function () { return this; };

  if (_method && 'function' === typeof _method)
    _super = _method;

  ctx[name] = function () {
    var result = method(_super).apply(this, arguments);
    return result === undefined ? this : result;
  }
};

},{}],27:[function(require,module,exports){
/*!
 * Chai - overwriteProperty utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### overwriteProperty (ctx, name, fn)
 *
 * Overwites an already existing property getter and provides
 * access to previous value. Must return function to use as getter.
 *
 *     utils.overwriteProperty(chai.Assertion.prototype, 'ok', function (_super) {
 *       return function () {
 *         var obj = utils.flag(this, 'object');
 *         if (obj instanceof Foo) {
 *           new chai.Assertion(obj.name).to.equal('bar');
 *         } else {
 *           _super.call(this);
 *         }
 *       }
 *     });
 *
 *
 * Can also be accessed directly from `chai.Assertion`.
 *
 *     chai.Assertion.overwriteProperty('foo', fn);
 *
 * Then can be used as any other assertion.
 *
 *     expect(myFoo).to.be.ok;
 *
 * @param {Object} ctx object whose property is to be overwritten
 * @param {String} name of property to overwrite
 * @param {Function} getter function that returns a getter function to be used for name
 * @name overwriteProperty
 * @api public
 */

module.exports = function (ctx, name, getter) {
  var _get = Object.getOwnPropertyDescriptor(ctx, name)
    , _super = function () {};

  if (_get && 'function' === typeof _get.get)
    _super = _get.get

  Object.defineProperty(ctx, name,
    { get: function () {
        var result = getter(_super).call(this);
        return result === undefined ? this : result;
      }
    , configurable: true
  });
};

},{}],28:[function(require,module,exports){
/*!
 * Chai - test utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Module dependancies
 */

var flag = require('./flag');

/**
 * # test(object, expression)
 *
 * Test and object for expression.
 *
 * @param {Object} object (constructed Assertion)
 * @param {Arguments} chai.Assertion.prototype.assert arguments
 */

module.exports = function (obj, args) {
  var negate = flag(obj, 'negate')
    , expr = args[0];
  return negate ? !expr : expr;
};

},{"./flag":15}],29:[function(require,module,exports){
/*!
 * Chai - transferFlags utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### transferFlags(assertion, object, includeAll = true)
 *
 * Transfer all the flags for `assertion` to `object`. If
 * `includeAll` is set to `false`, then the base Chai
 * assertion flags (namely `object`, `ssfi`, and `message`)
 * will not be transferred.
 *
 *
 *     var newAssertion = new Assertion();
 *     utils.transferFlags(assertion, newAssertion);
 *
 *     var anotherAsseriton = new Assertion(myObj);
 *     utils.transferFlags(assertion, anotherAssertion, false);
 *
 * @param {Assertion} assertion the assertion to transfer the flags from
 * @param {Object} object the object to transfer the flags too; usually a new assertion
 * @param {Boolean} includeAll
 * @name getAllFlags
 * @api private
 */

module.exports = function (assertion, object, includeAll) {
  var flags = assertion.__flags || (assertion.__flags = Object.create(null));

  if (!object.__flags) {
    object.__flags = Object.create(null);
  }

  includeAll = arguments.length === 3 ? includeAll : true;

  for (var flag in flags) {
    if (includeAll ||
        (flag !== 'object' && flag !== 'ssfi' && flag != 'message')) {
      object.__flags[flag] = flags[flag];
    }
  }
};

},{}],30:[function(require,module,exports){
/*!
 * Chai - type utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Detectable javascript natives
 */

var natives = {
    '[object Arguments]': 'arguments'
  , '[object Array]': 'array'
  , '[object Date]': 'date'
  , '[object Function]': 'function'
  , '[object Number]': 'number'
  , '[object RegExp]': 'regexp'
  , '[object String]': 'string'
};

/**
 * ### type(object)
 *
 * Better implementation of `typeof` detection that can
 * be used cross-browser. Handles the inconsistencies of
 * Array, `null`, and `undefined` detection.
 *
 *     utils.type({}) // 'object'
 *     utils.type(null) // `null'
 *     utils.type(undefined) // `undefined`
 *     utils.type([]) // `array`
 *
 * @param {Mixed} object to detect type of
 * @name type
 * @api private
 */

module.exports = function (obj) {
  var str = Object.prototype.toString.call(obj);
  if (natives[str]) return natives[str];
  if (obj === null) return 'null';
  if (obj === undefined) return 'undefined';
  if (obj === Object(obj)) return 'object';
  return typeof obj;
};

},{}],31:[function(require,module,exports){
/*!
 * assertion-error
 * Copyright(c) 2013 Jake Luer <jake@qualiancy.com>
 * MIT Licensed
 */

/*!
 * Return a function that will copy properties from
 * one object to another excluding any originally
 * listed. Returned function will create a new `{}`.
 *
 * @param {String} excluded properties ...
 * @return {Function}
 */

function exclude () {
  var excludes = [].slice.call(arguments);

  function excludeProps (res, obj) {
    Object.keys(obj).forEach(function (key) {
      if (!~excludes.indexOf(key)) res[key] = obj[key];
    });
  }

  return function extendExclude () {
    var args = [].slice.call(arguments)
      , i = 0
      , res = {};

    for (; i < args.length; i++) {
      excludeProps(res, args[i]);
    }

    return res;
  };
};

/*!
 * Primary Exports
 */

module.exports = AssertionError;

/**
 * ### AssertionError
 *
 * An extension of the JavaScript `Error` constructor for
 * assertion and validation scenarios.
 *
 * @param {String} message
 * @param {Object} properties to include (optional)
 * @param {callee} start stack function (optional)
 */

function AssertionError (message, _props, ssf) {
  var extend = exclude('name', 'message', 'stack', 'constructor', 'toJSON')
    , props = extend(_props || {});

  // default values
  this.message = message || 'Unspecified AssertionError';
  this.showDiff = false;

  // copy from properties
  for (var key in props) {
    this[key] = props[key];
  }

  // capture stack trace
  ssf = ssf || arguments.callee;
  if (ssf && Error.captureStackTrace) {
    Error.captureStackTrace(this, ssf);
  }
}

/*!
 * Inherit from Error.prototype
 */

AssertionError.prototype = Object.create(Error.prototype);

/*!
 * Statically set name
 */

AssertionError.prototype.name = 'AssertionError';

/*!
 * Ensure correct constructor
 */

AssertionError.prototype.constructor = AssertionError;

/**
 * Allow errors to be converted to JSON for static transfer.
 *
 * @param {Boolean} include stack (default: `true`)
 * @return {Object} object that can be `JSON.stringify`
 */

AssertionError.prototype.toJSON = function (stack) {
  var extend = exclude('constructor', 'toJSON', 'stack')
    , props = extend({ name: this.name }, this);

  // include stack if exists and not turned off
  if (false !== stack && this.stack) {
    props.stack = this.stack;
  }

  return props;
};

},{}],32:[function(require,module,exports){
module.exports = require('./lib/eql');

},{"./lib/eql":33}],33:[function(require,module,exports){
/*!
 * deep-eql
 * Copyright(c) 2013 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Module dependencies
 */

var type = require('type-detect');

/*!
 * Buffer.isBuffer browser shim
 */

var Buffer;
try { Buffer = require('buffer').Buffer; }
catch(ex) {
  Buffer = {};
  Buffer.isBuffer = function() { return false; }
}

/*!
 * Primary Export
 */

module.exports = deepEqual;

/**
 * Assert super-strict (egal) equality between
 * two objects of any type.
 *
 * @param {Mixed} a
 * @param {Mixed} b
 * @param {Array} memoised (optional)
 * @return {Boolean} equal match
 */

function deepEqual(a, b, m) {
  if (sameValue(a, b)) {
    return true;
  } else if ('date' === type(a)) {
    return dateEqual(a, b);
  } else if ('regexp' === type(a)) {
    return regexpEqual(a, b);
  } else if (Buffer.isBuffer(a)) {
    return bufferEqual(a, b);
  } else if ('arguments' === type(a)) {
    return argumentsEqual(a, b, m);
  } else if (!typeEqual(a, b)) {
    return false;
  } else if (('object' !== type(a) && 'object' !== type(b))
  && ('array' !== type(a) && 'array' !== type(b))) {
    return sameValue(a, b);
  } else {
    return objectEqual(a, b, m);
  }
}

/*!
 * Strict (egal) equality test. Ensures that NaN always
 * equals NaN and `-0` does not equal `+0`.
 *
 * @param {Mixed} a
 * @param {Mixed} b
 * @return {Boolean} equal match
 */

function sameValue(a, b) {
  if (a === b) return a !== 0 || 1 / a === 1 / b;
  return a !== a && b !== b;
}

/*!
 * Compare the types of two given objects and
 * return if they are equal. Note that an Array
 * has a type of `array` (not `object`) and arguments
 * have a type of `arguments` (not `array`/`object`).
 *
 * @param {Mixed} a
 * @param {Mixed} b
 * @return {Boolean} result
 */

function typeEqual(a, b) {
  return type(a) === type(b);
}

/*!
 * Compare two Date objects by asserting that
 * the time values are equal using `saveValue`.
 *
 * @param {Date} a
 * @param {Date} b
 * @return {Boolean} result
 */

function dateEqual(a, b) {
  if ('date' !== type(b)) return false;
  return sameValue(a.getTime(), b.getTime());
}

/*!
 * Compare two regular expressions by converting them
 * to string and checking for `sameValue`.
 *
 * @param {RegExp} a
 * @param {RegExp} b
 * @return {Boolean} result
 */

function regexpEqual(a, b) {
  if ('regexp' !== type(b)) return false;
  return sameValue(a.toString(), b.toString());
}

/*!
 * Assert deep equality of two `arguments` objects.
 * Unfortunately, these must be sliced to arrays
 * prior to test to ensure no bad behavior.
 *
 * @param {Arguments} a
 * @param {Arguments} b
 * @param {Array} memoize (optional)
 * @return {Boolean} result
 */

function argumentsEqual(a, b, m) {
  if ('arguments' !== type(b)) return false;
  a = [].slice.call(a);
  b = [].slice.call(b);
  return deepEqual(a, b, m);
}

/*!
 * Get enumerable properties of a given object.
 *
 * @param {Object} a
 * @return {Array} property names
 */

function enumerable(a) {
  var res = [];
  for (var key in a) res.push(key);
  return res;
}

/*!
 * Simple equality for flat iterable objects
 * such as Arrays or Node.js buffers.
 *
 * @param {Iterable} a
 * @param {Iterable} b
 * @return {Boolean} result
 */

function iterableEqual(a, b) {
  if (a.length !==  b.length) return false;

  var i = 0;
  var match = true;

  for (; i < a.length; i++) {
    if (a[i] !== b[i]) {
      match = false;
      break;
    }
  }

  return match;
}

/*!
 * Extension to `iterableEqual` specifically
 * for Node.js Buffers.
 *
 * @param {Buffer} a
 * @param {Mixed} b
 * @return {Boolean} result
 */

function bufferEqual(a, b) {
  if (!Buffer.isBuffer(b)) return false;
  return iterableEqual(a, b);
}

/*!
 * Block for `objectEqual` ensuring non-existing
 * values don't get in.
 *
 * @param {Mixed} object
 * @return {Boolean} result
 */

function isValue(a) {
  return a !== null && a !== undefined;
}

/*!
 * Recursively check the equality of two objects.
 * Once basic sameness has been established it will
 * defer to `deepEqual` for each enumerable key
 * in the object.
 *
 * @param {Mixed} a
 * @param {Mixed} b
 * @return {Boolean} result
 */

function objectEqual(a, b, m) {
  if (!isValue(a) || !isValue(b)) {
    return false;
  }

  if (a.prototype !== b.prototype) {
    return false;
  }

  var i;
  if (m) {
    for (i = 0; i < m.length; i++) {
      if ((m[i][0] === a && m[i][1] === b)
      ||  (m[i][0] === b && m[i][1] === a)) {
        return true;
      }
    }
  } else {
    m = [];
  }

  try {
    var ka = enumerable(a);
    var kb = enumerable(b);
  } catch (ex) {
    return false;
  }

  ka.sort();
  kb.sort();

  if (!iterableEqual(ka, kb)) {
    return false;
  }

  m.push([ a, b ]);

  var key;
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!deepEqual(a[key], b[key], m)) {
      return false;
    }
  }

  return true;
}

},{"buffer":1,"type-detect":34}],34:[function(require,module,exports){
module.exports = require('./lib/type');

},{"./lib/type":35}],35:[function(require,module,exports){
/*!
 * type-detect
 * Copyright(c) 2013 jake luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Primary Exports
 */

var exports = module.exports = getType;

/*!
 * Detectable javascript natives
 */

var natives = {
    '[object Array]': 'array'
  , '[object RegExp]': 'regexp'
  , '[object Function]': 'function'
  , '[object Arguments]': 'arguments'
  , '[object Date]': 'date'
};

/**
 * ### typeOf (obj)
 *
 * Use several different techniques to determine
 * the type of object being tested.
 *
 *
 * @param {Mixed} object
 * @return {String} object type
 * @api public
 */

function getType (obj) {
  var str = Object.prototype.toString.call(obj);
  if (natives[str]) return natives[str];
  if (obj === null) return 'null';
  if (obj === undefined) return 'undefined';
  if (obj === Object(obj)) return 'object';
  return typeof obj;
}

exports.Library = Library;

/**
 * ### Library
 *
 * Create a repository for custom type detection.
 *
 * ```js
 * var lib = new type.Library;
 * ```
 *
 */

function Library () {
  this.tests = {};
}

/**
 * #### .of (obj)
 *
 * Expose replacement `typeof` detection to the library.
 *
 * ```js
 * if ('string' === lib.of('hello world')) {
 *   // ...
 * }
 * ```
 *
 * @param {Mixed} object to test
 * @return {String} type
 */

Library.prototype.of = getType;

/**
 * #### .define (type, test)
 *
 * Add a test to for the `.test()` assertion.
 *
 * Can be defined as a regular expression:
 *
 * ```js
 * lib.define('int', /^[0-9]+$/);
 * ```
 *
 * ... or as a function:
 *
 * ```js
 * lib.define('bln', function (obj) {
 *   if ('boolean' === lib.of(obj)) return true;
 *   var blns = [ 'yes', 'no', 'true', 'false', 1, 0 ];
 *   if ('string' === lib.of(obj)) obj = obj.toLowerCase();
 *   return !! ~blns.indexOf(obj);
 * });
 * ```
 *
 * @param {String} type
 * @param {RegExp|Function} test
 * @api public
 */

Library.prototype.define = function (type, test) {
  if (arguments.length === 1) return this.tests[type];
  this.tests[type] = test;
  return this;
};

/**
 * #### .test (obj, test)
 *
 * Assert that an object is of type. Will first
 * check natives, and if that does not pass it will
 * use the user defined custom tests.
 *
 * ```js
 * assert(lib.test('1', 'int'));
 * assert(lib.test('yes', 'bln'));
 * ```
 *
 * @param {Mixed} object
 * @param {String} type
 * @return {Boolean} result
 * @api public
 */

Library.prototype.test = function (obj, type) {
  if (type === getType(obj)) return true;
  var test = this.tests[type];

  if (test && 'regexp' === getType(test)) {
    return test.test(obj);
  } else if (test && 'function' === getType(test)) {
    return test(obj);
  } else {
    throw new ReferenceError('Type test "' + type + '" not defined or invalid.');
  }
};

},{}],36:[function(require,module,exports){
'use strict';

var utils = require('./utils');

module.exports = Caret;

function Caret(editor) {
  this.editor = editor;
}

/**
 * @returns {Node}
 * @api public
 */
Caret.prototype.focusNode = function () {
  return document.getSelection().focusNode;
};

/**
 * @param {String} tagName
 * @returns {Element}
 * @api public
 */
Caret.prototype.focusElement = function (tagName) {
  var node;

  if (tagName) {
    node = this.focusElement();

    tagName = tagName.toUpperCase();

    while (node && node.tagName !== tagName) {
      node = node.parentElement;
    }

    return (node && node.tagName === tagName)
      ? node
      : null;
  } else {
    node = document.getSelection().focusNode;

    while (node && !utils.isElementNode(node)) {
      node = node.parentNode;
    }

    return node;
  }
};

/**
 * @returns {Element}
 * @api public
 */
Caret.prototype.focusSection = function () {
  return this.focusType('section');
};

/**
 * @returns {Element}
 * @api public
 */
Caret.prototype.focusParagraph = function () {
  return this.focusType('paragraph');
};

/**
 * @returns {Element}
 * @api public
 */
Caret.prototype.focusParagraphs = function () {
  return this.focusType('paragraphs');
};

/**
 * @returns {Element}
 * @api public
 */
Caret.prototype.focusFigure = function () {
  return this.focusType('figure');
};

/**
 * @returns {Element}
 * @api public
 */
Caret.prototype.focusDetail = function () {
  return this.focusType('detail');
};

/**
 * @param {String} type
 * @returns {Element}
 * @api public
 */
Caret.prototype.focusType = function (type) {
  var node = this.focusElement();
  var elType;

  while (true) {
    if (!node) {
      break;
    }

    elType = utils.getType(node);

    if (elType === type) {
      return node;
    }

    node = node.parentElement;
  }

  return null;
};

/**
 * @param {Node} node
 * @returns {Element}
 * @api public
 */
Caret.prototype.nextElement = function (node) {
  if (node) {
    node = node.nextSibling;
  } else {
    node = this.focusNode();
    node = node && node.nextSibling;
  }

  while (node) {
    if (utils.isElementNode(node)) {
      return node;
    }

    node = node.nextSibling;
  }

  return null;
};

/**
 * @param {Element} el
 * @api public
 */
Caret.prototype.focusTo = function (el) {
  if (!el) {
    return;
  }

  if (el.innerHTML.trim()) {
    this.moveToStart(el);
  } else {
    el.innerHTML = '\uffff';
    this.moveToStart(el);
    el.innerHTML = '';
  }
};

/**
 * @returns {String}
 * @api public
 */
Caret.prototype.textBefore = function () {
  var selection = document.getSelection();
  var node = selection.focusNode;
  var offset = selection.focusOffset;

  if (utils.isElementNode(node)) {
    return '';
  }
  
  return node.substringData(0, offset);
};

/**
 * @returns {String}
 * @api public
 */
Caret.prototype.textAfter = function () {
  var selection = document.getSelection();
  var node = selection.focusNode;
  var offset = selection.focusOffset;

  if (utils.isElementNode(node)) {
    return '';
  }
  
  return node.substringData(offset, node.length - 1); 
};

/**
 * @param {Element} el
 * @param {Number} offset
 * @api public
 */
Caret.prototype.moveToStart = function (el, offset) {
  if (!el) {
    return;
  }

  var selection = document.getSelection();
  var range = document.createRange();
  var len;

  if (utils.isTextNode(el)) {
    len = utils.getTextContent(el).length;
  } else {
    len = el.childNodes.length;
  }

  offset = offset | 0;

  if (offset < 0) {
    offset = 0;
  } else if (offset >= len) {
    offset = len;
  }

  range.setStart(el, offset);
  range.setEnd(el, offset);

  selection.removeAllRanges();
  selection.addRange(range);
  selection.collapseToStart();
};

/**
 * @param {Element} el
 * @param {Number} offset
 * @api public
 */
Caret.prototype.moveToEnd = function (el, offset) {
  if (!el) {
    return;
  }

  var range = document.createRange();
  var selection = window.getSelection();
  var len;

  if (utils.isTextNode(el)) {
    len = utils.getTextContent(el).length;
  } else {
    len = el.childNodes.length;
  }

  offset = len - (offset | 0);

  if (offset < 0) {
    offset = 0;
  }

  range.setStart(el, offset);
  range.setEnd(el, offset);

  selection.removeAllRanges();
  selection.addRange(range);
  selection.collapseToEnd();
};

/**
 * @param {Element} el
 * @returns {Element}
 * @api public
 */
Caret.prototype.split = function (el) {
  if (!el) {
    return null;
  }

  var selection = document.getSelection();
  var node = selection.focusNode;
  var offset = selection.focusOffset;
  var range = document.createRange();
  var parentIndex = Array.prototype.indexOf.call(el.parentNode.childNodes, el);

  range.setStart(el.parentNode, parentIndex);
  range.setEnd(node, offset);

  var left = range.extractContents();

  el.parentNode.insertBefore(left, el);

  return el;
};

/**
 * @api public
 */
Caret.prototype.save = function () {
  var selection = document.getSelection();
  var range;

  if (!selection) {
    return;
  }

  if (selection.rangeCount) {
    range = selection.getRangeAt(0);
  }

  this._range = range;
};

/**
 * @api public
 */
Caret.prototype.restore = function () {
  var range = this._range;

  if (range) {
    var r = document.createRange();
    var selection = document.getSelection();

    r.setStart(range.startContainer, range.startOffset);
    r.setEnd(range.endContainer, range.endOffset);
    selection.removeAllRanges();
    selection.addRange(r);
  }
};

/**
 * @param {Element} el
 * @api public
 */
Caret.prototype.selectAllText = function (el) {
  var selection = window.getSelection();        
  var range = document.createRange();
  range.selectNodeContents(el);
  selection.removeAllRanges();
  selection.addRange(range);
};

/**
 * @param {Element} el
 * @api public
 */
Caret.prototype.selectAll = function (el) {
  var firstNode = utils.firstTextNode(el);
  var lastNode = utils.lastTextNode(el);

  this.select(firstNode, lastNode);
};

/**
 *     caret.select(node)
 *     caret.select(node, offset)
 *     caret.select(startNode, endNode)
 *     caret.select(node, startOffset, endOffset)
 *     caret.select(startNode, startOffset, endNode, endOffset)
 *
 * @api public
 */
Caret.prototype.select = function () {
  var selection = window.getSelection();
  var startNode, startOffset, endNode, endOffset;
  var range;

  // Chrome 無法選取空 TextNode
  // 所以這邊填入 \uffff 當作 placeholder

  var insertPlaceholder = function () {
    if (startNode && utils.isEmpty(startNode)) {
      utils.setNodeContent(startNode, '\uffff');
    }

    if (endNode && utils.isEmpty(endNode)) {
      utils.setNodeContent(endNode, '\uffff');
    }
  };

  var removePlaceholder = function () {
    var startNodeContent = utils.getTextContent(startNode);
    var endNodeContent = utils.getTextContent(endNode);
    var placeholder = /\uffff/g;

    startNodeContent = startNodeContent.replace(placeholder, '');
    endNodeContent = endNodeContent.replace(placeholder, '');

    utils.setNodeContent(startNode, startNodeContent);
    utils.setNodeContent(endNode, endNodeContent);
  };

  switch (arguments.length) {
  case 1:
    startNode = endNode = arguments[0];
    startOffset = 0;
    endOffset = utils.getTextContent(startNode).length;
    break;
  case 2:
    if (typeof arguments[1] === 'number') {
      startNode = endNode = arguments[0];
      startOffset = endOffset = arguments[1];
      insertPlaceholder();
    } else {
      startNode = arguments[0];
      startOffset = 0;
      endNode = arguments[1];
      insertPlaceholder();
      endOffset = utils.getTextContent(endNode).length;
    }
    break;
  case 3:
    startNode = arguments[0];
    endNode = arguments[1];
    insertPlaceholder();
    startOffset = 0;
    endOffset = utils.getTextContent(startNode).length;
    break;
  case 4:
    startNode = arguments[0];
    startOffset = arguments[1];
    endNode = arguments[2];
    endOffset = arguments[3];
    insertPlaceholder();
    break;
  }

  startOffset = startOffset | 0;
  endOffset = endOffset | 0;

  range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);

  selection.removeAllRanges();
  selection.addRange(range);

  removePlaceholder();
};

/**
 * @param {Element} el
 * @api public
 */
Caret.prototype.insertElement = function (el) {
  var selection = document.getSelection();
  var range = selection.getRangeAt(0);
  
  range.deleteContents();

  range.insertNode(el);
};

/**
 * @api public
 */
Caret.prototype.closestElement = function () {
  var node = this.focusNode();
  return this.nextElement(node);
};

/**
 * @param {Element} el
 * @returns {Boolean}
 * @api public
 */
Caret.prototype.atElementStart = function (el) {
  if (!el.childNodes.length) {
    return true;
  }

  var selection = document.getSelection();
  var focusNode = selection.focusNode;
  var offset = selection.focusOffset;
  var range = document.createRange();

  range.setStart(el.childNodes[0], 0);
  range.setEnd(focusNode, offset);

  return !range.toString().trim();
};

/**
 * @param {Element} el
 * @returns {Boolean}
 * @api public
 */
Caret.prototype.atElementEnd = function (el) {
  if (!el.childNodes.length) {
    return true;
  }

  var selection = document.getSelection();
  var focusNode = selection.focusNode;
  var offset = selection.focusOffset;
  var range = document.createRange();
  var lastNode = utils.lastTextNode(el);

  if (!lastNode) {
    return true;
  }

  range.setStart(focusNode, offset);
  range.setEnd(lastNode, lastNode.length);

  return !range.toString().trim();
};

},{"./utils":63}],37:[function(require,module,exports){
'use strict';

var utils = require('./utils');

module.exports = Data;

function Data(id) {
  this.id = id;
  this.modified = false;
  this.data = {};
  this.tmp = {};
}

/**
 * @param {String} key
 * @param {Mixed} key
 * @returns {Data}
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
 * @returns {Data}
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
 * @returns {Mixed}
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
 * @returns {Data}
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
 * @returns {Object}
 * @api public
 */
Data.prototype.toJSON = function () {
  return utils.clone(this.data);
};

},{"./utils":63}],38:[function(require,module,exports){
'use strict';

module.exports = {
  genName: function () {
    var format = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
    return format.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
};

},{}],39:[function(require,module,exports){
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

},{}],40:[function(require,module,exports){
'use strict';

module.exports = FigureType;

function FigureType(name, options) {
  this.options = options || (options = {});
  this.name = name;
}

FigureType.prototype.updateData = function (el, data) {
  data.set('figureType', this.name);

  this.options.updateData
    && this.options.updateData(el, data);
};

FigureType.prototype.updateHTML = function (el, data) {
  el.setAttribute('type', this.name);

  this.options.updateHTML
    && this.options.updateHTML(el, data);
};

},{}],41:[function(require,module,exports){
'use strict';

var utils = require('./utils');

var keyboard = module.exports = {};

keyboard.modifiers = {
  224: 'command',
  91: 'command',
  93: 'command',
  18: 'alt',
  17: 'ctrl',
  16: 'shift'
};

keyboard.map = {
  8: 'backspace',
  9: 'tab',
  13: 'enter',
  20: 'capslock',
  27: 'esc',
  32: 'space',
  37: 'left',
  38: 'up',
  39: 'right',
  40: 'down'
};

keyboard.super = utils.os() === 'mac'
  ? 'command'
  : 'ctrl';

},{"./utils":63}],42:[function(require,module,exports){
'use strict';

module.exports = Editor;

var Emitter = require('./emitter');
var Caret = require('./caret');
var Middleware = require('./mixin/middleware');
var Observe = require('./mixin/observe');
var HtmlBuilder = require('./mixin/html-builder');
var Figure = require('./mixin/figure');
var utils = require('./utils');
var plugins = require('./plugins');
var defaultOptions = require('./default-options');

// extends
Editor.prototype = Object.create(Emitter.prototype);

// mixin
utils.mixin(Editor.prototype, Middleware.prototype);
utils.mixin(Editor.prototype, Observe.prototype);
utils.mixin(Editor.prototype, HtmlBuilder.prototype);
utils.mixin(Editor.prototype, Figure.prototype);

function Editor(options) {
  // parent
  Emitter.call(this);

  // init mixin
  Middleware.call(this);
  Observe.call(this);
  HtmlBuilder.call(this);
  Figure.call(this);

  this.options = utils.mixin(Object.create(defaultOptions), options || {});
  this.context = {};
  this.context.editor = this;

  var el = this.options.el;

  if (!el) {
    el = document.createElement('div');
  }

  el.setAttribute('contenteditable', true);
  el.classList.add('med');

  this.el = el;
  this.caret = new Caret(this);

  this.bindEvents();
  this.handleEmpty();

  this.use(plugins.initContext());

  plugins.removeExtraNodes(this);
  plugins.renameElements(this);
  plugins.removeInlineStyle(this);
  plugins.handleEmptyParagraph(this);
  plugins.refocus(this);
}

/**
 * @api public
 */
Editor.prototype.start = function () {
  return this.compose([
    plugins.preventDefault(),
    plugins.commandA(this),
    plugins.handleParagraph(this),
    plugins.handleList(this),
    plugins.handleFigure(this),
    plugins.handleBlockquote(this),
    plugins.handleBackspace(this)
  ]);
};

/**
 * @api public
 */
Editor.prototype.end = function () {
  return this.compose([
    plugins.createNewParagraph()
  ]);
};

/**
 * @api private
 */
Editor.prototype.bindEvents = function () {
  var el = this.el;
  var bind = el.addEventListener.bind(el);

  bind('keydown', this.onKeydown.bind(this));
  bind('keyup', this.handleEmpty.bind(this));
  bind('blur', this.handleEmpty.bind(this));
  bind('focus', this.handleEmpty.bind(this));
};

/**
 * @param {KeyboardEvent} e
 * @api private
 */
Editor.prototype.onKeydown = function (e) {
  var ctx;

  this.handleEmpty();
  
  ctx = Object.create(this.context);
  ctx.event = e;
  ctx.prevent = utils.preventDefault.bind(null, e);

  this.exec(ctx, function (e) {
    if (e) {
      this.emit('error', e);
    }
  }.bind(this));

  this.sync();
  this.walk();


  // 預設動作結束後必須在 sync 一次
  // 因為預設動作也會改變 html 結構
  setTimeout(function () {
    this.sync();
  }.bind(this));
};

/**
 * @returns {Boolean}
 * @api public
 */
Editor.prototype.isEmpty = function () {
  var children = this.el.children;
  var first = children[0];
  return children.length <= 1
    && !utils.getTextContent(first).trim();
};

/**
 * @api private
 */
Editor.prototype.handleEmpty = function () {
  var first = this.el.children[0];

  if (!first) {
    var p = document.createElement('p');
    first = document.createElement('section');
    p.innerHTML = '<br type="_med_placeholder">';
    first.appendChild(p);
    this.el.appendChild(first);
    this.sync(this.el);

    setTimeout(function () {
      this.caret.focusTo(p);
    }.bind(this));
  }

  if (this.isEmpty()) {
    this.el.classList.add('is-empty');
  } else {
    this.el.classList.remove('is-empty');
  }
};

/**
 * @api private
 */
Editor.prototype.walk = function () {
  var els = this.el.querySelectorAll('[name]');
  var context = {
    editor: this
  };

  context.editor = this;

  this.emit('walkStart', context);

  Array.prototype.forEach.call(els, function (el) {
    context.el = el;
    context.element = el;
    context.name = el.getAttribute('name');
    context.data = this.data[context.name];
    this.emit('walk', context);
  }.bind(this));

  this.emit('walkEnd', context);
};

},{"./caret":36,"./default-options":38,"./emitter":39,"./mixin/figure":43,"./mixin/html-builder":44,"./mixin/middleware":45,"./mixin/observe":46,"./plugins":55,"./utils":63}],43:[function(require,module,exports){
'use strict';

var FigureType = require('../figure-type');
var utils = require('../utils');

module.exports = Figure;

function Figure() {
  this.figureTypes = {};
  this.registerFigureType('default', {
    updateData: function (el, data) {
      data.set('html', el.innerHTML);
    },
    updateHTML: function (el, data) {
      el.innerHTML = data.get('html');
    }
  });
}

Figure.prototype.registerFigureType = function (name, options) {
  var type = new FigureType(name, options);
  this.figureTypes[name] = type;
  return this;
};

Figure.prototype.getFigureType = function (name) {
  if (utils.isElementNode(name)) {
    name = name.getAttribute('type');
  }

  return this.figureTypes[name]
    || this.figureTypes.default;
};

},{"../figure-type":40,"../utils":63}],44:[function(require,module,exports){
'use strict';

var Data = require('../data');
var schema = require('../schema');
var utils = require('../utils');

module.exports = HtmlBuilder;

function HtmlBuilder() {
}

/**
 * @param {Object} json
 * @api public
 */
HtmlBuilder.prototype.fromJSON = function (json) {
  HtmlBuilder.importData.call(this, json);
  HtmlBuilder.buildHTML.call(this);
};

/**
 * @param {Object} json
 * @api private
 */
HtmlBuilder.importData = function (json) {
  json = utils.clone(json);

  var data = this.data = {};
  var structure = this.structure = {};
  var sections = structure.sections = [];
  var paragraphs = structure.paragraphs = [];

  // section
  (json.sections || []).forEach(function (section) {
    var name = section.name;
    var d = data[name] = new Data(name);

    delete section.name;
    d.data = section;
    d.update();

    sections.push(name);
  });

  // paragraphs, paragraph and figure
  (json.paragraphs || []).forEach(function (paragraph) {
    var name = paragraph.name;
    var d = data[name] = new Data(name);

    delete paragraph.name;

    d.data = paragraph;
    
    // figure 沒有 detail
    if (d.get('type') !== 'figure') {
      paragraph.detail = (paragraph.detail || []).map(detail);
    }
    
    d.update();

    paragraphs.push(name);
  });

  // detail
  function detail(detail) {
    var name = detail.name;
    var d = data[name] = new Data(name);

    delete detail.name;
    d.data = detail;
    d.update();

    return name;
  }

  return this;
};

/**
 * @api private
 */
HtmlBuilder.buildHTML = function () {
  var docfrag = document.createDocumentFragment();
  var el = this.el;
  var html = '';

  HtmlBuilder.createElements.call(this, docfrag);

  utils.each(docfrag.childNodes, function (child) {
    html += child.outerHTML;
  });

  el.innerHTML = html;
};

/**
 * @param {DocumentFragment|Element} container
 * @api private
 */
HtmlBuilder.createElements = function (container) {
  HtmlBuilder.createSections.call(this, container);
};

/**
 * @param {DocumentFragment|Element} container
 * @api private
 */
HtmlBuilder.createSections = function (container) {
  var structure = this.structure;
  var data = this.data;

  structure.sections.forEach(function (name) {
    var section = data[name];
    var el = HtmlBuilder.createElement(section);

    HtmlBuilder.createParagraphs.call(this, section, el);

    container.appendChild(el);
  }.bind(this));
};

/**
 * @param {Object} section
 * @param {DocumentFragment|Element} container
 * @api private
 */
HtmlBuilder.createParagraphs = function (section, container) {
  var structure = this.structure;
  var data = this.data;

  structure
    .paragraphs
    .slice(section.get('start'), section.get('end'))
    .forEach(function (name) {
      var paragraph = data[name];
      var el = HtmlBuilder.createElement(paragraph);

      var type = utils.getType(el);

      if (type === 'paragraphs') {
        HtmlBuilder.createParagraphs.call(this, paragraph, el);
      } else if (!paragraph.get('in-paragraphs')) {
        if (utils.isType('figure', el)) {
          HtmlBuilder.createFigure.call(this, paragraph, el);
        } else {
          HtmlBuilder.createDetails.call(this, paragraph, el);
        }
      }

      container.appendChild(el);
    }.bind(this));
};

/**
 * @param {Data} figure
 * @param {DocumentFragment|Element} figureElement
 * @api private
 */
HtmlBuilder.createFigure = function (figure, figureElement) {
  var figureType = this.getFigureType(figure.get('type'));
  figureType.updateHTML(figureElement, figure);
};

/**
 * @param {Data} paragraph
 * @param {DocumentFragment|Element} container
 * @api private
 */
HtmlBuilder.createDetails = function (paragraph, container) {
  var data = this.data;
  var detail = paragraph.get('detail');
  var text = paragraph.get('text');
  var content, node;
  var pointer = 0;

  container.innerHTML = '';

  detail.forEach(function (name) {
    var d = data[name];
    var el = HtmlBuilder.createElement(d);
    var start = d.get('start');
    var end = d.get('end');

    if (pointer !== start) {
      content = text.slice(pointer, start);
      node = document.createTextNode(content);
      container.appendChild(node);
    }

    el.innerHTML = text.slice(start, end);
    container.appendChild(el);

    pointer = end;
  });

  if (pointer !== text.length) {
    content = text.slice(pointer, text.length);
    node = document.createTextNode(content);
    container.appendChild(node);
  }
};

/**
 * @param {Data} data
 * @returns {Element}
 * @api private
 */
HtmlBuilder.createElement = function (data) {
  var tagName = data.get('tag');
  var el = document.createElement(tagName);

  el.setAttribute('name', data.id);
  HtmlBuilder.initElement(el, data);

  return el;
};

/**
 * @param {Element} el
 * @param {Data} data
 * @api private
 */
HtmlBuilder.initElement = function (el, data) {
  var s = schema[data.get('tag')];

  s.attrs.forEach(function (attr) {
    HtmlBuilder[attr.type](el, data, attr);
  });
};

/**
 * @param {Element} el
 * @param {Data} data
 * @param {Object} attr
 * @api private
 */
HtmlBuilder.attribute = function (el, data, attr) {
  el.setAttribute(attr.name, data.get(attr.name));
};

/**
 * @param {Element} el
 * @param {Data} data
 * @param {Object} attr
 * @api private
 */
HtmlBuilder.dataset = function (el, data, attr) {
  el.setAttribute('data-' + attr.name, data.get(attr.name));
};

/**
 * @param {Element} el
 * @param {Data} data
 * @param {Object} attr
 * @api private
 */
HtmlBuilder.content = function (el, data, attr) {
  if (el.textContent === undefined) {
    el.innerText = data.get(attr.name);
  } else {
    el.textContent = data.get(attr.name);
  }
};

},{"../data":37,"../schema":62,"../utils":63}],45:[function(require,module,exports){
'use strict';

module.exports = Middleware;

function Middleware() {
  this.middleware = [];
}

/**
 * @param {Function} fn
 * @returns {Editor}
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
 * @returns {Function}
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

},{}],46:[function(require,module,exports){
'use strict';

var Data = require('../data');
var utils = require('../utils');
var schema = require('../schema');

module.exports = Observe;

function Observe() {
  this.structure = null;
  this.data = {};
}

/**
 * @api public
 */
Observe.prototype.sync = function () {
  var structure = {
    paragraphs: [],
    sections: []
  };

  var data = this.data;

  var shouldBeDelete = {};

  var context = {
    structure: structure,
    shouldBeDelete: shouldBeDelete
  };

  Object
    .keys(data)
    .forEach(function (name) {
      shouldBeDelete[name] = 1;
    });

  utils.each(this.el.children, function (el) {
    Observe.scan.call(this, context, el);
  }.bind(this));

  Object
    .keys(shouldBeDelete)
    .forEach(function (name) {
      delete data[name];
    });

  this.structure = structure;
};

/**
 * @param {Object} context
 * @param {Element} el
 * @returns {Data}
 * @api private
 */
Observe.scan = function (context, el) {
  var tagName = el.tagName.toLowerCase();
  var name = el.getAttribute('name');
  var data = this.data[name];
  var tagSchema = schema[tagName];
  
  if (!tagSchema) {
    el.parentElement.removeChild(el);
    return;
  }

  Observe.checkAndRemoveStrangeElement.call(this, el);

  if (name) {
    delete context.shouldBeDelete[name];
  }

  if (!data) {
    if (!name) {
      name = this.options.genName();
    }

    data = new Data(name);
    data.set('tag', tagName);
    this.data[name] = data;

    el.setAttribute('name', data.id);
  }

  Observe[tagSchema.type].call(this, context, el, data);

  tagSchema.attrs.forEach(function (attr) {
    Observe[attr.type].call(this, el, data, attr);
  }.bind(this));

  if (data.modified) {
    data.update();
    this.emit('changed', data);
  }

  return data;
};

/**
 * @param {Object} context
 * @param {Element} el
 * @param {Data} data
 * @api private
 */
Observe.section = function (context, el, data) {
  var structure = context.structure;
  var p = [];

  utils.each(el.children, function (child) {
    var tagSchema = utils.getElementSchema(child);

    if (!tagSchema) {
      Observe.handleUnknownElement(child);
      return;
    }

    if (!~structure.sections.indexOf(data.id)) {
      structure.sections.push(data.id);
    }

    if (/^(paragraphs?|figure)$/.test(tagSchema.type)) {
      p.push(Observe.scan.call(this, context, child).id);
    }

  }.bind(this));

  data.set('start', structure.paragraphs.length);
  data.set('end', Array.prototype.push.apply(structure.paragraphs, p));
};

/**
 * @param {Object} context
 * @param {Element} el
 * @param {Data} data
 * @api private
 */
Observe.paragraphs = function (context, el, data) {
  var structure = context.structure;
  var p = [];

  utils.each(el.children, function (child) {
    var tagSchema = utils.getElementSchema(child);

    if (!tagSchema) {
      Observe.handleUnknownElement(child);
      return;
    }

    if (tagSchema.type === 'paragraph') {
      p.push(Observe.scan.call(this, context, child).id);
    }
  }.bind(this));

  data.set('start', structure.paragraphs.length);
  data.set('end', Array.prototype.push.apply(structure.paragraphs, p));
};

/**
 * @param {Object} context
 * @param {Element} el
 * @param {Data} data
 * @api private
 */
Observe.figure = function (context, el, data) {
  var figureType = this.getFigureType(el);
  figureType.updateData(el, data);
};

/**
 * @param {Object} context
 * @param {Element} el
 * @param {Data} data
 * @api private
 */
Observe.paragraph = function (context, el, data) {
  var detail = [];

  utils.each(el.children, function (child) {
    var tagSchema = utils.getElementSchema(child);

    if (!tagSchema) {
      Observe.handleUnknownElement(child);
      return;
    }

    if (tagSchema.type === 'detail') {
      detail.push(Observe.scan.call(this, context, child).id);
    }
  }.bind(this));

  data.set('detail', detail);
};

/**
 * @param {Object} context
 * @param {Element} el
 * @param {Data} data
 * @api private
 */
Observe.detail = function (context, el, data) {
  var offset = Observe.getOffset(el);
  data.set('start', offset.start);
  data.set('end', offset.end);
};

/**
 * @param {Element} el
 * @param {Data} data
 * @param {Object} attr
 * @api private
 */
Observe.attribute = function (el, data, attr) {
  var val = el.getAttribute(attr.name);
  data.set(attr.name, val);
};

/**
 * @param {Element} el
 * @param {Data} data
 * @param {Object} attr
 * @api private
 */
Observe.dataset = function (el, data, attr) {
  var val = el.getAttribute('data-' + attr.name);
  data.set(attr.name, val);
};

/**
 * @param {Element} el
 * @param {Data} data
 * @param {Object} attr
 * @api private
 */
Observe.content = function (el, data, attr) {
  var text = utils.getTextContent(el);
  data.set(attr.name, text);
};

/**
 * @param {Element} el
 * @api private
 */
Observe.handleUnknownElement = function (el) {
  var text = utils.getTextContent(el);
  var node = document.createTextNode(text);
  el.parentElement.replaceChild(node, el);
};

/**
 * @param {Element} el
 * @returns {Number}
 * @api private
 */
Observe.getOffset = function (el) {
  var parentElement = el.parentNode;
  var beforeHTML, beforeText, tmp;
  var offset = {
    start: 0,
    end: 0
  };

  var check = function () {
    return parentElement
      && utils.isElementNode(parentElement)
      && !parentElement.getAttribute('name');
  };

  while (check()) {
    parentElement = parentElement.parentElement;
  }

  if (parentElement) {
    tmp = document.createElement('div');
    offset.start = parentElement.innerHTML.indexOf(el.outerHTML);
    beforeHTML = parentElement.innerHTML.substr(0, offset.start);
    tmp.innerHTML = beforeHTML;
    beforeText = utils.getTextContent(tmp);
    offset.start -= beforeHTML.length - beforeText.length;
    offset.end = offset.start + utils.getTextContent(el).length;
  }

  return offset;
};

/**
 * @returns {Object}
 * @api public
 */
Observe.prototype.toJSON = function () {
  if (!this.structure) {
    this.sync();
  }

  var structure = this.structure;
  var sections = structure.sections;
  var paragraphs = structure.paragraphs;
  var data = this.data;

  var json = {
    sections: [],
    paragraphs: []
  };

  sections.forEach(function (name) {
    var section = data[name];
    var d = section && section.toJSON() || {};

    d.name = name;

    json.sections.push(d);
  });

  paragraphs.forEach(function (name) {
    var paragraph = data[name];
    var d = paragraph && paragraph.toJSON() || {};
    
    d.name = name;

    d.detail = (d.detail || []).map(getDetailData);

    json.paragraphs.push(d);
  });

  function getDetailData(name) {
    var detail = data[name];
    var d = detail && detail.toJSON() || {};
    
    d.name = name;

    return d;
  }

  return json;
};

Observe.rules = {
  section: {
    paragraph: 1,
    paragraphs: 1,
    figure: 1
  },

  paragraphs: {
    paragraph: 1
  },

  paragraph: {
    detail: 1
  },

  detail: {}
};

/**
 * @param {Element} el
 * @api private
 */
Observe.checkAndRemoveStrangeElement = function (el) {
  var type = utils.getType(el);
  var parentType = utils.getType(el.parentElement);
  var shouldRemove = true;

  if (type && parentType) {
    if (Observe.rules[parentType][type]) {
      shouldRemove = false;
    }
  } else if (el.parentElement === this.el) {
    if (type === 'section') {
      shouldRemove = false;
    }
  }

  if (shouldRemove) {
    el.parentElement.removeChild(el);
  }
};

},{"../data":37,"../schema":62,"../utils":63}],47:[function(require,module,exports){
'use strict';

module.exports = function (editor) {
  return function (next) {
    if (this.super && this.key.toLowerCase() === 'a') {
      this.prevent();
      editor.caret.selectAll(editor.el);
    } else {
      next();
    }
  };
};

},{}],48:[function(require,module,exports){
'use strict';

var utils = require('../utils');

module.exports = function () {
  return function (next) {
    var needToCreateElement = this.key === 'enter'
      && this.section === this.editor.caret.focusSection()
      && !this.shift
      && utils.isTag('p', this.element)
      && this.element.parentElement
      && this.editor.caret.atElementEnd(this.element);

    if (needToCreateElement) {
      this.prevent();
      var el = document.createElement('p');
      this.element.parentElement.insertBefore(el, this.element.nextSibling);
      this.editor.caret.focusTo(el);
    }

    next();
  };
};

},{"../utils":63}],49:[function(require,module,exports){
'use strict';

var utils = require('../utils');

module.exports = function (editor) {
  var atElementStart = function (ctx) {
    var selection = document.getSelection();
    var el = ctx.paragraph;

    return !(selection + '')
      && utils.isType(['paragraph', 'paragraphs', 'section'], el)
      && editor.caret.atElementStart(el);
  };

  var handleList = function (ctx) {
    var el = ctx.paragraph;
    var paragraphs = ctx.paragraphs;

    if (paragraphs && utils.isFirstElementOf(paragraphs, el)) {
      ctx.prevent();

      var p = document.createElement('p');

      utils.moveChildNodes(el, p);
      utils.removeElement(el);

      ctx.section.insertBefore(p, paragraphs);

      if (utils.isEmpty(paragraphs)) {
        utils.removeElement(paragraphs);
      }

      editor.caret.moveToStart(p);
    }
  };

  var handleOthers = function (ctx) {
    ctx.prevent();

    var el = ctx.paragraph;
    var previous = el.previousElementSibling;
    var needToRemove, offset, firstChild, lastNode;

    if (previous) {
      needToRemove = el;
    } else {
      needToRemove = ctx.section;
    }

    previous = needToRemove.previousElementSibling;

    if (needToRemove && previous) {
      if (utils.isType('paragraphs', previous)) {

        // ul/ol 要特別處理
        // 如果使用跟其他地方相同方式的作法
        // 會造成 ul/ol 多出一個 br
        if(previous.lastChild && utils.isTag('li', previous.lastChild)) {
          var focus = previous.lastChild.lastChild;

          utils.moveChildNodes(el, previous.lastChild);
          utils.removeElement(el);

          if (focus) {
            editor.caret.moveToEnd(focus);
          } else {

            // 原本的 li 是空的
            // 所以直接把指標移到 li 最前面就可以了
            editor.caret.moveToStart(previous.lastChild);
          }
        } else {
          // 忽略動作
        }
      } else {
        firstChild = needToRemove.firstChild;
        lastNode = previous.childNodes[previous.childNodes.length - 1];
        offset = utils.getTextContent(lastNode).length;

        if (utils.isElementNode(lastNode) && utils.isTag('br', lastNode)) {
          utils.removeElement(lastNode);
          lastNode = null;
        }

        utils.removeEmptyElements(previous);

        utils.moveChildNodes(needToRemove, previous);

        needToRemove.parentElement.removeChild(needToRemove);

        if (utils.isType('section', needToRemove)) {
          // section 的情況是要讓游標在畫面上跟著目前 element 移動
          editor.caret.focusTo(firstChild);
        } else if (lastNode) {
          // 段落的情況是要讓兩個 element 接起來後，游標移動到合併的位置
          editor.caret.moveToStart(lastNode, offset);
        } else {
          editor.caret.moveToStart(previous);
        }
      }
    } else {
      previous = ctx.node.previousSibling;

      var previousIsBrTag = function () {
        return previous
          && utils.isElementNode(previous)
          && utils.isTag('br', previous);
      };
      
      if (previousIsBrTag()) {
        offset = utils.getTextContent(previous.previousSibling).length;
        previous.parentElement.removeChild(previous);
        editor.caret.moveToStart(ctx.node.previousSibling, offset);
      }
    }
  };

  var shouldCombineList = function () {
    var el = editor.caret.focusParagraphs();
    var next = el && el.nextElementSibling;
    
    return next
      && next.tagName === el.tagName;
  };

  var combineList = function () {
    var el = editor.caret.focusParagraphs();
    var next = el.nextElementSibling;
    
    utils.moveChildNodes(next, el);
    utils.removeElement(next);
  };

  return function (next) {
    if (this.key !== 'backspace') {
      return next();
    }

    var el = this.paragraph;

    if (atElementStart(this)) {
      // 段落前面已經沒有文字
      // 需要刪除 element
      if (utils.isTag('li', el)) {
        handleList(this, next);
      } else {
        handleOthers(this, next);
      }
    } else if (this.figure) {
      this.prevent();

      var previous = this.figure.previousElementSibling;

      utils.removeElement(this.figure);
      editor.caret.moveToEnd(previous);
    }

    // 兩個 list 相鄰的時候應該要合併他們
    if (shouldCombineList()) {
      combineList();
    }

    next();
  };
};

},{"../utils":63}],50:[function(require,module,exports){
'use strict';

var utils = require('../utils');

module.exports = function (editor) {
  return function (next) {
    var el = this.paragraph;

    if (!utils.isTag('blockquote', el)) {
      return next();
    }

    // 目前只處理換段落的情況
    if (!(this.key === 'enter' && !this.shift)) {
      return next();
    }

    this.prevent();

    if (editor.caret.atElementEnd(el)) {

      // 所有行尾換行都要建立新 <p>
      // 沒有例外

      var p = document.createElement('p');

      p.innerHTML = '<br />';
      this.section.insertBefore(p, el.nextSibling);
      editor.caret.moveToStart(p);

    } else if (editor.caret.atElementStart(el)) {

      // 行首在前面插入 element
      var quote = document.createElement('blockquote');

      quote.innerHTML = '<br />';
      this.section.insertBefore(quote, el);
      //editor.caret.moveToStart(quote);

    } else {

      // 其他情況下都將現有的 blockquote 分割
      editor.caret.split(el);
    }

    next();
  };
};

},{"../utils":63}],51:[function(require,module,exports){
'use strict';

var utils = require('../utils');

module.exports = function (editor) {
  editor.on('walk', function (ctx) {
    var el = ctx.element;

    if (!el.innerHTML.trim()) {
      if (utils.isType('paragraph', el)) {
        el.innerHTML = '<br type="_med_placeholder" />';
      } else if (utils.isType('section', el)) {
        el.innerHTML = '<p><br type="_med_placeholder" /></p>';
      }
    }
  });
};

},{"../utils":63}],52:[function(require,module,exports){
'use strict';

var utils = require('../utils');

module.exports = function (editor) {
  var klass = 'is-active';

  var removeActive = function (el) {
    var figure = editor.el.querySelector('figure.is-active');

    if (figure && figure !== el) {
      figure.classList.remove(klass);
    }
  };

  editor.on('walkEnd', function () {
    var figure = editor.caret.focusFigure();

    if (figure) {
      figure.classList.add(klass);
    }

    removeActive(figure);
  });

  editor.el.addEventListener('mousedown', function (e) {
    var el = e.target;
    
    if (!utils.isAncestorOf(editor.caret.focusNode(), editor.el)) {
      editor.caret.moveToStart(el);
    }

    while (1) {
      if (!el || el === editor.el) {
        el = null;
        break;
      }

      if (utils.isTag('figure', el)) {
        break;
      }

      el = el.parentElement;
    }

    if (el) {
      el.classList.add(klass);
    }

    removeActive(el);
  });

  editor.el.addEventListener('blur', function () {
    removeActive();
  });

  return function (next) {
    next();
  };
};

},{"../utils":63}],53:[function(require,module,exports){
'use strict';

var utils = require('../utils');

module.exports = function (editor) {
  var leaveList = function (ctx) {
    ctx.prevent();

    var el = ctx.paragraph;
    var p = document.createElement('p');

    p.innerHTML = '<br />';

    if (utils.isLastElementOf(ctx.paragraphs, el)) {
      // 是最後一個 item
      // 需要把新 p 塞到 list 後面

      ctx.section.insertBefore(p, ctx.paragraphs.nextSibling);
      utils.removeElement(el);
    } else {
      // 在 list 中間
      // 需要把 list 分半，然後在中間插入新 p

      utils.removeElement(el);
      editor.caret.split(ctx.paragraphs);
      ctx.section.insertBefore(p, ctx.paragraphs);
    }

    editor.caret.moveToStart(p);
  };

  var leaveAndMoveContentToNewElement = function (ctx) {
    var el = ctx.paragraph;
    var p = document.createElement('p');

    p.innerHTML = el.innerHTML;
    utils.removeElement(el);

    ctx.section.insertBefore(p, ctx.paragraphs.nextSibling);

    editor.caret.moveToStart(p);
  };

  return function (next) {
    var el = this.paragraph;

    if (!utils.isTag('li', el)) {
      return next();
    }

    // li 上換行有可能自動插入 <p>
    // 所以必須自己處理換行動作
    if (this.key === 'enter' && !this.shift) {
      if (utils.isEmpty(el)) {

        // 空行，要讓使用者跳離 ul/ol
        leaveList(this);

      } else if (editor.caret.atElementEnd(el)) {

        // 行尾換行預設動作會自動插入 <p>
        this.prevent();
        editor.caret.split(el);

      } else if (editor.caret.atElementStart(el)
          && utils.isLastElementOf(this.paragraphs, el)) {
        
        // 行首換行跳離 <ul>/<ol>
        this.prevent();
        leaveAndMoveContentToNewElement(this);

      }
    }

    next();
  };
};

},{"../utils":63}],54:[function(require,module,exports){
'use strict';

var utils = require('../utils');

var shouldHandleThis = function (ctx) {
  return !ctx.modifier
    && utils.isTag('p', ctx.paragraph)
    && isCreateNewLineAction(ctx);
};

var isCreateNewLineAction = function (ctx) {
  return ctx.key === 'enter'
    && !ctx.shift;
};

var createNewLine = function (ctx, next) {
  var editor = ctx.editor;
  var el = ctx.paragraph;

  if (utils.isEmpty(el)) {
    ctx.prevent();

    var section = ctx.section;

    // 目前這一行是空的
    // 需要建立一個新的 <section>

    if (section) {
      if (utils.isNotEmpty(section)) {
        var p;

        utils.removeEmptyElements(section);
        editor.caret.split(section);

        p = document.createElement('p');
        p.innerHTML = '<br />';

        section.insertBefore(p, section.firstChild);

        editor.caret.moveToStart(p);

        next();
      }
    } else {
      section = document.createElement('section');

      section.appendChild(el);
      editor.el.appendChild(section);
      editor.caret.moveToStart(el);

      next();
    }
  } else if (editor.caret.atElementStart(el)) {
    ctx.prevent();

    // 在行頭
    // 需要把 section 分段
    editor.caret.split(ctx.section);

    utils.removeEmptyElements(ctx.section);

    // 如果 <section> 是空的就不能把 <p> 移除
    // 移除會造成使用者直接輸入文字在 section 內
    if (utils.isNotEmpty(ctx.section.previousElementSibling)) {
      utils.removeEmptyElements(ctx.section.previousElementSibling);
    }

    next();
  }
};

module.exports = function () {
  return function (next) {
    if (!shouldHandleThis(this)) {
      return next();
    }

    createNewLine(this, next);
  };
};

},{"../utils":63}],55:[function(require,module,exports){
'use strict';

var plugins = module.exports = {};

plugins.commandA = require('./command-a');
plugins.preventDefault = require('./prevent-default');
plugins.createNewParagraph = require('./create-new-paragraph');
plugins.handleBackspace = require('./handle-backspace');
plugins.handleBlockquote = require('./handle-blockquote');
plugins.handleEmptyParagraph = require('./handle-empty-paragraph');
plugins.handleFigure = require('./handle-figure');
plugins.handleList = require('./handle-list');
plugins.handleParagraph = require('./handle-paragraph');
plugins.initContext = require('./init-context');
plugins.refocus = require('./refocus');
plugins.removeExtraNodes = require('./remove-extra-nodes');
plugins.removeInlineStyle = require('./remove-inline-style');
plugins.renameElements = require('./rename-elements');

},{"./command-a":47,"./create-new-paragraph":48,"./handle-backspace":49,"./handle-blockquote":50,"./handle-empty-paragraph":51,"./handle-figure":52,"./handle-list":53,"./handle-paragraph":54,"./init-context":56,"./prevent-default":57,"./refocus":58,"./remove-extra-nodes":59,"./remove-inline-style":60,"./rename-elements":61}],56:[function(require,module,exports){
'use strict';

var keyboard = require('../keyboard');
var utils = require('../utils');

module.exports = function () {
  return function (next) {
    var e = this.event;
    var code = e.keyCode || e.which;
    var mod = keyboard.modifiers[code];

    var editor = this.editor;

    this.modifier = mod;
    this.ctrl = e.ctrlKey;
    this.option = this.alt = e.altKey;
    this.shift = e.shiftKey;
    this.command = this.meta = e.metaKey;
    this.code = code;
    this.key = keyboard.map[code] || String.fromCharCode(code);
    this.super = this[keyboard.super];
    this.node = editor.caret.focusNode();
    this.element = editor.caret.focusElement();
    this.nextElement = editor.caret.nextElement();
    this.section = editor.caret.focusSection();
    this.paragraph = editor.caret.focusParagraph();
    this.paragraphs = editor.caret.focusParagraphs();
    this.figure = editor.el.querySelector('figure.is-active');
    this.detail = editor.caret.focusDetail();

    var els = editor.el.querySelectorAll('br[type="_med_placeholder"]');

    Array.prototype.forEach.call(els, function (el) {
      utils.removeElement(el);
    });

    next();
  };
};

},{"../keyboard":41,"../utils":63}],57:[function(require,module,exports){
'use strict';

module.exports = function () {
  return function (next) {
    var el = this.element;

    if (this.key === 'backspace' && this.editor.isEmpty()) {
      this.prevent();
      return;
    }

    if (!!~[document.body, this.section].indexOf(el)) {
      this.prevent();
      return;
    }

    next();
  };
};

},{}],58:[function(require,module,exports){
'use strict';

module.exports = function (editor) {
  editor.on('walkEnd', function (ctx) {
    var node = ctx.focusTo;
    var offset = ctx.focusOffset;

    if (node) {
      ctx.editor.caret.select(node, offset, node, offset);
    }
  });
};

},{}],59:[function(require,module,exports){
'use strict';

var utils = require('../utils');

module.exports = function (editor) {
  var removeExtraNode = function (ctx) {
    var el = ctx.element;
    var focus = ctx.editor.caret.focusElement();
    var nodes = el.childNodes;
    var len = nodes.length;
    var curr, prev, lastNode;

    var neetToCombine = function () {
      return prev
        && prev.nodeType === curr.nodeType
        && utils.isAllowedToHaveContent(prev);
    };
    
    while (len--) {
      curr = nodes[len];
      prev = nodes[len - 1];

      if (neetToCombine()) {
        
        // 目前要刪除的 element
        // 就是正被使用者 focus 的 element
        if (prev === focus) {
          lastNode = utils.lastNode(focus);
          ctx.focusTo = lastNode;
          ctx.focusOffset = lastNode.length;
        }

        if (utils.isTextNode(prev)) {
          prev.appendData(curr.data);
        } else if (utils.isElementNode(prev)) {
          utils.moveChildNodes(curr, prev);
        }

        curr.parentNode.removeChild(curr);
      }
    }
  };

  editor.on('walk', function (ctx) {
    if (utils.isType('paragraph', ctx.element)) {
      removeExtraNode(ctx);
    }
  });
};

},{"../utils":63}],60:[function(require,module,exports){
'use strict';

module.exports = function (editor) {
  editor.on('walk', function (ctx) {
    // chrome
    ctx.el.setAttribute('style', '');
  });
};

},{}],61:[function(require,module,exports){
'use strict';

module.exports = function (editor) {
  editor.on('walkStart', function (ctx) {
    ctx.names = {};
  });

  editor.on('walk', function (ctx) {
    if (ctx.names[ctx.name]) {
      ctx.el.setAttribute('name', '');
    } else {
      ctx.names[ctx.name] = 1;
    }
  });
};

},{}],62:[function(require,module,exports){
'use strict';

var schema = module.exports = {
  section: {
    type: 'section'
  },

  h1: {
    type: 'paragraph',
    text: 'content'
  },

  h2: {
    type: 'paragraph',
    text: 'content'
  },

  h3: {
    type: 'paragraph',
    text: 'content'
  },

  h4: {
    type: 'paragraph',
    text: 'content'
  },

  h5: {
    type: 'paragraph',
    text: 'content'
  },

  h6: {
    type: 'paragraph',
    text: 'content'
  },

  p: {
    type: 'paragraph',
    text: 'content'
  },

  blockquote: {
    type: 'paragraph',
    text: 'content',
    quoteTpye: 'dataset:type'
  },

  figure: {
    type: 'figure'
  },

  ol: {
    type: 'paragraphs'
  },

  ul: {
    type: 'paragraphs'
  },

  li: {
    type: 'paragraph',
    text: 'content'
  },

  a: {
    type: 'detail',
    href: 'attribute',
    title: 'attribute'
  },

  b: {
    type: 'detail'
  },

  i: {
    type: 'detail'
  },

  br: {
    type: 'detail'
  }
};

Object.keys(schema).forEach(function (tagName) {
  var tag = schema[tagName];
  var type = tag.type;
  var attrs = [];

  delete tag.type;

  Object.keys(tag).forEach(function (attrName) {
    var attr = tag[attrName];
    var args = attr.split(':');
    var attrType = args.shift();

    attrs.push({
      name: args[0] || attrName,
      type: attrType,
      args: args
    });
  });

  schema[tagName] = {
    type: type,
    attrs: attrs
  };
});

},{}],63:[function(require,module,exports){
'use strict';

var utils = module.exports = {};

require('./node')(utils);
require('./others')(utils);
require('./schema')(utils);

},{"./node":64,"./others":65,"./schema":66}],64:[function(require,module,exports){
'use strict';

module.exports = function (utils) {
  /**
   * @param {Node} node
   * @returns {String}
   * @api public
   */
  utils.getTextContent = function (node) {
    var text;

    if (!node) {
      return '';
    }

    switch (node.nodeType) {
    case document.ELEMENT_NODE:
      text = node.textContent
        || node.innerText
        || '';
      break;
    case document.TEXT_NODE:
      text = node.data;
      break;
    default:
      text = '';
    }

    return text;
  };

  /**
   * @param {Node} node
   * @api public
   */
  utils.setNodeContent = function (node, content) {
    if (utils.isTextNode(node)) {
      node.data = content;
    } else {
      node.innerHTML = content;
    }
  };

  /**
   * @param {Element} el
   * @returns {Boolean}
   * @api public
   */
  utils.isEmpty = function (el) {
    if (!utils.isAllowedToHaveContent(el)) {
      return false;
    }
    return !utils.getTextContent(el).trim();
  };

  /**
   * @parame {Element} el
   * @returns {Boolean}
   * @api public
   */
  utils.isStrictEmpty = function (el) {
    if (!utils.isAllowedToHaveContent(el)) {
      return false;
    }
    return !el.innerHTML.trim();
  };

  /**
   * @param {Element} el
   * @returns {Boolean}
   * @api public
   */
  utils.isNotEmpty = function (el) {
    return !utils.isEmpty(el);
  };

  /**
   * @param {Element} el
   * @returns {Boolean}
   * @api public
   */
  utils.isNotStrictEmpty = function (el) {
    return !utils.isStrictEmpty(el);
  };

  /**
   * @param {String} tagName
   * @param {Element} el
   * @returns {Boolean}
   * @api public
   */
  utils.isTag = function (tagName, el) {
    if (!el) {
      return false;
    }

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

  utils.isAllowedToHaveContent = function (el) {
    return !utils.isTag([
      'br',
      'input',
      'img'
    ], el);
  };

  /**
   * @param {Element} el
   * @returns {Boolean}
   * @api public
   */
  utils.isLastChild = function (el) {
    return el.parentELement.lastChild === el;
  };

  /**
   * @param {Element} el
   * @api public
   */
  utils.removeEmptyElements = function (el) {
    var shouldRemoveParagraphs = function (child) {
      return utils.isType('paragraphs', child)
        && utils.isEmpty(child);
    };

    var shouldRemoveP = function (child) {
      return utils.isTag('p', child)
        && utils.isEmpty(child)
        && !utils.isFirstElementOf(child.parentElement, child);
    };

    var shouldRemoveParagraph = function (child) {
      return utils.isType('paragraph', child)
        && utils.isStrictEmpty(child);
    };

    utils.each(el.children, function (child) {
      var shouldRemove = shouldRemoveParagraphs(child)
        || shouldRemoveP(child)
        || shouldRemoveParagraph(child);

      if (shouldRemove) {
        utils.removeElement(child);
      } else {
        utils.removeEmptyElements(child);
      }
    });
  };

  /**
   * @param {Element} el
   * @api public
   */
  utils.removeElement = function (el) {
    if (el.parentElement) {
      el.parentElement.removeChild(el);
    }
  };

  /**
   * @param {Element} src
   * @param {Element} dest
   * @api public
   */
  utils.moveChildren = function (src, dest) {
    var children = Array.prototype.slice.call(src.children);

    utils.each(children, function (child) {
      dest.appendChild(child);
    });
  };

  /**
   * @param {Element} src
   * @param {Element} dest
   * @api public
   */
  utils.moveChildNodes = function (src, dest) {
    var nodes = Array.prototype.slice.call(src.childNodes);

    utils.each(nodes, function (node) {
      dest.appendChild(node);
    });
  };

  /**
   * @param {String|String[]} types
   * @param {Element} el
   * @returns {Boolean}
   * @api public
   */
  utils.isType = function (types, el) {
    var s = utils.getElementSchema(el);

    if (typeof types === 'string') {
      types = [types];
    }

    return s && !!~types.indexOf(s.type);
  };

  /**
   * @param {Node} node
   * @returns {Boolean}
   * @api public
   */
  utils.isElementNode = function (node) {
    return node && node.nodeType === document.ELEMENT_NODE;
  };

  /**
   * @param {Node} node
   * @returns {Boolean}
   * @api public
   */
  utils.isTextNode = function (node) {
    return node && node.nodeType === document.TEXT_NODE;
  };

  /**
   * @param {Node} node
   * @param {Node} ancestor
   * @returns {Boolean}
   * @api public
   */
  utils.isAncestorOf = function (node, ancestor) {
    var parents = utils.getParents(node);
    return !!~parents.indexOf(ancestor);
  };

  /**
   * @param {Node} node
   * @returns {Element[]}
   * @api public
   */
  utils.getParents = function (node) {
    var parents = [];
    var parentNode;

    if (!node) {
      return parents;
    }

    while (parentNode = node.parentNode) {
      parents.push(parentNode);
      node = parentNode;
    }

    return parents;
  };

  /**
   * @param {Node} node
   * @returns {Number}
   * @api public
   */
  utils.nodeContentLength = function (node) {
    return utils.getTextContent(node).length;
  };

  /**
   * @param {Node} node
   * @returns {Node}
   * @api public
   */
  utils.lastNode = function (node) {
    return node
      && node.childNodes[node.childNodes.length - 1];
  };

  /**
   * @param {Node} node
   * @returns {Text}
   * @api public
   */
  utils.lastTextNode = function (node) {
    if (!node) {
      return null;
    }

    if (utils.isTextNode(node)) {
      return node;
    }

    var nodes = Array.prototype.slice.call(node.childNodes);

    while (node = nodes.pop()) {
      if (node = utils.lastTextNode(node)) {
        return node;
      }
    }

    return null;
  };

  /**
   * @param {Node} node
   * @returns {Element}
   * @api public
   */
  utils.lastElement = function (node) {
    return node
      && node.children[node.children.length - 1];
  };

  /**
   * @param {Node} node
   * @returns {Node}
   * @api public
   */
  utils.firstNode = function (node) {
    return node
      && node.childNodes[0];
  };

  /**
   * @param {Node} node
   * @returns {Text}
   * @api public
   */
  utils.firstTextNode = function (node) {
    if (!node) {
      return null;
    }

    if (utils.isTextNode(node)) {
      return node;
    }

    var nodes = Array.prototype.slice.call(node.childNodes);

    while (node = nodes.shift()) {
      if (node = utils.lastTextNode(node)) {
        return node;
      }
    }

    return null;
  };

  /**
   * @param {Node} node
   * @returns {Element}
   * @api public
   */
  utils.firstElement = function (node) {
    return node
      && node.children[0];
  };

  /**
   * @param {Element} container
   * @param {Element} el
   * @returns {Boolean}
   * @api public
   */
  utils.isLastElementOf = function (container, el) {
    var lastElement = utils.lastElement(container);
    return lastElement === el;
  };

  /**
   * @param {Element} container
   * @param {Element} el
   * @returns {Boolean}
   * @api public
   */
  utils.isFirstElementOf = function (container, el) {
    var firstElement = utils.firstElement(container);
    return firstElement === el;
  };
};

},{}],65:[function(require,module,exports){
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

},{}],66:[function(require,module,exports){
'use strict';

var schema = require('../schema');

module.exports = function (utils) {
  utils.getType = function (el) {
    var s = utils.getElementSchema(el);
    return s ? s.type : null;
  };

  utils.getElementSchema = function (el) {
    return el
      && schema[el.tagName.toLowerCase()]
      || null;
  };
};

},{"../schema":62}],67:[function(require,module,exports){
var expect = require('chai').expect;
var Data = require('../src/data');

describe('Data', function () {
  describe('#set(key, val)', function () {
    it('should set value to `.tmp`', function () {
      var data = new Data();
      data.set('test', 'test value');
      data.set('su.b', 'sub');
      expect(data.tmp.test).to.be.equal('test value');
      expect(data.tmp['su.b']).to.be.equal('sub');
    });

    it('should set value to `.data`', function () {
      var data = new Data();
      data._set('test', 'test value');
      data._set('su.b', 'sub');
      expect(data.data.test).to.be.equal('test value');
      expect(data.data.su.b).to.be.equal('sub');
    });
  });

  describe('#get(key)', function () {
    it('should get value from `.tmp`', function () {
      var data = new Data();
      data.tmp.test = 'tmp';
      data.data.test = 'data';
      expect(data.get('test')).to.be.equal('tmp');
    });

    it('should get value from `.data`', function () {
      var data = new Data();
      data.data.test = 'data';
      expect(data.get('test')).to.be.equal('data');
    });
  });

  describe('.modified', function () {
    it('should update `.modified` value when data has changed', function () {
      var data = new Data();
      
      data.set('h.e.l.l.o', 'hello');

      expect(data.modified).to.be.true;

      data.modified = false;
      data.set('h.e.l.l.o', 'hello');

      expect(data.modified).to.be.false;
    });
  });

  describe('#update()', function () {
    it('should copy all values from `.tmp` to `.data`', function () {
      var data = new Data();
      
      data.set('h.e.l.l.o', 'hello');
      data.set('test', 'test');

      expect(data.modified).to.be.true;

      data.update();

      expect(data.modified).to.be.false;
      expect(Object.keys(data.tmp)).to.have.length(0);
      expect(data.get('h.e.l.l.o', 'hello'));
      expect(data.get('test', 'test'));
    });
  });
});

},{"../src/data":37,"chai":4}],68:[function(require,module,exports){
var expect = require('chai').expect;
var Emitter = require('../src/emitter');

describe('Emitter', function () {
  describe('#on(event, handler)', function () {
    it('should work', function () {
      var emitter = new Emitter();
      var handler = function () {};
      emitter.on('test', handler);
      expect(emitter.events.test).to.have.length(1);
    });
  });

  describe('#off(event, handler)', function () {
    it('should remove the handler', function () {
      var emitter = new Emitter();
      var handler = function () {};

      emitter.on('test', handler);
      emitter.off('test', handler);

      expect(emitter.events.test).to.have.length(0);
    });
  });


  describe('#emit(event, [arg1], [arg2], [...])', function () {
    it('should work', function () {
      var emitter = new Emitter();
      var arg1 = {}, arg2 = {};

      emitter.on('test', function (a1, a2) {
        expect(a1).to.be.equal(arg1);
        expect(a2).to.be.equal(arg2);
      });

      emitter.emit('test', arg1, arg2);
    });
  });

  describe('#once(event, handler)', function () {
    it('should execute the handler only once', function () {
      var emitter = new Emitter();
      var counter = 0;

      emitter.once('test', function () {
        counter += 1;
      });

      emitter.emit('test');
      emitter.emit('test');

      expect(counter).to.be.equal(1);
    });
  });
});

},{"../src/emitter":39,"chai":4}],69:[function(require,module,exports){
var expect = require('chai').expect;
var Med = require('../src/main');
var HtmlBuilder = require('../src/mixin/html-builder');
var Data = require('../src/data');

var createName = (function () {
  var n = 0;
  return function () {
    return ++n;
  };
})();

var json = {
  sections: [
    {
      tag: 'section',
      name: createName(),
      start: 0,
      end: 2
    }
  ],
  paragraphs: [
    {
      name: createName(),
      tag: 'p',
      text: 'abc',
      detail: [
        {
          name: createName(),
          start: 0,
          end: 1,
          tag: 'i'
        }
      ]
    },
    {
      name: createName(),
      tag: 'p',
      text: '123',
      detail: []
    }
  ]
};

describe('HtmlBuilder', function () {
  var els = [];

  after(function () {
    els.forEach(function (el) {
      el.parentElement.removeChild(el);
    });
  });

  describe('.importData(json)', function () {
    it('should turn JSON to `Data`', function () {
      var el = document.createElement('div');

      document.body.appendChild(el);

      var med = new Med({ el: el });
      var p, d;

      els.push(el);

      HtmlBuilder.importData.call(med, json);
      
      expect(med.structure.sections).to.have.length(1);
      expect(med.structure.paragraphs).to.have.length(2);

      p = med.data[med.structure.paragraphs[0]];

      expect(p).to.be.an.instanceof(Data);
      expect(p.get('text')).to.be.equal('abc');

      d = med.data[p.get('detail')[0]];

      expect(d).to.be.an.instanceof(Data);
      expect(d.get('start')).to.be.equal(0);
      expect(d.get('end')).to.be.equal(1);
    });
  });

  describe('.fromJSON(json)', function () {
    it('should turn JSON to HTML', function () {
      var el = document.createElement('div');

      document.body.appendChild(el);

      var med = new Med({ el: el });
      var html = ''
        + '<section name="1">'
          + '<p name="2"><i name="3">a</i>bc</p>'
          + '<p name="4">123</p>'
        + '</section>';

      els.push(el);

      med.fromJSON(json);

      expect(med.el.innerHTML).to.be.equal(html);
    });
  });

  describe('.attribute()', function () {
    it('should update attribute value of element', function () {
      var el = document.createElement('div');
      var data = new Data();

      data.set('test', 'value');

      HtmlBuilder.attribute(el, data, { name: 'test' });

      expect(el.getAttribute('test')).to.be.equal('value');
    });
  });

  describe('.dataset()', function () {
    it('should update dataset value of element', function () {
      var el = document.createElement('div');
      var data = new Data();

      data.set('test', 'value');

      HtmlBuilder.dataset(el, data, { name: 'test' });

      expect(el.getAttribute('data-test')).to.be.equal('value');
    });
  });

  describe('.content()', function () {
    it('should update content of element', function () {
      var el = document.createElement('div');
      var data = new Data();

      data.set('test', 'value');

      HtmlBuilder.content(el, data, { name: 'test' });

      expect(el.textContent || el.innerText).to.be.equal('value');
    });
  });
});

},{"../src/data":37,"../src/main":42,"../src/mixin/html-builder":44,"chai":4}],70:[function(require,module,exports){
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

},{"../src/mixin/middleware":45,"chai":4}],71:[function(require,module,exports){
var expect = require('chai').expect;
var Med = require('../src/main');
var Data = require('../src/data');
var Observe = require('../src/mixin/observe');

describe('Observe', function () {
  var els = [];

  after(function () {
    els.forEach(function (el) {
      el.parentElement.removeChild(el);
    });
  });

  var createElement = function () {
    var el = document.createElement('div');

    el.style.display = 'none';
    document.body.appendChild(el);
    els.push(el);

    return el;
  };

  describe('get values from element', function () {
    describe('.attribute(el, data, attr)', function () {
      it('should get attribute value from the element', function () {
        var el = document.createElement('div');
        var attr = { name: 'name' };
        var data = new Data();

        el.setAttribute(attr.name, 'test');
        Observe.attribute(el, data, attr);

        expect(data.get('name')).to.be.equal('test');
      });
    });

    describe('.dataset(el, data, attr)', function () {
      it('should get dataset value from the element', function () {
        var el = document.createElement('div');
        var attr = { name: 'name' };
        var data = new Data();

        el.setAttribute('data-' + attr.name, 'test');
        Observe.dataset(el, data, attr);

        expect(data.get('name')).to.be.equal('test');
      });
    });

    describe('.content(el, data, attr)', function () {
      it('should get text content from the element', function () {
        var el = document.createElement('div');
        var attr = { name: 'name' };
        var data = new Data();

        el.innerHTML = '<b>test</b>';
        Observe.content(el, data, attr);

        expect(data.get('name')).to.be.equal('test');
      });
    });

    describe('.handleUnknownElement(el)', function () {
      it('should clone the element content and remove that element', function () {
        var p = document.createElement('p');
        var b;

        p.innerHTML = 'no <b>child elements</b> here';
        b = p.children[0];

        Observe.handleUnknownElement(b);

        // ['no ', 'child elements', ' here']
        expect(p.childNodes.length).to.be.equal(3);
        expect(p.children.length).to.be.equal(0);
        expect(p.childNodes[1].nodeType).to.be.equal(document.TEXT_NODE);
        expect(p.innerHTML).to.be.equal('no child elements here');
      });
    });

    describe('.getOffset(el)', function () {
      it('should get offset of the element relative to that element\'s parent element', function () {
        var p = document.createElement('p');
        var b, offset;

        p.setAttribute('name', 'test');
        p.innerHTML = 'no <b>child elements</b> here';
        b = p.children[0];

        offset = Observe.getOffset(b);

        expect(offset.start).to.be.equal(3);
        expect(offset.end).to.be.equal(17);
      });
    });

    describe('.sync()', function () {
      it('should turn elements (except ul/ol) to data object', function () {
        var el = createElement();
        var med = new Med({ el: el });
        var firstSection, p, i, b;

        el.innerHTML = '<section><p>hello</p><p><i>world</i> <b>!</b></p></section><section><p>section 2</p></section>';
        
        med.sync();

        expect(med.structure.sections).to.have.length(2);
        expect(med.structure.paragraphs).to.have.length(3);

        firstSection = med.data[med.structure.sections[0]];
        expect(firstSection.get('start')).to.be.equal(0);
        expect(firstSection.get('end')).to.be.equal(2);

        p = med.data[med.structure.paragraphs[1]];
        i = med.data[p.get('detail')[0]];
        b = med.data[p.get('detail')[1]];

        expect(p.get('text')).to.be.equal('world !');
        expect(i.get('start')).to.be.equal(0);
        expect(i.get('end')).to.be.equal(5);
        expect(b.get('start')).to.be.equal(6);
        expect(b.get('end')).to.be.equal(7);
      });

      it('should turn ul/ol to data object', function () {
        var el = createElement();
        var med = new Med({ el: el });
        var li2;

        el.innerHTML = '<section><ul><li>item 1</li><li><b>item 2</b></li></ul></section>';
        
        med.sync();

        expect(med.structure.paragraphs).to.have.length(3);

        li2 = med.data[med.structure.paragraphs[1]];

        expect(li2.get('detail')).to.have.length(1);
        expect(li2.get('text')).to.be.equal('item 2');
      });
    });

    describe('#toJSON()', function () {
      it('should turn elements (except ol/ul) to JSON', function () {
        var el = createElement();
        var med = new Med({ el: el });
        var json;

        el.innerHTML = '<section><p>hello</p><p><i>world</i> <b>!</b></p></section><section><p>section 2</p></section>';
        
        med.sync();

        json = med.toJSON();

        expect(json.sections).to.have.length(2);
        expect(json.paragraphs).to.have.length(3);

        expect(json.sections[0].start).to.be.equal(0);
        expect(json.sections[0].end).to.be.equal(2);

        expect(json.paragraphs[1].text).to.be.equal('world !');
        expect(json.paragraphs[1].detail[0].start).to.be.equal(0);
        expect(json.paragraphs[1].detail[0].end).to.be.equal(5);
        expect(json.paragraphs[1].detail[1].start).to.be.equal(6);
        expect(json.paragraphs[1].detail[1].end).to.be.equal(7);
      });

      it('should turn ol/ul to JSON', function () {
        var el = createElement();
        var med = new Med({ el: el });
        var json;

        el.innerHTML = '<section><ul><li>item 1</li><li><b>item 2</b></li></ul></section>';
        
        med.sync();

        json = med.toJSON();

        expect(json.paragraphs).to.have.length(3);

        // paragraphs: [li, li, ul]
        expect(json.paragraphs[1].detail).to.have.length(1);
        expect(json.paragraphs[1].text).to.be.equal('item 2');
      });
    });
  });
});

},{"../src/data":37,"../src/main":42,"../src/mixin/observe":46,"chai":4}],72:[function(require,module,exports){
var expect = require('chai').expect;
var utils = require('../src/utils');

describe('utils', function () {
  describe('.mixin(obj1, obj2)', function () {
    it('should copy all obj2\'s property descriptor to obj1', function () {
      var obj1 = {
        p1: 1
      };
      
      var obj2 = {
        p2: 2,
        p3: 3,
        p4: 4
      };

      utils.mixin(obj1, obj2);

      var sum = Object.keys(obj1).reduce(function (sum, key) {
        return sum + obj1[key];
      }, 0);

      expect(sum).to.be.equal(10);
    });
  });

  describe('.each(ctx, fn)', function () {
    it('should work with arguments', function () {
      var sum = 0;

      var start = function () {
        utils.each(arguments, function (n) {
          sum += n;
        });
      };

      start(1, 2, 3, 4);

      expect(sum).to.be.equal(10);
    });

    it('should work with HTMLCollection', function () {
      var sum = 0;
      var doc = document.createElement('div');
      
      doc.innerHTML = '<div>1</div>'
        + '<div>2</div>'
        + '<div>3</div>'
        + '<div>4</div>';

      utils.each(doc.children, function (child) {
        sum += child.innerHTML | 0;
      });

      expect(sum).to.be.equal(10);
    });
  });

  describe('.splite(separator, limit)', function () {
    it('should ignore \'\\\\.\'', function () {
      var str = 'a.b.c\\.d';
      expect(utils.split(str, '.')).to.have.length(3);
    });
  });

  describe('.clone(obj)', function () {
    it('should work with Object', function () {
      var obj = { a: 1, b: 2 };
      var clone = utils.clone(obj);

      expect(clone).to.not.equal(obj);
      expect(clone).to.deep.equal(obj);
    });

    it('should work with Array', function () {
      var arr = [1, 2, 3];
      var clone = utils.clone(arr);

      expect(clone).to.be.instanceof(Array);
      expect(clone).to.not.equal(arr);
      expect(clone).to.deep.equal(arr);
    });
  });

  describe('.equal(a, b)', function () {
    it('should work with Object', function () {
      expect(utils.equal({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } })).to.be.true;
      expect(utils.equal({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 3 } })).to.be.false;
    });

    it('should work with Array', function () {
      expect(utils.equal([1, 2], [2, 1])).to.be.true;
      expect(utils.equal([1, 2], [2, 3])).to.be.false;
    });

    it('should work with primitive value', function () {
      expect(utils.equal(1, 1)).to.be.true;
      expect(utils.equal(2, 1)).to.be.false;

      expect(utils.equal('str', 'str')).to.be.true;
      expect(utils.equal('st', 'str')).to.be.false;
    });
  });
});

},{"../src/utils":63,"chai":4}]},{},[67,68,69,70,71,72])