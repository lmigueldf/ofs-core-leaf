var namespace = 'Utils';
// GLOBAL GOOGLE ANALYTICS
//-------------------------------------------------------------------------------------
var GAnalytics;
GLOBAL.startAnalitics = function() {
  CONFIG.modules.extended.googleAnalytics && (function initAnalytics() {
    window.ga = window.ga || function() {
      (ga.q = ga.q || []).push(arguments)
    };
    ga.l = +new Date;
    var _myAppName = CONFIG.modules.extended.googleAnalytics.appName || 'myAppName';
    var _dimension = '';
    var _screen = '';
    GLOBAL.GAnalytics = GAnalytics = {
      isReady: function() {
        return !!window.ga;
      },
      create: function(UA) {
        ga('create', UA || 'UA-XXXXX-Y', 'auto');

        CONFIG.modules.debug && ga(function(tracker) {
          // Logs the tracker created above to the console.
          console.info(tracker);
        });
      },
      sendPageView: function(screen) {
        _screen = screen;
        ga('set', 'page', '/#' + (screen || ''));
        ga('send', 'pageview');
      },
      sendAppView: function(_screenName) {
        ga('send', 'screenview', {
          appName: _myAppName,
          screenName: _screenName
        });
      },
      sendEvent: function(context, item, label, value) {
        ga('send', {
          hitType: 'event',
          eventCategory: context,
          eventAction: item,
          eventLabel: label,
          eventValue: value,
          nonInteraction: true,
          hitCallback: function() {
            console.info('Event sent');
          },
          hitCallbackFail: function() {
            console.info("Unable to send Google Analytics data");
          }
        });
      },
      setDimension: function(dimension, segment) {
        _dimension = dimension;
        ga('set', dimension, segment);
      },
      getCurrentScreen: function() {
        return _screen;
      },
      getCurrentDimension: function() {
        return _dimension;
      }
    };
  }).call(this);
};
// Connection Listener --------------------------------------------------------------------
(function initOnlineStatusListeners() {
  function updateOnlineStatus(event) {
    GLOBAL.onOnlineStatusChanged && GLOBAL.onOnlineStatusChanged(navigator.onLine);
  }

  if (window.updateOnlineStatus) {
    window.removeEventListener('online', window.updateOnlineStatus);
    window.removeEventListener('offline', window.updateOnlineStatus);
  }
  window.updateOnlineStatus = bind(this, updateOnlineStatus);
  window.addEventListener('online', window.updateOnlineStatus);
  window.addEventListener('offline', window.updateOnlineStatus);

  Utils.getOnlineStatus = function() {
    return navigator.onLine;
  };
})();
// HTTP Connector -------------------------------------------------------------------------
/**
 * One Flag Studio 2015-2020
 * Communications Layer -- HTTP requests with CORS Wrapper
 * PWA Wrapper with desktop install --
 *
 *
 * Luís Fernandes <luis.fernandes@oneflagstudio.com>
 * Luís Fernandes <luis@junesoftware.com>
 */
