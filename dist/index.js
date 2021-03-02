(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.FakeXHR = {}));
}(this, (function (exports) { 'use strict';

  /**
   * Minimal Event interface implementation
   *
   * Original implementation by Sven Fuchs: https://gist.github.com/995028
   * Modifications and tests by Christian Johansen.
   *
   * @author Sven Fuchs (svenfuchs@artweb-design.de)
   * @author Christian Johansen (christian@cjohansen.no)
   * @license BSD
   *
   * Copyright (c) 2011 Sven Fuchs, Christian Johansen
   */
  var _Event = function Event(type, bubbles, cancelable, target) {
    this.type = type;
    this.bubbles = bubbles;
    this.cancelable = cancelable;
    this.target = target;
  };

  _Event.prototype = {
    stopPropagation: function () {},
    preventDefault: function () {
      this.defaultPrevented = true;
    }
  };
  /*
    Used to set the statusText property of an xhr object
  */

  var httpStatusCodes = {
    100: "Continue",
    101: "Switching Protocols",
    200: "OK",
    201: "Created",
    202: "Accepted",
    203: "Non-Authoritative Information",
    204: "No Content",
    205: "Reset Content",
    206: "Partial Content",
    300: "Multiple Choice",
    301: "Moved Permanently",
    302: "Found",
    303: "See Other",
    304: "Not Modified",
    305: "Use Proxy",
    307: "Temporary Redirect",
    400: "Bad Request",
    401: "Unauthorized",
    402: "Payment Required",
    403: "Forbidden",
    404: "Not Found",
    405: "Method Not Allowed",
    406: "Not Acceptable",
    407: "Proxy Authentication Required",
    408: "Request Timeout",
    409: "Conflict",
    410: "Gone",
    411: "Length Required",
    412: "Precondition Failed",
    413: "Request Entity Too Large",
    414: "Request-URI Too Long",
    415: "Unsupported Media Type",
    416: "Requested Range Not Satisfiable",
    417: "Expectation Failed",
    422: "Unprocessable Entity",
    500: "Internal Server Error",
    501: "Not Implemented",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
    505: "HTTP Version Not Supported"
  };
  /*
    Cross-browser XML parsing. Used to turn
    XML responses into Document objects
    Borrowed from JSpec
  */

  function parseXML(text) {
    var xmlDoc;

    if (typeof DOMParser != "undefined") {
      var parser = new DOMParser();
      xmlDoc = parser.parseFromString(text, "text/xml");
    } else {
      xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
      xmlDoc.async = "false";
      xmlDoc.loadXML(text);
    }

    return xmlDoc;
  }
  /*
    Without mocking, the native XMLHttpRequest object will throw
    an error when attempting to set these headers. We match this behavior.
  */


  var unsafeHeaders = {
    "Accept-Charset": true,
    "Accept-Encoding": true,
    "Connection": true,
    "Content-Length": true,
    "Cookie": true,
    "Cookie2": true,
    "Content-Transfer-Encoding": true,
    "Date": true,
    "Expect": true,
    "Host": true,
    "Keep-Alive": true,
    "Referer": true,
    "TE": true,
    "Trailer": true,
    "Transfer-Encoding": true,
    "Upgrade": true,
    "User-Agent": true,
    "Via": true
  };
  /*
    Adds an "event" onto the fake xhr object
    that just calls the same-named method. This is
    in case a library adds callbacks for these events.
  */

  function _addEventListener(eventName, xhr) {
    xhr.addEventListener(eventName, function (event) {
      var listener = xhr["on" + eventName];

      if (listener && typeof listener == "function") {
        listener.call(event.target, event);
      }
    });
  }

  function EventedObject() {
    this._eventListeners = {};
    var events = ["loadstart", "progress", "load", "abort", "loadend"];

    for (var i = events.length - 1; i >= 0; i--) {
      _addEventListener(events[i], this);
    }
  }
  EventedObject.prototype = {
    /*
      Duplicates the behavior of native XMLHttpRequest's addEventListener function
    */
    addEventListener: function addEventListener(event, listener) {
      this._eventListeners[event] = this._eventListeners[event] || [];

      this._eventListeners[event].push(listener);
    },

    /*
      Duplicates the behavior of native XMLHttpRequest's removeEventListener function
    */
    removeEventListener: function removeEventListener(event, listener) {
      var listeners = this._eventListeners[event] || [];

      for (var i = 0, l = listeners.length; i < l; ++i) {
        if (listeners[i] == listener) {
          return listeners.splice(i, 1);
        }
      }
    },

    /*
      Duplicates the behavior of native XMLHttpRequest's dispatchEvent function
    */
    dispatchEvent: function dispatchEvent(event) {
      var type = event.type;
      var listeners = this._eventListeners[type] || [];

      for (var i = 0; i < listeners.length; i++) {
        if (typeof listeners[i] == "function") {
          listeners[i].call(this, event);
        } else {
          listeners[i].handleEvent(event);
        }
      }

      return !!event.defaultPrevented;
    },

    /*
      Triggers an `onprogress` event with the given parameters.
    */
    _progress: function _progress(lengthComputable, loaded, total) {
      var event = new _Event('progress');
      event.target = this;
      event.lengthComputable = lengthComputable;
      event.loaded = loaded;
      event.total = total;
      this.dispatchEvent(event);
    }
  };
  /*
    Constructor for a fake window.XMLHttpRequest
  */

  function FakeXMLHttpRequest() {
    EventedObject.call(this);
    this.readyState = FakeXMLHttpRequest.UNSENT;
    this.requestHeaders = {};
    this.requestBody = null;
    this.status = 0;
    this.statusText = "";
    this.upload = new EventedObject();
  }

  FakeXMLHttpRequest.prototype = new EventedObject(); // These status codes are available on the native XMLHttpRequest
  // object, so we match that here in case a library is relying on them.

  FakeXMLHttpRequest.UNSENT = 0;
  FakeXMLHttpRequest.OPENED = 1;
  FakeXMLHttpRequest.HEADERS_RECEIVED = 2;
  FakeXMLHttpRequest.LOADING = 3;
  FakeXMLHttpRequest.DONE = 4;
  var FakeXMLHttpRequestProto = {
    UNSENT: 0,
    OPENED: 1,
    HEADERS_RECEIVED: 2,
    LOADING: 3,
    DONE: 4,
    async: true,
    withCredentials: false,

    /*
      Duplicates the behavior of native XMLHttpRequest's open function
    */
    open: function open(method, url, async, username, password) {
      this.method = method;
      this.url = url;
      this.async = typeof async == "boolean" ? async : true;
      this.username = username;
      this.password = password;
      this.responseText = null;
      this.response = this.responseText;
      this.responseXML = null;
      this.responseURL = url;
      this.requestHeaders = {};
      this.sendFlag = false;

      this._readyStateChange(FakeXMLHttpRequest.OPENED);
    },

    /*
      Duplicates the behavior of native XMLHttpRequest's setRequestHeader function
    */
    setRequestHeader: function setRequestHeader(header, value) {
      verifyState(this);

      if (unsafeHeaders[header] || /^(Sec-|Proxy-)/.test(header)) {
        throw new Error("Refused to set unsafe header \"" + header + "\"");
      }

      if (this.requestHeaders[header]) {
        this.requestHeaders[header] += "," + value;
      } else {
        this.requestHeaders[header] = value;
      }
    },

    /*
      Duplicates the behavior of native XMLHttpRequest's send function
    */
    send: function send(data) {
      verifyState(this);

      if (!/^(get|head)$/i.test(this.method)) {
        var hasContentTypeHeader = false;
        Object.keys(this.requestHeaders).forEach(function (key) {
          if (key.toLowerCase() === 'content-type') {
            hasContentTypeHeader = true;
          }
        });

        if (!hasContentTypeHeader && !(data || '').toString().match('FormData')) {
          this.requestHeaders["Content-Type"] = "text/plain;charset=UTF-8";
        }

        this.requestBody = data;
      }

      this.errorFlag = false;
      this.sendFlag = this.async;

      this._readyStateChange(FakeXMLHttpRequest.OPENED);

      if (typeof this.onSend == "function") {
        this.onSend(this);
      }

      this.dispatchEvent(new _Event("loadstart", false, false, this));

      if (window.__fakeXhr__) {
        let urlObj;

        if (/^http|https/.test(this.url)) {
          urlObj = new URL(this.url);
        } else {
          urlObj = new URL(location.origin + this.url);
        }

        if (window.__fakeXhr__[urlObj.host]) window.__fakeXhr__[urlObj.host](this);else if (window.__fakeXhr__['*']) {
          window.__fakeXhr__['*'](this);
        } else {
          this.respond(404, {}, {});
        }
      }
    },

    /*
      Duplicates the behavior of native XMLHttpRequest's abort function
    */
    abort: function abort() {
      this.aborted = true;
      this.responseText = null;
      this.response = this.responseText;
      this.errorFlag = true;
      this.requestHeaders = {};
      this.dispatchEvent(new _Event("abort", false, false, this));

      if (this.readyState > FakeXMLHttpRequest.UNSENT && this.sendFlag) {
        this._readyStateChange(FakeXMLHttpRequest.UNSENT);

        this.sendFlag = false;
      }

      if (typeof this.onerror === "function") {
        this.onerror();
      }
    },

    /*
      Duplicates the behavior of native XMLHttpRequest's getResponseHeader function
    */
    getResponseHeader: function getResponseHeader(header) {
      if (this.readyState < FakeXMLHttpRequest.HEADERS_RECEIVED) {
        return null;
      }

      if (/^Set-Cookie2?$/i.test(header)) {
        return null;
      }

      header = header.toLowerCase();

      for (var h in this.responseHeaders) {
        if (h.toLowerCase() == header) {
          return this.responseHeaders[h];
        }
      }

      return null;
    },

    /*
      Duplicates the behavior of native XMLHttpRequest's getAllResponseHeaders function
    */
    getAllResponseHeaders: function getAllResponseHeaders() {
      if (this.readyState < FakeXMLHttpRequest.HEADERS_RECEIVED) {
        return "";
      }

      var headers = "";

      for (var header in this.responseHeaders) {
        if (this.responseHeaders.hasOwnProperty(header) && !/^Set-Cookie2?$/i.test(header)) {
          headers += header + ": " + this.responseHeaders[header] + "\r\n";
        }
      }

      return headers;
    },

    /*
     Duplicates the behavior of native XMLHttpRequest's overrideMimeType function
     */
    overrideMimeType: function overrideMimeType(mimeType) {
      if (typeof mimeType === "string") {
        this.forceMimeType = mimeType.toLowerCase();
      }
    },

    /*
      Places a FakeXMLHttpRequest object into the passed
      state.
    */
    _readyStateChange: function _readyStateChange(state) {
      this.readyState = state;

      if (typeof this.onreadystatechange == "function") {
        this.onreadystatechange(new _Event("readystatechange"));
      }

      this.dispatchEvent(new _Event("readystatechange"));

      if (this.readyState == FakeXMLHttpRequest.DONE) {
        this.dispatchEvent(new _Event("load", false, false, this));
      }

      if (this.readyState == FakeXMLHttpRequest.UNSENT || this.readyState == FakeXMLHttpRequest.DONE) {
        this.dispatchEvent(new _Event("loadend", false, false, this));
      }
    },

    /*
      Sets the FakeXMLHttpRequest object's response headers and
      places the object into readyState 2
    */
    _setResponseHeaders: function _setResponseHeaders(headers) {
      this.responseHeaders = {};

      for (var header in headers) {
        if (headers.hasOwnProperty(header)) {
          this.responseHeaders[header] = headers[header];
        }
      }

      if (this.forceMimeType) {
        this.responseHeaders['Content-Type'] = this.forceMimeType;
      }

      if (this.async) {
        this._readyStateChange(FakeXMLHttpRequest.HEADERS_RECEIVED);
      } else {
        this.readyState = FakeXMLHttpRequest.HEADERS_RECEIVED;
      }
    },

    /*
      Sets the FakeXMLHttpRequest object's response body and
      if body text is XML, sets responseXML to parsed document
      object
    */
    _setResponseBody: function _setResponseBody(body) {
      verifyRequestSent(this);
      verifyHeadersReceived(this);
      verifyResponseBodyType(body);
      var chunkSize = this.chunkSize || 10;
      var index = 0;
      this.responseText = "";
      this.response = this.responseText;

      do {
        if (this.async) {
          this._readyStateChange(FakeXMLHttpRequest.LOADING);
        }

        this.responseText += body.substring(index, index + chunkSize);
        this.response = this.responseText;
        index += chunkSize;
      } while (index < body.length);

      var type = this.getResponseHeader("Content-Type");

      if (this.responseText && (!type || /(text\/xml)|(application\/xml)|(\+xml)/.test(type))) {
        try {
          this.responseXML = parseXML(this.responseText);
        } catch (e) {// Unable to parse XML - no biggie
        }
      }

      if (this.async) {
        this._readyStateChange(FakeXMLHttpRequest.DONE);
      } else {
        this.readyState = FakeXMLHttpRequest.DONE;
      }
    },

    /*
      Forces a response on to the FakeXMLHttpRequest object.
       This is the public API for faking responses. This function
      takes a number status, headers object, and string body:
       ```
      xhr.respond(404, {Content-Type: 'text/plain'}, "Sorry. This object was not found.")
       ```
    */
    respond: function respond(status, headers, body) {
      this._setResponseHeaders(headers || {});

      this.status = typeof status == "number" ? status : 200;
      this.statusText = httpStatusCodes[this.status];

      this._setResponseBody(body || "");
    }
  };

  for (var property in FakeXMLHttpRequestProto) {
    FakeXMLHttpRequest.prototype[property] = FakeXMLHttpRequestProto[property];
  }

  function verifyState(xhr) {
    if (xhr.readyState !== FakeXMLHttpRequest.OPENED) {
      throw new Error("INVALID_STATE_ERR");
    }

    if (xhr.sendFlag) {
      throw new Error("INVALID_STATE_ERR");
    }
  }

  function verifyRequestSent(xhr) {
    if (xhr.readyState == FakeXMLHttpRequest.DONE) {
      throw new Error("Request done");
    }
  }

  function verifyHeadersReceived(xhr) {
    if (xhr.async && xhr.readyState != FakeXMLHttpRequest.HEADERS_RECEIVED) {
      throw new Error("No headers received");
    }
  }

  function verifyResponseBodyType(body) {
    if (typeof body != "string") {
      var error = new Error("Attempted to respond to fake XMLHttpRequest with " + body + ", which is not a string.");
      error.name = "InvalidBodyException";
      throw error;
    }
  }

  function mitt(n){return {all:n=n||new Map,on:function(t,e){var i=n.get(t);i&&i.push(e)||n.set(t,[e]);},off:function(t,e){var i=n.get(t);i&&i.splice(i.indexOf(e)>>>0,1);},emit:function(t,e){(n.get(t)||[]).slice().map(function(n){n(e);}),(n.get("*")||[]).slice().map(function(n){n(t,e);});}}}

  function createCommonjsModule(fn) {
    var module = { exports: {} };
  	return fn(module, module.exports), module.exports;
  }

  var strictUriEncode = str => encodeURIComponent(str).replace(/[!'()*]/g, x => `%${x.charCodeAt(0).toString(16).toUpperCase()}`);

  var token = '%[a-f0-9]{2}';
  var singleMatcher = new RegExp(token, 'gi');
  var multiMatcher = new RegExp('(' + token + ')+', 'gi');

  function decodeComponents(components, split) {
  	try {
  		// Try to decode the entire string first
  		return decodeURIComponent(components.join(''));
  	} catch (err) {
  		// Do nothing
  	}

  	if (components.length === 1) {
  		return components;
  	}

  	split = split || 1;

  	// Split the array in 2 parts
  	var left = components.slice(0, split);
  	var right = components.slice(split);

  	return Array.prototype.concat.call([], decodeComponents(left), decodeComponents(right));
  }

  function decode(input) {
  	try {
  		return decodeURIComponent(input);
  	} catch (err) {
  		var tokens = input.match(singleMatcher);

  		for (var i = 1; i < tokens.length; i++) {
  			input = decodeComponents(tokens, i).join('');

  			tokens = input.match(singleMatcher);
  		}

  		return input;
  	}
  }

  function customDecodeURIComponent(input) {
  	// Keep track of all the replacements and prefill the map with the `BOM`
  	var replaceMap = {
  		'%FE%FF': '\uFFFD\uFFFD',
  		'%FF%FE': '\uFFFD\uFFFD'
  	};

  	var match = multiMatcher.exec(input);
  	while (match) {
  		try {
  			// Decode as big chunks as possible
  			replaceMap[match[0]] = decodeURIComponent(match[0]);
  		} catch (err) {
  			var result = decode(match[0]);

  			if (result !== match[0]) {
  				replaceMap[match[0]] = result;
  			}
  		}

  		match = multiMatcher.exec(input);
  	}

  	// Add `%C2` at the end of the map to make sure it does not replace the combinator before everything else
  	replaceMap['%C2'] = '\uFFFD';

  	var entries = Object.keys(replaceMap);

  	for (var i = 0; i < entries.length; i++) {
  		// Replace all decoded components
  		var key = entries[i];
  		input = input.replace(new RegExp(key, 'g'), replaceMap[key]);
  	}

  	return input;
  }

  var decodeUriComponent = function (encodedURI) {
  	if (typeof encodedURI !== 'string') {
  		throw new TypeError('Expected `encodedURI` to be of type `string`, got `' + typeof encodedURI + '`');
  	}

  	try {
  		encodedURI = encodedURI.replace(/\+/g, ' ');

  		// Try the built in decoder first
  		return decodeURIComponent(encodedURI);
  	} catch (err) {
  		// Fallback to a more advanced decoder
  		return customDecodeURIComponent(encodedURI);
  	}
  };

  var splitOnFirst = (string, separator) => {
  	if (!(typeof string === 'string' && typeof separator === 'string')) {
  		throw new TypeError('Expected the arguments to be of type `string`');
  	}

  	if (separator === '') {
  		return [string];
  	}

  	const separatorIndex = string.indexOf(separator);

  	if (separatorIndex === -1) {
  		return [string];
  	}

  	return [
  		string.slice(0, separatorIndex),
  		string.slice(separatorIndex + separator.length)
  	];
  };

  var queryString = createCommonjsModule(function (module, exports) {




  const isNullOrUndefined = value => value === null || value === undefined;

  function encoderForArrayFormat(options) {
  	switch (options.arrayFormat) {
  		case 'index':
  			return key => (result, value) => {
  				const index = result.length;

  				if (
  					value === undefined ||
  					(options.skipNull && value === null) ||
  					(options.skipEmptyString && value === '')
  				) {
  					return result;
  				}

  				if (value === null) {
  					return [...result, [encode(key, options), '[', index, ']'].join('')];
  				}

  				return [
  					...result,
  					[encode(key, options), '[', encode(index, options), ']=', encode(value, options)].join('')
  				];
  			};

  		case 'bracket':
  			return key => (result, value) => {
  				if (
  					value === undefined ||
  					(options.skipNull && value === null) ||
  					(options.skipEmptyString && value === '')
  				) {
  					return result;
  				}

  				if (value === null) {
  					return [...result, [encode(key, options), '[]'].join('')];
  				}

  				return [...result, [encode(key, options), '[]=', encode(value, options)].join('')];
  			};

  		case 'comma':
  		case 'separator':
  			return key => (result, value) => {
  				if (value === null || value === undefined || value.length === 0) {
  					return result;
  				}

  				if (result.length === 0) {
  					return [[encode(key, options), '=', encode(value, options)].join('')];
  				}

  				return [[result, encode(value, options)].join(options.arrayFormatSeparator)];
  			};

  		default:
  			return key => (result, value) => {
  				if (
  					value === undefined ||
  					(options.skipNull && value === null) ||
  					(options.skipEmptyString && value === '')
  				) {
  					return result;
  				}

  				if (value === null) {
  					return [...result, encode(key, options)];
  				}

  				return [...result, [encode(key, options), '=', encode(value, options)].join('')];
  			};
  	}
  }

  function parserForArrayFormat(options) {
  	let result;

  	switch (options.arrayFormat) {
  		case 'index':
  			return (key, value, accumulator) => {
  				result = /\[(\d*)\]$/.exec(key);

  				key = key.replace(/\[\d*\]$/, '');

  				if (!result) {
  					accumulator[key] = value;
  					return;
  				}

  				if (accumulator[key] === undefined) {
  					accumulator[key] = {};
  				}

  				accumulator[key][result[1]] = value;
  			};

  		case 'bracket':
  			return (key, value, accumulator) => {
  				result = /(\[\])$/.exec(key);
  				key = key.replace(/\[\]$/, '');

  				if (!result) {
  					accumulator[key] = value;
  					return;
  				}

  				if (accumulator[key] === undefined) {
  					accumulator[key] = [value];
  					return;
  				}

  				accumulator[key] = [].concat(accumulator[key], value);
  			};

  		case 'comma':
  		case 'separator':
  			return (key, value, accumulator) => {
  				const isArray = typeof value === 'string' && value.includes(options.arrayFormatSeparator);
  				const isEncodedArray = (typeof value === 'string' && !isArray && decode(value, options).includes(options.arrayFormatSeparator));
  				value = isEncodedArray ? decode(value, options) : value;
  				const newValue = isArray || isEncodedArray ? value.split(options.arrayFormatSeparator).map(item => decode(item, options)) : value === null ? value : decode(value, options);
  				accumulator[key] = newValue;
  			};

  		default:
  			return (key, value, accumulator) => {
  				if (accumulator[key] === undefined) {
  					accumulator[key] = value;
  					return;
  				}

  				accumulator[key] = [].concat(accumulator[key], value);
  			};
  	}
  }

  function validateArrayFormatSeparator(value) {
  	if (typeof value !== 'string' || value.length !== 1) {
  		throw new TypeError('arrayFormatSeparator must be single character string');
  	}
  }

  function encode(value, options) {
  	if (options.encode) {
  		return options.strict ? strictUriEncode(value) : encodeURIComponent(value);
  	}

  	return value;
  }

  function decode(value, options) {
  	if (options.decode) {
  		return decodeUriComponent(value);
  	}

  	return value;
  }

  function keysSorter(input) {
  	if (Array.isArray(input)) {
  		return input.sort();
  	}

  	if (typeof input === 'object') {
  		return keysSorter(Object.keys(input))
  			.sort((a, b) => Number(a) - Number(b))
  			.map(key => input[key]);
  	}

  	return input;
  }

  function removeHash(input) {
  	const hashStart = input.indexOf('#');
  	if (hashStart !== -1) {
  		input = input.slice(0, hashStart);
  	}

  	return input;
  }

  function getHash(url) {
  	let hash = '';
  	const hashStart = url.indexOf('#');
  	if (hashStart !== -1) {
  		hash = url.slice(hashStart);
  	}

  	return hash;
  }

  function extract(input) {
  	input = removeHash(input);
  	const queryStart = input.indexOf('?');
  	if (queryStart === -1) {
  		return '';
  	}

  	return input.slice(queryStart + 1);
  }

  function parseValue(value, options) {
  	if (options.parseNumbers && !Number.isNaN(Number(value)) && (typeof value === 'string' && value.trim() !== '')) {
  		value = Number(value);
  	} else if (options.parseBooleans && value !== null && (value.toLowerCase() === 'true' || value.toLowerCase() === 'false')) {
  		value = value.toLowerCase() === 'true';
  	}

  	return value;
  }

  function parse(query, options) {
  	options = Object.assign({
  		decode: true,
  		sort: true,
  		arrayFormat: 'none',
  		arrayFormatSeparator: ',',
  		parseNumbers: false,
  		parseBooleans: false
  	}, options);

  	validateArrayFormatSeparator(options.arrayFormatSeparator);

  	const formatter = parserForArrayFormat(options);

  	// Create an object with no prototype
  	const ret = Object.create(null);

  	if (typeof query !== 'string') {
  		return ret;
  	}

  	query = query.trim().replace(/^[?#&]/, '');

  	if (!query) {
  		return ret;
  	}

  	for (const param of query.split('&')) {
  		let [key, value] = splitOnFirst(options.decode ? param.replace(/\+/g, ' ') : param, '=');

  		// Missing `=` should be `null`:
  		// http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
  		value = value === undefined ? null : ['comma', 'separator'].includes(options.arrayFormat) ? value : decode(value, options);
  		formatter(decode(key, options), value, ret);
  	}

  	for (const key of Object.keys(ret)) {
  		const value = ret[key];
  		if (typeof value === 'object' && value !== null) {
  			for (const k of Object.keys(value)) {
  				value[k] = parseValue(value[k], options);
  			}
  		} else {
  			ret[key] = parseValue(value, options);
  		}
  	}

  	if (options.sort === false) {
  		return ret;
  	}

  	return (options.sort === true ? Object.keys(ret).sort() : Object.keys(ret).sort(options.sort)).reduce((result, key) => {
  		const value = ret[key];
  		if (Boolean(value) && typeof value === 'object' && !Array.isArray(value)) {
  			// Sort object keys, not values
  			result[key] = keysSorter(value);
  		} else {
  			result[key] = value;
  		}

  		return result;
  	}, Object.create(null));
  }

  exports.extract = extract;
  exports.parse = parse;

  exports.stringify = (object, options) => {
  	if (!object) {
  		return '';
  	}

  	options = Object.assign({
  		encode: true,
  		strict: true,
  		arrayFormat: 'none',
  		arrayFormatSeparator: ','
  	}, options);

  	validateArrayFormatSeparator(options.arrayFormatSeparator);

  	const shouldFilter = key => (
  		(options.skipNull && isNullOrUndefined(object[key])) ||
  		(options.skipEmptyString && object[key] === '')
  	);

  	const formatter = encoderForArrayFormat(options);

  	const objectCopy = {};

  	for (const key of Object.keys(object)) {
  		if (!shouldFilter(key)) {
  			objectCopy[key] = object[key];
  		}
  	}

  	const keys = Object.keys(objectCopy);

  	if (options.sort !== false) {
  		keys.sort(options.sort);
  	}

  	return keys.map(key => {
  		const value = object[key];

  		if (value === undefined) {
  			return '';
  		}

  		if (value === null) {
  			return encode(key, options);
  		}

  		if (Array.isArray(value)) {
  			return value
  				.reduce(formatter(key), [])
  				.join('&');
  		}

  		return encode(key, options) + '=' + encode(value, options);
  	}).filter(x => x.length > 0).join('&');
  };

  exports.parseUrl = (url, options) => {
  	options = Object.assign({
  		decode: true
  	}, options);

  	const [url_, hash] = splitOnFirst(url, '#');

  	return Object.assign(
  		{
  			url: url_.split('?')[0] || '',
  			query: parse(extract(url), options)
  		},
  		options && options.parseFragmentIdentifier && hash ? {fragmentIdentifier: decode(hash, options)} : {}
  	);
  };

  exports.stringifyUrl = (object, options) => {
  	options = Object.assign({
  		encode: true,
  		strict: true
  	}, options);

  	const url = removeHash(object.url).split('?')[0] || '';
  	const queryFromUrl = exports.extract(object.url);
  	const parsedQueryFromUrl = exports.parse(queryFromUrl, {sort: false});

  	const query = Object.assign(parsedQueryFromUrl, object.query);
  	let queryString = exports.stringify(query, options);
  	if (queryString) {
  		queryString = `?${queryString}`;
  	}

  	let hash = getHash(object.url);
  	if (object.fragmentIdentifier) {
  		hash = `#${encode(object.fragmentIdentifier, options)}`;
  	}

  	return `${url}${queryString}${hash}`;
  };
  });

  class FakeXMLHttpRequestServer {
    constructor(host = location.host, config) {
      this.host = host;
      this.config = config;
      this.emitter = mitt();

      window.__fakeXhr__[host] = xhr => this.emit(xhr);
    }

    on(...args) {
      this.emitter.on(...args);
    }

    off(...args) {
      this.emitter.off(...args);
    }

    emit(xhr) {
      let url;

      if (/^http|https/.test(xhr.url)) {
        url = new URL(xhr.url);
      } else {
        url = new URL(location.origin + xhr.url);
      }

      this.emitter.emit(url.pathname, {
        url: xhr.url,
        method: xhr.method,
        pathname: url.pathname,
        body: xhr.requestBody,
        query: queryString.parse(url.search),
        xhr
      });
    }

  }

  window.__fakeXhr__ = {};

  exports.XMLHttpRequest = FakeXMLHttpRequest;
  exports.XMLHttpRequestServer = FakeXMLHttpRequestServer;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
