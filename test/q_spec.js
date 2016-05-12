'use strict';

var sinon = require('sinon');

var publishExternalAPI = require('../src/angular_public');
var createInjector = require('../src/injector');

describe('$q', function () {
  
  var $q, $rootScope;
  
  beforeEach(function () {
    publishExternalAPI();
    var injector = createInjector(['ng']);
    $q = injector.get('$q');
    $rootScope = injector.get('$rootScope');
  });
  
  it('can create a deferred.', function () {
    var d = $q.defer();
    d.should.be.Object();
  });
  
  it('has a promise for each Deferred', function () {
    var d = $q.defer();
    d.promise.should.be.Object();
  });
  
  it('can resolve a promise', function (done) {
    var deferred = $q.defer();
    var promise = deferred.promise;
    
    var promiseSpy = sinon.spy();
    promise.then(promiseSpy);
    
    deferred.resolve('a-ok');
    
    setTimeout(function () {
      promiseSpy.calledWith('a-ok');
      done();
    }, 1);
    
  });
  
  it('works when resolved before promise listener.', function (done) {
    var d = $q.defer();
    d.resolve(42);
    
    var promiseSpy = sinon.spy();
    d.promise.then(promiseSpy);
    
    setTimeout(function () {
      promiseSpy.calledWith(42);
      done();
    }, 0);
  });
  
  it('does not resolve promise immediately.', function () {
    var d = $q.defer();
    
    var promiseSpy = sinon.spy();
    d.promise.then(promiseSpy);
    
    d.resolve(42);
    
    promiseSpy.called.should.be.false();
  });
  
  it('resolve promise at next digest.', function () {
    var d = $q.defer();
    
    var promiseSpy = sinon.spy();
    d.promise.then(promiseSpy);
    
    d.resolve(42);
    $rootScope.$apply();
    
    promiseSpy.calledWith(42);
  });
  
  it('may only be resolved once', function() {
    var d = $q.defer();
    
    var promiseSpy = sinon.spy();
    d.promise.then(promiseSpy);
    
    d.resolve(42);
    d.resolve(43);
    
    $rootScope.$apply()
    
    promiseSpy.callCount.should.eql(1);
    promiseSpy.calledWith(42);
  });
  
  it('may only ever be resolved once', function() {
    var d = $q.defer();
    
    var promiseSpy = sinon.spy();
    d.promise.then(promiseSpy);
    
    d.resolve(42);
    $rootScope.$apply();
    promiseSpy.calledWith(42);
    
    d.resolve(43);
    $rootScope.$apply();
    promiseSpy.callCount.should.eql(1);
  });
  
  it('resolve a listener added after resolution.', function() {
    
    var d = $q.defer();
    d.resolve(42);
    $rootScope.$apply();
    
    var promiseSpy = sinon.spy();
    d.promise.then(promiseSpy);
    $rootScope.$apply();
    
    promiseSpy.calledWith(42);
    
  });
  
  it('may have multiple callbacks', function() {
    var d = $q.defer();
    
    var firstSpy = sinon.spy();
    var secondSpy = sinon.spy();
    
    d.promise.then(firstSpy);
    d.promise.then(secondSpy);
    
    d.resolve(42);
    $rootScope.$apply();
    
    firstSpy.calledWith(42);
    secondSpy.calledWith(42);
  });
  
});