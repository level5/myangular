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
        'Accept': 'text/plian',
        'Cache-Control': 'no-cache'
      }
    });
    
    requests.length.should.eql(1);
    requests[0].requestHeaders.Accept.should.eql('text/plian');
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
      method: 'POST'
    });
  });
  
});