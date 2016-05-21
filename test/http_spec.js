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

});
