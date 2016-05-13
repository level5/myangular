'use strict';

var sinon = require('sinon');
var _ = require('lodash');

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
      promiseSpy.calledWith('a-ok').should.be.true();;
      done();
    }, 1);
    
  });
  
  it('works when resolved before promise listener.', function (done) {
    var d = $q.defer();
    d.resolve(42);
    
    var promiseSpy = sinon.spy();
    d.promise.then(promiseSpy);
    
    setTimeout(function () {
      promiseSpy.calledWith(42).should.be.true();;
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
    
    promiseSpy.calledWith(42).should.be.true();;
  });
  
  it('may only be resolved once', function() {
    var d = $q.defer();
    
    var promiseSpy = sinon.spy();
    d.promise.then(promiseSpy);
    
    d.resolve(42);
    d.resolve(43);
    
    $rootScope.$apply()
    
    promiseSpy.callCount.should.eql(1);
    promiseSpy.calledWith(42).should.be.true();;
  });
  
  it('may only ever be resolved once', function() {
    var d = $q.defer();
    
    var promiseSpy = sinon.spy();
    d.promise.then(promiseSpy);
    
    d.resolve(42);
    $rootScope.$apply();
    promiseSpy.calledWith(42).should.be.true();;
    
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
    
    promiseSpy.calledWith(42).should.be.true();
    
  });
  
  it('may have multiple callbacks', function() {
    var d = $q.defer();
    
    var firstSpy = sinon.spy();
    var secondSpy = sinon.spy();
    
    d.promise.then(firstSpy);
    d.promise.then(secondSpy);
    
    d.resolve(42);
    $rootScope.$apply();
    
    firstSpy.calledWith(42).should.be.true();;
    secondSpy.calledWith(42).should.be.true();;
  });
  
  it('invokes callbacks once', function() {
    var d = $q.defer();
    
    var firstSpy = sinon.spy();
    var secondSpy = sinon.spy();
    
    d.promise.then(firstSpy);
    d.resolve(42);
    $rootScope.$apply();
    firstSpy.callCount.should.eql(1);
    secondSpy.callCount.should.eql(0);
    
    d.promise.then(secondSpy);
    firstSpy.callCount.should.eql(1);
    secondSpy.callCount.should.eql(0);
    
    $rootScope.$apply();
    firstSpy.callCount.should.eql(1);
    secondSpy.callCount.should.eql(1);
    
  });
  
  
  it('can reject a deferred', function () {
    var d = $q.defer();
    var fulfillSpy = sinon.spy();
    var rejectSpy = sinon.spy();
    
    d.promise.then(fulfillSpy, rejectSpy);
    
    d.reject('fail');
    $rootScope.$apply();
    
    fulfillSpy.called.should.be.false();
    rejectSpy.calledWith('fail').should.be.true();
    
  });
  
  it('can reject just once', function () {
    var d = $q.defer();
    
    var rejectSpy = sinon.spy();
    d.promise.then(null, rejectSpy);
    
    d.reject('fail');
    $rootScope.$apply();

    rejectSpy.callCount.should.eql(1);
    
    d.reject('fail again');
    $rootScope.$apply();
    rejectSpy.callCount.should.eql(1);
        
  });
  
  it('cannot fulfill a promise once rejected.', function () {
    var d = $q.defer();
    
    var fulfillSpy = sinon.spy();
    var rejectSpy = sinon.spy();
    
    d.promise.then(fulfillSpy, rejectSpy);
    
    d.reject('fail');
    $rootScope.$apply();
    
    d.resolve('success');
    $rootScope.$apply();
    
    fulfillSpy.called.should.be.false();
    
  });
  
  it('does not require a failure handler each time.', function () {
    var d = $q.defer();
    
    var fulfillSpy = sinon.spy();
    var rejectSpy = sinon.spy();
    
    d.promise.then(fulfillSpy);
    d.promise.then(null, rejectSpy);
    
    d.reject('fail');
    $rootScope.$apply();
    
    rejectSpy.calledWith('fail').should.be.true();
    
  });
  
  it('does not require a success handler each time.', function () {
    var d = $q.defer();
    
    var fulfillSpy = sinon.spy();
    var rejectSpy = sinon.spy();
    
    d.promise.then(fulfillSpy);
    d.promise.then(null, rejectSpy);

    d.resolve('ok');    
    $rootScope.$apply();
    
    fulfillSpy.calledWith('ok').should.be.true();
  });
  
  it('can register rejection handler with catch.', function () {
    var d = $q.defer();
    
    var rejectSpy = sinon.spy();
    d.promise.catch(rejectSpy);
    d.reject('fail');
    $rootScope.$apply();
    
    rejectSpy.called.should.be.true();
  });
  
  it('invokes a finally handler when fulfilled', function() {
    var d = $q.defer();
    
    var finallySpy = sinon.spy();
    d.promise.finally(finallySpy);
    d.resolve(42);
    $rootScope.$apply();
    
    finallySpy.calledWithExactly().should.be.true();
  });
   
  it('invokes a finally handler when rejected', function() {
    var d = $q.defer();
    
    var finallySpy = sinon.spy();
    d.promise.finally(finallySpy);
    d.reject('fail');
    $rootScope.$apply();
    
    finallySpy.calledWithExactly().should.be.true();
  }); 
  
  it('allows chaining handler', function() {
    
    var d = $q.defer();
    
    var fulfilledSpy = sinon.spy();
    
    d.promise.then(function(result) {
      return result + 1;
    }).then(function(result) {
      return result * 2;
    }).then(fulfilledSpy);
    
    d.resolve(20);
    $rootScope.$apply();
    
    fulfilledSpy.calledWithExactly(42).should.be.true();
    
  });
  
  it('does not modify original resolution in chains', function() {
    
    var d = $q.defer();
    
    var fulfilledSpy = sinon.spy();
    
    d.promise.then(function (result) {
      return result + 1;
    }).then(function (result) {
      return result * 2;
    });
    
    d.promise.then(fulfilledSpy);
    
    d.resolve(20);
    $rootScope.$apply();
    
    fulfilledSpy.calledWithExactly(20).should.be.true();
  });
  
  it('catches rejection on chained handler', function() {
    var d = $q.defer();
    
    var rejectedSpy = sinon.spy();
    d.promise.then(_.noop).catch(rejectedSpy);
    
    d.reject('fail');
    $rootScope.$apply();
    
    rejectedSpy.calledWithExactly('fail').should.be.true();
  });
  
    
  it('fulfills on chained handler', function() {
    var d = $q.defer();
    
    var fulfilledSpy = sinon.spy();
    d.promise.catch(_.noop).then(fulfilledSpy);
    
    d.resolve(42);
    $rootScope.$apply();
    
    fulfilledSpy.calledWithExactly(42).should.be.true();
  });
  
  it('treats catch return value as resolution', function () {
    var d = $q.defer();
    
    var fulfilledSpy = sinon.spy();
    d.promise.catch(function () {
      return 42;
    }).then(fulfilledSpy);
    
    d.reject('fail')
    $rootScope.$apply();
    
    fulfilledSpy.calledWithExactly(42).should.be.true();
  });
  
  it('rejects chained promise when handler throws', function () {
    var d = $q.defer();
    
    var rejectedSpy = sinon.spy();
    
    d.promise.then(function () {
      throw 'fail';
    }).catch(rejectedSpy);
    
    d.resolve(42);
    $rootScope.$apply();
    
    rejectedSpy.calledWithExactly('fail').should.be.true();
  });
  
  it('does not reject current promise when handler throws', function () {
    var d = $q.defer();
    
    var rejectedSpy = sinon.spy();
    
    d.promise.then(function () {
      throw 'fail';
    });
    
    d.promise.catch(rejectedSpy);
    
    d.resolve(42);
    $rootScope.$apply();
    
    rejectedSpy.called.should.be.false();
    
  });
});