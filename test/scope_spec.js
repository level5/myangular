'use strict';

var Scope = require('../src/scope');
var sinon = require('sinon');
var _ = require('lodash');


describe('Scope', function() {

  it('can be constructed and used as an object.', function() {
    var scope = new Scope();
    scope.aProperty = 1;
    scope.aProperty.should.eql(1);
  });

  describe('digest', function() {
    var scope;

    beforeEach(function() {
      scope = new Scope();
    });

    it('calls the listener function of a watch on first $disgest', function(){
      var watchFn = function() {return 'wat';};
      var listenerFn = sinon.spy();

      scope.$watch(watchFn, listenerFn);
      scope.$digest();
      listenerFn.called.should.be.true();
    });

    it('calls the watch function with the scope as the argument', function() {
      var watchFn = sinon.spy();
      var listenerFn = function() {};

      scope.$watch(watchFn, listenerFn);
      scope.$digest();
      watchFn.calledWithExactly(scope);
    });

    it('calls the listener function when the watched value changes', function() {
      scope.someValue = 'a';
      scope.counter = 0;

      scope.$watch(
        function(scope) {return scope.someValue;},
        function(newValue, oldValue, scope) {scope.counter++;}
      );

      scope.counter.should.eql(0);

      scope.$digest();
      scope.counter.should.eql(1);

      scope.$digest();
      scope.counter.should.eql(1);

      scope.someValue = 'b';
      scope.counter.should.eql(1);

      scope.$digest();
      scope.counter.should.eql(2);
    });

    it('calls listener when watch value is first undefined', function() {
      scope.counter = 0;
      scope.$watch(
        function(scope) {return scope.someValue;},
        function(newValue, oldValue, scope) {scope.counter++;}
      );

      scope.$digest();
      scope.counter.should.eql(1);
    });


    it('calls listener with new value as old value the first time.', function() {
      scope.someValue = 123;
      var oldValueGiven;
      scope.$watch(
        function(scope) {return scope.someValue;},
        function(newValue, oldValue, scope) {oldValueGiven = oldValue;}
      );

      scope.$digest();
      oldValueGiven.should.eql(123);
    });

    it('may have watchers that omit the listener function', function() {
      var watchFn = sinon.spy();
      scope.$watch(watchFn);

      scope.$digest();

      watchFn.called.should.be.true();
    });

    it('triggers chained watchers in the same digest.', function() {
      scope.name = 'Jane';

      scope.$watch(
        function(scope) {return scope.nameUpper;},
        function(newValue, oldValue, scope) {
          if (newValue) {
            scope.initial = newValue.substring(0, 1) + ".";
          }
        }
      );

      scope.$watch(
        function(scope) {return scope.name;},
        function(newValue, oldValue, scope) {
          scope.nameUpper = newValue.toUpperCase();
        }
      );

      scope.$digest();
      scope.initial.should.eql('J.');

      scope.name = 'Bob';
      scope.$digest();
      scope.initial.should.eql('B.');
    });

    it('gives up on the watches after 10 iterations', function() {
      scope.counterA = 0;
      scope.counterB = 0;

      scope.$watch(
        function(scope) {return scope.counterA;},
        function(newValue, oldValue, scope) {
          scope.counterB++;
        }
      );

      scope.$watch(
        function(scope) {return scope.counterB;},
        function(newValue, oldValue, scope) {
          scope.counterA++;
        }
      );

      (function() {
        scope.$digest();
      }).should.throw();
    });

    it('ends the digeest when the last watch is clean', function() {

      scope.array = _.range(100);
      var watchExecution = 0;

      _.times(100, function(i) {
        scope.$watch(
          function(scope) {
            watchExecution++;
            return scope.array[i];
          },
          function(newValue, oldValue, scope) {}
        );
      });

      scope.$digest();
      watchExecution.should.eql(200);

      scope.array[0] = 420;
      scope.$digest();
      watchExecution.should.eql(301);
    });

    it('does not end digest so that new watches are not run.', function() {
      scope.aValue = 'abc';
      scope.counter = 0;

      scope.$watch(
        function(scope) {return scope.aValue;},
        function(newValue, oldValue, scope) {
          scope.$watch(
            function(scope) {return scope.aValue;},
            function(newValue, oldValue, scope) {
              scope.counter++;
            }
          );
        }
      );

      scope.$digest();
      scope.counter.should.eql(1);
    });

    it('compares base on value if enabled', function() {
      scope.aValue = [1, 2, 3];
      scope.counter = 0;

      scope.$watch(
        function(scope) { return scope.aValue;},
        function(newValue, oldValue, scope) {
          scope.counter++;
        },
        true
      );

      scope.$digest();
      scope.counter.should.eql(1);

      scope.aValue.push(4);
      scope.$digest();
      scope.counter.should.eql(2);
    });

    it('correctly handles NaNs', function() {
      scope.number = 0 / 0; // NaN;
      scope.counter = 0;

      scope.$watch(
        function(scope) {return scope.number;},
        function(newValue, oldValue, scope) {
          scope.counter++;
        }
      );

      scope.$digest();
      scope.counter.should.eql(1);

      scope.$digest();
      scope.counter.should.eql(1);
    });

    it("executes $eval'ed function and return result.", function() {
      scope.aValue = 42;
      var result = scope.$eval(function(scope) {
        return scope.aValue;
      });

      result.should.eql(42);
    });

    it('passes the second $eval argument straight throught.', function() {
      scope.aValue = 42;

      var result = scope.$eval(function(scope, arg) {
        return scope.aValue + arg;
      }, 2);

      result.should.eql(44);
    });

    it("executes $apply'ed function and start the digest", function() {
      scope.aValue = 'someValues';
      scope.counter = 0;

      scope.$watch(
        function(scope) {return scope.aValue;},
        function(newValue, oldValue, scope) { scope.counter++;}
      );

      scope.$digest();
      scope.counter.should.eql(1);

      scope.$apply(function(scope) {
        scope.aValue = 'someOtherValue';
      });

      scope.counter.should.eql(2);
    });

    it("executes $evalAsync'ed function later in the same cycle.", function() {
      scope.aValue = [1, 2, 3];
      scope.asyncEvaluated = false;
      scope.asyncEvaluatedImmediately = false;

      scope.$watch(
        function(scope) {return scope.aValue;},
        function(newValue, oldValue, scope) {
          scope.$evalAsync(function(scope) {
            scope.asyncEvaluated = true;
          });
          scope.asyncEvaluatedImmediately = scope.asyncEvaluated;
        }
      );

      scope.$digest();
      scope.asyncEvaluated.should.be.true();
      scope.asyncEvaluatedImmediately.should.be.false();
    });

    it("executes $evalAsync'ed functions added by watch functions.", function() {
      scope.aValue = [1, 2, 3];
      scope.asyncEvaluated = false;

      scope.$watch(
        function(scope) {
          if (!scope.asyncEvaluated) {
            scope.$evalAsync(function(scope) {
              scope.asyncEvaluated = true;
            });
          }
          return scope.aValue;
        },
        function(newValue, oldValue, scope) {}
      );

      scope.$digest();

      scope.asyncEvaluated.should.be.true();
    });

    it("executes $evalAsync'ed function even when not dirty.", function() {
      scope.aValue = [1, 2, 3];
      scope.asyncEvaluatedTimes = 0;

      scope.$watch(
        function(scope) {
          if (scope.asyncEvaluatedTimes < 2) {
            scope.$evalAsync(function(scope) {
              scope.asyncEvaluatedTimes++;
            });
          }
          return scope.aValue;
        },
        function(newValue, oldValue, scope) {}
      );

      scope.$digest();

      scope.asyncEvaluatedTimes.should.eql(2);
    });

    it("eventually halts $evalAsync add by watches.", function() {
      scope.aValue = [1, 2, 3];

      scope.$watch(
        function(scope) {
          scope.$evalAsync(function(scope) {});
          return scope.aValue;
        },
        function(newValue, oldValue, scope) {}
      );

      (function() {
        scope.$digest();
      }).should.throw();
    });

    it('has a $$phase field whose value is the current digest phase', function() {
      scope.aValue = [1, 2, 3];
      scope.phaseInwatchFunction = undefined;
      scope.phaseInListenerFunction = undefined;
      scope.phaseInApplyFunction = undefined;

      scope.$watch(
        function(scope) {
          scope.phaseInwatchFunction = scope.$$phase;
          return scope.aValue;
        },
        function(newValue, oldValue, scope) {
          scope.phaseInListenerFunction = scope.$$phase;
        }
      );

      scope.$apply(function(scope) {
        scope.phaseInApplyFunction = scope.$$phase;
      });

      scope.phaseInwatchFunction.should.eql('$digest');
      scope.phaseInListenerFunction.should.eql('$digest');
      scope.phaseInApplyFunction.should.eql('$apply');

    });

    it('schedules a digest in $evalAsync', function(done) {
      scope.aValue = "abc";
      scope.counter = 0;

      scope.$watch(
        function(scope) {return scope.aValue;},
        function(newValue, oldValue, scope) {
          scope.counter++;
        }
      );

      scope.$evalAsync(function(scope) {});

      scope.counter.should.eql(0);
      setTimeout(function(){
        scope.counter.should.eql(1);
        done();
      }, 50);
    });
  });
});
