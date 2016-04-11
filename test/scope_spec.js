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


      });
    });
  });
});
