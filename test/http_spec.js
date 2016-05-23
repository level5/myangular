'use strict';

var sinon = require('sinon');
var _ = require('lodash');

var publishExternalAPI = require('../src/angular_public');
var createInjector = require('../src/injector');

describe('$http', function () {

  var $http;
  var xhr, requests;

  beforeEach(function () {
    publishExternalAPI();
    var injector = createInjector(['ng']);
    $http = injector.get('$http');
  });

  beforeEach(function () {
    xhr = sinon.useFakeXMLHttpRequest();
    requests = [];
    xhr.onCreate = function (req) {
      requests.push(req);
    }
  });

  afterEach(function () {
    xhr.restore();
  });

  it('is a function', function () {
    $http.should.be.Function();
  });

  it('returns a Promise', function () {
    var result = $http({});

    result.should.be.Object();
    result.then.should.be.Function();
  });

  it('makes an XMLHttpRequest to given URL', function () {
    $http({
      method: 'POST',
      url: 'http://level5.cn',
      data: 'Hello'
    });

    requests.length.should.eql(1);
    requests[0].method.should.eql('POST');
    requests[0].url.should.eql('http://level5.cn');
    requests[0].async.should.be.true();
    requests[0].requestBody.should.eql('Hello');

  });

  it('resolves promise when XHR result received', function () {
    var requestConfig = {
      method: 'GET',
      url: 'http://level5.cn'
    };
    var response;
    $http(requestConfig).then(function (r) {
      response = r;
    });

    requests[0].respond(200, {}, 'Hello');
    response.should.be.Object();
    response.status.should.eql(200);
    response.statusText.should.eql('OK');
    response.data.should.eql('Hello');
    response.config.url.should.eql('http://level5.cn');
  });

  it('rejects promise when XHR result received with error status', function () {
    var requestConfig = {
      method: 'GET',
      url: 'http://level5.cn'
    };

    var response;
    $http(requestConfig).catch(function(r) {
      response = r;
    });

    requests[0].respond(401, {}, 'Fail');

    response.should.be.Object();
    response.status.should.eql(401);
    response.statusText.should.eql('Unauthorized');
    response.data.should.eql('Fail');
    response.config.url.should.eql('http://level5.cn');

  });

  it('rejects promise when XHR result errors/aborts', function () {
    var requestConfig = {
      method: 'GET',
      url: 'http://level5.cn'
    };

    var response;
    $http(requestConfig).catch(function (r) {
      response = r;
    });

    requests[0].onerror();

    response.should.be.Object();
    response.status.should.eql(0);
    should(response.data).be.Null();
    response.config.url.should.eql('http://level5.cn');
  });

  it('uses GET method by default', function () {
    $http({
      url: 'http://level5.cn'
    });

    requests.length.should.eql(1);
    requests[0].method.should.eql('GET');
  });

  it('sets headers on request', function () {
    $http({
      url: 'http://level5.cn',
      headers: {
        'Accept': 'text/plain',
        'Cache-Control': 'no-cache'
      }
    });

    requests.length.should.eql(1);
    requests[0].requestHeaders.Accept.should.eql('text/plain');
    requests[0].requestHeaders['Cache-Control'].should.eql('no-cache');

  });

  it('sets default headers on request', function () {
    $http({
      url: 'http://level5.cn'
    });
    requests.length.should.eql(1);
    requests[0].requestHeaders.Accept.should.eql('application/json, text/plain, */*');
  });

  it('sets method-specific default headers on request', function () {
    $http({
      method: 'POST',
      url: 'http://level5.cn',
      data: 42
    });

    requests.length.should.eql(1);
    requests[0].requestHeaders['Content-Type'].should.eql(
      'application/json;charset=utf-8'
    );
  });

  it('exposes default headers for oerriding', function () {
    $http.defaults.headers.post['Content-Type'] = 'text/plain;charset=utf-8';
    $http({
      method: 'POST',
      url: 'http://level5.cn',
      data: 42
    });
    requests.length.should.eql(1);
    requests[0].requestHeaders['Content-Type'].should.eql(
      'text/plain;charset=utf-8'
    );
  });

  it('exposes default headers through provider', function() {

    var injector = createInjector(['ng', function($httpProvider) {
      $httpProvider.defaults.headers.post['Content-Type'] =
        'text/plain;charset=utf-8';
      console.log('GXG', JSON.stringify($httpProvider.defaults));
    }]);
    $http = injector.get('$http');
    $http({
      method: 'POST',
      url: 'http://level5.cn',
      data: 42
    });
    requests.length.should.eql(1);
    requests[0].requestHeaders['Content-Type'].should.eql(
      'text/plain;charset=utf-8'
    );

  });

  it('merges default headers case-insensitively', function () {
    $http({
      method: 'POST',
      url: 'http://level5.cn',
      data: '42',
      headers: {
        'content-type': 'text/plain;charset=utf-8'
      }
    });

    requests.length.should.eql(1);
    should(requests[0].requestHeaders['Content-Type']).be.undefined();
    requests[0].requestHeaders['content-type'].should.eql(
      'text/plain;charset=utf-8'
    );
  });

  it('does not send content-type header when no data', function() {
    $http({
      method: 'POST',
      url: 'http://level5.cn',
      header: {
        'Content-Type': 'application/json;charset=utf-8'
      }
    });

    requests.length.should.eql(1);
    should(requests[0].requestHeaders['Content-Type']).not.eql('application/json;charset=utf-8');
  });

  it('supports functions as header values', function () {
    var contentTypeStub = sinon.stub();
    contentTypeStub.returns('text/plain;charset=utf-8');

    $http.defaults.headers.post['Content-Type'] = contentTypeStub;

    var request = {
      method: 'POST',
      url: 'http://level5.cn',
      data: 42
    };
    $http(request);

    contentTypeStub.calledWithExactly(request).should.be.true();
    requests[0].requestHeaders['Content-Type'].should.eql(
      'text/plain;charset=utf-8'
    );

  });

  it('ignores header function value when null/undefined', function () {
    var cacheControlStub = sinon.stub();
    cacheControlStub.returns(null);

    $http.defaults.headers.post['Cache-Control'] = cacheControlStub;

    var request = {
      method: 'POST',
      url: 'http://level5.cn',
      data: 42
    };
    $http(request);

    cacheControlStub.calledWithExactly(request);
  });

  it('makes response headers available', function () {

    var response;
    $http({
      method: 'POST',
      url: 'http://level5.cn',
      data: 42
    }).then(function (r) {
      response = r;
    });
    requests[0].respond(200, {'Content-Type': 'text/plain'}, 'Hello');

    response.headers.should.be.Function();
    response.headers('Content-Type').should.eql('text/plain');
    response.headers('content-type').should.eql('text/plain');
  });

  it('may returns all response headers', function () {
    var response;
    $http({
      method: 'POST',
      url: 'http://level5.cn',
      data: 42
    }).then(function (r) {
      response = r;
    });

    requests[0].respond(200, {'Content-Type': 'text/plain'}, 'Hello');
    response.headers().should.eql({'content-type': 'text/plain'});
  });

  it('allows setting withCredentials', function () {
    $http({
      method: 'POST',
      url: 'http://level5.cn',
      data: 42,
      withCredentials: true
    });

    requests[0].withCredentials.should.be.true();
  });

  it('allows setting withCredentials from defaults', function () {
    $http.defaults.withCredentials = true;

    $http({
      method: 'POST',
      url: 'http://level5.cn',
      data: 42
    });
    requests[0].withCredentials.should.be.true();
  });

  it('allows transforming request with functions', function () {
    $http({
      method: 'POST',
      url: 'http://level5.cn',
      data: 42,
      transformRequest: function (data) {
        return '*' + data + '*';
      }
    });

    requests[0].requestBody.should.eql('*42*');
  });

  it('allows multiple request transform functions', function() {
    $http({
      method: 'POST',
      url: 'http://level5.cn',
      data: 42,
      transformRequest: [function(data) {
        return '*' + data + '*';
      }, function (data) {
        return '-' + data + '-';
      }]
    });

    requests[0].requestBody.should.eql('-*42*-');
  });

  it('allows setting transforms in defaults', function() {
    $http.defaults.transformRequest = [function(data) {
      return '*' + data + '*';
    }];
    $http({
      method: 'POST',
      url: 'http://level5.cn',
      data: 42
    });

    requests[0].requestBody.should.eql('*42*');
  });

  it('passes request headers getter to transforms', function() {
    $http.defaults.transformRequest = [function(data, headers) {
      if (headers('Content-Type') === 'text/emphasized') {
        return '*' + data + '*';
      } else {
        return data;
      }
    }];
    $http({
      method: 'POST',
      url: 'http://level5.cn',
      data: 42,
      headers: {
        'content-type': 'text/emphasized'
      }
    });

    requests[0].requestBody.should.eql('*42*');
  });

  it('allows transforming responses with functions', function () {
    var response;
    $http({
      url: 'http://level5.cn',
      transformResponse: function(data) {
        return '*' + data + '*';
      }
    }).then(function(r) {
      response = r;
    });

    requests[0].respond(200, {'Content-Type': 'text/plain'}, 'Hello');
    response.data.should.eql('*Hello*');

  });

  it('passes response headers to transform functions', function () {
    var response;
    $http({
      url: 'http://level5.cn',
      transformResponse: function(data, headers) {
        if (headers('content-type') === 'text/decorated') {
          return '*' + data + '*';
        } else {
          return data;
        }
      }
    }).then(function(r) {
      response = r;
    });

    requests[0].respond(200, {'Content-Type': 'text/decorated'}, 'Hello');
    response.data.should.eql('*Hello*');
  });

  it('allows setting default reponses transform', function () {
    $http.defaults.transformResponse = [function(data) {
      return '*' + data + '*';
    }];
    var response;
    $http({
      url: 'http://level5.cn'
    }).then(function(r) {
      response = r;
    });

    requests[0].respond(200, {'Content-Type': 'text/plain'}, 'Hello');
    response.data.should.eql('*Hello*');
  });

  it('transforms error responses also', function () {
    var response;
    $http({
      url: 'http://level5.cn',
      transformResponse: function (data) {
        return '*' + data + '*';
      }
    }).catch(function (r) {
      response = r;
    });

    requests[0].respond(401, {'Content-Type': 'text/plain'}, 'Fail');
    response.data.should.eql('*Fail*');

  });

  it('passes HTTP status to respose transformers', function () {
    var response;
    $http({
      url: 'http://level5.cn',
      transformResponse: function (data, headers, status) {
        if (status === 401) {
          return 'unauthorized';
        } else {
          return data;
        }
      }
    }).catch(function (r) {
      response = r;
    });

    requests[0].respond(401, {'Content-Type': 'text/plain'}, 'Fail');
    response.data.should.eql('unauthorized');

  });

  it('serializes object data to JSON for requests', function () {
    $http({
      method: 'POST',
      url: 'http://level5.cn',
      data: {aKey: 42}
    });
    requests[0].requestBody.should.eql('{"aKey":42}');
  });

  it('serializes array data to JSON fro requests', function () {
    $http({
      method: 'POST',
      url: 'http://level5.cn',
      data: [1, 'two', 3]
    });

    requests[0].requestBody.should.eql('[1,"two",3]');
  });

  it.skip('does not serializes blobs for requests', function () {
    var BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder ||
                        window.MozBlobBuilder || window.MSBlobBuilder;
    var bb = new BlobBuilder();
    bb.apend('hello');
    var blob = bb.getBlob('text/plain');

    $http({
      method: 'POST',
      url: 'http://level5.cn',
      data: blob
    });

    requests[0].requestBody.should.be.exactly(blob);
  });

  it('does not serialize form data from requests', function () {
    var formData = new FormData();
    formData.append('aFiled', 'aValue');
    $http({
      method: 'POST',
      url: 'http://level5.cn',
      data: formData
    });

    requests[0].requestBody.should.be.exactly(formData);

  });

  it('parses JSON data for JSON responses', function () {
    var response;
    $http({
      method: 'GET',
      url: 'http://level5.cn',
    }).then(function (r) {
      response = r;
    });
    requests[0].respond(
      200, {'Content-Type': 'application/json'}, '{"message": "Hello"}');

    response.data.should.be.Object();
    response.data.message.should.eql('Hello');
  });

  it('parses a JSON object response without content type', function () {
    var response;
    $http({
      method: 'GET',
      url: 'http://level5.cn',
    }).then(function (r) {
      response = r;
    });
    requests[0].respond(200, {}, '{"message": "Hello"}');

    response.data.should.be.Object();
    response.data.message.should.eql('Hello');
  });

  it('parses a JSON array response without content type', function () {
    var response;
    $http({
      method: 'GET',
      url: 'http://level5.cn',
    }).then(function (r) {
      response = r;
    });
    requests[0].respond(200, {}, '[1, 2, 3]');

    response.data.should.be.Array();
    response.data.should.eql([1, 2, 3]);
  });

  it('does not choke on response resembling JSON but not valid', function () {
    var response;
    $http({
      method: 'GET',
      url: 'http://level5.cn',
    }).then(function (r) {
      response = r;
    });
    requests[0].respond(200, {}, '{1, 2, 3]');
    response.data.should.eql('{1, 2, 3]');
  });

  it('does not try to parse interpolation expr as JSON', function () {
    var response;
    $http({
      method: 'GET',
      url: 'http://level5.cn',
    }).then(function (r) {
      response = r;
    });
    requests[0].respond(200, {}, '{{expr}}');
    response.data.should.eql('{{expr}}');
  });

  it('adds params to URL', function () {
    $http({
      url: 'http://level5.cn',
      params: {
        a: 42
      }
    });

    requests[0].url.should.eql('http://level5.cn?a=42');
  });

  it('adds additional params to URL', function() {
    $http({
      url: 'http://level5.cn?a=42',
      params: {
        b: 42
      }
    });

    requests[0].url.should.eql('http://level5.cn?a=42&b=42');
  });

  it('escapes url characters in params', function () {
    $http({
      url: 'http://level5.cn',
      params: {
        '==': '&&'
      }
    });
    requests[0].url.should.eql('http://level5.cn?%3D%3D=%26%26');
  });

  it('does not attach null or undefined params', function () {
    $http({
      url: 'http://level5.cn',
      params: {
        a: null,
        b: undefined
      }
    });
    requests[0].url.should.eql('http://level5.cn');
  });

  it('attaches multiple params from arrays', function () {
    $http({
      url: 'http://level5.cn',
      params: {
        a: [42, 43]
      }
    });
    requests[0].url.should.eql('http://level5.cn?a=42&a=43');
  });

  it('serializes objects to json', function () {
    $http({
      url: 'http://level5.cn',
      params: {
        a: {b:42}
      }
    });
    requests[0].url.should.eql('http://level5.cn?a=%7B%22b%22%3A42%7D');
  });

  it('allows substituting param serializer', function () {

    $http({
      url: 'http://level5.cn',
      params: {
        a: 42,
        b: 43
      },
      paramSerializer: function (params) {
          return _.map(params, function (v, k) {
            return k + '=' + v + 'lol';
          }).join('&');
      }
    });

    requests[0].url.should.eql('http://level5.cn?a=42lol&b=43lol');

  });

  it('allows substituting param serializer through DI', function () {
    var injector = createInjector(['ng', function ($provide) {
      $provide.factory('mySpecialSerializer', function () {
        return function (params) {
          return _.map(params, function (v, k) {
            return k + '=' + v + 'lol';
          }).join('&');
        }
      });
    }]);
    injector.invoke(function($http) {
      $http({
        url: 'http://level5.cn',
        params: {
          a: 42,
          b: 43
        },
        paramSerializer: 'mySpecialSerializer'
      });
    });
    requests[0].url.should.eql('http://level5.cn?a=42lol&b=43lol');
  });

  it('makes default param serializer available through DI', function () {
    var injector = createInjector(['ng']);
    injector.invoke(function ($httpParamSerializer) {
      var result = $httpParamSerializer({a: 42, b: 43});
      result.should.eql('a=42&b=43');
    })
  });

  describe('JQ-like param serialization', function () {

    it('is possible', function () {
      $http({
        url: 'http://level5.cn',
        params: {
          a: 42,
          b: 43
        },
        paramSerializer: '$httpParamSerializerJQLike'
      });
      requests[0].url.should.eql('http://level5.cn?a=42&b=43');
    });

    it('uses square brackets in arrays', function () {
      $http({
        url: 'http://level5.cn',
        params: {
          a: [42, 43]
        },
        paramSerializer: '$httpParamSerializerJQLike'
      });
      requests[0].url.should.eql('http://level5.cn?a%5B%5D=42&a%5B%5D=43');
    });

    it('uses square brackets in objects', function () {
      $http({
        url: 'http://level5.cn',
        params: {
          a: {b: 42, c: 43}
        },
        paramSerializer: '$httpParamSerializerJQLike'
      });
      requests[0].url.should.eql('http://level5.cn?a%5Bb%5D=42&a%5Bc%5D=43');
    });
    
    it('appends array indexs when items are objects', function () {
      $http({
        url: 'http://level5.cn',
        params: {
          a: [{b:42}]
        },
        paramSerializer: '$httpParamSerializerJQLike'
      });
      requests[0].url.should.eql('http://level5.cn?a%5B0%5D%5Bb%5D=42');
    });
    
  });
  
  it('supports shorthand method for GET', function () {
    
    $http.get('http://level5.cn', {params: {q: 42}});
    
    requests[0].url.should.eql('http://level5.cn?q=42');
    requests[0].method.should.eql('GET');
  });
  
  it('supports shorthand method for HEAD', function () {
    $http.head('http://level5.cn', {params: {q: 42}});
    
    requests[0].url.should.eql('http://level5.cn?q=42');
    requests[0].method.should.eql('HEAD');
  });
  
  
  it('supports shorthand method for DELETE', function () {
    $http.delete('http://level5.cn', {params: {q: 42}});
    
    requests[0].url.should.eql('http://level5.cn?q=42');
    requests[0].method.should.eql('DELETE');
  });
  
  it('supports shorthand method for POST with data', function () {
    $http.post('http://level5.cn', 'data', {
      params: {q: 42}
    });
    
    requests[0].url.should.eql('http://level5.cn?q=42');
    requests[0].method.should.eql('POST');
    requests[0].requestBody.should.eql('data');
  });
  
  
  it('supports shorthand method for PUT with data', function () {
    $http.put('http://level5.cn', 'data', {
      params: {q: 42}
    });
    
    requests[0].url.should.eql('http://level5.cn?q=42');
    requests[0].method.should.eql('PUT');
    requests[0].requestBody.should.eql('data');
  });
  
  
  it('supports shorthand method for PATCH with data', function () {
    $http.patch('http://level5.cn', 'data', {
      params: {q: 42}
    });
    
    requests[0].url.should.eql('http://level5.cn?q=42');
    requests[0].method.should.eql('PATCH');
    requests[0].requestBody.should.eql('data');
  });
  
  it('allows attaching interceptor factories', function () {
    var interceptorFactorySpy = sinon.spy();
    var injector = createInjector(['ng', function ($httpProvider) {
      $httpProvider.interceptors.push(interceptorFactorySpy);
    }]);
    
    $http = injector.get('$http');
    
    interceptorFactorySpy.called.should.be.true();
  });
  
  it('uses DI to instantiate interceptors', function () {
    var interceptorFactorySpy = sinon.spy();
    var injector = createInjector(['ng', function ($httpProvider) {
      $httpProvider.interceptors.push(['$rootScope', interceptorFactorySpy]);
    }]);
    
    $http = injector.get('$http');
    var $rootScope = injector.get('$rootScope');
    interceptorFactorySpy.calledWithExactly($rootScope);
  });
  
  it('allows refrenceing existing interceptor factories', function () {
    var interceptorFactoryStub = sinon.stub();
    interceptorFactoryStub.returns({});
    var injector = createInjector(['ng', function ($provide, $httpProvider) {
      $provide.factory('myInterceptor', interceptorFactoryStub);
      $httpProvider.interceptors.push('myInterceptor');
    }]);
    
    $http = injector.get('$http');
    interceptorFactoryStub.called.should.be.true();
  });
});
