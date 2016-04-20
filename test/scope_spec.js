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

    it('allows async $apply with $applyAsync', function(done) {
      scope.counter = 0;

      scope.$watch(
        function(scope) {return scope.aValue;},
        function(newValue, oldValue, scope) {
          scope.counter++;
        }
      );

      scope.$digest();
      scope.counter.should.eql(1);

      scope.$applyAsync(function(scope) {
        scope.aValue = 'abc';
      });
      scope.counter.should.eql(1);
      setTimeout(function() {
        scope.counter.should.eql(2);
        done();
      }, 50);
    });

    it("never executes $applyAsync'ed function in the same cycle.", function(done) {
      scope.aValue = [1, 2, 3];
      scope.asyncApplied = false;

      scope.$watch(
        function(scope) {return scope.aValue;},
        function(newValue, oldValue, scope) {
          scope.$applyAsync(function(scope) {
            scope.asyncApplied = true;
          });
        }
      );

      scope.$digest();
      scope.asyncApplied.should.be.false();
      setTimeout(function() {
        scope.asyncApplied.should.be.true();
        done();
      }, 50);
    });

    it('coalesces many calls to $applyAsync.', function(done) {
      scope.counter = 0;

      scope.$watch(
        function(scope) {
          scope.counter++;
          return scope.aValue;
        },
        function(newValue, oldValue, scope) {}
      );

      scope.$applyAsync(function(scope) {
        scope.aValue = 'abc';
      });
      scope.$applyAsync(function(scope) {
        scope.aValue = 'def';
      });

      setTimeout(function() {
        scope.counter.should.eql(2);
        done();
      }, 50);
    });

    it('cancels and flushes $applyAsync if digested first', function(done) {
      scope.counter = 0;

      scope.$watch(
        function(scope) {
          scope.counter++;
          return scope.aValue;
        },
        function(newValue, oldValue, scope) {}
      );

      scope.$applyAsync(function(scope) {
        scope.aValue = 'abc';
      });

      scope.$applyAsync(function(scope) {
        scope.aValue = 'def';
      });

      scope.$digest();
      scope.counter.should.eql(2);
      scope.aValue.should.eql('def');

      setTimeout(function() {
        scope.counter.should.eql(2);
        done();
      }, 50);
    });

    it('runs a $$postDigest function after each digest', function() {
      scope.counter = 0;

      scope.$$postDigest(function() {
        scope.counter++;
      });

      scope.counter.should.eql(0);

      scope.$digest();
      scope.counter.should.eql(1);

      scope.$digest();
      scope.counter.should.eql(1);

    });

    it('does not include $$postDigest in the digest.', function() {
      scope.aValue = 'original value';

      scope.$$postDigest(function() {
        scope.aValue = 'changed value';
      });

      scope.$watch(
        function(scope) {return scope.aValue;},
        function(newValue, oldValue, scope) {
          scope.watchedValue = newValue;
        }
      );

      scope.$digest();
      scope.watchedValue.should.eql('original value');

      scope.$digest();
      scope.watchedValue.should.eql('changed value');

    });

    it('catches exceptions in watch functions and continues.', function() {
      scope.aValue = 'abc';
      scope.counter = 0;

      scope.$watch(
        function(scope) {throw "error";},
        function(newValue, oldValue, scope) {}
      );

      scope.$watch(
        function(scope){return scope.aValue;},
        function(newValue, oldValue, scope) {
          scope.counter++;
        }
      );

      scope.$digest();
      scope.counter.should.eql(1);
    });

    it('catches exceptions in listener function and continues.', function() {
      scope.aValue = 'abc';
      scope.counter = 0;

      scope.$watch(
        function(scope) {return scope.aValue;},
        function(newValue, oldValue, scope) {
          throw "Error";
        }
      );

      scope.$watch(
        function(scope) {return scope.aValue;},
        function(newValue, oldValue, scope) {
          scope.counter++;
        }
      );

      scope.$digest();
      scope.counter.should.eql(1);
    });

    it('catches exceptions in $evalAsync.', function(done) {
      scope.aValue = 'abc';
      scope.counter = 0;

      scope.$watch(
        function(scope) {return scope.aValue;},
        function(newValue, oldValue, scope) {
          scope.counter++;
        }
      );

      scope.$evalAsync(function(scope) {
        throw "Error";
      });

      setTimeout(function() {
        scope.counter.should.eql(1);
        done();
      }, 50);
    });

    it('catches exceptions in $applyAsync.', function(done) {
      scope.$applyAsync(function(scope) { throw "Error"; });
      scope.$applyAsync(function(scope) { throw "Error"; });
      scope.$applyAsync(function(scope) {
        scope.applied = true;
      });

      setTimeout(function() {
        scope.applied.should.be.true();
        done();
      }, 50);
    });

    it('catches exceptions in $$postDigest.', function() {
      var didRun = false;
      scope.$$postDigest(function() {
        throw "Error";
      });

      scope.$$postDigest(function() {
        didRun = true;
      });

      scope.$digest();
      didRun.should.be.true();
    });

    it('allows destroying a $watch with a removal function.', function() {
      scope.aValue = 'abc';
      scope.counter = 0;

      var destroyWatch = scope.$watch(
        function(scope) {return scope.aValue;},
        function(newValue, oldValue, scope) {
          scope.counter++;
        }
      );

      scope.$digest();
      scope.counter.should.eql(1);

      scope.aValue = 'def';
      scope.$digest();
      scope.counter.should.eql(2);

      scope.aValue = 'ghi';
      destroyWatch();
      scope.$digest();
      scope.counter.should.eql(2);

    });

    it('allows destorying a $watch during digest.', function() {
      scope.aValue = 'abc';

      var watchCalls = [];

      scope.$watch(
        function(scope) {
          watchCalls.push('first');
          return scope.aValue;
        }
      );

      var destroyWatch = scope.$watch(
        function(scope) {
          watchCalls.push('second');
          destroyWatch();
        }
      );

      scope.$watch(
        function(scope) {
          watchCalls.push('third');
          return scope.aValue;
        }
      );

      scope.$digest();
      watchCalls.should.eql(['first', 'second', 'third', 'first', 'third']);

    });

    it('allows a $watch to destroy another during digest.', function() {
      scope.aValue = 'abc';
      scope.counter= 0;

      scope.$watch(
        function(scope) {
          return scope.aValue;
        },
        function(newValue, oldValue, scope) {
          destroyWatch();
        }
      );

      var destroyWatch = scope.$watch(
        function(scope) {},
        function(newValue, oldValue, scope) {}
      );

      scope.$watch(
        function(scope) {
          return scope.aValue;
        },
        function(newValue, oldValue, scope) {
          scope.counter++;
        }
      );

      scope.$digest();
      scope.counter.should.eql(1);
    });

    it('allows destroying several $watches during digest', function() {
      scope.aValue = 'abc';
      scope.counter = 0;

      var destroyWatch1 = scope.$watch(function(scope) {
        destroyWatch1();
        destroyWatch2();
      });

      var destroyWatch2 = scope.$watch(
        function(scope) {return scope.aValue;},
        function(newValue, oldValue, scope) {
          scope.counter++;
        }
      );
      scope.$digest();
      scope.counter.should.eql(0);
    });

  });

  describe('$watchGroup', function() {

    var scope;

    beforeEach(function() {
      scope = new Scope();
    });

    it('takes watches as an array and calls listener with arrays.', function() {

      var gotNewvalues, gotOldValues;

      scope.aValue = 1;
      scope.anotherValue = 2;

      scope.$watchGroup([
        function(scope) {return scope.aValue;},
        function(scope) {return scope.anotherValue;}
      ], function(newValues, oldValues, scope) {
        gotNewvalues = newValues;
        gotOldValues = oldValues;
      });

      scope.$digest();

      gotNewvalues.should.eql([1, 2]);
      gotOldValues.should.eql([1, 2]);
    });

    it('only calls listener once per digest.', function() {

      var counter = 0;

      scope.aValue = 1;
      scope.anotherValue = 2;

      scope.$watchGroup([
        function(scope) {return scope.aValue;},
        function(scope) {return scope.anotherValue;}
      ], function(newValues, oldValues, scope) {
        counter++;
      });

      scope.$digest();
      counter.should.eql(1);
    });

    it('uses the same array of old and new values on first run.', function() {

      var gotNewValues, gotOldValues;

      scope.aValue = 1;
      scope.aValue = 2;

      scope.$watchGroup([
        function(scope) {return scope.aValue;},
        function(scope) {return scope.anotherValue;}
      ], function(newValues, oldValues, scope) {
        gotNewValues = newValues;
        gotOldValues = oldValues;
      });

      scope.$digest();
      gotNewValues.should.be.exactly(gotOldValues);
    });

    it('uses different arrays for old and new values on subsequent runs.', function() {

      var gotNewValues, gotOldValues;

      scope.aValue = 1;
      scope.anotherValue = 2;

      scope.$watchGroup([
        function(scope) {return scope.aValue;},
        function(scope) {return scope.anotherValue;}
      ], function(newValues, oldValues, scope) {
        gotNewValues = newValues;
        gotOldValues = oldValues;
      });

      scope.$digest();
      gotNewValues.should.be.exactly(gotOldValues);

      scope.anotherValue = 3;
      scope.$digest();
      gotNewValues.should.eql([1, 3]);
      gotOldValues.should.eql([1, 2]);
    });

    it('calls the listener once when the watch array is empty.', function() {
      var gotNewValues, gotOldValues;
      scope.$watchGroup([], function(newValues, oldValues, scope) {
        gotNewValues = newValues;
        gotOldValues = oldValues;
      });

      scope.$digest();
      gotNewValues.should.eql([]);
      gotOldValues.should.eql([]);
    });

    it('can be deregistered.', function() {
      var counter = 0;

      scope.aValue = 1;
      scope.anotherValue = 2;

      var destroyGroup = scope.$watchGroup([
        function(scope) {return scope.aValue;},
        function(scope) {return scope.anotherValue;}
      ], function(newValues, oldValues, scope) {
        counter++;
      });

      scope.$digest();
      scope.anotherValue = 3;
      destroyGroup();
      scope.$digest();

      counter.should.eql(1);

    });

    it('does not call the zero-watch listner when deregistered first.', function() {
      var counter = 0;

      var destroyGroup = scope.$watchGroup([], function(newValues, oldValues, scope) {
        counter++;
      });

      destroyGroup();
      scope.$digest();

      counter.should.eql(0);
    })
  });

  describe('inheritance', function() {

    it("inherits the parent's proterties.", function() {
      var parent = new Scope();

      parent.aValue = [1, 2, 3];
      var child = parent.$new();

      child.aValue.should.eql([1, 2, 3]);
    });

    it("does not cause a parent to inherit its properties.", function() {
      var parent = new Scope();
      var child = parent.$new();

      child.aValue = [1, 2, 3];
      should(parent.aValue).be.undefined();
    });

    it("inherits the parent's proterties whenever they are defined.", function() {
      var parent = new Scope();
      var child = parent.$new();

      parent.aValue = [1, 2, 3];

      child.aValue.should.eql([1, 2, 3]);
    });

    it("can manipulate a parent scope's property.", function() {
      var parent = new Scope();
      var child = parent.$new();

      parent.aValue = [1, 2, 3];
      child.aValue.push(4);

      child.aValue.should.eql([1, 2, 3, 4]);
      parent.aValue.should.eql([1, 2, 3, 4]);
    });

    it("can watch a property in the parent.", function() {
      var parent = new Scope();
      var child = parent.$new();

      parent.aValue = [1, 2, 3];
      child.counter = 0;

      child.$watch(
        function(scope) {return scope.aValue;},
        function(newValue, oldValue, scope) {
          scope.counter++;
        },
        true
      );

      child.$digest();
      child.counter.should.eql(1);

      parent.aValue.push(4);
      child.$digest();
      child.counter.should.eql(2);
    });

    it('can be nested at any depth', function() {
      var a = new Scope();
      var aa = a.$new();
      var aaa = aa.$new();
      var ab = a.$new();
      var abb = ab.$new();

      a.value = 1;

      aa.value.should.eql(1);
      aaa.value.should.eql(1);
      ab.value.should.eql(1);
      abb.value.should.eql(1);

      ab.anotherValue = 2;

      abb.anotherValue.should.eql(2);
      should(aa.anotherValue).be.undefined();
      should(aaa.anotherValue).be.undefined();
    });

    it("shadows a parent's property with the same name.", function() {
      var parent = new Scope();
      var child = parent.$new();

      parent.name = 'Joe';
      child.name = 'Jill';

      child.name.should.eql('Jill');
      parent.name.should.eql('Joe');
    });

    it("does not shadow members of parent scope's attributes.", function() {

      var parent = new Scope();
      var child = parent.$new();

      parent.user = {name: 'Joe'};
      child.user.name = 'Jill';

      child.user.name.should.eql('Jill');
      parent.user.name.should.eql('Jill');
    });

    it("does not digest its parent(s).", function() {
      var parent  = new Scope();
      var child = parent.$new();

      parent.aValue = 'abc';
      parent.$watch(
        function(scope) {return scope.aValue;},
        function(newValue, oldValue, scope) {
          scope.aValueWas = newValue;
        }
      );

      child.$digest();
      should(child.aValueWas).be.undefined();
    });

    it("keeps a record of its children.", function() {
      var parent = new Scope();
      var child1 = parent.$new();
      var child2 = parent.$new();
      var child2_1 = child2.$new();

      parent.$$children.length.should.eql(2);
      parent.$$children[0].should.exactly(child1);
      parent.$$children[1].should.exactly(child2);

      child1.$$children.length.should.eql(0);

      child2.$$children.length.should.eql(1);
      child2.$$children[0].should.exactly(child2_1)
    });

    it("digests its children", function() {

      var parent = new Scope();
      var child = parent.$new();

      parent.aValue = 'abc';
      child.$watch(
        function(scope) {return scope.aValue;},
        function(newValue, oldValue, scope) {
          scope.aValueWas = newValue;
        }
      );

        parent.$digest();
        child.aValueWas.should.eql('abc');

    });

    it('digests from root on $apply', function() {
      var parent = new Scope();
      var child = parent.$new();
      var child2 = child.$new();

      parent.aValue = 'abc';
      parent.counter = 0;
      parent.$watch(
        function(scope) {return scope.aValue;},
        function(newValue, oldValue, scope) {
          scope.counter++;
        }
      );

      child2.$apply(function(scope) {});
      parent.counter.should.eql(1);
    });

    it('schedules a digest from root on $evalAsync.', function(done) {
      var parent = new Scope();
      var child = parent.$new();
      var child2 = child.$new();

      parent.aValue = 'abc';
      parent.counter = 0;
      parent.$watch(
        function(scope) {return scope.aValue;},
        function(newValue, oldValue, scope) {
          scope.counter++;
        }
      );

      child2.$evalAsync(function(scope) {});
      setTimeout(function() {
        parent.counter.should.eql(1);
        done();
      }, 50);
    });

    it('does not have access to parent attributes when isolated.', function() {
      var parent = new Scope();
      var child = parent.$new(true);

      parent.aValue = 'abc';
      should(child.aValue).be.undefined();
    });

    it('cannot watch parent attributes when isolated.', function() {
      var parent = new Scope();
      var child = parent.$new(true);

      parent.aValue = 'abc';
      child.$watch(
        function(scope) {return scope.aValue;},
        function(newValue, oldValue, scope) {
          scope.aValueWas = newValue;
        }
      );
      child.$digest();
      should(child.aValueWas).be.undefined();
    });

    it('digests its isolated children.', function() {
      var parent = new Scope();
      var child = parent.$new(true);

      child.aValue = 'abc';
      child.$watch(
        function(scope) {return scope.aValue;},
        function(newValue, oldValue, scope) {
          scope.aValueWas = newValue;
        }
      );

      parent.$digest();
      child.aValueWas.should.eql('abc');
    });

    it('digests from root on $apply when isolated.', function() {
      var parent = new Scope();
      var child = parent.$new(true);
      var child2 = child.$new();

      parent.aValue = 'abc';
      parent.counter = 0;
      parent.$watch(
        function(scope) {return scope.aValue;},
        function(newValue, oldValue, scope) {
          scope.counter++;
        }
      );

      child2.$apply(function(scope) {});

      parent.counter.should.eql(1);
    });

    it('schedules a digest from root on $evalAsync when isolated.', function(done) {
      var parent = new Scope();
      var child = parent.$new(true);
      var child2 = child.$new();

      parent.aValue = 'abc';
      parent.counter = 0;
      parent.$watch(
        function(scope) {return scope.aValue;},
        function(newValue, oldValue, scope) {
          scope.counter++;
        }
      );

      child2.$evalAsync(function(scope) {});

      setTimeout(function() {
        parent.counter.should.eql(1);
        done();
      }, 50);
    });

    it("executes $evalAsync function on isolate scopes", function(done) {
      var parent = new Scope();
      var child = parent.$new(true);

      child.$evalAsync(function(scope) {
        scope.didEvalAsync = true;
      });

      setTimeout(function() {
        child.didEvalAsync.should.be.true();
        done();
      }, 50);
    });

    it("executes $$postDigest function on isolated scopes", function() {
      var parent = new Scope();
      var child = parent.$new(true);

      child.$$postDigest(function() {
        child.didPostDigest = true;
      });

      parent.$digest();

      child.didPostDigest.should.be.true();
    });

    it('can take some other scope as the parent.', function() {
      var prototypeParent = new Scope();
      var hierarchyParent = new Scope();

      var child = prototypeParent.$new(false, hierarchyParent);

      prototypeParent.a = 42;
      child.a.should.eql(42);

      child.counter = 0;
      child.$watch(function(scope) {
        scope.counter++;
      });

      prototypeParent.$digest();
      child.counter.should.eql(0);

      hierarchyParent.$digest();
      child.counter.should.eql(2);
    });

    it('is no longer digested when $destroy has been called.', function() {

      var parent  = new Scope();
      var child = parent.$new();

      child.aValue = [1, 2, 3];
      child.counter = 0;
      child.$watch(
        function(scope) {return scope.aValue;},
        function(newValue, oldValue, scope) {
          scope.counter++;
        },
        true
      );

      parent.$digest();
      child.counter.should.eql(1);

      child.aValue.push(4);
      parent.$digest();
      child.counter.should.eql(2);

      child.$destroy();
      child.aValue.push(5);
      parent.$digest();
      child.counter.should.eql(2);

    });

  });

  describe('$watchCollection', function() {

    var scope;

    beforeEach(function() {
      scope = new Scope();
    });

    it('works like a normal watch for non-collections', function() {
      var valueProvide;

      scope.aValue = 42;
      scope.counter = 0;

      scope.$watchCollection(
        function(scope) {return scope.aValue;},
        function(newValue, oldValue, scope) {
          valueProvide = newValue;
          scope.counter++;
        }
      );

      scope.$digest();
      scope.counter.should.eql(1);
      valueProvide.should.eql(scope.aValue);

      scope.aValue = 43;
      scope.$digest();
      scope.counter.should.eql(2);

      scope.$digest();
      scope.counter.should.eql(2);
    });

    it('works like a normal watch for NaNs.', function() {
      scope.aValue = 0/0;
      scope.counter = 0;

      scope.$watchCollection(
        function(scope) {return scope.aValue;},
        function(newValue, oldValue, scope) {
          scope.counter++;
        }
      );

      scope.$digest();
      scope.counter.should.eql(1);

      scope.$digest();
      scope.counter.should.eql(1);
    });
    
    it('notices when the value becomes an array', function() {
      scope.counter = 0;
      
      scope.$watchCollection(
        function (scope) { return scope.arr; },
        function (newValue, oldValue, scope) {
          scope.counter++;
        }
      );
      
      scope.$digest();
      scope.counter.should.eql(1);
      
      scope.arr = [1, 2, 3];
      scope.$digest();
      scope.counter.should.eql(2);
      
      scope.$digest();
      scope.counter.should.eql(2);
    });
    
    it("notices an item added to an array.", function() {
      scope.arr = [1, 2, 3];
      scope.counter = 0;
      
      scope.$watchCollection(
        function (scope) {
          return scope.arr;
        },
        function (newValue, oldValue, scope) {
          scope.counter++;
        }
      );
      
      scope.$digest();
      scope.counter.should.eql(1);
      
      scope.arr.push(4);
      scope.$digest();
      scope.counter.should.eql(2);
      
      scope.$digest();
      scope.counter.should.eql(2);
    });
    
    it('notices an item removed from an array.', function () {
      scope.arr = [1, 2, 3];
      scope.counter = 0;
      
      scope.$watchCollection(
        function (scope) {
          return scope.arr;
        },
        function (newValue, oldValue, scope) {
          scope.counter++;
        }
      );
      
      scope.$digest();
      scope.counter.should.eql(1);
      
      scope.arr.shift();
      scope.$digest();
      scope.counter.should.eql(2);
      
      scope.$digest();
      scope.counter.should.eql(2);
    });
    
    it('notices an item replaced in an array.', function () {
      scope.arr = [1, 2, 3];
      scope.counter = 0;
      
      scope.$watchCollection(
        function (scope) {
          return scope.arr;
        },
        function (newValue, oldValue, scope) {
          scope.counter++;
        }
      );
      
      scope.$digest();
      scope.counter.should.eql(1);
      
      scope.arr[1] = 42;
      scope.$digest();
      scope.counter.should.eql(2);
      
      scope.$digest();
      scope.counter.should.eql(2);
    });
        
    it('notices items reordered in an array.', function () {
      scope.arr = [2, 1, 3];
      scope.counter = 0;
      
      scope.$watchCollection(
        function (scope) {
          return scope.arr;
        },
        function (newValue, oldValue, scope) {
          scope.counter++;
        }
      );
      
      scope.$digest();
      scope.counter.should.eql(1);
      
      scope.arr.sort();
      scope.$digest();
      scope.counter.should.eql(2);
      
      scope.$digest();
      scope.counter.should.eql(2);
    });
    
    it('does not fail on NaNs in arrays.', function () {
      scope.arr = [2, NaN, 3];
      scope.counter = 0;
      
      scope.$watchCollection(
        function (scope) {
          return scope.arr;
        },
        function (newValue, oldValue, scope) {
          scope.counter++;
        }
      );
      
      scope.$digest();
      scope.counter.should.eql(1);
      
      scope.$digest();
      scope.counter.should.eql(1);
    });
    
    it('notices an item replaced in an arguments object.', function () {
      (function () {
        scope.arrayLike = arguments;
      })(1, 2, 3);
      scope.counter = 0;
      
      scope.$watchCollection(
        function (scope) {
          return scope.arrayLike;
        },
        function (newValue, oldValue, scope) {
          scope.counter++;
        }
      );
      
      scope.$digest();
      scope.counter.should.eql(1);
      
      scope.arrayLike[1] = 42;
      scope.$digest();
      scope.counter.should.eql(2);
      
      scope.$digest();
      scope.counter.should.eql(2);     
    });
    
    it('notices an item replaced in a  NodeList object.', function() {
      document.documentElement.appendChild(document.createElement('div'));
      scope.arrayLike = document.getElementsByTagName('div');
      
      scope.counter = 0;

      scope.$watchCollection(
        function (scope) {
          return scope.arrayLike;
        },
        function (newValue, oldValue, scope) {
          scope.counter++;
        }
      );
      
      scope.$digest();
      scope.counter.should.eql(1);
      
      document.documentElement.appendChild(document.createElement('div'));
      scope.$digest();
      scope.counter.should.eql(2);
      
      scope.$digest();
      scope.counter.should.eql(2);      
    });
    
    it('notices when value becomes an object.', function() {
      scope.counter = 0;
      scope.$watchCollection(
        function (scope) {
          return scope.obj;
        },
        function(newValue, oldValue, scope) {
          scope.counter++;
        }
      );
      
      scope.$digest();
      scope.counter.should.eql(1);
      
      scope.obj = {a: 1};
      scope.$digest();
      scope.counter.should.eql(2);
      
      scope.$digest();
      scope.counter.should.eql(2);
    });
    
    it('notices when an attribute is added to an object.', function() {
      scope.counter = 0;
      scope.obj = {a: 1};
      
      scope.$watchCollection(
        function (scope) {
          return scope.obj;
        },
        function(newValue, oldValue, scope) {
          scope.counter++;
        }
      );
      
      scope.$digest();
      scope.counter.should.eql(1);
      
      scope.obj.b = 2;
      scope.$digest();
      scope.counter.should.eql(2);
      
      scope.$digest();
      scope.counter.should.eql(2);      
    });
    
    it('notices when an attribute is changed in an object.', function() {
      scope.counter = 0;
      scope.obj = {a: 1};
      
      scope.$watchCollection(
        function (scope) {
          return scope.obj;
        },
        function(newValue, oldValue, scope) {
          scope.counter++;
        }
      );
      
      scope.$digest();
      scope.counter.should.eql(1);
      
      scope.obj.a = 2;
      scope.$digest();
      scope.counter.should.eql(2);
      
      scope.$digest();
      scope.counter.should.eql(2);      
    });    
     
    it('does not fail on NaN attributes in objects.', function() {
      scope.counter = 0;
      scope.obj = {a: NaN};
      
      scope.$watchCollection(
        function (scope) {
          return scope.obj;
        },
        function(newValue, oldValue, scope) {
          scope.counter++;
        }
      );
      
      scope.$digest();
      scope.counter.should.eql(1);
      
      scope.$digest();
      scope.counter.should.eql(1);      
    });     
    
    it('notices when an attribute is removed from an object.', function() {
      scope.counter = 0;
      scope.obj = {a: 1};
      
      scope.$watchCollection(
        function (scope) {
          return scope.obj;
        },
        function(newValue, oldValue, scope) {
          scope.counter++;
        }
      );
      
      scope.$digest();
      scope.counter.should.eql(1);
      
      delete scope.obj.a;
      scope.$digest();
      scope.counter.should.eql(2);
      
      scope.$digest();
      scope.counter.should.eql(2);      
    });  
    
    it('does not consider any object with a length property an array.', function() {
      scope.obj = {length: 42, otherKey: 'abc'};
      scope.counter = 0;
      
      scope.$watchCollection(
        function(scope) {return scope.obj;},
        function(newValue, oldValue, scope) {
          scope.counter++;
        }
      );
      
      scope.$digest();
      scope.obj.newKey = 'def';
      scope.$digest();
      
      scope.counter.should.eql(2);
    }); 
    
    it('gives the old non-collection value to listeners.', function() {
      scope.aValue = 42;
      var oldValueGiven;
      
      scope.$watchCollection(
        function(scope) {return scope.aValue;},
        function(newValue, oldValue, scope) {
          oldValueGiven = oldValue;
        }
      );
      
      scope.$digest();
      
      scope.aValue = 43;
      scope.$digest();
      
      oldValueGiven.should.eql(42);
      
    });
  
    it('gives the old array value to listeners.', function() {
      scope.aValue = [1, 2, 3];
      var oldValueGiven;
      
      scope.$watchCollection(
        function(scope) {return scope.aValue;},
        function(newValue, oldValue, scope) {
          oldValueGiven = oldValue;
        }
      );
      
      scope.$digest();
      
      scope.aValue.push(4);
      scope.$digest();
      
      oldValueGiven.should.eql([1, 2, 3]);
      
    });
  
    it('gives the old object value to listeners.', function() {
      scope.aValue = {a: 1, b: 2};
      var oldValueGiven;
      
      scope.$watchCollection(
        function(scope) {return scope.aValue;},
        function(newValue, oldValue, scope) {
          oldValueGiven = oldValue;
        }
      );
      
      scope.$digest();
      
      scope.aValue.c = 3;
      scope.$digest();
      
      oldValueGiven.should.eql({a: 1, b: 2});
      
    });
  });
  
  describe('Event', function () {
    
    var parent;
    var scope;
    var child;
    var isolatedChild;
    
    beforeEach(function () {
      parent = new Scope();
      scope = parent.$new();
      child = scope.$new();
      
      isolatedChild = scope.$new(true);
    });
    
    it('allows registering listeners.', function () {
      var listener1 = function() {};
      var listener2 = function() {};
      var listener3 = function() {};
      
      scope.$on('someEvent', listener1);
      scope.$on('someEvent', listener2);
      scope.$on('someOtherEvent', listener3);
      
      scope.$$listeners.should.eql({
        someEvent: [listener1, listener2],
        someOtherEvent: [listener3]
      });
    });
    
    it('registers different listeners for every scope.', function () {
      var listener1 = function() {};
      var listener2 = function() {};
      var listener3 = function() {};
      
      scope.$on('someEvent', listener1);
      child.$on('someEvent', listener2);
      isolatedChild.$on('someOtherEvent', listener3);
      
      scope.$$listeners.should.eql({ someEvent: [listener1] });
      child.$$listeners.should.eql({ someEvent: [listener2] });
      isolatedChild.$$listeners.should.eql({ someOtherEvent: [listener3] });
    });
    
    _.forEach(['$emit', '$broadcast'], function(method) {
      
      it('calls the listeners of the matching event on ' + method, function() {
        var listener1 = sinon.spy();
        var listener2 = sinon.spy();
        
        scope.$on('someEvent', listener1);
        scope.$on('someOtherEvent', listener2);
        
        scope[method]('someEvent');
        listener1.called.should.be.true();
        listener2.called.should.be.false();
        
      });
      
      it('passes an event object with a name to listeners on ' + method, function() {
        var listener = sinon.spy();
        scope.$on('someEvent', listener);
        
        scope[method]('someEvent');
        
        listener.called.should.be.true();
        listener.getCall(0).args[0].name.should.eql('someEvent');
      });
      
      it('passes the same event object to each listener on ' + method, function() {
        var listener1 = sinon.spy();
        var listener2 = sinon.spy();
        scope.$on('someEvent', listener1);
        scope.$on('someEvent', listener2);
        
        scope[method]('someEvent');
        
        listener1.args[0][0].should.be.exactly(listener2.args[0][0]);
      });
      
      it('passes additional arguments to listener on ' + method, function () {
        var listener = sinon.spy();
        scope.$on('someEvent', listener);
        
        scope[method]('someEvent', 'and', ['additional', 'arguments'], '...');
        
        listener.args[0][1].should.eql('and');
        listener.args[0][2].should.eql(['additional', 'arguments']);
        listener.args[0][3].should.eql('...');
      });
      
      it('returns the event object on '  + method, function() {
        var returnEvent = scope[method]('someEvent');
        
        returnEvent.should.not.be.undefined();
        returnEvent.name.should.eql('someEvent');
      });
      
      it('could be deregistered on ' + method, function() {
        var listener = sinon.spy();
        var deregistered = scope.$on('ss', listener);
        deregistered();
        scope[method]('ss');
        
        listener.called.should.be.false();
      });
      
      it('does not skip the next listener when removed on ' + method, function() {
        var deregistered;
        
        var listener = function() {
          deregistered();
        }
        var nextListener = sinon.spy();
        
        deregistered = scope.$on('someEvent', listener);
        scope.$on('someEvent', nextListener);
        
        scope[method]('someEvent');
        
        nextListener.called.should.be.true();
        
      });
      
    });
      
    it('propagates up the scope hierarchy on $emit', function () {
      var parentListener = sinon.spy();
      var scopeListener = sinon.spy();
      
      parent.$on('someEvent', parentListener);
      scope.$on('someEvent', scopeListener);
      
      scope.$emit('someEvent');
      
      parentListener.called.should.be.true();
      scopeListener.called.should.be.true();
    });
    
    it('propagates down the scope hierarchy on $boradcast', function() {
      var scopeListener = sinon.spy();
      var childListener = sinon.spy();
      var isolatedChildListener = sinon.spy();
      
      scope.$on('someEvent', scopeListener);
      child.$on('someEvent', childListener);
      isolatedChild.$on('someEvent', isolatedChildListener);
      
      scope.$broadcast('someEvent');
      
      scopeListener.called.should.be.true();
      childListener.called.should.be.true();
      isolatedChildListener.called.should.be.true();
      
    });
    
    it('attaches targetScope on $emit.', function () {
      var scopeListener = sinon.spy();
      var parentListener = sinon.spy();
      
      scope.$on('someEvent', parentListener);
      scope.$on('someEvent', scopeListener);
      
      scope.$emit('someEvent');
      
      parentListener.args[0][0].targetScope.should.equal(scope);
      scopeListener.args[0][0].targetScope.should.equal(scope);
    });
     
    it('attaches targetScope on $broadcast.', function () {
      var scopeListener = sinon.spy();
      var parentListener = sinon.spy();
      
      scope.$on('someEvent', parentListener);
      scope.$on('someEvent', scopeListener);
      
      scope.$broadcast('someEvent');
      
      parentListener.args[0][0].targetScope.should.equal(scope);
      scopeListener.args[0][0].targetScope.should.equal(scope);
    });

    
    it('attaches currentScope on $emit.', function () {
      var currentScopeOnScope, currentScopeOnParent;
      var scopeListener = function (event) {
        currentScopeOnScope = event.currentScope;
      };
      var parentListener = function (event) {
        currentScopeOnParent = event.currentScope;
      };
      
      parent.$on('someEvent', parentListener);
      scope.$on('someEvent', scopeListener);
      
      scope.$emit('someEvent');
      
      currentScopeOnScope.should.be.exactly(scope);
      currentScopeOnParent.should.be.exactly(parent);
    });
     
    it('attaches currentScope on $broadcast.', function () {
      var currentScopeOnScope, currentScopeOnChild;
      var scopeListener = function (event) {
        currentScopeOnScope = event.currentScope;
      };
      var childListener = function (event) {
        currentScopeOnChild = event.currentScope;
      };
      
      scope.$on('someEvent', scopeListener);
      child.$on('someEvent', childListener);
      
      scope.$broadcast('someEvent');
      
      currentScopeOnScope.should.be.exactly(scope);
      currentScopeOnChild.should.be.exactly(child);
    });       
  });

});