var HTTP_CONSTANTS;
var HTTP = HTTP_CONSTANTS = {
  PROTOCOL: 'http',
  URL_SEPARATOR: '/',
  CONTENT_TYPE: {
    TEXT_PLAIN: 'text/plain',
    APPLICATION_URLENCODED: 'application/x-www-form-urlencoded',
    APPLICATION_JSON: 'application/json',
    APPLICATION_XML: 'application/xml',
    MULTIPART_FORM_DATA: 'multipart/form-data'
  },
  REQUEST: {
    METHOD: {
      GET: 'GET',
      POST: 'POST',
      PUT: 'PUT',
      DELETE: 'DELETE',
      UPDATE: 'UPDATE'
    }
  },
  RESPONSE: {
    STATUS: {
      NO_RESPONSE: {
        code: 0,
        message: 'No response'
      },
      OK: {
        code: 200,
        message: 'Ok'
      },
      NOT_MODIFIED: {
        code: 304,
        message: 'Not Modified'
      },
      UNAUTHORIZED: {
        code: 403,
        message: 'Unauthorized'
      },
      NOT_FOUND: {
        code: 404,
        message: 'Not Found'
      }
    }
  }
};
var HttpRequest = function(opts) {
  this.url = opts.url || '/';
  this.formParams = [];
  this.headers = [];
  this.query = [];
  this.contentType = opts.contentType || HTTP.CONTENT_TYPE.TEXT_PLAIN;
  this.withCredentials = opts.withCredentials || false;
  this.method = opts.method || HTTP.REQUEST.METHOD.POST;
  this.onResponse = function() {};
  this.onTimeout = function() {};

  this.getUrl = function() {
    return (this.query.length > 0) ? this.url + '?' + this.buildQueryString(this.query) : this.url;
  };

  this.setUrl = function(url) {
    this.url = url || '/';
  }

  this.getMethod = function() {
    return this.method;
  }

  this.setMethod = function(httpMethod) {
    this.method = httpMethod || HTTP.REQUEST.METHOD.POST;
  }

  this.setContentType = function(ct) {
    this.contentType = ct;
  }

  this.setQueryParam = function(key, value) {
    this.query.push({
      propName: key,
      value: value
    });
    return this;
  }

  this.setFormParam = function(key, value) {
    this.formParams.push({
      propName: key,
      value: value
    });
    return this;
  }

  this.setBody = function(body) {
    this.body = body;
    return this;
  }

  this.setHeader = function(key, value) {
    var obj = {};
    obj[key] = value;
    this.headers.push(obj);
    return this;
  }

  this.buildQueryString = function(params) {
    var formString = '';
    for (var i = 0; i < params.length; i++) {
      var obj = params[i];
      formString += obj[Object.keys(obj)[0]] + '=' + obj[Object.keys(obj)[1]]
      if (i < params.length - 1) {
        formString += '&';
      }
    }
    return formString;
  }

  this.build = function(xhr) {
    xhr.withCredentials = this.withCredentials;
    xhr.overrideMimeType(this.contentType);
    xhr.setRequestHeader('Content-Type', this.contentType);
    if (this.headers.length > 0) {
      for (var i = 0; i < this.headers.length; i++) {
        var obj = this.headers[i];
        xhr.setRequestHeader(Object.keys(obj)[0], obj[Object.keys(obj)[0]]);
      }
    }
    if (this.formParams.length > 0) {
      if (this.contentType === HTTP.CONTENT_TYPE.APPLICATION_URLENCODED) {
        return this.buildQueryString(this.formParams);
      } else {
        var formData = new FormData();
        for (var index in this.formParams) {
          formData.append(this.formParams[index].propName,
            this.formParams[index].value);
        }
        return formData;
      }
    }
    return this.body;
  }
};
var HttpResponse = function(opts) {
  try {
    this.status = opts.status || opts.code;
    if (opts.status == 404) {
      this.body = opts.response;
    } else {
      this.body = opts.response !== void 0 ? JSON.parse(opts.response) : opts.message;
      this.headers = opts.getAllResponseHeaders();
    }
  } catch (e) {
    this.status = opts.status || opts.code;
    this.body = opts.message || opts.response;
  }
};
var CommunicationsLayer = function(opts) {
  var X = window.XMLHttpRequest;
  var Y = window.XDomainRequest;
  // window.XMLHttpRequest = function () {
  // };
  // window.XDomainRequest = function () {
  // };
  this.useHttp = (opts && opts.useHttp) || true;
  this.corsSupport = (opts && opts.corsSupport) || true;
  this.serverRequestFactory = function(opts) {
    var request;
    switch (opts.type) {
      case HTTP.PROTOCOL:
      default:
        request = new HttpRequest(opts);
        break;
    }
    return request;
  };
  this.sendRequest = function(request) {
    if (request instanceof HttpRequest) {
      this.sendHttpRequest(request);
    }
  }

  this.createCORSRequest = function(method, url) {
    var xhrRequest = new X();
    if ('withCredentials' in xhrRequest) {
      xhrRequest.open(method, url, true);
    } else if (typeof Y !== 'undefined') {
      xhrRequest = new Y();
      xhrRequest.open(method, url);
    } else {
      // Otherwise, CORS is not supported by the browser.
      xhrRequest = null;
    }
    return xhrRequest;
  }

  this.sendHttpRequest = function(request) {
    var xhr = this.createCORSRequest(request.getMethod(), request.getUrl());
    if (!xhr) {
      throw new Error('CORS not supported');
    }
    xhr.onload = function() {
      request.onResponse(new HttpResponse(xhr));
      clearTimeout(request.timeoutHandler);
    };
    request.timeoutHandler = setTimeout(function() {
      request.onTimeout(new HttpResponse(HTTP.RESPONSE.STATUS.NO_RESPONSE));
      request.timeoutHandler = null;
      clearTimeout(this);
    }, request.timeout || 10000);
    xhr.onProgress = request.onProgress;
    xhr.onerror = function() {
      clearTimeout(request.timeoutHandler);
      request.onResponse(new HttpResponse(HTTP.RESPONSE.STATUS.NO_RESPONSE));
    };
    xhr.send(request.build(xhr));
  }
};
var Connector = function(opts) {
  this.url = (opts && opts.baseUrl) || '/'
  this.commLayer = new CommunicationsLayer({});

  this.buildHttpRequest = function() {
    return this.commLayer.serverRequestFactory({
      type: HTTP_CONSTANTS.PROTOCOL
    })
  }

  this.sendHttpRequest = function(request, onSuccess, onRejected, requestTimeout) {
    request.onResponse = function(response) {
      if (response.status === HTTP_CONSTANTS.RESPONSE.STATUS.OK.code) {
        onSuccess && onSuccess(response.body, response.headers || []);
      } else {
        onRejected && onRejected({
          code: response.status,
          message: response.message || response.body
        });
      }
    };
    request.onRejected = function() {
      onRejected && onRejected({
        code: 0,
        message: 'Canceled'
      });
    };
    request.timeout = requestTimeout || (1000 * 60 * 60);
    request.onTimeout = function() {
      onRejected && onRejected({
        code: -1,
        message: 'Timeout'
      });
    };
    this.commLayer.sendRequest(request);
  };

  /**
   * HTTP GET
   * @param opts ex. { url: '/test, query: [{key: paramA, value: valueA}]'}
   * @param onResponse
   * @param onRejected
   * @param onTimeout
   * @constructor
   */
  this.HTTP_GET = function(opts, onSuccess, onRejected) {
    var request = this.buildHttpRequest();
    request.setUrl(opts.url);
    request.setMethod(HTTP_CONSTANTS.REQUEST.METHOD.GET);
    if (opts.query) {
      opts.query.map(function(param) {
        request.setQueryParam(param.key, param.value);
      });
    }
    if (opts.headers) {
      opts.headers.map(function(param) {
        request.setHeader(param.key, param.value);
      });
    }
    this.sendHttpRequest(request, onSuccess, onRejected, opts.timeout);
  };

  /**
   * HTTP POST
   * @param opts ex. { url: '/test, query: [{key: paramA, value: valueA}], form: [{key: paramA, value: valueA}]'}
   * @param onResponse
   * @param onRejected
   * @param onTimeout
   * @constructor
   */
  this.HTTP_POST = function(opts, onSuccess, onRejected) {
    var request = this.buildHttpRequest();
    request.setUrl(opts.url);
    request.setBody(opts.body);
    request.setMethod(HTTP_CONSTANTS.REQUEST.METHOD.POST);
    request.setContentType(opts.contentType || HTTP_CONSTANTS.CONTENT_TYPE.APPLICATION_JSON);
    if (opts.query) {
      opts.query.map(function(param) {
        request.setQueryParam(param.key, param.value);
      });
    }
    if (opts.form) {
      opts.form.map(function(param) {
        request.setFormParam(param.key, param.value);
      });
    }
    if (opts.headers) {
      opts.headers.map(function(param) {
        request.setHeader(param.key, param.value);
      });
    }
    this.sendHttpRequest(request, onSuccess, onRejected, opts.timeout);
  };
};
GLOBAL.Connector = new Connector({});
//-------------------------------------------------------------------------------------
GLOBAL.formatTime = function(milliseconds) {
  var seconds = (milliseconds / 1000).toFixed(0);
  var minutes = Math.floor(seconds / 60);
  var hours = '';

  seconds = Math.floor(seconds % 60);

  seconds = (seconds >= 10) ? seconds : '0' + seconds;

  if (minutes > 59) {
    hours = Math.floor(minutes / 60);
    minutes = minutes - (hours * 60);
    minutes = (minutes >= 10) ? minutes : '0' + minutes;
  }

  if (hours != '') {
    return hours + ':' + minutes + ':' + seconds;
  }

  return minutes + ':' + seconds;
};
exports = {
  connector: GLOBAL.Connector,
  registerOnlineStatusChanged : function(cb){
    GLOBAL.onOnlineStatusChanged = cb;
  }
};