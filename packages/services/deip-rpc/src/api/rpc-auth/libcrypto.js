/* global self */
(function(root, factory) {
  if (typeof exports === 'object' && typeof exports.nodeName !== 'string') {
    // CommonJS
    factory(exports);
  } else {
    // Browser globals
    root.deipCrypto = root.deipCrypto || {};
    factory((root.deipCrypto.crypto = {}));
  }
})(typeof self !== 'undefined' ? self : this, function(exports) {
  exports.PrivateKey = PrivateKey;
  exports.PublicKey = PublicKey;
  exports.generateKeys = generateKeys;
  exports.keysFromPassword = keysFromPassword;
  exports.sha256 = sha256;
  exports.ripemd160 = ripemd160;
  exports.hexify = hexify;

  var sjcl = (function() {
    // SJCL is inserted here automatically by the build process.
    /** @fileOverview Javascript cryptography implementation.
 *
 * Crush to remove comments, shorten variable names and
 * generally reduce transmission size.
 */

"use strict";
/*jslint indent: 2, bitwise: false, nomen: false, plusplus: false, white: false, regexp: false */
/*global document, window, escape, unescape, module, require, Uint32Array */

/**
 * The Stanford Javascript Crypto Library, top-level namespace.
 * @namespace
 */
var sjcl = {
  /**
   * Symmetric ciphers.
   * @namespace
   */
  cipher: {},

  /**
   * Hash functions.  Right now only SHA256 is implemented.
   * @namespace
   */
  hash: {},

  /**
   * Key exchange functions.  Right now only SRP is implemented.
   * @namespace
   */
  keyexchange: {},
  
  /**
   * Cipher modes of operation.
   * @namespace
   */
  mode: {},

  /**
   * Miscellaneous.  HMAC and PBKDF2.
   * @namespace
   */
  misc: {},
  
  /**
   * Bit array encoders and decoders.
   * @namespace
   *
   * @description
   * The members of this namespace are functions which translate between
   * SJCL's bitArrays and other objects (usually strings).  Because it
   * isn't always clear which direction is encoding and which is decoding,
   * the method names are "fromBits" and "toBits".
   */
  codec: {},
  
  /**
   * Exceptions.
   * @namespace
   */
  exception: {
    /**
     * Ciphertext is corrupt.
     * @constructor
     */
    corrupt: function(message) {
      this.toString = function() { return "CORRUPT: "+this.message; };
      this.message = message;
    },
    
    /**
     * Invalid parameter.
     * @constructor
     */
    invalid: function(message) {
      this.toString = function() { return "INVALID: "+this.message; };
      this.message = message;
    },
    
    /**
     * Bug or missing feature in SJCL.
     * @constructor
     */
    bug: function(message) {
      this.toString = function() { return "BUG: "+this.message; };
      this.message = message;
    },

    /**
     * Something isn't ready.
     * @constructor
     */
    notReady: function(message) {
      this.toString = function() { return "NOT READY: "+this.message; };
      this.message = message;
    }
  }
};
/** @fileOverview Arrays of bits, encoded as arrays of Numbers.
 */

/**
 * Arrays of bits, encoded as arrays of Numbers.
 * @namespace
 * @description
 * <p>
 * These objects are the currency accepted by SJCL's crypto functions.
 * </p>
 *
 * <p>
 * Most of our crypto primitives operate on arrays of 4-byte words internally,
 * but many of them can take arguments that are not a multiple of 4 bytes.
 * This library encodes arrays of bits (whose size need not be a multiple of 8
 * bits) as arrays of 32-bit words.  The bits are packed, big-endian, into an
 * array of words, 32 bits at a time.  Since the words are double-precision
 * floating point numbers, they fit some extra data.  We use this (in a private,
 * possibly-changing manner) to encode the number of bits actually  present
 * in the last word of the array.
 * </p>
 *
 * <p>
 * Because bitwise ops clear this out-of-band data, these arrays can be passed
 * to ciphers like AES which want arrays of words.
 * </p>
 */
sjcl.bitArray = {
  /**
   * Array slices in units of bits.
   * @param {bitArray} a The array to slice.
   * @param {Number} bstart The offset to the start of the slice, in bits.
   * @param {Number} bend The offset to the end of the slice, in bits.  If this is undefined,
   * slice until the end of the array.
   * @return {bitArray} The requested slice.
   */
  bitSlice: function (a, bstart, bend) {
    a = sjcl.bitArray._shiftRight(a.slice(bstart/32), 32 - (bstart & 31)).slice(1);
    return (bend === undefined) ? a : sjcl.bitArray.clamp(a, bend-bstart);
  },

  /**
   * Extract a number packed into a bit array.
   * @param {bitArray} a The array to slice.
   * @param {Number} bstart The offset to the start of the slice, in bits.
   * @param {Number} blength The length of the number to extract.
   * @return {Number} The requested slice.
   */
  extract: function(a, bstart, blength) {
    // FIXME: this Math.floor is not necessary at all, but for some reason
    // seems to suppress a bug in the Chromium JIT.
    var x, sh = Math.floor((-bstart-blength) & 31);
    if ((bstart + blength - 1 ^ bstart) & -32) {
      // it crosses a boundary
      x = (a[bstart/32|0] << (32 - sh)) ^ (a[bstart/32+1|0] >>> sh);
    } else {
      // within a single word
      x = a[bstart/32|0] >>> sh;
    }
    return x & ((1<<blength) - 1);
  },

  /**
   * Concatenate two bit arrays.
   * @param {bitArray} a1 The first array.
   * @param {bitArray} a2 The second array.
   * @return {bitArray} The concatenation of a1 and a2.
   */
  concat: function (a1, a2) {
    if (a1.length === 0 || a2.length === 0) {
      return a1.concat(a2);
    }
    
    var last = a1[a1.length-1], shift = sjcl.bitArray.getPartial(last);
    if (shift === 32) {
      return a1.concat(a2);
    } else {
      return sjcl.bitArray._shiftRight(a2, shift, last|0, a1.slice(0,a1.length-1));
    }
  },

  /**
   * Find the length of an array of bits.
   * @param {bitArray} a The array.
   * @return {Number} The length of a, in bits.
   */
  bitLength: function (a) {
    var l = a.length, x;
    if (l === 0) { return 0; }
    x = a[l - 1];
    return (l-1) * 32 + sjcl.bitArray.getPartial(x);
  },

  /**
   * Truncate an array.
   * @param {bitArray} a The array.
   * @param {Number} len The length to truncate to, in bits.
   * @return {bitArray} A new array, truncated to len bits.
   */
  clamp: function (a, len) {
    if (a.length * 32 < len) { return a; }
    a = a.slice(0, Math.ceil(len / 32));
    var l = a.length;
    len = len & 31;
    if (l > 0 && len) {
      a[l-1] = sjcl.bitArray.partial(len, a[l-1] & 0x80000000 >> (len-1), 1);
    }
    return a;
  },

  /**
   * Make a partial word for a bit array.
   * @param {Number} len The number of bits in the word.
   * @param {Number} x The bits.
   * @param {Number} [_end=0] Pass 1 if x has already been shifted to the high side.
   * @return {Number} The partial word.
   */
  partial: function (len, x, _end) {
    if (len === 32) { return x; }
    return (_end ? x|0 : x << (32-len)) + len * 0x10000000000;
  },

  /**
   * Get the number of bits used by a partial word.
   * @param {Number} x The partial word.
   * @return {Number} The number of bits used by the partial word.
   */
  getPartial: function (x) {
    return Math.round(x/0x10000000000) || 32;
  },

  /**
   * Compare two arrays for equality in a predictable amount of time.
   * @param {bitArray} a The first array.
   * @param {bitArray} b The second array.
   * @return {boolean} true if a == b; false otherwise.
   */
  equal: function (a, b) {
    if (sjcl.bitArray.bitLength(a) !== sjcl.bitArray.bitLength(b)) {
      return false;
    }
    var x = 0, i;
    for (i=0; i<a.length; i++) {
      x |= a[i]^b[i];
    }
    return (x === 0);
  },

  /** Shift an array right.
   * @param {bitArray} a The array to shift.
   * @param {Number} shift The number of bits to shift.
   * @param {Number} [carry=0] A byte to carry in
   * @param {bitArray} [out=[]] An array to prepend to the output.
   * @private
   */
  _shiftRight: function (a, shift, carry, out) {
    var i, last2=0, shift2;
    if (out === undefined) { out = []; }
    
    for (; shift >= 32; shift -= 32) {
      out.push(carry);
      carry = 0;
    }
    if (shift === 0) {
      return out.concat(a);
    }
    
    for (i=0; i<a.length; i++) {
      out.push(carry | a[i]>>>shift);
      carry = a[i] << (32-shift);
    }
    last2 = a.length ? a[a.length-1] : 0;
    shift2 = sjcl.bitArray.getPartial(last2);
    out.push(sjcl.bitArray.partial(shift+shift2 & 31, (shift + shift2 > 32) ? carry : out.pop(),1));
    return out;
  },
  
  /** xor a block of 4 words together.
   * @private
   */
  _xor4: function(x,y) {
    return [x[0]^y[0],x[1]^y[1],x[2]^y[2],x[3]^y[3]];
  },

  /** byteswap a word array inplace.
   * (does not handle partial words)
   * @param {sjcl.bitArray} a word array
   * @return {sjcl.bitArray} byteswapped array
   */
  byteswapM: function(a) {
    var i, v, m = 0xff00;
    for (i = 0; i < a.length; ++i) {
      v = a[i];
      a[i] = (v >>> 24) | ((v >>> 8) & m) | ((v & m) << 8) | (v << 24);
    }
    return a;
  }
};
/** @fileOverview Low-level AES implementation.
 *
 * This file contains a low-level implementation of AES, optimized for
 * size and for efficiency on several browsers.  It is based on
 * OpenSSL's aes_core.c, a public-domain implementation by Vincent
 * Rijmen, Antoon Bosselaers and Paulo Barreto.
 *
 * An older version of this implementation is available in the public
 * domain, but this one is (c) Emily Stark, Mike Hamburg, Dan Boneh,
 * Stanford University 2008-2010 and BSD-licensed for liability
 * reasons.
 */

/**
 * Schedule out an AES key for both encryption and decryption.  This
 * is a low-level class.  Use a cipher mode to do bulk encryption.
 *
 * @constructor
 * @param {Array} key The key as an array of 4, 6 or 8 words.
 */
sjcl.cipher.aes = function (key) {
  if (!this._tables[0][0][0]) {
    this._precompute();
  }
  
  var i, j, tmp,
    encKey, decKey,
    sbox = this._tables[0][4], decTable = this._tables[1],
    keyLen = key.length, rcon = 1;
  
  if (keyLen !== 4 && keyLen !== 6 && keyLen !== 8) {
    throw new sjcl.exception.invalid("invalid aes key size");
  }
  
  this._key = [encKey = key.slice(0), decKey = []];
  
  // schedule encryption keys
  for (i = keyLen; i < 4 * keyLen + 28; i++) {
    tmp = encKey[i-1];
    
    // apply sbox
    if (i%keyLen === 0 || (keyLen === 8 && i%keyLen === 4)) {
      tmp = sbox[tmp>>>24]<<24 ^ sbox[tmp>>16&255]<<16 ^ sbox[tmp>>8&255]<<8 ^ sbox[tmp&255];
      
      // shift rows and add rcon
      if (i%keyLen === 0) {
        tmp = tmp<<8 ^ tmp>>>24 ^ rcon<<24;
        rcon = rcon<<1 ^ (rcon>>7)*283;
      }
    }
    
    encKey[i] = encKey[i-keyLen] ^ tmp;
  }
  
  // schedule decryption keys
  for (j = 0; i; j++, i--) {
    tmp = encKey[j&3 ? i : i - 4];
    if (i<=4 || j<4) {
      decKey[j] = tmp;
    } else {
      decKey[j] = decTable[0][sbox[tmp>>>24      ]] ^
                  decTable[1][sbox[tmp>>16  & 255]] ^
                  decTable[2][sbox[tmp>>8   & 255]] ^
                  decTable[3][sbox[tmp      & 255]];
    }
  }
};

sjcl.cipher.aes.prototype = {
  // public
  /* Something like this might appear here eventually
  name: "AES",
  blockSize: 4,
  keySizes: [4,6,8],
  */
  
  /**
   * Encrypt an array of 4 big-endian words.
   * @param {Array} data The plaintext.
   * @return {Array} The ciphertext.
   */
  encrypt:function (data) { return this._crypt(data,0); },
  
  /**
   * Decrypt an array of 4 big-endian words.
   * @param {Array} data The ciphertext.
   * @return {Array} The plaintext.
   */
  decrypt:function (data) { return this._crypt(data,1); },
  
  /**
   * The expanded S-box and inverse S-box tables.  These will be computed
   * on the client so that we don't have to send them down the wire.
   *
   * There are two tables, _tables[0] is for encryption and
   * _tables[1] is for decryption.
   *
   * The first 4 sub-tables are the expanded S-box with MixColumns.  The
   * last (_tables[01][4]) is the S-box itself.
   *
   * @private
   */
  _tables: [[[],[],[],[],[]],[[],[],[],[],[]]],

  /**
   * Expand the S-box tables.
   *
   * @private
   */
  _precompute: function () {
   var encTable = this._tables[0], decTable = this._tables[1],
       sbox = encTable[4], sboxInv = decTable[4],
       i, x, xInv, d=[], th=[], x2, x4, x8, s, tEnc, tDec;

    // Compute double and third tables
   for (i = 0; i < 256; i++) {
     th[( d[i] = i<<1 ^ (i>>7)*283 )^i]=i;
   }
   
   for (x = xInv = 0; !sbox[x]; x ^= x2 || 1, xInv = th[xInv] || 1) {
     // Compute sbox
     s = xInv ^ xInv<<1 ^ xInv<<2 ^ xInv<<3 ^ xInv<<4;
     s = s>>8 ^ s&255 ^ 99;
     sbox[x] = s;
     sboxInv[s] = x;
     
     // Compute MixColumns
     x8 = d[x4 = d[x2 = d[x]]];
     tDec = x8*0x1010101 ^ x4*0x10001 ^ x2*0x101 ^ x*0x1010100;
     tEnc = d[s]*0x101 ^ s*0x1010100;
     
     for (i = 0; i < 4; i++) {
       encTable[i][x] = tEnc = tEnc<<24 ^ tEnc>>>8;
       decTable[i][s] = tDec = tDec<<24 ^ tDec>>>8;
     }
   }
   
   // Compactify.  Considerable speedup on Firefox.
   for (i = 0; i < 5; i++) {
     encTable[i] = encTable[i].slice(0);
     decTable[i] = decTable[i].slice(0);
   }
  },
  
  /**
   * Encryption and decryption core.
   * @param {Array} input Four words to be encrypted or decrypted.
   * @param dir The direction, 0 for encrypt and 1 for decrypt.
   * @return {Array} The four encrypted or decrypted words.
   * @private
   */
  _crypt:function (input, dir) {
    if (input.length !== 4) {
      throw new sjcl.exception.invalid("invalid aes block size");
    }
    
    var key = this._key[dir],
        // state variables a,b,c,d are loaded with pre-whitened data
        a = input[0]           ^ key[0],
        b = input[dir ? 3 : 1] ^ key[1],
        c = input[2]           ^ key[2],
        d = input[dir ? 1 : 3] ^ key[3],
        a2, b2, c2,
        
        nInnerRounds = key.length/4 - 2,
        i,
        kIndex = 4,
        out = [0,0,0,0],
        table = this._tables[dir],
        
        // load up the tables
        t0    = table[0],
        t1    = table[1],
        t2    = table[2],
        t3    = table[3],
        sbox  = table[4];
 
    // Inner rounds.  Cribbed from OpenSSL.
    for (i = 0; i < nInnerRounds; i++) {
      a2 = t0[a>>>24] ^ t1[b>>16 & 255] ^ t2[c>>8 & 255] ^ t3[d & 255] ^ key[kIndex];
      b2 = t0[b>>>24] ^ t1[c>>16 & 255] ^ t2[d>>8 & 255] ^ t3[a & 255] ^ key[kIndex + 1];
      c2 = t0[c>>>24] ^ t1[d>>16 & 255] ^ t2[a>>8 & 255] ^ t3[b & 255] ^ key[kIndex + 2];
      d  = t0[d>>>24] ^ t1[a>>16 & 255] ^ t2[b>>8 & 255] ^ t3[c & 255] ^ key[kIndex + 3];
      kIndex += 4;
      a=a2; b=b2; c=c2;
    }
        
    // Last round.
    for (i = 0; i < 4; i++) {
      out[dir ? 3&-i : i] =
        sbox[a>>>24      ]<<24 ^ 
        sbox[b>>16  & 255]<<16 ^
        sbox[c>>8   & 255]<<8  ^
        sbox[d      & 255]     ^
        key[kIndex++];
      a2=a; a=b; b=c; c=d; d=a2;
    }
    
    return out;
  }
};

/**
 * Constructs a new bignum from another bignum, a number or a hex string.
 * @constructor
 */
sjcl.bn = function(it) {
  this.initWith(it);
};

sjcl.bn.prototype = {
  radix: 24,
  maxMul: 8,
  _class: sjcl.bn,

  copy: function() {
    return new this._class(this);
  },

  /**
   * Initializes this with it, either as a bn, a number, or a hex string.
   */
  initWith: function(it) {
    var i=0, k;
    switch(typeof it) {
    case "object":
      this.limbs = it.limbs.slice(0);
      break;

    case "number":
      this.limbs = [it];
      this.normalize();
      break;

    case "string":
      it = it.replace(/^0x/, '');
      this.limbs = [];
      // hack
      k = this.radix / 4;
      for (i=0; i < it.length; i+=k) {
        this.limbs.push(parseInt(it.substring(Math.max(it.length - i - k, 0), it.length - i),16));
      }
      break;

    default:
      this.limbs = [0];
    }
    return this;
  },

  /**
   * Returns true if "this" and "that" are equal.  Calls fullReduce().
   * Equality test is in constant time.
   */
  equals: function(that) {
    if (typeof that === "number") { that = new this._class(that); }
    var difference = 0, i;
    this.fullReduce();
    that.fullReduce();
    for (i = 0; i < this.limbs.length || i < that.limbs.length; i++) {
      difference |= this.getLimb(i) ^ that.getLimb(i);
    }
    return (difference === 0);
  },

  /**
   * Get the i'th limb of this, zero if i is too large.
   */
  getLimb: function(i) {
    return (i >= this.limbs.length) ? 0 : this.limbs[i];
  },

  /**
   * Constant time comparison function.
   * Returns 1 if this >= that, or zero otherwise.
   */
  greaterEquals: function(that) {
    if (typeof that === "number") { that = new this._class(that); }
    var less = 0, greater = 0, i, a, b;
    i = Math.max(this.limbs.length, that.limbs.length) - 1;
    for (; i>= 0; i--) {
      a = this.getLimb(i);
      b = that.getLimb(i);
      greater |= (b - a) & ~less;
      less |= (a - b) & ~greater;
    }
    return (greater | ~less) >>> 31;
  },

  /**
   * Convert to a hex string.
   */
  toString: function() {
    this.fullReduce();
    var out="", i, s, l = this.limbs;
    for (i=0; i < this.limbs.length; i++) {
      s = l[i].toString(16);
      while (i < this.limbs.length - 1 && s.length < 6) {
        s = "0" + s;
      }
      out = s + out;
    }
    return "0x"+out;
  },

  /** this += that.  Does not normalize. */
  addM: function(that) {
    if (typeof(that) !== "object") { that = new this._class(that); }
    var i, l=this.limbs, ll=that.limbs;
    for (i=l.length; i<ll.length; i++) {
      l[i] = 0;
    }
    for (i=0; i<ll.length; i++) {
      l[i] += ll[i];
    }
    return this;
  },

  /** this *= 2.  Requires normalized; ends up normalized. */
  doubleM: function() {
    var i, carry=0, tmp, r=this.radix, m=this.radixMask, l=this.limbs;
    for (i=0; i<l.length; i++) {
      tmp = l[i];
      tmp = tmp+tmp+carry;
      l[i] = tmp & m;
      carry = tmp >> r;
    }
    if (carry) {
      l.push(carry);
    }
    return this;
  },

  /** this /= 2, rounded down.  Requires normalized; ends up normalized. */
  halveM: function() {
    var i, carry=0, tmp, r=this.radix, l=this.limbs;
    for (i=l.length-1; i>=0; i--) {
      tmp = l[i];
      l[i] = (tmp+carry)>>1;
      carry = (tmp&1) << r;
    }
    if (!l[l.length-1]) {
      l.pop();
    }
    return this;
  },

  /** this -= that.  Does not normalize. */
  subM: function(that) {
    if (typeof(that) !== "object") { that = new this._class(that); }
    var i, l=this.limbs, ll=that.limbs;
    for (i=l.length; i<ll.length; i++) {
      l[i] = 0;
    }
    for (i=0; i<ll.length; i++) {
      l[i] -= ll[i];
    }
    return this;
  },

  mod: function(that) {
    var neg = !this.greaterEquals(new sjcl.bn(0));

    that = new sjcl.bn(that).normalize(); // copy before we begin
    var out = new sjcl.bn(this).normalize(), ci=0;

    if (neg) out = (new sjcl.bn(0)).subM(out).normalize();

    for (; out.greaterEquals(that); ci++) {
      that.doubleM();
    }

    if (neg) out = that.sub(out).normalize();

    for (; ci > 0; ci--) {
      that.halveM();
      if (out.greaterEquals(that)) {
        out.subM(that).normalize();
      }
    }
    return out.trim();
  },

  /** return inverse mod prime p.  p must be odd. Binary extended Euclidean algorithm mod p. */
  inverseMod: function(p) {
    var a = new sjcl.bn(1), b = new sjcl.bn(0), x = new sjcl.bn(this), y = new sjcl.bn(p), tmp, i, nz=1;

    if (!(p.limbs[0] & 1)) {
      throw (new sjcl.exception.invalid("inverseMod: p must be odd"));
    }

    // invariant: y is odd
    do {
      if (x.limbs[0] & 1) {
        if (!x.greaterEquals(y)) {
          // x < y; swap everything
          tmp = x; x = y; y = tmp;
          tmp = a; a = b; b = tmp;
        }
        x.subM(y);
        x.normalize();

        if (!a.greaterEquals(b)) {
          a.addM(p);
        }
        a.subM(b);
      }

      // cut everything in half
      x.halveM();
      if (a.limbs[0] & 1) {
        a.addM(p);
      }
      a.normalize();
      a.halveM();

      // check for termination: x ?= 0
      for (i=nz=0; i<x.limbs.length; i++) {
        nz |= x.limbs[i];
      }
    } while(nz);

    if (!y.equals(1)) {
      throw (new sjcl.exception.invalid("inverseMod: p and x must be relatively prime"));
    }

    return b;
  },

  /** this + that.  Does not normalize. */
  add: function(that) {
    return this.copy().addM(that);
  },

  /** this - that.  Does not normalize. */
  sub: function(that) {
    return this.copy().subM(that);
  },

  /** this * that.  Normalizes and reduces. */
  mul: function(that) {
    if (typeof(that) === "number") { that = new this._class(that); }
    var i, j, a = this.limbs, b = that.limbs, al = a.length, bl = b.length, out = new this._class(), c = out.limbs, ai, ii=this.maxMul;

    for (i=0; i < this.limbs.length + that.limbs.length + 1; i++) {
      c[i] = 0;
    }
    for (i=0; i<al; i++) {
      ai = a[i];
      for (j=0; j<bl; j++) {
        c[i+j] += ai * b[j];
      }

      if (!--ii) {
        ii = this.maxMul;
        out.cnormalize();
      }
    }
    return out.cnormalize().reduce();
  },

  /** this ^ 2.  Normalizes and reduces. */
  square: function() {
    return this.mul(this);
  },

  /** this ^ n.  Uses square-and-multiply.  Normalizes and reduces. */
  power: function(l) {
    l = new sjcl.bn(l).normalize().trim().limbs;
    var i, j, out = new this._class(1), pow = this;

    for (i=0; i<l.length; i++) {
      for (j=0; j<this.radix; j++) {
        if (l[i] & (1<<j)) { out = out.mul(pow); }
        if (i == (l.length - 1) && l[i]>>(j + 1) == 0) { break; }

        pow = pow.square();
      }
    }

    return out;
  },

  /** this * that mod N */
  mulmod: function(that, N) {
    return this.mod(N).mul(that.mod(N)).mod(N);
  },

  /** this ^ x mod N */
  powermod: function(x, N) {
    x = new sjcl.bn(x);
    N = new sjcl.bn(N);

    // Jump to montpowermod if possible.
    if ((N.limbs[0] & 1) == 1) {
      var montOut = this.montpowermod(x, N);

      if (montOut != false) { return montOut; } // else go to slow powermod
    }

    var i, j, l = x.normalize().trim().limbs, out = new this._class(1), pow = this;

    for (i=0; i<l.length; i++) {
      for (j=0; j<this.radix; j++) {
        if (l[i] & (1<<j)) { out = out.mulmod(pow, N); }
        if (i == (l.length - 1) && l[i]>>(j + 1) == 0) { break; }

        pow = pow.mulmod(pow, N);
      }
    }

    return out;
  },

  /** this ^ x mod N with Montomery reduction */
  montpowermod: function(x, N) {
    x = new sjcl.bn(x).normalize().trim();
    N = new sjcl.bn(N);

    var i, j,
      radix = this.radix,
      out = new this._class(1),
      pow = this.copy();

    // Generate R as a cap of N.
    var R, s, wind, bitsize = x.bitLength();

    R = new sjcl.bn({
      limbs: N.copy().normalize().trim().limbs.map(function() { return 0; })
    });

    for (s = this.radix; s > 0; s--) {
      if (((N.limbs[N.limbs.length - 1] >> s) & 1) == 1) {
        R.limbs[R.limbs.length - 1] = 1 << s;
        break;
      }
    }

    // Calculate window size as a function of the exponent's size.
    if (bitsize == 0) {
      return this;
    } else if (bitsize < 18)  {
      wind = 1;
    } else if (bitsize < 48)  {
      wind = 3;
    } else if (bitsize < 144) {
      wind = 4;
    } else if (bitsize < 768) {
      wind = 5;
    } else {
      wind = 6;
    }

    // Find R' and N' such that R * R' - N * N' = 1.
    var RR = R.copy(), NN = N.copy(), RP = new sjcl.bn(1), NP = new sjcl.bn(0), RT = R.copy();

    while (RT.greaterEquals(1)) {
      RT.halveM();

      if ((RP.limbs[0] & 1) == 0) {
        RP.halveM();
        NP.halveM();
      } else {
        RP.addM(NN);
        RP.halveM();

        NP.halveM();
        NP.addM(RR);
      }
    }

    RP = RP.normalize();
    NP = NP.normalize();

    RR.doubleM();
    var R2 = RR.mulmod(RR, N);

    // Check whether the invariant holds.
    // If it doesn't, we can't use Montgomery reduction on this modulus.
    if (!RR.mul(RP).sub(N.mul(NP)).equals(1)) {
      return false;
    }

    var montIn = function(c) { return montMul(c, R2); },
    montMul = function(a, b) {
      // Standard Montgomery reduction
      var k, carry, ab, right, abBar, mask = (1 << (s + 1)) - 1;

      ab = a.mul(b);

      right = ab.mul(NP);
      right.limbs = right.limbs.slice(0, R.limbs.length);

      if (right.limbs.length == R.limbs.length) {
        right.limbs[R.limbs.length - 1] &= mask;
      }

      right = right.mul(N);

      abBar = ab.add(right).normalize().trim();
      abBar.limbs = abBar.limbs.slice(R.limbs.length - 1);

      // Division.  Equivelent to calling *.halveM() s times.
      for (k=0; k < abBar.limbs.length; k++) {
        if (k > 0) {
          abBar.limbs[k - 1] |= (abBar.limbs[k] & mask) << (radix - s - 1);
        }

        abBar.limbs[k] = abBar.limbs[k] >> (s + 1);
      }

      if (abBar.greaterEquals(N)) {
        abBar.subM(N);
      }

      return abBar;
    },
    montOut = function(c) { return montMul(c, 1); };

    pow = montIn(pow);
    out = montIn(out);

    // Sliding-Window Exponentiation (HAC 14.85)
    var h, precomp = {}, cap = (1 << (wind - 1)) - 1;

    precomp[1] = pow.copy();
    precomp[2] = montMul(pow, pow);

    for (h=1; h<=cap; h++) {
      precomp[(2 * h) + 1] = montMul(precomp[(2 * h) - 1], precomp[2]);
    }

    var getBit = function(exp, i) { // Gets ith bit of exp.
      var off = i % exp.radix;

      return (exp.limbs[Math.floor(i / exp.radix)] & (1 << off)) >> off;
    };

    for (i = x.bitLength() - 1; i >= 0; ) {
      if (getBit(x, i) == 0) {
        // If the next bit is zero:
        //   Square, move forward one bit.
        out = montMul(out, out);
        i = i - 1;
      } else {
        // If the next bit is one:
        //   Find the longest sequence of bits after this one, less than `wind`
        //   bits long, that ends with a 1.  Convert the sequence into an
        //   integer and look up the pre-computed value to add.
        var l = i - wind + 1;

        while (getBit(x, l) == 0) {
          l++;
        }

        var indx = 0;
        for (j = l; j <= i; j++) {
          indx += getBit(x, j) << (j - l);
          out = montMul(out, out);
        }

        out = montMul(out, precomp[indx]);

        i = l - 1;
      }
    }

    return montOut(out);
  },

  trim: function() {
    var l = this.limbs, p;
    do {
      p = l.pop();
    } while (l.length && p === 0);
    l.push(p);
    return this;
  },

  /** Reduce mod a modulus.  Stubbed for subclassing. */
  reduce: function() {
    return this;
  },

  /** Reduce and normalize. */
  fullReduce: function() {
    return this.normalize();
  },

  /** Propagate carries. */
  normalize: function() {
    var carry=0, i, pv = this.placeVal, ipv = this.ipv, l, m, limbs = this.limbs, ll = limbs.length, mask = this.radixMask;
    for (i=0; i < ll || (carry !== 0 && carry !== -1); i++) {
      l = (limbs[i]||0) + carry;
      m = limbs[i] = l & mask;
      carry = (l-m)*ipv;
    }
    if (carry === -1) {
      limbs[i-1] -= pv;
    }
    this.trim();
    return this;
  },

  /** Constant-time normalize. Does not allocate additional space. */
  cnormalize: function() {
    var carry=0, i, ipv = this.ipv, l, m, limbs = this.limbs, ll = limbs.length, mask = this.radixMask;
    for (i=0; i < ll-1; i++) {
      l = limbs[i] + carry;
      m = limbs[i] = l & mask;
      carry = (l-m)*ipv;
    }
    limbs[i] += carry;
    return this;
  },

  /** Serialize to a bit array */
  toBits: function(len) {
    this.fullReduce();
    len = len || this.exponent || this.bitLength();
    var i = Math.floor((len-1)/24), w=sjcl.bitArray, e = (len + 7 & -8) % this.radix || this.radix,
        out = [w.partial(e, this.getLimb(i))];
    for (i--; i >= 0; i--) {
      out = w.concat(out, [w.partial(Math.min(this.radix,len), this.getLimb(i))]);
      len -= this.radix;
    }
    return out;
  },

  /** Return the length in bits, rounded up to the nearest byte. */
  bitLength: function() {
    this.fullReduce();
    var out = this.radix * (this.limbs.length - 1),
        b = this.limbs[this.limbs.length - 1];
    for (; b; b >>>= 1) {
      out ++;
    }
    return out+7 & -8;
  }
};

/** @memberOf sjcl.bn
* @this { sjcl.bn }
*/
sjcl.bn.fromBits = function(bits) {
  var Class = this, out = new Class(), words=[], w=sjcl.bitArray, t = this.prototype,
      l = Math.min(this.bitLength || 0x100000000, w.bitLength(bits)), e = l % t.radix || t.radix;

  words[0] = w.extract(bits, 0, e);
  for (; e < l; e += t.radix) {
    words.unshift(w.extract(bits, e, t.radix));
  }

  out.limbs = words;
  return out;
};



sjcl.bn.prototype.ipv = 1 / (sjcl.bn.prototype.placeVal = Math.pow(2,sjcl.bn.prototype.radix));
sjcl.bn.prototype.radixMask = (1 << sjcl.bn.prototype.radix) - 1;

/**
 * Creates a new subclass of bn, based on reduction modulo a pseudo-Mersenne prime,
 * i.e. a prime of the form 2^e + sum(a * 2^b),where the sum is negative and sparse.
 */
sjcl.bn.pseudoMersennePrime = function(exponent, coeff) {
  /** @constructor
  * @private
  */
  function p(it) {
    this.initWith(it);
    /*if (this.limbs[this.modOffset]) {
      this.reduce();
    }*/
  }

  var ppr = p.prototype = new sjcl.bn(), i, tmp, mo;
  mo = ppr.modOffset = Math.ceil(tmp = exponent / ppr.radix);
  ppr.exponent = exponent;
  ppr.offset = [];
  ppr.factor = [];
  ppr.minOffset = mo;
  ppr.fullMask = 0;
  ppr.fullOffset = [];
  ppr.fullFactor = [];
  ppr.modulus = p.modulus = new sjcl.bn(Math.pow(2,exponent));

  ppr.fullMask = 0|-Math.pow(2, exponent % ppr.radix);

  for (i=0; i<coeff.length; i++) {
    ppr.offset[i] = Math.floor(coeff[i][0] / ppr.radix - tmp);
    ppr.fullOffset[i] = Math.ceil(coeff[i][0] / ppr.radix - tmp);
    ppr.factor[i] = coeff[i][1] * Math.pow(1/2, exponent - coeff[i][0] + ppr.offset[i] * ppr.radix);
    ppr.fullFactor[i] = coeff[i][1] * Math.pow(1/2, exponent - coeff[i][0] + ppr.fullOffset[i] * ppr.radix);
    ppr.modulus.addM(new sjcl.bn(Math.pow(2,coeff[i][0])*coeff[i][1]));
    ppr.minOffset = Math.min(ppr.minOffset, -ppr.offset[i]); // conservative
  }
  ppr._class = p;
  ppr.modulus.cnormalize();

  /** Approximate reduction mod p.  May leave a number which is negative or slightly larger than p.
   * @memberof sjcl.bn
   * @this { sjcl.bn }
   */
  ppr.reduce = function() {
    var i, k, l, mo = this.modOffset, limbs = this.limbs, off = this.offset, ol = this.offset.length, fac = this.factor, ll;

    i = this.minOffset;
    while (limbs.length > mo) {
      l = limbs.pop();
      ll = limbs.length;
      for (k=0; k<ol; k++) {
        limbs[ll+off[k]] -= fac[k] * l;
      }

      i--;
      if (!i) {
        limbs.push(0);
        this.cnormalize();
        i = this.minOffset;
      }
    }
    this.cnormalize();

    return this;
  };

  /** @memberof sjcl.bn
  * @this { sjcl.bn }
  */
  ppr._strongReduce = (ppr.fullMask === -1) ? ppr.reduce : function() {
    var limbs = this.limbs, i = limbs.length - 1, k, l;
    this.reduce();
    if (i === this.modOffset - 1) {
      l = limbs[i] & this.fullMask;
      limbs[i] -= l;
      for (k=0; k<this.fullOffset.length; k++) {
        limbs[i+this.fullOffset[k]] -= this.fullFactor[k] * l;
      }
      this.normalize();
    }
  };

  /** mostly constant-time, very expensive full reduction.
   * @memberof sjcl.bn
   * @this { sjcl.bn }
   */
  ppr.fullReduce = function() {
    var greater, i;
    // massively above the modulus, may be negative

    this._strongReduce();
    // less than twice the modulus, may be negative

    this.addM(this.modulus);
    this.addM(this.modulus);
    this.normalize();
    // probably 2-3x the modulus

    this._strongReduce();
    // less than the power of 2.  still may be more than
    // the modulus

    // HACK: pad out to this length
    for (i=this.limbs.length; i<this.modOffset; i++) {
      this.limbs[i] = 0;
    }

    // constant-time subtract modulus
    greater = this.greaterEquals(this.modulus);
    for (i=0; i<this.limbs.length; i++) {
      this.limbs[i] -= this.modulus.limbs[i] * greater;
    }
    this.cnormalize();

    return this;
  };


  /** @memberof sjcl.bn
  * @this { sjcl.bn }
  */
  ppr.inverse = function() {
    return (this.power(this.modulus.sub(2)));
  };

  p.fromBits = sjcl.bn.fromBits;

  return p;
};

// a small Mersenne prime
var sbp = sjcl.bn.pseudoMersennePrime;
sjcl.bn.prime = {
  p127: sbp(127, [[0,-1]]),

  // Bernstein's prime for Curve25519
  p25519: sbp(255, [[0,-19]]),

  // Koblitz primes
  p192k: sbp(192, [[32,-1],[12,-1],[8,-1],[7,-1],[6,-1],[3,-1],[0,-1]]),
  p224k: sbp(224, [[32,-1],[12,-1],[11,-1],[9,-1],[7,-1],[4,-1],[1,-1],[0,-1]]),
  p256k: sbp(256, [[32,-1],[9,-1],[8,-1],[7,-1],[6,-1],[4,-1],[0,-1]]),

  // NIST primes
  p192: sbp(192, [[0,-1],[64,-1]]),
  p224: sbp(224, [[0,1],[96,-1]]),
  p256: sbp(256, [[0,-1],[96,1],[192,1],[224,-1]]),
  p384: sbp(384, [[0,-1],[32,1],[96,-1],[128,-1]]),
  p521: sbp(521, [[0,-1]])
};

sjcl.bn.random = function(modulus, paranoia) {
  if (typeof modulus !== "object") { modulus = new sjcl.bn(modulus); }
  var words, i, l = modulus.limbs.length, m = modulus.limbs[l-1]+1, out = new sjcl.bn();
  while (true) {
    // get a sequence whose first digits make sense
    do {
      words = sjcl.random.randomWords(l, paranoia);
      if (words[l-1] < 0) { words[l-1] += 0x100000000; }
    } while (Math.floor(words[l-1] / m) === Math.floor(0x100000000 / m));
    words[l-1] %= m;

    // mask off all the limbs
    for (i=0; i<l-1; i++) {
      words[i] &= modulus.radixMask;
    }

    // check the rest of the digitssj
    out.limbs = words;
    if (!out.greaterEquals(modulus)) {
      return out;
    }
  }
};
/** @fileOverview Bit array codec implementations.
 */

//patch arraybuffers if they don't exist
if (typeof(ArrayBuffer) === 'undefined') {
  (function(globals){
      "use strict";
      globals.ArrayBuffer = function(){};
      globals.DataView = function(){};
  }(this));
}

/**
 * ArrayBuffer
 * @namespace
 */
sjcl.codec.arrayBuffer = {
  /** Convert from a bitArray to an ArrayBuffer. 
   * Will default to 8byte padding if padding is undefined*/
  fromBits: function (arr, padding, padding_count) {
    var out, i, ol, tmp, smallest;
    padding = padding==undefined  ? true : padding;
    padding_count = padding_count || 8;

    if (arr.length === 0) {
      return new ArrayBuffer(0);
    }

    ol = sjcl.bitArray.bitLength(arr)/8;

    //check to make sure the bitLength is divisible by 8, if it isn't 
    //we can't do anything since arraybuffers work with bytes, not bits
    if ( sjcl.bitArray.bitLength(arr)%8 !== 0 ) {
      throw new sjcl.exception.invalid("Invalid bit size, must be divisble by 8 to fit in an arraybuffer correctly");
    }

    if (padding && ol%padding_count !== 0){
      ol += padding_count - (ol%padding_count);
    }


    //padded temp for easy copying
    tmp = new DataView(new ArrayBuffer(arr.length*4));
    for (i=0; i<arr.length; i++) {
      tmp.setUint32(i*4, (arr[i]<<32)); //get rid of the higher bits
    }

    //now copy the final message if we are not going to 0 pad
    out = new DataView(new ArrayBuffer(ol));

    //save a step when the tmp and out bytelength are ===
    if (out.byteLength === tmp.byteLength){
      return tmp.buffer;
    }

    smallest = tmp.byteLength < out.byteLength ? tmp.byteLength : out.byteLength;
    for(i=0; i<smallest; i++){
      out.setUint8(i,tmp.getUint8(i));
    }


    return out.buffer;
  },

  toBits: function (buffer) {
    var i, out=[], len, inView, tmp;

    if (buffer.byteLength === 0) {
      return [];
    }

    inView = new DataView(buffer);
    len = inView.byteLength - inView.byteLength%4;

    for (var i = 0; i < len; i+=4) {
      out.push(inView.getUint32(i));
    }

    if (inView.byteLength%4 != 0) {
      tmp = new DataView(new ArrayBuffer(4));
      for (var i = 0, l = inView.byteLength%4; i < l; i++) {
        //we want the data to the right, because partial slices off the starting bits
        tmp.setUint8(i+4-l, inView.getUint8(len+i)); // big-endian, 
      }
      out.push(
        sjcl.bitArray.partial( (inView.byteLength%4)*8, tmp.getUint32(0) )
      ); 
    }
    return out;
  },



  /** Prints a hex output of the buffer contents, akin to hexdump **/
  hexDumpBuffer: function(buffer){
      var stringBufferView = new DataView(buffer);
      var string = '';
      var pad = function (n, width) {
          n = n + '';
          return n.length >= width ? n : new Array(width - n.length + 1).join('0') + n;
      };

      for (var i = 0; i < stringBufferView.byteLength; i+=2) {
          if (i%16 == 0) string += ('\n'+(i).toString(16)+'\t');
          string += ( pad(stringBufferView.getUint16(i).toString(16),4) + ' ');
      }

      if ( typeof console === undefined ){
        console = console || {log:function(){}}; //fix for IE
      }
      console.log(string.toUpperCase());
  }
};

/** @fileOverview Bit array codec implementations.
 */

/**
 * UTF-8 strings
 * @namespace
 */
sjcl.codec.utf8String = {
  /** Convert from a bitArray to a UTF-8 string. */
  fromBits: function (arr) {
    var out = "", bl = sjcl.bitArray.bitLength(arr), i, tmp;
    for (i=0; i<bl/8; i++) {
      if ((i&3) === 0) {
        tmp = arr[i/4];
      }
      out += String.fromCharCode(tmp >>> 8 >>> 8 >>> 8);
      tmp <<= 8;
    }
    return decodeURIComponent(escape(out));
  },

  /** Convert from a UTF-8 string to a bitArray. */
  toBits: function (str) {
    str = unescape(encodeURIComponent(str));
    var out = [], i, tmp=0;
    for (i=0; i<str.length; i++) {
      tmp = tmp << 8 | str.charCodeAt(i);
      if ((i&3) === 3) {
        out.push(tmp);
        tmp = 0;
      }
    }
    if (i&3) {
      out.push(sjcl.bitArray.partial(8*(i&3), tmp));
    }
    return out;
  }
};
/**
 * base class for all ecc operations.
 * @namespace
 */
sjcl.ecc = {};

/**
 * Represents a point on a curve in affine coordinates.
 * @constructor
 * @param {sjcl.ecc.curve} curve The curve that this point lies on.
 * @param {bigInt} x The x coordinate.
 * @param {bigInt} y The y coordinate.
 */
sjcl.ecc.point = function(curve,x,y) {
  if (x === undefined) {
    this.isIdentity = true;
  } else {
    if (x instanceof sjcl.bn) {
      x = new curve.field(x);
    }
    if (y instanceof sjcl.bn) {
      y = new curve.field(y);
    }

    this.x = x;
    this.y = y;

    this.isIdentity = false;
  }
  this.curve = curve;
};



sjcl.ecc.point.prototype = {
  toJac: function() {
    return new sjcl.ecc.pointJac(this.curve, this.x, this.y, new this.curve.field(1));
  },

  mult: function(k) {
    return this.toJac().mult(k, this).toAffine();
  },

  /**
   * Multiply this point by k, added to affine2*k2, and return the answer in Jacobian coordinates.
   * @param {bigInt} k The coefficient to multiply this by.
   * @param {bigInt} k2 The coefficient to multiply affine2 this by.
   * @param {sjcl.ecc.point} affine The other point in affine coordinates.
   * @return {sjcl.ecc.pointJac} The result of the multiplication and addition, in Jacobian coordinates.
   */
  mult2: function(k, k2, affine2) {
    return this.toJac().mult2(k, this, k2, affine2).toAffine();
  },

  multiples: function() {
    var m, i, j;
    if (this._multiples === undefined) {
      j = this.toJac().doubl();
      m = this._multiples = [new sjcl.ecc.point(this.curve), this, j.toAffine()];
      for (i=3; i<16; i++) {
        j = j.add(this);
        m.push(j.toAffine());
      }
    }
    return this._multiples;
  },

  negate: function() {
    var newY = new this.curve.field(0).sub(this.y).normalize().reduce();
    return new sjcl.ecc.point(this.curve, this.x, newY);
  },

  isValid: function() {
    return this.y.square().equals(this.curve.b.add(this.x.mul(this.curve.a.add(this.x.square()))));
  },

  toBits: function() {
    return sjcl.bitArray.concat(this.x.toBits(), this.y.toBits());
  }
};

/**
 * Represents a point on a curve in Jacobian coordinates. Coordinates can be specified as bigInts or strings (which
 * will be converted to bigInts).
 *
 * @constructor
 * @param {bigInt/string} x The x coordinate.
 * @param {bigInt/string} y The y coordinate.
 * @param {bigInt/string} z The z coordinate.
 * @param {sjcl.ecc.curve} curve The curve that this point lies on.
 */
sjcl.ecc.pointJac = function(curve, x, y, z) {
  if (x === undefined) {
    this.isIdentity = true;
  } else {
    this.x = x;
    this.y = y;
    this.z = z;
    this.isIdentity = false;
  }
  this.curve = curve;
};

sjcl.ecc.pointJac.prototype = {
  /**
   * Adds S and T and returns the result in Jacobian coordinates. Note that S must be in Jacobian coordinates and T must be in affine coordinates.
   * @param {sjcl.ecc.pointJac} S One of the points to add, in Jacobian coordinates.
   * @param {sjcl.ecc.point} T The other point to add, in affine coordinates.
   * @return {sjcl.ecc.pointJac} The sum of the two points, in Jacobian coordinates.
   */
  add: function(T) {
    var S = this, sz2, c, d, c2, x1, x2, x, y1, y2, y, z;
    if (S.curve !== T.curve) {
      throw new sjcl.exception.invalid("sjcl.ecc.add(): Points must be on the same curve to add them!");
    }

    if (S.isIdentity) {
      return T.toJac();
    } else if (T.isIdentity) {
      return S;
    }

    sz2 = S.z.square();
    c = T.x.mul(sz2).subM(S.x);

    if (c.equals(0)) {
      if (S.y.equals(T.y.mul(sz2.mul(S.z)))) {
        // same point
        return S.doubl();
      } else {
        // inverses
        return new sjcl.ecc.pointJac(S.curve);
      }
    }

    d = T.y.mul(sz2.mul(S.z)).subM(S.y);
    c2 = c.square();

    x1 = d.square();
    x2 = c.square().mul(c).addM( S.x.add(S.x).mul(c2) );
    x  = x1.subM(x2);

    y1 = S.x.mul(c2).subM(x).mul(d);
    y2 = S.y.mul(c.square().mul(c));
    y  = y1.subM(y2);

    z  = S.z.mul(c);

    return new sjcl.ecc.pointJac(this.curve,x,y,z);
  },

  /**
   * doubles this point.
   * @return {sjcl.ecc.pointJac} The doubled point.
   */
  doubl: function() {
    if (this.isIdentity) { return this; }

    var
      y2 = this.y.square(),
      a  = y2.mul(this.x.mul(4)),
      b  = y2.square().mul(8),
      z2 = this.z.square(),
      c  = this.curve.a.toString() == (new sjcl.bn(-3)).toString() ?
                this.x.sub(z2).mul(3).mul(this.x.add(z2)) :
                this.x.square().mul(3).add(z2.square().mul(this.curve.a)),
      x  = c.square().subM(a).subM(a),
      y  = a.sub(x).mul(c).subM(b),
      z  = this.y.add(this.y).mul(this.z);
    return new sjcl.ecc.pointJac(this.curve, x, y, z);
  },

  /**
   * Returns a copy of this point converted to affine coordinates.
   * @return {sjcl.ecc.point} The converted point.
   */
  toAffine: function() {
    if (this.isIdentity || this.z.equals(0)) {
      return new sjcl.ecc.point(this.curve);
    }
    var zi = this.z.inverse(), zi2 = zi.square();
    return new sjcl.ecc.point(this.curve, this.x.mul(zi2).fullReduce(), this.y.mul(zi2.mul(zi)).fullReduce());
  },

  /**
   * Multiply this point by k and return the answer in Jacobian coordinates.
   * @param {bigInt} k The coefficient to multiply by.
   * @param {sjcl.ecc.point} affine This point in affine coordinates.
   * @return {sjcl.ecc.pointJac} The result of the multiplication, in Jacobian coordinates.
   */
  mult: function(k, affine) {
    if (typeof(k) === "number") {
      k = [k];
    } else if (k.limbs !== undefined) {
      k = k.normalize().limbs;
    }

    var i, j, out = new sjcl.ecc.point(this.curve).toJac(), multiples = affine.multiples();

    for (i=k.length-1; i>=0; i--) {
      for (j=sjcl.bn.prototype.radix-4; j>=0; j-=4) {
        out = out.doubl().doubl().doubl().doubl().add(multiples[k[i]>>j & 0xF]);
      }
    }

    return out;
  },

  /**
   * Multiply this point by k, added to affine2*k2, and return the answer in Jacobian coordinates.
   * @param {bigInt} k The coefficient to multiply this by.
   * @param {sjcl.ecc.point} affine This point in affine coordinates.
   * @param {bigInt} k2 The coefficient to multiply affine2 this by.
   * @param {sjcl.ecc.point} affine The other point in affine coordinates.
   * @return {sjcl.ecc.pointJac} The result of the multiplication and addition, in Jacobian coordinates.
   */
  mult2: function(k1, affine, k2, affine2) {
    if (typeof(k1) === "number") {
      k1 = [k1];
    } else if (k1.limbs !== undefined) {
      k1 = k1.normalize().limbs;
    }

    if (typeof(k2) === "number") {
      k2 = [k2];
    } else if (k2.limbs !== undefined) {
      k2 = k2.normalize().limbs;
    }

    var i, j, out = new sjcl.ecc.point(this.curve).toJac(), m1 = affine.multiples(),
        m2 = affine2.multiples(), l1, l2;

    for (i=Math.max(k1.length,k2.length)-1; i>=0; i--) {
      l1 = k1[i] | 0;
      l2 = k2[i] | 0;
      for (j=sjcl.bn.prototype.radix-4; j>=0; j-=4) {
        out = out.doubl().doubl().doubl().doubl().add(m1[l1>>j & 0xF]).add(m2[l2>>j & 0xF]);
      }
    }

    return out;
  },

  negate: function() {
    return this.toAffine().negate().toJac();
  },

  isValid: function() {
    var z2 = this.z.square(), z4 = z2.square(), z6 = z4.mul(z2);
    return this.y.square().equals(
             this.curve.b.mul(z6).add(this.x.mul(
               this.curve.a.mul(z4).add(this.x.square()))));
  }
};

/**
 * Construct an elliptic curve. Most users will not use this and instead start with one of the NIST curves defined below.
 *
 * @constructor
 * @param {bigInt} p The prime modulus.
 * @param {bigInt} r The prime order of the curve.
 * @param {bigInt} a The constant a in the equation of the curve y^2 = x^3 + ax + b (for NIST curves, a is always -3).
 * @param {bigInt} x The x coordinate of a base point of the curve.
 * @param {bigInt} y The y coordinate of a base point of the curve.
 */
sjcl.ecc.curve = function(Field, r, a, b, x, y) {
  this.field = Field;
  this.r = new sjcl.bn(r);
  this.a = new Field(a);
  this.b = new Field(b);
  this.G = new sjcl.ecc.point(this, new Field(x), new Field(y));
};

sjcl.ecc.curve.prototype.fromBits = function (bits) {
  var w = sjcl.bitArray, l = this.field.prototype.exponent + 7 & -8,
      p = new sjcl.ecc.point(this, this.field.fromBits(w.bitSlice(bits, 0, l)),
                             this.field.fromBits(w.bitSlice(bits, l, 2*l)));
  if (!p.isValid()) {
    throw new sjcl.exception.corrupt("not on the curve!");
  }
  return p;
};

sjcl.ecc.curves = {
  c192: new sjcl.ecc.curve(
    sjcl.bn.prime.p192,
    "0xffffffffffffffffffffffff99def836146bc9b1b4d22831",
    -3,
    "0x64210519e59c80e70fa7e9ab72243049feb8deecc146b9b1",
    "0x188da80eb03090f67cbf20eb43a18800f4ff0afd82ff1012",
    "0x07192b95ffc8da78631011ed6b24cdd573f977a11e794811"),

  c224: new sjcl.ecc.curve(
    sjcl.bn.prime.p224,
    "0xffffffffffffffffffffffffffff16a2e0b8f03e13dd29455c5c2a3d",
    -3,
    "0xb4050a850c04b3abf54132565044b0b7d7bfd8ba270b39432355ffb4",
    "0xb70e0cbd6bb4bf7f321390b94a03c1d356c21122343280d6115c1d21",
    "0xbd376388b5f723fb4c22dfe6cd4375a05a07476444d5819985007e34"),

  c256: new sjcl.ecc.curve(
    sjcl.bn.prime.p256,
    "0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551",
    -3,
    "0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604b",
    "0x6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296",
    "0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5"),

  c384: new sjcl.ecc.curve(
    sjcl.bn.prime.p384,
    "0xffffffffffffffffffffffffffffffffffffffffffffffffc7634d81f4372ddf581a0db248b0a77aecec196accc52973",
    -3,
    "0xb3312fa7e23ee7e4988e056be3f82d19181d9c6efe8141120314088f5013875ac656398d8a2ed19d2a85c8edd3ec2aef",
    "0xaa87ca22be8b05378eb1c71ef320ad746e1d3b628ba79b9859f741e082542a385502f25dbf55296c3a545e3872760ab7",
    "0x3617de4a96262c6f5d9e98bf9292dc29f8f41dbd289a147ce9da3113b5f0b8c00a60b1ce1d7e819d7a431d7c90ea0e5f"),
    
  c521: new sjcl.ecc.curve(
    sjcl.bn.prime.p521,
    "0x1FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFA51868783BF2F966B7FCC0148F709A5D03BB5C9B8899C47AEBB6FB71E91386409",
    -3,
    "0x051953EB9618E1C9A1F929A21A0B68540EEA2DA725B99B315F3B8B489918EF109E156193951EC7E937B1652C0BD3BB1BF073573DF883D2C34F1EF451FD46B503F00",
    "0xC6858E06B70404E9CD9E3ECB662395B4429C648139053FB521F828AF606B4D3DBAA14B5E77EFE75928FE1DC127A2FFA8DE3348B3C1856A429BF97E7E31C2E5BD66",
    "0x11839296A789A3BC0045C8A5FB42C7D1BD998F54449579B446817AFBD17273E662C97EE72995EF42640C550B9013FAD0761353C7086A272C24088BE94769FD16650"),

  k192: new sjcl.ecc.curve(
    sjcl.bn.prime.p192k,
    "0xfffffffffffffffffffffffe26f2fc170f69466a74defd8d",
    0,
    3,
    "0xdb4ff10ec057e9ae26b07d0280b7f4341da5d1b1eae06c7d",
    "0x9b2f2f6d9c5628a7844163d015be86344082aa88d95e2f9d"),

  k224: new sjcl.ecc.curve(
    sjcl.bn.prime.p224k,
    "0x010000000000000000000000000001dce8d2ec6184caf0a971769fb1f7",
    0,
    5,
    "0xa1455b334df099df30fc28a169a467e9e47075a90f7e650eb6b7a45c",
    "0x7e089fed7fba344282cafbd6f7e319f7c0b0bd59e2ca4bdb556d61a5"),

  k256: new sjcl.ecc.curve(
    sjcl.bn.prime.p256k,
    "0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141",
    0,
    7,
    "0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
    "0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8")

};

sjcl.ecc.curveName = function (curve) {
  var curcurve;
  for (curcurve in sjcl.ecc.curves) {
    if (sjcl.ecc.curves.hasOwnProperty(curcurve)) {
      if (sjcl.ecc.curves[curcurve] === curve) {
        return curcurve;
      }
    }
  }

  throw new sjcl.exception.invalid("no such curve");
};

sjcl.ecc.deserialize = function (key) {
  var types = ["elGamal", "ecdsa"];

  if (!key || !key.curve || !sjcl.ecc.curves[key.curve]) { throw new sjcl.exception.invalid("invalid serialization"); }
  if (types.indexOf(key.type) === -1) { throw new sjcl.exception.invalid("invalid type"); }

  var curve = sjcl.ecc.curves[key.curve];

  if (key.secretKey) {
    if (!key.exponent) { throw new sjcl.exception.invalid("invalid exponent"); }
    var exponent = new sjcl.bn(key.exponent);
    return new sjcl.ecc[key.type].secretKey(curve, exponent);
  } else {
    if (!key.point) { throw new sjcl.exception.invalid("invalid point"); }
    
    var point = curve.fromBits(sjcl.codec.hex.toBits(key.point));
    return new sjcl.ecc[key.type].publicKey(curve, point);
  }
};

/** our basicKey classes
*/
sjcl.ecc.basicKey = {
  /** ecc publicKey.
  * @constructor
  * @param {curve} curve the elliptic curve
  * @param {point} point the point on the curve
  */
  publicKey: function(curve, point) {
    this._curve = curve;
    this._curveBitLength = curve.r.bitLength();
    if (point instanceof Array) {
      this._point = curve.fromBits(point);
    } else {
      this._point = point;
    }

    this.serialize = function () {
      var curveName = sjcl.ecc.curveName(curve);
      return {
        type: this.getType(),
        secretKey: false,
        point: sjcl.codec.hex.fromBits(this._point.toBits()),
        curve: curveName
      };
    };

    /** get this keys point data
    * @return x and y as bitArrays
    */
    this.get = function() {
      var pointbits = this._point.toBits();
      var len = sjcl.bitArray.bitLength(pointbits);
      var x = sjcl.bitArray.bitSlice(pointbits, 0, len/2);
      var y = sjcl.bitArray.bitSlice(pointbits, len/2);
      return { x: x, y: y };
    };
  },

  /** ecc secretKey
  * @constructor
  * @param {curve} curve the elliptic curve
  * @param exponent
  */
  secretKey: function(curve, exponent) {
    this._curve = curve;
    this._curveBitLength = curve.r.bitLength();
    this._exponent = exponent;

    this.serialize = function () {
      var exponent = this.get();
      var curveName = sjcl.ecc.curveName(curve);
      return {
        type: this.getType(),
        secretKey: true,
        exponent: sjcl.codec.hex.fromBits(exponent),
        curve: curveName
      };
    };

    /** get this keys exponent data
    * @return {bitArray} exponent
    */
    this.get = function () {
      return this._exponent.toBits();
    };
  }
};

/** @private */
sjcl.ecc.basicKey.generateKeys = function(cn) {
  return function generateKeys(curve, paranoia, sec) {
    curve = curve || 256;

    if (typeof curve === "number") {
      curve = sjcl.ecc.curves['c'+curve];
      if (curve === undefined) {
        throw new sjcl.exception.invalid("no such curve");
      }
    }
    sec = sec || sjcl.bn.random(curve.r, paranoia);

    var pub = curve.G.mult(sec);
    return { pub: new sjcl.ecc[cn].publicKey(curve, pub),
             sec: new sjcl.ecc[cn].secretKey(curve, sec) };
  };
};

/** elGamal keys */
sjcl.ecc.elGamal = {
  /** generate keys
  * @function
  * @param curve
  * @param {int} paranoia Paranoia for generation (default 6)
  * @param {secretKey} sec secret Key to use. used to get the publicKey for ones secretKey
  */
  generateKeys: sjcl.ecc.basicKey.generateKeys("elGamal"),
  /** elGamal publicKey.
  * @constructor
  * @augments sjcl.ecc.basicKey.publicKey
  */
  publicKey: function (curve, point) {
    sjcl.ecc.basicKey.publicKey.apply(this, arguments);
  },
  /** elGamal secretKey
  * @constructor
  * @augments sjcl.ecc.basicKey.secretKey
  */
  secretKey: function (curve, exponent) {
    sjcl.ecc.basicKey.secretKey.apply(this, arguments);
  }
};

sjcl.ecc.elGamal.publicKey.prototype = {
  /** Kem function of elGamal Public Key
  * @param paranoia paranoia to use for randomization.
  * @return {object} key and tag. unkem(tag) with the corresponding secret key results in the key returned.
  */
  kem: function(paranoia) {
    var sec = sjcl.bn.random(this._curve.r, paranoia),
        tag = this._curve.G.mult(sec).toBits(),
        key = sjcl.hash.sha256.hash(this._point.mult(sec).toBits());
    return { key: key, tag: tag };
  },
  
  getType: function() {
    return "elGamal";
  }
};

sjcl.ecc.elGamal.secretKey.prototype = {
  /** UnKem function of elGamal Secret Key
  * @param {bitArray} tag The Tag to decrypt.
  * @return {bitArray} decrypted key.
  */
  unkem: function(tag) {
    return sjcl.hash.sha256.hash(this._curve.fromBits(tag).mult(this._exponent).toBits());
  },

  /** Diffie-Hellmann function
  * @param {elGamal.publicKey} pk The Public Key to do Diffie-Hellmann with
  * @return {bitArray} diffie-hellmann result for this key combination.
  */
  dh: function(pk) {
    return sjcl.hash.sha256.hash(pk._point.mult(this._exponent).toBits());
  },

  /** Diffie-Hellmann function, compatible with Java generateSecret
  * @param {elGamal.publicKey} pk The Public Key to do Diffie-Hellmann with
  * @return {bitArray} undigested X value, diffie-hellmann result for this key combination,
  * compatible with Java generateSecret().
  */
  dhJavaEc: function(pk) {
    return pk._point.mult(this._exponent).x.toBits();
  }, 

  getType: function() {
    return "elGamal";
  }
};

/** ecdsa keys */
sjcl.ecc.ecdsa = {
  /** generate keys
  * @function
  * @param curve
  * @param {int} paranoia Paranoia for generation (default 6)
  * @param {secretKey} sec secret Key to use. used to get the publicKey for ones secretKey
  */
  generateKeys: sjcl.ecc.basicKey.generateKeys("ecdsa")
};

/** ecdsa publicKey.
* @constructor
* @augments sjcl.ecc.basicKey.publicKey
*/
sjcl.ecc.ecdsa.publicKey = function (curve, point) {
  sjcl.ecc.basicKey.publicKey.apply(this, arguments);
};

/** specific functions for ecdsa publicKey. */
sjcl.ecc.ecdsa.publicKey.prototype = {
  /** Diffie-Hellmann function
  * @param {bitArray} hash hash to verify.
  * @param {bitArray} rs signature bitArray.
  * @param {boolean}  fakeLegacyVersion use old legacy version
  */
  verify: function(hash, rs, fakeLegacyVersion) {
    if (sjcl.bitArray.bitLength(hash) > this._curveBitLength) {
      hash = sjcl.bitArray.clamp(hash, this._curveBitLength);
    }
    var w = sjcl.bitArray,
        R = this._curve.r,
        l = this._curveBitLength,
        r = sjcl.bn.fromBits(w.bitSlice(rs,0,l)),
        ss = sjcl.bn.fromBits(w.bitSlice(rs,l,2*l)),
        s = fakeLegacyVersion ? ss : ss.inverseMod(R),
        hG = sjcl.bn.fromBits(hash).mul(s).mod(R),
        hA = r.mul(s).mod(R),
        r2 = this._curve.G.mult2(hG, hA, this._point).x;
    if (r.equals(0) || ss.equals(0) || r.greaterEquals(R) || ss.greaterEquals(R) || !r2.equals(r)) {
      if (fakeLegacyVersion === undefined) {
        return this.verify(hash, rs, true);
      } else {
        throw (new sjcl.exception.corrupt("signature didn't check out"));
      }
    }
    return true;
  },

  getType: function() {
    return "ecdsa";
  }
};

/** ecdsa secretKey
* @constructor
* @augments sjcl.ecc.basicKey.publicKey
*/
sjcl.ecc.ecdsa.secretKey = function (curve, exponent) {
  sjcl.ecc.basicKey.secretKey.apply(this, arguments);
};

/** specific functions for ecdsa secretKey. */
sjcl.ecc.ecdsa.secretKey.prototype = {
  /** Diffie-Hellmann function
  * @param {bitArray} hash hash to sign.
  * @param {int} paranoia paranoia for random number generation
  * @param {boolean} fakeLegacyVersion use old legacy version
  */
  sign: function(hash, paranoia, fakeLegacyVersion, fixedKForTesting) {
    if (sjcl.bitArray.bitLength(hash) > this._curveBitLength) {
      hash = sjcl.bitArray.clamp(hash, this._curveBitLength);
    }
    var R  = this._curve.r,
        l  = R.bitLength(),
        k  = fixedKForTesting || sjcl.bn.random(R.sub(1), paranoia).add(1),
        r  = this._curve.G.mult(k).x.mod(R),
        ss = sjcl.bn.fromBits(hash).add(r.mul(this._exponent)),
        s  = fakeLegacyVersion ? ss.inverseMod(R).mul(k).mod(R)
             : ss.mul(k.inverseMod(R)).mod(R);
    return sjcl.bitArray.concat(r.toBits(l), s.toBits(l));
  },

  getType: function() {
    return "ecdsa";
  }
};
/** @fileOverview Javascript RIPEMD-160 implementation.
 */
(function() {

/**
 * Context for a RIPEMD-160 operation in progress.
 * @constructor
 */
sjcl.hash.ripemd160 = function (hash) {
    if (hash) {
        this._h = hash._h.slice(0);
        this._buffer = hash._buffer.slice(0);
        this._length = hash._length;
    } else {
        this.reset();
    }
};

/**
 * Hash a string or an array of words.
 * @static
 * @param {bitArray|String} data the data to hash.
 * @return {bitArray} The hash value, an array of 5 big-endian words.
 */
sjcl.hash.ripemd160.hash = function (data) {
  return (new sjcl.hash.ripemd160()).update(data).finalize();
};

sjcl.hash.ripemd160.prototype = {
    /**
     * Reset the hash state.
     * @return this
     */
    reset: function () {
        this._h = _h0.slice(0);
        this._buffer = [];
        this._length = 0;
        return this;
    },

    /**
     * Reset the hash state.
     * @param {bitArray|String} data the data to hash.
     * @return this
     */
    update: function (data) {
        if ( typeof data === "string" )
            data = sjcl.codec.utf8String.toBits(data);

        var i, b = this._buffer = sjcl.bitArray.concat(this._buffer, data),
            ol = this._length,
            nl = this._length = ol + sjcl.bitArray.bitLength(data);
        if (nl > 9007199254740991){
            throw new sjcl.exception.invalid("Cannot hash more than 2^53 - 1 bits");
        }
        for (i = 512+ol - ((512+ol) & 511); i <= nl; i+= 512) {
            var words = b.splice(0,16);
            for ( var w = 0; w < 16; ++w )
                words[w] = _cvt(words[w]);

            _block.call( this, words );
        }

        return this;
    },

    /**
     * Complete hashing and output the hash value.
     * @return {bitArray} The hash value, an array of 5 big-endian words.
     */
    finalize: function () {
        var b = sjcl.bitArray.concat( this._buffer, [ sjcl.bitArray.partial(1,1) ] ),
            l = ( this._length + 1 ) % 512,
            z = ( l > 448 ? 512 : 448 ) - l % 448,
            zp = z % 32;

        if ( zp > 0 )
            b = sjcl.bitArray.concat( b, [ sjcl.bitArray.partial(zp,0) ] );
        for ( ; z >= 32; z -= 32 )
            b.push(0);

        b.push( _cvt( this._length | 0 ) );
        b.push( _cvt( Math.floor(this._length / 0x100000000) ) );

        while ( b.length ) {
            var words = b.splice(0,16);
            for ( var w = 0; w < 16; ++w )
                words[w] = _cvt(words[w]);

            _block.call( this, words );
        }

        var h = this._h;
        this.reset();

        for ( var w = 0; w < 5; ++w )
            h[w] = _cvt(h[w]);

        return h;
    }
};

var _h0 = [ 0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0 ];

var _k1 = [ 0x00000000, 0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xa953fd4e ];
var _k2 = [ 0x50a28be6, 0x5c4dd124, 0x6d703ef3, 0x7a6d76e9, 0x00000000 ];
for ( var i = 4; i >= 0; --i ) {
    for ( var j = 1; j < 16; ++j ) {
        _k1.splice(i,0,_k1[i]);
        _k2.splice(i,0,_k2[i]);
    }
}

var _r1 = [  0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15,
             7,  4, 13,  1, 10,  6, 15,  3, 12,  0,  9,  5,  2, 14, 11,  8,
             3, 10, 14,  4,  9, 15,  8,  1,  2,  7,  0,  6, 13, 11,  5, 12,
             1,  9, 11, 10,  0,  8, 12,  4, 13,  3,  7, 15, 14,  5,  6,  2,
             4,  0,  5,  9,  7, 12,  2, 10, 14,  1,  3,  8, 11,  6, 15, 13 ];
var _r2 = [  5, 14,  7,  0,  9,  2, 11,  4, 13,  6, 15,  8,  1, 10,  3, 12,
             6, 11,  3,  7,  0, 13,  5, 10, 14, 15,  8, 12,  4,  9,  1,  2,
            15,  5,  1,  3,  7, 14,  6,  9, 11,  8, 12,  2, 10,  0,  4, 13,
             8,  6,  4,  1,  3, 11, 15,  0,  5, 12,  2, 13,  9,  7, 10, 14,
            12, 15, 10,  4,  1,  5,  8,  7,  6,  2, 13, 14,  0,  3,  9, 11 ];

var _s1 = [ 11, 14, 15, 12,  5,  8,  7,  9, 11, 13, 14, 15,  6,  7,  9,  8,
             7,  6,  8, 13, 11,  9,  7, 15,  7, 12, 15,  9, 11,  7, 13, 12,
            11, 13,  6,  7, 14,  9, 13, 15, 14,  8, 13,  6,  5, 12,  7,  5,
            11, 12, 14, 15, 14, 15,  9,  8,  9, 14,  5,  6,  8,  6,  5, 12,
             9, 15,  5, 11,  6,  8, 13, 12,  5, 12, 13, 14, 11,  8,  5,  6 ];
var _s2 = [  8,  9,  9, 11, 13, 15, 15,  5,  7,  7,  8, 11, 14, 14, 12,  6,
             9, 13, 15,  7, 12,  8,  9, 11,  7,  7, 12,  7,  6, 15, 13, 11,
             9,  7, 15, 11,  8,  6,  6, 14, 12, 13,  5, 14, 13, 13,  7,  5,
            15,  5,  8, 11, 14, 14,  6, 14,  6,  9, 12,  9, 12,  5, 15,  8,
             8,  5, 12,  9, 12,  5, 14,  6,  8, 13,  6,  5, 15, 13, 11, 11 ];

function _f0(x,y,z) {
    return x ^ y ^ z;
}

function _f1(x,y,z) {
    return (x & y) | (~x & z);
}

function _f2(x,y,z) {
    return (x | ~y) ^ z;
}

function _f3(x,y,z) {
    return (x & z) | (y & ~z);
}

function _f4(x,y,z) {
    return x ^ (y | ~z);
}

function _rol(n,l) {
    return (n << l) | (n >>> (32-l));
}

function _cvt(n) {
    return ( (n & 0xff <<  0) <<  24 )
         | ( (n & 0xff <<  8) <<   8 )
         | ( (n & 0xff << 16) >>>  8 )
         | ( (n & 0xff << 24) >>> 24 );
}

function _block(X) {
    var A1 = this._h[0], B1 = this._h[1], C1 = this._h[2], D1 = this._h[3], E1 = this._h[4],
        A2 = this._h[0], B2 = this._h[1], C2 = this._h[2], D2 = this._h[3], E2 = this._h[4];

    var j = 0, T;

    for ( ; j < 16; ++j ) {
        T = _rol( A1 + _f0(B1,C1,D1) + X[_r1[j]] + _k1[j], _s1[j] ) + E1;
        A1 = E1; E1 = D1; D1 = _rol(C1,10); C1 = B1; B1 = T;
        T = _rol( A2 + _f4(B2,C2,D2) + X[_r2[j]] + _k2[j], _s2[j] ) + E2;
        A2 = E2; E2 = D2; D2 = _rol(C2,10); C2 = B2; B2 = T; }
    for ( ; j < 32; ++j ) {
        T = _rol( A1 + _f1(B1,C1,D1) + X[_r1[j]] + _k1[j], _s1[j] ) + E1;
        A1 = E1; E1 = D1; D1 = _rol(C1,10); C1 = B1; B1 = T;
        T = _rol( A2 + _f3(B2,C2,D2) + X[_r2[j]] + _k2[j], _s2[j] ) + E2;
        A2 = E2; E2 = D2; D2 = _rol(C2,10); C2 = B2; B2 = T; }
    for ( ; j < 48; ++j ) {
        T = _rol( A1 + _f2(B1,C1,D1) + X[_r1[j]] + _k1[j], _s1[j] ) + E1;
        A1 = E1; E1 = D1; D1 = _rol(C1,10); C1 = B1; B1 = T;
        T = _rol( A2 + _f2(B2,C2,D2) + X[_r2[j]] + _k2[j], _s2[j] ) + E2;
        A2 = E2; E2 = D2; D2 = _rol(C2,10); C2 = B2; B2 = T; }
    for ( ; j < 64; ++j ) {
        T = _rol( A1 + _f3(B1,C1,D1) + X[_r1[j]] + _k1[j], _s1[j] ) + E1;
        A1 = E1; E1 = D1; D1 = _rol(C1,10); C1 = B1; B1 = T;
        T = _rol( A2 + _f1(B2,C2,D2) + X[_r2[j]] + _k2[j], _s2[j] ) + E2;
        A2 = E2; E2 = D2; D2 = _rol(C2,10); C2 = B2; B2 = T; }
    for ( ; j < 80; ++j ) {
        T = _rol( A1 + _f4(B1,C1,D1) + X[_r1[j]] + _k1[j], _s1[j] ) + E1;
        A1 = E1; E1 = D1; D1 = _rol(C1,10); C1 = B1; B1 = T;
        T = _rol( A2 + _f0(B2,C2,D2) + X[_r2[j]] + _k2[j], _s2[j] ) + E2;
        A2 = E2; E2 = D2; D2 = _rol(C2,10); C2 = B2; B2 = T; }

    T = this._h[1] + C1 + D2;
    this._h[1] = this._h[2] + D1 + E2;
    this._h[2] = this._h[3] + E1 + A2;
    this._h[3] = this._h[4] + A1 + B2;
    this._h[4] = this._h[0] + B1 + C2;
    this._h[0] = T;
}

})();
/** @fileOverview Javascript SHA-256 implementation.
 *
 * An older version of this implementation is available in the public
 * domain, but this one is (c) Emily Stark, Mike Hamburg, Dan Boneh,
 * Stanford University 2008-2010 and BSD-licensed for liability
 * reasons.
 *
 * Special thanks to Aldo Cortesi for pointing out several bugs in
 * this code.
 */

/**
 * Context for a SHA-256 operation in progress.
 * @constructor
 */
sjcl.hash.sha256 = function (hash) {
  if (!this._key[0]) { this._precompute(); }
  if (hash) {
    this._h = hash._h.slice(0);
    this._buffer = hash._buffer.slice(0);
    this._length = hash._length;
  } else {
    this.reset();
  }
};

/**
 * Hash a string or an array of words.
 * @static
 * @param {bitArray|String} data the data to hash.
 * @return {bitArray} The hash value, an array of 16 big-endian words.
 */
sjcl.hash.sha256.hash = function (data) {
  return (new sjcl.hash.sha256()).update(data).finalize();
};

sjcl.hash.sha256.prototype = {
  /**
   * The hash's block size, in bits.
   * @constant
   */
  blockSize: 512,
   
  /**
   * Reset the hash state.
   * @return this
   */
  reset:function () {
    this._h = this._init.slice(0);
    this._buffer = [];
    this._length = 0;
    return this;
  },
  
  /**
   * Input several words to the hash.
   * @param {bitArray|String} data the data to hash.
   * @return this
   */
  update: function (data) {
    if (typeof data === "string") {
      data = sjcl.codec.utf8String.toBits(data);
    }
    var i, b = this._buffer = sjcl.bitArray.concat(this._buffer, data),
        ol = this._length,
        nl = this._length = ol + sjcl.bitArray.bitLength(data);
    if (nl > 9007199254740991){
      throw new sjcl.exception.invalid("Cannot hash more than 2^53 - 1 bits");
    }

    if (typeof Uint32Array !== 'undefined') {
	var c = new Uint32Array(b);
    	var j = 0;
    	for (i = 512+ol - ((512+ol) & 511); i <= nl; i+= 512) {
      	    this._block(c.subarray(16 * j, 16 * (j+1)));
      	    j += 1;
    	}
    	b.splice(0, 16 * j);
    } else {
	for (i = 512+ol - ((512+ol) & 511); i <= nl; i+= 512) {
      	    this._block(b.splice(0,16));
      	}
    }
    return this;
  },
  
  /**
   * Complete hashing and output the hash value.
   * @return {bitArray} The hash value, an array of 8 big-endian words.
   */
  finalize:function () {
    var i, b = this._buffer, h = this._h;

    // Round out and push the buffer
    b = sjcl.bitArray.concat(b, [sjcl.bitArray.partial(1,1)]);
    
    // Round out the buffer to a multiple of 16 words, less the 2 length words.
    for (i = b.length + 2; i & 15; i++) {
      b.push(0);
    }
    
    // append the length
    b.push(Math.floor(this._length / 0x100000000));
    b.push(this._length | 0);

    while (b.length) {
      this._block(b.splice(0,16));
    }

    this.reset();
    return h;
  },

  /**
   * The SHA-256 initialization vector, to be precomputed.
   * @private
   */
  _init:[],
  /*
  _init:[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19],
  */
  
  /**
   * The SHA-256 hash key, to be precomputed.
   * @private
   */
  _key:[],
  /*
  _key:
    [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
     0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
     0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
     0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
     0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
     0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
     0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
     0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2],
  */


  /**
   * Function to precompute _init and _key.
   * @private
   */
  _precompute: function () {
    var i = 0, prime = 2, factor, isPrime;

    function frac(x) { return (x-Math.floor(x)) * 0x100000000 | 0; }

    for (; i<64; prime++) {
      isPrime = true;
      for (factor=2; factor*factor <= prime; factor++) {
        if (prime % factor === 0) {
          isPrime = false;
          break;
        }
      }
      if (isPrime) {
        if (i<8) {
          this._init[i] = frac(Math.pow(prime, 1/2));
        }
        this._key[i] = frac(Math.pow(prime, 1/3));
        i++;
      }
    }
  },
  
  /**
   * Perform one cycle of SHA-256.
   * @param {Uint32Array|bitArray} w one block of words.
   * @private
   */
  _block:function (w) {  
    var i, tmp, a, b,
      h = this._h,
      k = this._key,
      h0 = h[0], h1 = h[1], h2 = h[2], h3 = h[3],
      h4 = h[4], h5 = h[5], h6 = h[6], h7 = h[7];

    /* Rationale for placement of |0 :
     * If a value can overflow is original 32 bits by a factor of more than a few
     * million (2^23 ish), there is a possibility that it might overflow the
     * 53-bit mantissa and lose precision.
     *
     * To avoid this, we clamp back to 32 bits by |'ing with 0 on any value that
     * propagates around the loop, and on the hash state h[].  I don't believe
     * that the clamps on h4 and on h0 are strictly necessary, but it's close
     * (for h4 anyway), and better safe than sorry.
     *
     * The clamps on h[] are necessary for the output to be correct even in the
     * common case and for short inputs.
     */
    for (i=0; i<64; i++) {
      // load up the input word for this round
      if (i<16) {
        tmp = w[i];
      } else {
        a   = w[(i+1 ) & 15];
        b   = w[(i+14) & 15];
        tmp = w[i&15] = ((a>>>7  ^ a>>>18 ^ a>>>3  ^ a<<25 ^ a<<14) + 
                         (b>>>17 ^ b>>>19 ^ b>>>10 ^ b<<15 ^ b<<13) +
                         w[i&15] + w[(i+9) & 15]) | 0;
      }
      
      tmp = (tmp + h7 + (h4>>>6 ^ h4>>>11 ^ h4>>>25 ^ h4<<26 ^ h4<<21 ^ h4<<7) +  (h6 ^ h4&(h5^h6)) + k[i]); // | 0;
      
      // shift register
      h7 = h6; h6 = h5; h5 = h4;
      h4 = h3 + tmp | 0;
      h3 = h2; h2 = h1; h1 = h0;

      h0 = (tmp +  ((h1&h2) ^ (h3&(h1^h2))) + (h1>>>2 ^ h1>>>13 ^ h1>>>22 ^ h1<<30 ^ h1<<19 ^ h1<<10)) | 0;
    }

    h[0] = h[0]+h0 | 0;
    h[1] = h[1]+h1 | 0;
    h[2] = h[2]+h2 | 0;
    h[3] = h[3]+h3 | 0;
    h[4] = h[4]+h4 | 0;
    h[5] = h[5]+h5 | 0;
    h[6] = h[6]+h6 | 0;
    h[7] = h[7]+h7 | 0;
  }
};


/** @fileOverview Random number generator.
 */

/** 
 * @class Random number generator
 * @description
 * <b>Use sjcl.random as a singleton for this class!</b>
 * <p>
 * This random number generator is a derivative of Ferguson and Schneier's
 * generator Fortuna.  It collects entropy from various events into several
 * pools, implemented by streaming SHA-256 instances.  It differs from
 * ordinary Fortuna in a few ways, though.
 * </p>
 *
 * <p>
 * Most importantly, it has an entropy estimator.  This is present because
 * there is a strong conflict here between making the generator available
 * as soon as possible, and making sure that it doesn't "run on empty".
 * In Fortuna, there is a saved state file, and the system is likely to have
 * time to warm up.
 * </p>
 *
 * <p>
 * Second, because users are unlikely to stay on the page for very long,
 * and to speed startup time, the number of pools increases logarithmically:
 * a new pool is created when the previous one is actually used for a reseed.
 * This gives the same asymptotic guarantees as Fortuna, but gives more
 * entropy to early reseeds.
 * </p>
 *
 * <p>
 * The entire mechanism here feels pretty klunky.  Furthermore, there are
 * several improvements that should be made, including support for
 * dedicated cryptographic functions that may be present in some browsers;
 * state files in local storage; cookies containing randomness; etc.  So
 * look for improvements in future versions.
 * </p>
 * @constructor
 */
sjcl.prng = function(defaultParanoia) {
  
  /* private */
  this._pools                   = [new sjcl.hash.sha256()];
  this._poolEntropy             = [0];
  this._reseedCount             = 0;
  this._robins                  = {};
  this._eventId                 = 0;
  
  this._collectorIds            = {};
  this._collectorIdNext         = 0;
  
  this._strength                = 0;
  this._poolStrength            = 0;
  this._nextReseed              = 0;
  this._key                     = [0,0,0,0,0,0,0,0];
  this._counter                 = [0,0,0,0];
  this._cipher                  = undefined;
  this._defaultParanoia         = defaultParanoia;
  
  /* event listener stuff */
  this._collectorsStarted       = false;
  this._callbacks               = {progress: {}, seeded: {}};
  this._callbackI               = 0;
  
  /* constants */
  this._NOT_READY               = 0;
  this._READY                   = 1;
  this._REQUIRES_RESEED         = 2;

  this._MAX_WORDS_PER_BURST     = 65536;
  this._PARANOIA_LEVELS         = [0,48,64,96,128,192,256,384,512,768,1024];
  this._MILLISECONDS_PER_RESEED = 30000;
  this._BITS_PER_RESEED         = 80;
};
 
sjcl.prng.prototype = {
  /** Generate several random words, and return them in an array.
   * A word consists of 32 bits (4 bytes)
   * @param {Number} nwords The number of words to generate.
   */
  randomWords: function (nwords, paranoia) {
    var out = [], i, readiness = this.isReady(paranoia), g;
  
    if (readiness === this._NOT_READY) {
      throw new sjcl.exception.notReady("generator isn't seeded");
    } else if (readiness & this._REQUIRES_RESEED) {
      this._reseedFromPools(!(readiness & this._READY));
    }
  
    for (i=0; i<nwords; i+= 4) {
      if ((i+1) % this._MAX_WORDS_PER_BURST === 0) {
        this._gate();
      }
   
      g = this._gen4words();
      out.push(g[0],g[1],g[2],g[3]);
    }
    this._gate();
  
    return out.slice(0,nwords);
  },
  
  setDefaultParanoia: function (paranoia, allowZeroParanoia) {
    if (paranoia === 0 && allowZeroParanoia !== "Setting paranoia=0 will ruin your security; use it only for testing") {
      throw new sjcl.exception.invalid("Setting paranoia=0 will ruin your security; use it only for testing");
    }

    this._defaultParanoia = paranoia;
  },
  
  /**
   * Add entropy to the pools.
   * @param data The entropic value.  Should be a 32-bit integer, array of 32-bit integers, or string
   * @param {Number} estimatedEntropy The estimated entropy of data, in bits
   * @param {String} source The source of the entropy, eg "mouse"
   */
  addEntropy: function (data, estimatedEntropy, source) {
    source = source || "user";
  
    var id,
      i, tmp,
      t = (new Date()).valueOf(),
      robin = this._robins[source],
      oldReady = this.isReady(), err = 0, objName;
      
    id = this._collectorIds[source];
    if (id === undefined) { id = this._collectorIds[source] = this._collectorIdNext ++; }
      
    if (robin === undefined) { robin = this._robins[source] = 0; }
    this._robins[source] = ( this._robins[source] + 1 ) % this._pools.length;
  
    switch(typeof(data)) {
      
    case "number":
      if (estimatedEntropy === undefined) {
        estimatedEntropy = 1;
      }
      this._pools[robin].update([id,this._eventId++,1,estimatedEntropy,t,1,data|0]);
      break;
      
    case "object":
      objName = Object.prototype.toString.call(data);
      if (objName === "[object Uint32Array]") {
        tmp = [];
        for (i = 0; i < data.length; i++) {
          tmp.push(data[i]);
        }
        data = tmp;
      } else {
        if (objName !== "[object Array]") {
          err = 1;
        }
        for (i=0; i<data.length && !err; i++) {
          if (typeof(data[i]) !== "number") {
            err = 1;
          }
        }
      }
      if (!err) {
        if (estimatedEntropy === undefined) {
          /* horrible entropy estimator */
          estimatedEntropy = 0;
          for (i=0; i<data.length; i++) {
            tmp= data[i];
            while (tmp>0) {
              estimatedEntropy++;
              tmp = tmp >>> 1;
            }
          }
        }
        this._pools[robin].update([id,this._eventId++,2,estimatedEntropy,t,data.length].concat(data));
      }
      break;
      
    case "string":
      if (estimatedEntropy === undefined) {
       /* English text has just over 1 bit per character of entropy.
        * But this might be HTML or something, and have far less
        * entropy than English...  Oh well, let's just say one bit.
        */
       estimatedEntropy = data.length;
      }
      this._pools[robin].update([id,this._eventId++,3,estimatedEntropy,t,data.length]);
      this._pools[robin].update(data);
      break;
      
    default:
      err=1;
    }
    if (err) {
      throw new sjcl.exception.bug("random: addEntropy only supports number, array of numbers or string");
    }
  
    /* record the new strength */
    this._poolEntropy[robin] += estimatedEntropy;
    this._poolStrength += estimatedEntropy;
  
    /* fire off events */
    if (oldReady === this._NOT_READY) {
      if (this.isReady() !== this._NOT_READY) {
        this._fireEvent("seeded", Math.max(this._strength, this._poolStrength));
      }
      this._fireEvent("progress", this.getProgress());
    }
  },
  
  /** Is the generator ready? */
  isReady: function (paranoia) {
    var entropyRequired = this._PARANOIA_LEVELS[ (paranoia !== undefined) ? paranoia : this._defaultParanoia ];
  
    if (this._strength && this._strength >= entropyRequired) {
      return (this._poolEntropy[0] > this._BITS_PER_RESEED && (new Date()).valueOf() > this._nextReseed) ?
        this._REQUIRES_RESEED | this._READY :
        this._READY;
    } else {
      return (this._poolStrength >= entropyRequired) ?
        this._REQUIRES_RESEED | this._NOT_READY :
        this._NOT_READY;
    }
  },
  
  /** Get the generator's progress toward readiness, as a fraction */
  getProgress: function (paranoia) {
    var entropyRequired = this._PARANOIA_LEVELS[ paranoia ? paranoia : this._defaultParanoia ];
  
    if (this._strength >= entropyRequired) {
      return 1.0;
    } else {
      return (this._poolStrength > entropyRequired) ?
        1.0 :
        this._poolStrength / entropyRequired;
    }
  },
  
  /** start the built-in entropy collectors */
  startCollectors: function () {
    if (this._collectorsStarted) { return; }
  
    this._eventListener = {
      loadTimeCollector: this._bind(this._loadTimeCollector),
      mouseCollector: this._bind(this._mouseCollector),
      keyboardCollector: this._bind(this._keyboardCollector),
      accelerometerCollector: this._bind(this._accelerometerCollector),
      touchCollector: this._bind(this._touchCollector)
    };

    if (window.addEventListener) {
      window.addEventListener("load", this._eventListener.loadTimeCollector, false);
      window.addEventListener("mousemove", this._eventListener.mouseCollector, false);
      window.addEventListener("keypress", this._eventListener.keyboardCollector, false);
      window.addEventListener("devicemotion", this._eventListener.accelerometerCollector, false);
      window.addEventListener("touchmove", this._eventListener.touchCollector, false);
    } else if (document.attachEvent) {
      document.attachEvent("onload", this._eventListener.loadTimeCollector);
      document.attachEvent("onmousemove", this._eventListener.mouseCollector);
      document.attachEvent("keypress", this._eventListener.keyboardCollector);
    } else {
      throw new sjcl.exception.bug("can't attach event");
    }
  
    this._collectorsStarted = true;
  },
  
  /** stop the built-in entropy collectors */
  stopCollectors: function () {
    if (!this._collectorsStarted) { return; }
  
    if (window.removeEventListener) {
      window.removeEventListener("load", this._eventListener.loadTimeCollector, false);
      window.removeEventListener("mousemove", this._eventListener.mouseCollector, false);
      window.removeEventListener("keypress", this._eventListener.keyboardCollector, false);
      window.removeEventListener("devicemotion", this._eventListener.accelerometerCollector, false);
      window.removeEventListener("touchmove", this._eventListener.touchCollector, false);
    } else if (document.detachEvent) {
      document.detachEvent("onload", this._eventListener.loadTimeCollector);
      document.detachEvent("onmousemove", this._eventListener.mouseCollector);
      document.detachEvent("keypress", this._eventListener.keyboardCollector);
    }

    this._collectorsStarted = false;
  },
  
  /* use a cookie to store entropy.
  useCookie: function (all_cookies) {
      throw new sjcl.exception.bug("random: useCookie is unimplemented");
  },*/
  
  /** add an event listener for progress or seeded-ness. */
  addEventListener: function (name, callback) {
    this._callbacks[name][this._callbackI++] = callback;
  },
  
  /** remove an event listener for progress or seeded-ness */
  removeEventListener: function (name, cb) {
    var i, j, cbs=this._callbacks[name], jsTemp=[];

    /* I'm not sure if this is necessary; in C++, iterating over a
     * collection and modifying it at the same time is a no-no.
     */

    for (j in cbs) {
      if (cbs.hasOwnProperty(j) && cbs[j] === cb) {
        jsTemp.push(j);
      }
    }

    for (i=0; i<jsTemp.length; i++) {
      j = jsTemp[i];
      delete cbs[j];
    }
  },
  
  _bind: function (func) {
    var that = this;
    return function () {
      func.apply(that, arguments);
    };
  },

  /** Generate 4 random words, no reseed, no gate.
   * @private
   */
  _gen4words: function () {
    for (var i=0; i<4; i++) {
      this._counter[i] = this._counter[i]+1 | 0;
      if (this._counter[i]) { break; }
    }
    return this._cipher.encrypt(this._counter);
  },
  
  /* Rekey the AES instance with itself after a request, or every _MAX_WORDS_PER_BURST words.
   * @private
   */
  _gate: function () {
    this._key = this._gen4words().concat(this._gen4words());
    this._cipher = new sjcl.cipher.aes(this._key);
  },
  
  /** Reseed the generator with the given words
   * @private
   */
  _reseed: function (seedWords) {
    this._key = sjcl.hash.sha256.hash(this._key.concat(seedWords));
    this._cipher = new sjcl.cipher.aes(this._key);
    for (var i=0; i<4; i++) {
      this._counter[i] = this._counter[i]+1 | 0;
      if (this._counter[i]) { break; }
    }
  },
  
  /** reseed the data from the entropy pools
   * @param full If set, use all the entropy pools in the reseed.
   */
  _reseedFromPools: function (full) {
    var reseedData = [], strength = 0, i;
  
    this._nextReseed = reseedData[0] =
      (new Date()).valueOf() + this._MILLISECONDS_PER_RESEED;
    
    for (i=0; i<16; i++) {
      /* On some browsers, this is cryptographically random.  So we might
       * as well toss it in the pot and stir...
       */
      reseedData.push(Math.random()*0x100000000|0);
    }
    
    for (i=0; i<this._pools.length; i++) {
     reseedData = reseedData.concat(this._pools[i].finalize());
     strength += this._poolEntropy[i];
     this._poolEntropy[i] = 0;
   
     if (!full && (this._reseedCount & (1<<i))) { break; }
    }
  
    /* if we used the last pool, push a new one onto the stack */
    if (this._reseedCount >= 1 << this._pools.length) {
     this._pools.push(new sjcl.hash.sha256());
     this._poolEntropy.push(0);
    }
  
    /* how strong was this reseed? */
    this._poolStrength -= strength;
    if (strength > this._strength) {
      this._strength = strength;
    }
  
    this._reseedCount ++;
    this._reseed(reseedData);
  },
  
  _keyboardCollector: function () {
    this._addCurrentTimeToEntropy(1);
  },
  
  _mouseCollector: function (ev) {
    var x, y;

    try {
      x = ev.x || ev.clientX || ev.offsetX || 0;
      y = ev.y || ev.clientY || ev.offsetY || 0;
    } catch (err) {
      // Event originated from a secure element. No mouse position available.
      x = 0;
      y = 0;
    }

    if (x != 0 && y!= 0) {
      this.addEntropy([x,y], 2, "mouse");
    }

    this._addCurrentTimeToEntropy(0);
  },

  _touchCollector: function(ev) {
    var touch = ev.touches[0] || ev.changedTouches[0];
    var x = touch.pageX || touch.clientX,
        y = touch.pageY || touch.clientY;

    this.addEntropy([x,y],1,"touch");

    this._addCurrentTimeToEntropy(0);
  },
  
  _loadTimeCollector: function () {
    this._addCurrentTimeToEntropy(2);
  },

  _addCurrentTimeToEntropy: function (estimatedEntropy) {
    if (typeof window !== 'undefined' && window.performance && typeof window.performance.now === "function") {
      //how much entropy do we want to add here?
      this.addEntropy(window.performance.now(), estimatedEntropy, "loadtime");
    } else {
      this.addEntropy((new Date()).valueOf(), estimatedEntropy, "loadtime");
    }
  },
  _accelerometerCollector: function (ev) {
    var ac = ev.accelerationIncludingGravity.x||ev.accelerationIncludingGravity.y||ev.accelerationIncludingGravity.z;
    if(window.orientation){
      var or = window.orientation;
      if (typeof or === "number") {
        this.addEntropy(or, 1, "accelerometer");
      }
    }
    if (ac) {
      this.addEntropy(ac, 2, "accelerometer");
    }
    this._addCurrentTimeToEntropy(0);
  },

  _fireEvent: function (name, arg) {
    var j, cbs=sjcl.random._callbacks[name], cbsTemp=[];
    /* TODO: there is a race condition between removing collectors and firing them */

    /* I'm not sure if this is necessary; in C++, iterating over a
     * collection and modifying it at the same time is a no-no.
     */

    for (j in cbs) {
      if (cbs.hasOwnProperty(j)) {
        cbsTemp.push(cbs[j]);
      }
    }

    for (j=0; j<cbsTemp.length; j++) {
      cbsTemp[j](arg);
    }
  }
};

/** an instance for the prng.
* @see sjcl.prng
*/
sjcl.random = new sjcl.prng(6);

(function(){
  // function for getting nodejs crypto module. catches and ignores errors.
  function getCryptoModule() {
    try {
      return require('crypto');
    }
    catch (e) {
      return null;
    }
  }

  try {
    var buf, crypt, ab;

    // get cryptographically strong entropy depending on runtime environment
    if (typeof module !== 'undefined' && module.exports && (crypt = getCryptoModule()) && crypt.randomBytes) {
      buf = crypt.randomBytes(1024/8);
      buf = new Uint32Array(new Uint8Array(buf).buffer);
      sjcl.random.addEntropy(buf, 1024, "crypto.randomBytes");

    } else if (typeof window !== 'undefined' && typeof Uint32Array !== 'undefined') {
      ab = new Uint32Array(32);
      if (window.crypto && window.crypto.getRandomValues) {
        window.crypto.getRandomValues(ab);
      } else if (window.msCrypto && window.msCrypto.getRandomValues) {
        window.msCrypto.getRandomValues(ab);
      } else {
        return;
      }

      // get cryptographically strong entropy in Webkit
      sjcl.random.addEntropy(ab, 1024, "crypto.getRandomValues");

    } else {
      // no getRandomValues :-(
    }
  } catch (e) {
    if (typeof window !== 'undefined' && window.console) {
      console.log("There was an error collecting entropy from the browser:");
      console.log(e);
      //we do not want the library to fail due to randomness not being maintained.
    }
  }
}());
/* global sjcl */
sjcl.codec.base58 = {
  alpha: '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',
  lookup: {
    '1': 0,
    '2': 1,
    '3': 2,
    '4': 3,
    '5': 4,
    '6': 5,
    '7': 6,
    '8': 7,
    '9': 8,
    A: 9,
    B: 10,
    C: 11,
    D: 12,
    E: 13,
    F: 14,
    G: 15,
    H: 16,
    J: 17,
    K: 18,
    L: 19,
    M: 20,
    N: 21,
    P: 22,
    Q: 23,
    R: 24,
    S: 25,
    T: 26,
    U: 27,
    V: 28,
    W: 29,
    X: 30,
    Y: 31,
    Z: 32,
    a: 33,
    b: 34,
    c: 35,
    d: 36,
    e: 37,
    f: 38,
    g: 39,
    h: 40,
    i: 41,
    j: 42,
    k: 43,
    m: 44,
    n: 45,
    o: 46,
    p: 47,
    q: 48,
    r: 49,
    s: 50,
    t: 51,
    u: 52,
    v: 53,
    w: 54,
    x: 55,
    y: 56,
    z: 57
  },

  toBits: function(fromDigits) {
    var work = new sjcl.bn();
    var fb = new sjcl.bn(58);

    for (var i = 0; i < fromDigits.length; i++) {
      var digit = new sjcl.bn(sjcl.codec.base58.lookup[fromDigits[i]]);
      work.addM(digit.mul(fb.power(fromDigits.length - i - 1)));
    }

    work.fullReduce();
    return work.toBits();
  },

  fromBits: function(bits) {
    var num = sjcl.bn.fromBits(bits);
    var bitlen = sjcl.bitArray.bitLength(bits);
    var len = Math.ceil(bitlen * (Math.log(2) / Math.log(58)));
    var base = new sjcl.bn(58);
    var str = '';

    for (var i = len - 1; i >= 0; i--) {
      var iBig = new sjcl.bn(i);
      var exp = base.power(iBig);

      var pos = 0;
      while (num.greaterEquals(exp)) {
        num.subM(exp);
        num.normalize();
        pos++;
      }
      if (!(i === len - 1 && pos === 0)) {
        str += sjcl.codec.base58.alpha[pos];
      }
    }
    return str;
  }
};
/* global sjcl */

sjcl.codec.base58Check = {
  defaultChecksumFn: function(bits) {
    return sjcl.bitArray.bitSlice(
      sjcl.hash.sha256.hash(sjcl.hash.sha256.hash(bits)),
      0,
      32
    );
  },

  fromBits: function(version, bits, checksumFn) {
    checksumFn = checksumFn || sjcl.codec.base58Check.defaultChecksumFn;

    var bitsWithHeader = sjcl.bitArray.concat(
      [sjcl.bitArray.partial(8, version)],
      bits
    );
    var checksum = checksumFn(bitsWithHeader);
    var headerPayloadAndChecksum = sjcl.bitArray.concat(
      bitsWithHeader,
      checksum
    );
    var base58str = sjcl.codec.base58.fromBits(headerPayloadAndChecksum);

    var leadingZeroBits = 0;
    while (
      sjcl.bitArray.extract(headerPayloadAndChecksum, leadingZeroBits, 8) == 0
    ) {
      base58str = '1' + base58str;
      leadingZeroBits += 8;
    }

    return base58str;
  },
  toBits: function(str, checksumFn) {
    checksumFn = checksumFn || sjcl.codec.base58Check.defaultChecksumFn;

    var bits = sjcl.codec.base58.toBits(str);
    var bitlen = sjcl.bitArray.bitLength(bits);
    //    var headerByte = sjcl.bitArray.extract(bits, 0, 8);
    var payload = sjcl.bitArray.bitSlice(bits, 0, bitlen - 32);

    var transmittedChecksum = sjcl.bitArray.bitSlice(bits, bitlen - 32);
    var computedChecksum = checksumFn(payload);
    if (!sjcl.bitArray.equal(computedChecksum, transmittedChecksum)) {
      throw new Error('Checksums do not match');
    }

    return payload;
  }
};
/* global sjcl */
sjcl.codec.deipCrypto = {
  ROLES: ['owner', 'memo', 'active', 'posting'],
  MAINNET: {
    pubHeader: 0x0,
    privHeader: 0x80,
    pubPrefix: 'STM'
  },
  TESTNET: {
    pubHeader: 0x0,
    privHeader: 0x80,
    pubPrefix: 'TST'
  },
  keyChecksum: function(bits) {
    return sjcl.bitArray.bitSlice(sjcl.hash.ripemd160.hash(bits), 0, 32);
  },

  keysFromPassword: function(account, password) {
    var keyPairs = {};
    var CURVE = sjcl.ecc.curves.k256;
    for (var i = 0; i < sjcl.codec.deipCrypto.ROLES.length; i++) {
      var role = sjcl.codec.deipCrypto.ROLES[i];
      var seed = account + role + password;
      var secret = sjcl.bn.fromBits(
        sjcl.hash.sha256.hash(sjcl.codec.utf8String.toBits(seed))
      );
      keyPairs[role] = sjcl.ecc.ecdsa.generateKeys(CURVE, 0, secret);
    }
    return keyPairs;
  },

  signRecoverably: function(sec, hash, paranoia, fixedKForTesting) {
    /*
     * an explanation of the format of the recovery parameter.
     * given any ECDSA signature (r, s), there are 4 possible public keys that could have
     * generated the signature over the hash. Two have odd Y-coordinates and two have
     * even Y-coordinates. the recovery parameter deterministically identifies the public key
     * that _did_ generate the signature.
     *
     * to get the public key given the recovery parameter, do the following:
     * a. if the recovery parameter is between 27 and 31, subtract 27 and remember that the public
     * key that produced the signature is canonically an "uncompressed" public key (i.e. known by
     * its X and Y coordinates)
     * b. If the recovery parameter is between 31 and 34, subtract 31 and remember that the public
     * key that produced the signature is canonically a "compressed" public key (i.e. known by only
     * its X coordinate).
     *
     * note that in the Deip blockchain, all public keys are canonically compressed and therefore the
     * recovery parameter will always be between 31 and 34. therefore only case "b" applies here.
     *
     * after the subtraction, you will get a number between 0 and 4. this number, i, encodes the parity
     * and "overflow" of the candidate public key among the four options.
     *
     * the lowest bit of i in binary notation indicates the parity of the candidate public key.
     * if the lowest bit is set, the candidate public key's Y coordinate is odd. If it is cleared, the
     * Y coordinate is even.
     *
     * The next-lowest bit of i, if set, indicates that the candidate public key's x was greater than
     * the order of k. This is true of approximately 1 in 1^127 points on the secp256k1 curve.
     * considering the rarity of this condition, it's much much simpler to just brute-force this
     * condition when it occurs, following §4.1.6.
     */

    if (sjcl.bitArray.bitLength(hash) > this._curveBitLength) {
      hash = sjcl.bitArray.clamp(hash, this._curveBitLength);
    }

    while (true) {

      var CURVE = sjcl.ecc.curves.k256,
        n = CURVE.r,
        l = n.bitLength(),
        k = fixedKForTesting || sjcl.bn.random(n.sub(1), paranoia).add(1),
        R = CURVE.G.mult(k);

      if (fixedKForTesting) {
        fixedKForTesting = fixedKForTesting.add(1);
      }
      
      if (R.isIdentity) {
        continue;
      }

      var r = R.x.mod(n),
        ss = sjcl.bn.fromBits(hash).add(r.mul(sec._exponent)),
        s = ss.mul(k.inverseMod(n)).mod(n),
        isOdd = R.y.limbs[0] & (0x1 == 1),
        recoveryParam = 31;

        if (isOdd) {
          recoveryParam++;
        }
   
        var rBitArray = r.toBits(l);
        var sBitArray = s.toBits(l);

        var r0 = sjcl.bitArray.extract(rBitArray, 0, 8);
        var r1 = sjcl.bitArray.extract(rBitArray, 8, 8);
        var s0 = sjcl.bitArray.extract(sBitArray, 0, 8);
        var s1 = sjcl.bitArray.extract(sBitArray, 8, 8);
            
        if (!(r0 & 0x80)
          && !(r0 == 0 && !(r1 & 0x80))
          && !(s0 & 0x80)
          && !(s0 == 0 && !(s1 & 0x80))) {
          var rawSig = sjcl.bitArray.concat(r.toBits(l), s.toBits(l));
      
          return sjcl.bitArray.concat(
            [sjcl.bitArray.partial(8, recoveryParam)],
            rawSig
          );
        }
     }
  },

  recoverPublicKey: function(hash, sig) {
    var CURVE = sjcl.ecc.curves.k256;
    var n = CURVE.r;
    var G = CURVE.G;

    var recoveryParameter = sjcl.bitArray.extract(sig, 0, 8) - 31;
    var e = sjcl.bn.fromBits(hash);
    var r = sjcl.bn.fromBits(sjcl.bitArray.bitSlice(sig, 8, 264));
    var s = sjcl.bn.fromBits(sjcl.bitArray.bitSlice(sig, 264));

    if (recoveryParameter < 0 || recoveryParameter > 4) {
      throw new Error('Corrupt signature: recovery parameter is wrong');
    }

    var hasOddParity = (recoveryParameter & 0x1) === 1;

    for (var j = 0; j <= 1; j++) {
      var x = r.add(n.mul(j));

      var y = sjcl.codec.deipCrypto._yFromX(x, hasOddParity);
      var p = new sjcl.ecc.point(CURVE, x, y);

      var rInv = r.inverseMod(n);
      var eNeg = new sjcl.bn(0).sub(e).mod(n);
      var keyPoint = G.mult2(eNeg, s, p).mult(rInv);
      var key = new sjcl.ecc.ecdsa.publicKey(CURVE, keyPoint);
      try {
        key.verify(hash, sjcl.bitArray.bitSlice(sig, 8));
        return key;
      } catch (_) {
        // do nothing, wait for next j
      }
    }
    throw new Error('public key was unrecoverable');
  },

  serializePublicKey: function(key, net) {
    net = net || sjcl.codec.deipCrypto.MAINNET;

    var point = key.get();
    var header = net.pubHeader;

    // the public key header sets 0x3 if X is odd, 0x2 if even
    if (sjcl.bn.fromBits(point.y).limbs[0] & 0x1) {
      header |= 0x3;
    } else {
      header |= 0x2;
    }
    return (
      net.pubPrefix +
      sjcl.codec.base58Check.fromBits(
        header,
        point.x,
        sjcl.codec.deipCrypto.keyChecksum
      )
    );
  },

  deserializePublicKey: function(pubKey, net) {
    net = net || sjcl.codec.deipCrypto.MAINNET;
    var CURVE = sjcl.ecc.curves.k256;

    if (pubKey.indexOf(net.pubPrefix) !== 0) {
      throw new Error(
        'Public key is not in correct format, it should begin with "' +
          net.pubPrefix +
          '"'
      );
    }

    var payload = sjcl.codec.base58Check.toBits(
      pubKey.slice(3),
      sjcl.codec.deipCrypto.keyChecksum
    );
    var headerByte = sjcl.bitArray.extract(payload, 0, 8);
    var isOdd = headerByte == 0x3;
    if ((headerByte & net.pubHeader) !== net.pubHeader) {
      throw new Error('public key has invalid header');
    } else if ((headerByte & 0x3) === 0 && (headerByte & 0x2) === 0) {
      throw new Error(
        'public key has invalid header: should set 0x2 or 0x3, but got 0x' +
          headerByte.toString(16)
      );
    }

    var xBits = sjcl.bitArray.bitSlice(payload, 8);
    var x = sjcl.bn.fromBits(xBits);
    var y = sjcl.codec.deipCrypto._yFromX(x, isOdd);

    return new sjcl.ecc.ecdsa.publicKey(CURVE, new sjcl.ecc.point(CURVE, x, y));
  },

  serializePrivateKey: function(key, net) {
    net = net || sjcl.codec.deipCrypto.MAINNET;
    return sjcl.codec.base58Check.fromBits(net.privHeader, key.get());
  },

  deserializePrivateKey: function(wif, header) {
    header = header || sjcl.codec.deipCrypto.MAINNET.privHeader;
    var curve = sjcl.ecc.curves.k256;
    var payload = sjcl.codec.base58Check.toBits(wif);
    var headerByte = sjcl.bitArray.extract(payload, 0, 8);
    if (headerByte !== header) {
      throw new Error(
        'private key has invalid header: wanted 0x' +
          header.toString(16) +
          ', got 0x' +
          headerByte.toString(16)
      );
    }

    var keyBits = sjcl.bitArray.bitSlice(payload, 8);
    return new sjcl.ecc.ecdsa.secretKey(curve, sjcl.bn.fromBits(keyBits));
  },

  _yFromX: function(x, shouldBeOdd) {
    var CURVE = sjcl.ecc.curves.k256;
    var PIDENT = sjcl.codec.deipCrypto._getPident();

    var alpha = x
      .powermod(3, CURVE.field.modulus)
      .add(x.mulmod(CURVE.a, CURVE.field.modulus))
      .add(CURVE.b)
      .mod(CURVE.field.modulus);

    var y = alpha.powermod(PIDENT, CURVE.field.modulus);
    var yIsOdd = y.mod(2).equals(1);

    if ((yIsOdd && shouldBeOdd) || (!yIsOdd && !shouldBeOdd)) {
      return y;
    } else {
      return CURVE.field.modulus.sub(y).normalize();
    }
  },

  _getPident: function() {
    if (!sjcl.codec.deipCrypto.PIDENT) {
      sjcl.codec.deipCrypto.PIDENT = sjcl.ecc.curves.k256.field.modulus
        .add(1)
        .normalize()
        .halveM()
        .halveM()
        .normalize();
    }
    return sjcl.codec.deipCrypto.PIDENT;
  }
};


    return sjcl;
  })();

  exports.sjcl = sjcl;

  function PrivateKey(priv, pub) {
    // we deliberately avoid exposing private key material on the instance.
    // this is paranoid and probably doesn't protect against a determined
    // attack, but why make things easy?
    this.getPublicKey = function() {
      if (!pub) {
        pub = sjcl.ecc.ecdsa.generateKeys(
          sjcl.ecc.curves.k256,
          undefined,
          sjcl.bn.fromBits(priv.get())
        ).pub;
      }
      return new PublicKey(pub);
    };

    this.sign = function(hash) {
      return fromBits(sjcl.codec.deipCrypto.signRecoverably(priv, toBits(hash)));
    };
  }

  PrivateKey.from = function(wif, header) {
    return new PrivateKey(
      sjcl.codec.deipCrypto.deserializePrivateKey(wif, header)
    );
  };

  function PublicKey(pub) {
    this._p = pub;
  }

  PublicKey.from = function(str) {
    return new PublicKey(sjcl.codec.deipCrypto.deserializePublicKey(str));
  };

  PublicKey.recover = function(hash, sig) {
    return new PublicKey(
      sjcl.codec.deipCrypto.recoverPublicKey(toBits(hash), toBits(sig))
    );
  };

  PublicKey.prototype = {
    toString: function() {
      return sjcl.codec.deipCrypto.serializePublicKey(this._p);
    },
    verify: function(hash, signature) {
      try {
        var rawSig = sjcl.bitArray.bitSlice(toBits(signature), 8);
        this._p.verify(toBits(hash), rawSig);
        return true;
      } catch (_) {
        return false;
      }
    }
  };

  function generateKeys() {
    var k = sjcl.ecc.ecdsa.generateKeys(sjcl.ecc.curves.k256);
    return serializePair(k);
  }

  function keysFromPassword(accountName, accountPassword) {
    var keys = sjcl.codec.deipCrypto.keysFromPassword(
      accountName,
      accountPassword
    );
    return {
      owner: serializePair(keys.owner),
      memo: serializePair(keys.memo),
      posting: serializePair(keys.posting),
      active: serializePair(keys.active)
    };
  }

  function sha256(data) {
    return fromBits(sjcl.hash.sha256.hash(toBits(data)));
  }

  function ripemd160(data) {
    return fromBits(sjcl.hash.ripemd160.hash(toBits(data)));
  }

  function hexify(data) {
    var result = '';
    var view = new Uint8Array(data);
    for (var i = 0; i < view.byteLength; i++) {
      if (view[i] < 16) {
        result += '0';
      }
      result += view[i].toString(16);
    }
    return result;
  }

  function serializePair(k) {
    return {
      private: sjcl.codec.deipCrypto.serializePrivateKey(k.sec),
      public: sjcl.codec.deipCrypto.serializePublicKey(k.pub)
    };
  }

  function toBits(a) {
    if (a instanceof ArrayBuffer) {
      return sjcl.codec.arrayBuffer.toBits(a);
    } else {
      throw new Error('You must supply an ArrayBuffer');
    }
  }

  function fromBits(a) {
    return sjcl.codec.arrayBuffer.fromBits(a, 0, 0);
  }
});
