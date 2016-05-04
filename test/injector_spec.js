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
    
  });
  
});