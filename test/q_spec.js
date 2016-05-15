'use strict';

var sinon = require('sinon');
var _ = require('lodash');

var publishExternalAPI = require('../src/angular_public');
var createInjector = require('../src/injector');

describe('$q', function () {
  
  var $q, $$q, $rootScope;
  
  beforeEach(function () {
    publishExternalAPI();
    var injector = createInjector(['ng']);
    $q = injector.get('$q');
    $$q = injector.get('$$q');
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
    var fulfilledSpy = sinon.spy();
    var rejectedSpy = sinon.spy();
    
    d.promise.then(fulfilledSpy, rejectedSpy);
    
    d.reject('fail');
    $rootScope.$apply();
    
    fulfilledSpy.called.should.be.false();
    rejectedSpy.calledWith('fail').should.be.true();
    
  });
  
  it('can reject just once', function () {
    var d = $q.defer();
    
    var rejectedSpy = sinon.spy();
    d.promise.then(null, rejectedSpy);
    
    d.reject('fail');
    $rootScope.$apply();

    rejectedSpy.callCount.should.eql(1);
    
    d.reject('fail again');
    $rootScope.$apply();
    rejectedSpy.callCount.should.eql(1);
        
  });
  
  it('cannot fulfill a promise once rejected.', function () {
    var d = $q.defer();
    
    var fulfilledSpy = sinon.spy();
    var rejectedSpy = sinon.spy();
    
    d.promise.then(fulfilledSpy, rejectedSpy);
    
    d.reject('fail');
    $rootScope.$apply();
    
    d.resolve('success');
    $rootScope.$apply();
    
    fulfilledSpy.called.should.be.false();
    
  });
  
  it('does not require a failure handler each time.', function () {
    var d = $q.defer();
    
    var fulfilledSpy = sinon.spy();
    var rejectedSpy = sinon.spy();
    
    d.promise.then(fulfilledSpy);
    d.promise.then(null, rejectedSpy);
    
    d.reject('fail');
    $rootScope.$apply();
    
    rejectedSpy.calledWith('fail').should.be.true();
    
  });
  
  it('does not require a success handler each time.', function () {
    var d = $q.defer();
    
    var fulfilledSpy = sinon.spy();
    var rejectedSpy = sinon.spy();
    
    d.promise.then(fulfilledSpy);
    d.promise.then(null, rejectedSpy);

    d.resolve('ok');    
    $rootScope.$apply();
    
    fulfilledSpy.calledWith('ok').should.be.true();
  });
  
  it('can register rejection handler with catch.', function () {
    var d = $q.defer();
    
    var rejectedSpy = sinon.spy();
    d.promise.catch(rejectedSpy);
    d.reject('fail');
    $rootScope.$apply();
    
    rejectedSpy.called.should.be.true();
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
  
  it('waits on promise returned from handler', function () {
    var d = $q.defer();
    var fulfilledSpy = sinon.spy();
    
    d.promise.then(function (v) {
      var d2 = $q.defer();
      d2.resolve(v+1);
      return d2.promise;
    }).then(function (v) {
      return v * 2;
    }).then(fulfilledSpy);
    
    d.resolve(20);
    $rootScope.$apply();
    fulfilledSpy.calledWithExactly(42).should.be.true();
  });
  
  it('waits on promise given to resolve', function () {
    var d = $q.defer();
    var d2 = $q.defer();
    
    var fulfilledSpy = sinon.spy();
    
    d.promise.then(fulfilledSpy);
    d2.resolve(42);
    d.resolve(d2.promise);
    
    $rootScope.$apply();
    
    fulfilledSpy.calledWithExactly(42).should.be.true();
  });
  
  it('rejects when promise returned from handler rejects.', function () {
    var d = $q.defer();
    var rejectedSpy = sinon.spy();
    d.promise.then(function () {
      var d2 = $q.defer();
      d2.reject('fail');
      return d2.promise;
    }).catch(rejectedSpy);
    
    d.resolve('ok');
    $rootScope.$apply();
    
    rejectedSpy.calledWithExactly('fail').should.be.true();
  });
  
  it('allows chaining handlers on finally, with original value.', function () {
    var d = $q.defer();
    
    var fulfilledSpy = sinon.spy();
    d.promise.then(function (result) {
      return result + 1;
    }).finally(function (result) {
      return result * 2;
    }).then(fulfilledSpy);
    
    d.resolve(20);
    $rootScope.$apply();
    
    fulfilledSpy.calledWithExactly(21).should.be.true();
  });
  
  it('allows chaining handlers on finally, with original rejection.', function () {
    var d = $q.defer();
    
    var rejectedSpy = sinon.spy();
    d.promise.then(function () {
      throw 'fail';
    }).finally(function() {
    }).catch(rejectedSpy);
    
    d.resolve(20);
    $rootScope.$apply();
    
    rejectedSpy.calledWithExactly('fail').should.be.true();
  });
  
  it('resolves to original value when nested promise resolves', function () {
    var d = $q.defer();
    
    var fulfilledSpy = sinon.spy();
    var resolveNested;
    
    d.promise.then(function (result) {
      return result + 1;
    }).finally(function (result) {
      var d2 = $q.defer();
      resolveNested = function() {
        d2.resolve('abc');
      };
      return d2.promise;
    }).then(fulfilledSpy);
    
    d.resolve(20);
    $rootScope.$apply();
    fulfilledSpy.called.should.be.false();
    
    resolveNested();
    $rootScope.$apply();
    fulfilledSpy.calledWithExactly(21).should.be.true();
  });
  
  it('rejects to original value when nested promise resloves', function () {
    var d = $q.defer();
    
    var rejectedSpy = sinon.spy();
    var resolveNested;
    
    d.promise.then(function (result) {
      throw 'fail';
    }).finally(function (result) {
      var d2 = $q.defer();
      resolveNested = function () {
        d2.resolve('abc');
      }
      return d2.promise;
    }).catch(rejectedSpy);
    
    d.resolve(20);
    $rootScope.$apply();
    rejectedSpy.called.should.be.false();
    
    resolveNested();
    $rootScope.$apply();
    rejectedSpy.calledWithExactly('fail').should.be.true();
    
    
  });
  
  it('rejects when nested promise rejects in finally', function () {
    var d = $q.defer();
    
    var fulfilledSpy = sinon.spy();
    var rejectedSpy = sinon.spy();
    var rejecteNested;
    
    d.promise.then(function (result) {
      return result + 1;
    }).finally(function (result) {
      var d2 = $q.defer();
      rejecteNested = function () {
        d2.reject('fail');
      };
      return d2.promise;
    }).then(fulfilledSpy, rejectedSpy);
    
    d.resolve(20);
    $rootScope.$apply();
    fulfilledSpy.called.should.be.false();
    
    rejecteNested();
    $rootScope.$apply();
    fulfilledSpy.called.should.be.false();
    rejectedSpy.calledWithExactly('fail').should.be.true();
  });
  
  it('can report progress', function () {
    var d = $q.defer();
    var progressSpy = sinon.spy();
    d.promise.then(null, null, progressSpy);
    
    d.notify('working...');
    $rootScope.$apply();
    
    progressSpy.calledWithExactly('working...').should.be.true();
  });
  
  it('can report progress many times', function () {
    var d = $q.defer();
    var progressSpy = sinon.spy();
    d.promise.then(null, null, progressSpy);
    
    d.notify('40%');
    $rootScope.$apply();
    
    d.notify('80%');
    d.notify('100%');
    $rootScope.$apply();
    
    progressSpy.callCount.should.eql(3);
  });
  
  it('does not notifiy progress after being resolved.', function () {
    var d = $q.defer();
    var progressSpy = sinon.spy();
    d.promise.then(null, null, progressSpy);
    
    d.resolve('ok');
    d.notify('working...');
    $rootScope.$apply();
    
    progressSpy.called.should.be.false();
  });
  
  it('does not notify progress after being rejected.', function () {
    var d = $q.defer();
    var progressSpy = sinon.spy();
    d.promise.then(null, null, progressSpy);

    d.reject('fail');    
    d.notify('working...');
    $rootScope.$apply();
    
    progressSpy.called.should.be.false();
  });
  
  it('can notify progress through chain.', function () {
    var d = $q.defer();
    var progressSpy = sinon.spy();
    
    d.promise.then(_.noop).then(_.noop).then(null, null, progressSpy);
    
    d.notify('working...');
    $rootScope.$apply();
    
    progressSpy.calledWithExactly('working...').should.be.true();
  });
  
  it('transforms progress through handlers', function () {
    var d = $q.defer();
    var progressSpy = sinon.spy();
    
    d.promise
      .then(_.noop)
      .then(null, null, function (progress) {
        return '***' + progress + '***';
      }).catch(_.noop)
      .then(null, null, progressSpy);
      
      d.notify('working...');
      $rootScope.$apply();
      
      progressSpy.calledWithExactly('***working...***');   
  });
  
  it('recovers from progressback exceptions.', function () {
    var d = $q.defer();
    var progressSpy = sinon.spy();
    var fulfilledSpy = sinon.spy();
    
    d.promise.then(null, null, function (progress) {
      throw 'fail';
    });
    d.promise.then(fulfilledSpy, null, progressSpy);
    
    d.notify('working...');
    d.resolve('ok');
    $rootScope.$apply();
    
    progressSpy.calledWithExactly('working...').should.be.true();
  });
  
  it('can notifiy progress through promise return from handler', function () {
    var d = $q.defer();
    
    var progressSpy = sinon.spy();
    d.promise.then(null, null, progressSpy);
    
    var d2 = $q.defer();
    
    d.resolve(d2.promise);
    
    d2.notify('working...');
    
    $rootScope.$apply();
    
    progressSpy.calledWithExactly('working...').should.be.true();
    
  });
  
  it('allows attaching progressback in finally', function () {
    var d  = $q.defer();
    var progressSpy = sinon.spy();
    d.promise.finally(null, progressSpy);
    
    d.notify('working...');
    $rootScope.$apply();
    
    progressSpy.calledWithExactly('working...').should.be.true();
  });
  
  it('can make an immediately rejected promise', function () {
    var fulfilledSpy = sinon.spy();
    var rejectedSpy = sinon.spy();
    
    var promise = $q.reject('fail');
    promise.then(fulfilledSpy, rejectedSpy);
    
    $rootScope.$apply();
    
    fulfilledSpy.called.should.be.false();
    rejectedSpy.calledWithExactly('fail').should.be.true();
  });
  
  it('can make an immediately resolved promise', function () {
    var fulfilledSpy = sinon.spy();
    var rejectedSpy = sinon.spy();
    
    var promise = $q.when('ok');
    promise.then(fulfilledSpy, rejectedSpy);
    
    $rootScope.$apply();
    
    fulfilledSpy.calledWithExactly('ok').should.be.true();
    rejectedSpy.called.should.be.false();
  });
  
  it('can wrap a foreign promise', function () {
    var fulfilledSpy = sinon.spy();
    var rejectedSpy = sinon.spy();
    
    var promise = $q.when({
      then: function (handler) {
        $rootScope.$evalAsync(function() {
          handler('ok');
        });
      }
    });
    
    promise.then(fulfilledSpy, rejectedSpy);
    
    $rootScope.$apply();
    
    fulfilledSpy.calledWithExactly('ok').should.be.true();
    rejectedSpy.called.should.be.false();
  });
  
  it('takes callbacks directly when wrapping', function () {
    var fulfilledSpy = sinon.spy();
    var rejectedSpy = sinon.spy();
    var progressSpy = sinon.spy();
    
    var wrapped = $q.defer();
    $q.when(
      wrapped.promise,
      fulfilledSpy,
      rejectedSpy,
      progressSpy
    );
    
    wrapped.notify('working...');
    wrapped.resolve('ok');
    $rootScope.$apply();
    
    fulfilledSpy.calledWithExactly('ok').should.be.true();
    rejectedSpy.called.should.be.false();
    progressSpy.calledWithExactly('working...').should.be.true();
  });
  
  it('makes an immediately resolved promise with resolve', function () {
    var fulfilledSpy = sinon.spy();
    var rejectedSpy = sinon.spy();
    
    var promise = $q.resolve('ok');
    promise.then(fulfilledSpy, rejectedSpy);
    
    $rootScope.$apply();
    
    fulfilledSpy.calledWithExactly('ok').should.be.true();
    rejectedSpy.called.should.be.false();
  });
  
  describe('all', function () {
    
    it('can resolve an array of promise to array of results', function () {
      
      var promise = $q.all([$q.when(1), $q.when(2), $q.when(3)]);
      var fulfilledSpy = sinon.spy();
      promise.then(fulfilledSpy);
      
      $rootScope.$apply();
      
      fulfilledSpy.calledWithExactly([1, 2, 3]).should.be.true();
      
    });
    
    it('can resolve an object of promises to an object of results', function () {
      var promise = $q.all({a: $q.when(1), b: $q.when(2)});
      var fulfilledSpy = sinon.spy();
      promise.then(fulfilledSpy);
      
      $rootScope.$apply();
      
      fulfilledSpy.calledWithExactly({a:1, b:2}).should.be.true();
    });
    
    it('can resolve an empty array of promises immediately', function () {
      var promise = $q.all([]);
      var fulfilledSpy = sinon.spy();
      promise.then(fulfilledSpy);
      
      $rootScope.$apply();
      
      fulfilledSpy.calledWithExactly([]).should.be.true();
    });
    
    it('can resolve an empty object of promises immediately', function () {
      var promise = $q.all({});
      var fulfilledSpy = sinon.spy();
      promise.then(fulfilledSpy);
      
      $rootScope.$apply();
      
      fulfilledSpy.calledWithExactly({}).should.be.true();
    });
    
    it('rejects when any of the promise rejects', function () {
      var promise = $q.all([$q.when(1), $q.when(2), $q.reject('fail')]);
      var fulfilledSpy = sinon.spy();
      var rejectedSpy = sinon.spy();
      
      promise.then(fulfilledSpy, rejectedSpy);
      $rootScope.$apply();
      
      fulfilledSpy.called.should.be.false();
      rejectedSpy.calledWithExactly('fail').should.be.true();
    });
    
    it('wraps non-promises in the input collection', function () {
      var promise = $q.all([$q.when(1), 2, 3]);
      var fulfilledSpy = sinon.spy();
      promise.then(fulfilledSpy);
      
      $rootScope.$apply();
      
      fulfilledSpy.calledWithExactly([1, 2, 3]).should.be.true();
    });
    
  });
  
  describe('ES6 style', function () {
    
    it('is a function', function () {
      $q.should.be.Function();
    });
    
    it('expects a function as an argument', function () {
      ($q).should.throw();
      $q(_.noop); // 监测这样不会抛异常
    });
    
    it('return a promise', function () {
      $q(_.noop).should.be.Object();
      $q(_.noop).then.should.be.Function();
    });
    
    it('calls function with a resolve function', function () {
      var fulfilledSpy = sinon.spy();
      
      $q(function(resolve) {
        resolve('ok');
      }).then(fulfilledSpy);
      
      $rootScope.$apply();
      fulfilledSpy.calledWithExactly('ok').should.be.true();
    });
        
    it('calls function with a reject function', function () {
      var fulfilledSpy = sinon.spy();
      var rejectedSpy = sinon.spy();
      
      $q(function(resolve, reject) {
        reject('fail');
      }).then(fulfilledSpy, rejectedSpy);
      
      $rootScope.$apply();
      fulfilledSpy.called.should.be.false();
      rejectedSpy.calledWithExactly('fail').should.be.true();
    });
  });
  
  describe('$$q', function () {
    
    var clock;
    
    beforeEach(function () {
      clock = sinon.useFakeTimers();
    });
    
    afterEach(function () {
      clock.restore();
    });
    
    
    it('uses deferreds that do not reslove at digist', function () {
      var d = $$q.defer();
      var fulfilledSpy = sinon.spy();
      d.promise.then(fulfilledSpy);
      d.resolve('ok');
      $rootScope.$apply();
      fulfilledSpy.called.should.be.false();
    });
    
    it('uses deferreds that resolve later', function () {
      var d = $$q.defer();
      var fulfilledSpy = sinon.spy();
      d.promise.then(fulfilledSpy);
      d.resolve('ok');
      
      clock.tick(1);
      
      fulfilledSpy.calledWithExactly('ok').should.be.true();
    });
    
    it('does not invoke digest', function () {
      var d = $$q.defer();
      d.promise.then(_.noop);
      d.resolve('ok');
      
      var watchSpy = sinon.spy();
      $rootScope.$watch(watchSpy);
      
      clock.tick(1);
      watchSpy.called.should.be.false();
    })
    
  });
  
});