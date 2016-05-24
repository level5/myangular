'use strict';

var sinon = require('sinon');
var _ = require('lodash');

var setModuleLoader = require('../src/loader');
var createInjector = require('../src/injector');
describe('injector', function() {

  beforeEach(function () {
    delete window.angular;
    setModuleLoader(window);
  });

  it('can be created', function () {
    var injector = createInjector([]);
    injector.should.be.Object();
  });
  
  it('has a constant that has been registered to a module', function() {
     var module = window.angular.module('myModule', []);
     module.constant('aConstant', 42);
     var injector = createInjector(['myModule']);
     injector.has('aConstant').should.be.true();
  });


  it('does not have a non-registered constant', function() {
     var module = window.angular.module('myModule', []);
     var injector = createInjector(['myModule']);
     injector.has('aConstant').should.be.false();
  });

  it('does not allow a constant called hasOwnProperty', function() {
    var module = window.angular.module('myModule', []);
    module.constant('hasOwnProperty', false);
    (function() {
      createInjector(['myModule']);
    }).should.throw();
  });


  it('can return a registered constant', function() {
     var module = window.angular.module('myModule', []);
     module.constant('aConstant', 42);
     var injector = createInjector(['myModule']);
     injector.get('aConstant').should.eql(42);
  });

  it('loads multiple module', function () {
    var module1 = window.angular.module('myModule', []);
    var module2 = window.angular.module('myOtherModule', []);
    module1.constant('aConstant', 42);
    module2.constant('anotherConstant', 43);

    var injector = createInjector(['myModule', 'myOtherModule']);
    injector.has('aConstant').should.be.true();
    injector.has('anotherConstant').should.be.true();
  });


  it('loads the required modules of a module.', function () {
    var module1 = window.angular.module('myModule', []);
    var module2 = window.angular.module('myOtherModule', ['myModule']);
    module1.constant('aConstant', 42);
    module2.constant('anotherConstant', 43);

    var injector = createInjector(['myOtherModule']);
    injector.has('aConstant').should.be.true();
    injector.has('anotherConstant').should.be.true();
  });

  it('loads the transitively required modules of a module', function () {
    var module1 = window.angular.module('myModule', []);
    var module2 = window.angular.module('myOtherModule', ['myModule']);
    var module3 = window.angular.module('myThirdModule', ['myOtherModule']);
    module1.constant('aConstant', 42);
    module2.constant('anotherConstant', 43);
    module3.constant('aThridConstant', 44);

    var injector = createInjector(['myThirdModule']);
    injector.has('aConstant').should.be.true();
    injector.has('anotherConstant').should.be.true();
    injector.has('aThridConstant').should.be.true();
  });

  it('loads each module only once', function () {
    window.angular.module('myModule', ['myOtherModule']);
    window.angular.module('myOtherModule', ['myModule']);

    createInjector(['myModule']);
  });

  it('invokes an annotated function with dependency injection.', function () {
    var module = window.angular.module('myModule', []);
    module.constant('a', 1);
    module.constant('b', 2);
    var injector = createInjector(['myModule']);

    var fn = function (one, two) { return one + two; }
    fn.$inject = ['a', 'b'];

    injector.invoke(fn).should.eql(3);
  });

  it('does not accept non-string as injection token', function() {
    var module = window.angular.module('myModule', []);
    module.constant('a', 1);
    var injector = createInjector(['myModule']);

    var fn = function(one, two) { return one + two;}
    fn.$inject = ['a', 2];

    (function() {
      injector.invoke(fn);
    }).should.throw();

  });

  it('invokes a function with the given this context', function () {
    var module = window.angular.module('myModule', []);
    module.constant('a', 1);
    var injector = createInjector(['myModule']);

    var obj = {
      two: 2,
      fn: function (one) {
        return one + this.two;
      }
    };
    obj.fn.$inject = ['a'];

    injector.invoke(obj.fn, obj).should.eql(3);
  });

  it('overrides dependencies with locals when invoking', function () {
    var module = window.angular.module('myModule', []);
    module.constant('a', 1);
    module.constant('b', 2);

    var injector = createInjector(['myModule']);

    var fn = function(one, two) { return one + two; };
    fn.$inject = ['a', 'b'];

    injector.invoke(fn, undefined, {b:3}).should.eql(4);
  });

  describe('annotate', function() {

    it('returns the $inject annotation of a function when it has one.', function() {
      var injector = createInjector([]);

      var fn = function() {};
      fn.$inject = ['a', 'b'];

      injector.annotate(fn).should.eql(['a', 'b']);
    });

    it('returns the array-style annotation of a function.', function() {
      var injector = createInjector([]);

      var fn = ['a', 'b', function() {}];

      injector.annotate(fn).should.eql(['a', 'b']);
    });

    it('returns an empty array for a non-annotated 0-arg function.', function() {

      var injector = createInjector([]);
      var fn = function() {};

      injector.annotate(fn).should.eql([]);
    });

    it('returns annotations parsed from function args when not annotated.', function() {
      var injector = createInjector([]);
      var fn = function(a, b) {};

      injector.annotate(fn).should.eql(['a', 'b']);
    });

    it('strips comments from argument list when parsing', function() {

      var injector = createInjector([]);

      var fn = function(a, /*b, */ c) {};

      injector.annotate(fn).should.eql(['a', 'c']);
    });

    it('strips several comments from argument lists when parsing.', function() {
      var injector = createInjector([]);
      var fn = function(a, /*b, */ c /*, d*/) {};
      injector.annotate(fn).should.eql(['a', 'c']);
    });

    it('strips // comments from argument lists when parsing.', function () {
      var injector = createInjector([]);
      var fn = function (a, //b,
                         c) { };

      injector.annotate(fn).should.eql(['a', 'c']);

    });

    it('strips surrounding underscores from argument names when parsing.', function () {
      var injector = createInjector([]);
      var fn = function(a, _b_, c_, _d, an_argument) {};

      injector.annotate(fn).should.eql(['a', 'b', 'c_', '_d', 'an_argument']);
    });

    it('throws when using a non-annotated fn in strict mode.', function () {
      var injector = createInjector([], true);
      var fn = function(a, b, c) {};

      (function() {
        injector.annotate(fn);
      }).should.throw();
    });

    it('invokes an array-annotated function with dependency injection', function () {
      var module = window.angular.module('myModule', []);
      module.constant('a', 1);
      module.constant('b', 2);
      var injector = createInjector(['myModule']);
      var fn = ['a', 'b', function (one, two) { return one + two;}];
      injector.invoke(fn).should.eql(3);
    });

    it('invokes a non-annotated function with dependency injection', function () {
      var module = window.angular.module('myModule', []);
      module.constant('a', 1);
      module.constant('b', 2);
      var injector = createInjector(['myModule']);

      var fn = function (a, b) {return a + b;};
      injector.invoke(fn).should.eql(3);
    });

    it('instantiates an annotated constructor function.', function() {
      var module = window.angular.module('myModule', []);
      module.constant('a', 1);
      module.constant('b', 2);
      var injector = createInjector(['myModule']);

      function Type(one, two) {
        this.result = one + two;
      }

      Type.$inject = ['a', 'b'];
      var instance = injector.instantiate(Type);
      instance.result.should.eql(3);
    });

    it('instantiates an array-constructed function.', function() {
      var module = window.angular.module('myModule', []);
      module.constant('a', 1);
      module.constant('b', 2);
      var injector = createInjector(['myModule']);

      function Type(one, two) {
        this.result = one + two;
      }

      var instance = injector.instantiate(['a', 'b', Type]);
      instance.result.should.eql(3);
    });


    it('instantiates a non-annotated constructor function.', function() {
      var module = window.angular.module('myModule', []);
      module.constant('a', 1);
      module.constant('b', 2);
      var injector = createInjector(['myModule']);

      function Type(a, b) {
        this.result = a + b;
      }

      var instance = injector.instantiate(Type);
      instance.result.should.eql(3);
    });

    it('uses the prototype of the constructor when instantiating', function () {
      function BaseType() {}
      BaseType.prototype.getValue = _.constant(42);

      function Type() { this.v = this.getValue(); }
      Type.prototype = BaseType.prototype;

      var module = window.angular.module('myModule', []);
      var injector = createInjector(['myModule']);

      var instance = injector.instantiate(Type);
    });

    it('supports locals when instantiating', function () {
      var module = window.angular.module('myModule', []);
      module.constant('a', 1);
      module.constant('b', 2);
      var injector = createInjector(['myModule']);

      function Type(a, b) {
        this.result = a + b;
      }

      var instance = injector.instantiate(Type, {b:3});
      instance.result.should.eql(4);
    });

    it('allows registering a provider and uses its $get', function () {
      var module = window.angular.module('myModule', []);
      module.provider('a', {
        $get: function () {
          return 42;
        }
      });

      var injector = createInjector(['myModule']);
      injector.has('a').should.be.true();
      injector.get('a').should.eql(42);
    });

    it('injects the $get method of a provider.', function() {
      var module = window.angular.module('myModule', []);
      module.constant('a', 1);
      module.provider('b', {
        $get: function(a) {
          return a + 2;
        }
      });

      var injector = createInjector(['myModule']);
      injector.get('b').should.eql(3);
    });

    it('injects the $get method of a provider lazily', function() {
      var module = window.angular.module('myModule', []);
      module.provider('b', {
        $get: function(a) {
          return a + 2;
        }
      });
      module.provider('a', { $get: _.constant(1) });
      var injector = createInjector(['myModule']);

      injector.get('b').should.eql(3);
    });

    it('instantiates a dependency only once.', function () {
      var module = window.angular.module('myModule', []);
      module.provider('a', { $get: function() {return {};} });

      var injector = createInjector(['myModule']);

      injector.get('a').should.be.exactly(injector.get('a'));
    });

    it('notifies the user about a circular dependency', function () {
      var module = window.angular.module('myModule', []);
      module.provider('a', { $get: function(b) {} });
      module.provider('b', { $get: function(c) {} });
      module.provider('c', { $get: function(a) {} });

      var injector = createInjector(['myModule']);
      (function() {
        injector.get('a');
      }).should.throw(/Circular dependency found/);
    });

    it('cleans up the circular marker when instantiation fails.', function() {
      var module = window.angular.module('myModule', []);
      module.provider('a', { $get: function() {
        throw new Error('Failing instantiation!');
      }});

      var injector = createInjector(['myModule']);

      (function() {
        injector.get('a');
      }).should.throw('Failing instantiation!');

      (function() {
        injector.get('a');
      }).should.throw('Failing instantiation!');

    });

    it('notifies the user about a circular dependency', function () {
      var module = window.angular.module('myModule', []);
      module.provider('a', { $get: function(b) {} });
      module.provider('b', { $get: function(c) {} });
      module.provider('c', { $get: function(a) {} });

      var injector = createInjector(['myModule']);
      (function() {
        injector.get('a');
      }).should.throw('Circular dependency found: a <- c <- b <- a');
    });

    it('instantiates a provider if given as a constructor function.', function () {
      var module = window.angular.module('myModule', []);

      module.provider('a', function AProvider() {
        this.$get = function () {return 42;};
      })

      var injector = createInjector(['myModule']);
      injector.get('a').should.eql(42);
    });

    it('injects the given provider constructor function.', function () {
      var module = window.angular.module('myModule', []);

      module.constant('b', 2);
      module.provider('a', function AProvider(b) {
        this.$get = function () {return 1 + b};
      })

      var injector = createInjector(['myModule']);
      injector.get('a').should.eql(3);
    });

    it('injects another provider to a provider constructor function', function () {
      var module = window.angular.module('myModule', []);

      module.provider('a', function AProvider() {
        var value = 1;
        this.setValue = function(v) { value = v;};
        this.$get = function() {return value;};
      });

      module.provider('b', function BProvider(aProvider) {
        aProvider.setValue(2);
        this.$get = function () {};
      });

      var injector = createInjector(['myModule']);
      injector.get('a').should.eql(2);

    });

    it('does not inject an instance to a provider constructor function', function () {

      var module = window.angular.module('myModule', []);

      module.provider('a', function AProvider() {
        this.$get = function() {return 1;};
      });

      module.provider('b', function BProvider(a) {
        this.$get = function() {return a;};
      });

      (function () {
        createInjector(['myModule']);
      }).should.throw();

    });

    it('does not inject a provider to a $get function.', function () {

      var module = window.angular.module('myModule', []);

      module.provider('a', function AProvider() {
        this.$get = function() {return 1;};
      });

       module.provider('b', function BProvider() {
        this.$get = function(aProvider) {return aProvider.$get();};
      });

      createInjector(['myModule']);
      (function () {
        injector.get('b');
      }).should.throw();
    });

    it('does not inject a provider to invoke', function () {
      var module = window.angular.module('myModule', []);
      module.provider('a', function AProvider() {
        this.$get = function() {return 1;};
      });
      var injector = createInjector(['myModule']);
      (function () {
        injector.invoke(function(aProvider) {});
      }).should.throw();
    });

    it('does not give access to provider through get', function () {
      var module = window.angular.module('myModule', []);
      module.provider('a', function AProvider() {
        this.$get = function() {return 1;};
      });
      var injector = createInjector(['myModule']);
      (function () {
        injector.get('aProvider');
      }).should.throw();
    });

    it('registers constans first to make them avaliable to providers', function() {
      var module = window.angular.module('myModule', []);

      module.provider('a', function AProvider(b) {
        this.$get = function() {return b;};
      });

      module.constant('b', 42);

      var injector = createInjector(['myModule']);
      injector.get('a').should.eql(42);
    });
  });


  it('allows injecting the instance injector to $get', function() {

    var module = window.angular.module('myModule', []);
    module.constant('a', 42);
    module.provider('b', function BProvider() {
      this.$get = function ($injector) {
        return $injector.get('a');
      };
    });

    var injector = createInjector(['myModule']);

    injector.get('b').should.eql(42);
  });

  it('allows injecting the provider injector to provider.', function() {

    var module = window.angular.module('myModule', []);
    module.provider('a', function AProvider() {
      this.value = 42;
      this.$get = function() {return this.value;};
    });
    module.provider('b', function BProvider($injector) {
      var aProvider = $injector.get('aProvider');
      this.$get = function() {
        return aProvider.value;
      }
    });

    var injector = createInjector(['myModule']);
    injector.get('b').should.eql(42);
  });

  it('allows injecting the $provider service to providers', function () {
    var module = window.angular.module('myModule', []);

    module.provider('a', function AProvider($provide) {
      $provide.constant('b', 2);
      this.$get = function(b) { return 1 + b;};
    });

    var injector = createInjector(['myModule']);
    injector.get('a').should.eql(3);
  });

  it('does not allow injecting the $provider service to $get', function () {
    var module = window.angular.module('myModule', []);

    module.provider('a', function AProvider() {
      this.$get = function($provide) {};
    });

    var injector = createInjector(['myModule']);
    (function () {
      injector.get('a');
    }).should.throw();
  });

  it('runs config blocks when the injector is created.', function() {
    var module = window.angular.module('myModule', []);

    var hasRun = false;
    module.config(function() {
      hasRun = true;
    });

    createInjector(['myModule']);
    hasRun.should.be.true();
  });

  it('inject config blocks with provider injector', function() {
    var module = window.angular.module('myModule', []);
    module.config(function($provide) {
      $provide.constant('a', 42);
    });

    var injector = createInjector(['myModule']);
    injector.get('a').should.eql(42);
  });

  it('allows registering config block before providers', function () {
    var module = window.angular.module('myModule', []);

    module.config(function(aProvider) { });
    module.provider('a', function () {
      this.$get = _.constant(42);
    });

    var injector = createInjector(['myModule']);
    injector.get('a').should.eql(42);

  });

  it('runs a config block added during module registration', function() {
    var module = window.angular.module('myModule', [], function($provide) {
      $provide.constant('a', 42);
    });

    var injector = createInjector(['myModule']);
    injector.get('a').should.eql(42);
  });

  it('runs run blocks when the injector is created.', function () {
    var module = window.angular.module('myModule', []);

    var hasRun = false;
    module.run(function () {
      hasRun = true;
    });

    createInjector(['myModule']);
    hasRun.should.be.true();
  });

  it('injects run blocks with the instance injector.', function () {
    var module = window.angular.module('myModule', []);

    module.provider('a', {$get: _.constant(42)});

    var gotA;
    module.run(function(a) {
      gotA = a;
    });

    createInjector(['myModule']);
    gotA.should.eql(42);
  });

  it('configures all modules before running any run blocks', function() {
    var module1 = window.angular.module('myModule', []);
    module1.provider('a',  { $get: _.constant(42) });
    var result;
    module1.run(function(a, b) {
      result = a + b;
    });

    var module2 = window.angular.module('myOtherModule', []);
    module2.provider('b',  { $get: _.constant(2) });

    createInjector(['myModule', 'myOtherModule']);

    result.should.eql(44);
  });

  it('runs a function module dependency as a config block.', function() {
    var functionModule = function($provide) {
      $provide.constant('a', 43);
    };
    window.angular.module('myModule', [functionModule]);

    var injector = createInjector(['myModule']);

    injector.get('a').should.eql(43);

  });

  it('runs a function module with array injection as a config block', function() {
    var functionModule = ['$provide', function($provide) {
      $provide.constant('a', 42);
    }];
    window.angular.module('myModule', [functionModule]);

    var injector = createInjector(['myModule']);

    injector.get('a').should.eql(42);

  });

  it('supports returning a run block from a function module.', function () {
    var result;
    var functionModule = function($provide) {
      $provide.constant('a', 42);
      return function(a) {
        result = a;
      };
    };
    window.angular.module('myModule', [functionModule]);

    var injector = createInjector(['myModule']);

    result.should.eql(42);

  });

  it('only loads function modules once', function() {
    var loadedTimes = 0;
    var functionModule = function() {
      loadedTimes++;
    };

    window.angular.module('myModule', [functionModule, functionModule]);
    createInjector(['myModule']);
    loadedTimes.should.eql(1);
  });

  it('allows registering a factory', function () {
    var module = window.angular.module('myModule', []);
    module.factory('a', function() { return 42; });
    var injector = createInjector(['myModule']);
    injector.get('a').should.eql(42);
  });

  it('injects a factory function with instances', function () {
    var module = window.angular.module('myModule', []);

    module.factory('a', function() {return 1;});
    module.factory('b', function (a) { return a + 2;});

    var injector = createInjector(['myModule']);
    injector.get('b').should.eql(3);
  });

  it('only calls a factory function once.', function () {
    var module = window.angular.module('myModule', []);
    module.factory('a', function() { return {}; });

    var injector = createInjector(['myModule']);
    injector.get('a').should.eql(injector.get('a'));
  });

  it('forces a factory to return a value.', function () {
    var module = window.angular.module('myModule', []);

    module.factory('a', function () {});
    module.factory('b', function () {return null;});

    var injector = createInjector(['myModule']);

    (function () {
      injector.get('a');
    }).should.throw();

    should(injector.get('b')).be.null();

  });

  it('allows registering a vlaue.', function () {
    var module = window.angular.module('myModule', []);
    module.value('a', 42);
    var injector = createInjector(['myModule']);
    injector.get('a').should.eql(42);
  });

  it('does not make values avaliable to config blocks', function () {
    var module = window.angular.module('myModule', []);

    module.value('a', 42);
    module.config(function(a){});

    (function() {
      createInjector(['myModule']);
    }).should.throw();
  });

  it('allows an undefined value.', function () {
    var module = window.angular.module('myModule', []);

    module.value('a', undefined);

    var injector = createInjector(['myModule']);

    should(injector.get('a')).be.undefined();
  });

  it('allows registering a service.', function () {
    var module = window.angular.module('myModule', []);

    module.service('aService', function MyService() {
      this.getValue = function () { return 42; };
    });

    var injector = createInjector(['myModule']);
    injector.get('aService').getValue().should.eql(42);
  });

  it('injects service constructors with instance', function () {
    var module = window.angular.module('myModule', []);

    module.value('theValue', 42);
    module.service('aService', function MyService(theValue) {
      this.getValue = function() {return theValue;};
    });

    var injector = createInjector(['myModule']);

    injector.get('aService').getValue().should.eql(42);
  });

  it('only instantiates services once.', function () {
    var module = window.angular.module('myModule', []);
    module.service('aService', function MyService() {
    });

    var injector = createInjector(['myModule']);
    injector.get('aService').should.be.exactly(injector.get('aService'));
  });

  it('allows changing an instance using a decorator', function () {
    var module = window.angular.module('myModule', []);
    module.factory('aValue', function() {
      return {aKey: 42};
    });
    module.decorator('aValue', function($delegate) {
      $delegate.decoratedKey = 43;
    });

    var injector = createInjector(['myModule']);
    injector.get('aValue').aKey.should.eql(42);
    injector.get('aValue').decoratedKey.should.eql(43);

  });

  it('allows multiple decorators per service', function () {
    var module = window.angular.module('myModule', []);

    module.factory('aValue', function() {
      return {};
    });

    module.decorator('aValue', function ($delegate) {
      $delegate.decoratedKey = 42;
    });


    module.decorator('aValue', function ($delegate) {
      $delegate.otherDecoratedKey = 43;
    });

    var injector = createInjector(['myModule']);
    injector.get('aValue').decoratedKey.should.eql(42);
    injector.get('aValue').otherDecoratedKey.should.eql(43);
  });

  it('uses dependency injection with decorators', function () {
    var module = window.angular.module('myModule', []);

    module.factory('aValue', function() {
      return {};
    });
    module.constant('a', 42);
    module.decorator('aValue', function (a, $delegate) {
      $delegate.decoratedKey = a;
    });

    var injector = createInjector(['myModule']);
    injector.get('aValue').decoratedKey.should.eql(42);

  });

});
