'use strict';

var sinon = require('sinon');
var _ = require('lodash');

var publishExternalAPI = require('../src/angular_public');
var createInjector = require('../src/injector');

describe('parse', function() {

  var parse;

  beforeEach(function() {
    publishExternalAPI();
    parse = createInjector(['ng']).get('$parse');
  });

  it('can parse an integer.', function() {
    var fn = parse('42');
    fn().should.equal(42);
  });

  it('can parse a floating point number.', function() {
    var fn = parse('4.2');
    fn().should.equal(4.2);
  });

  it('can parse a floating point number without an integer part.', function() {
    var fn = parse('.42');
    fn().should.equal(0.42);
  });

  it('can parse a number in scientific notiation.', function() {
    var fn = parse('42e3');
    fn().should.equal(42000);
  });

  it('can parse scientific notation with a float coefficient.', function() {
    var fn = parse('.42e2');
    fn().should.equal(42);
  });

  it('can parse scientific notation with negative exponents.', function() {
    var fn = parse('4200e-2');
    fn().should.equal(42);
  });

  it('can parse scientific notaton with the + sign.', function() {
    var fn = parse('.42e+2');
    fn().should.equal(42);
  });

  it('can parse upper case scientific notation.', function() {
    var fn = parse('.42E2');
    fn().should.equal(42);
  });

  it('will not parse invalid scientific notation.', function() {
    (function() { parse('42e-'); }).should.throw();
    (function() { parse('42e+'); }).should.throw();
  });

  it('can parse a string in single quotes.', function() {
    var fn = parse("'abc'");
    console.log('fn:', fn.toString());
    fn().should.equal('abc');
  });

  it('can parse a string in double quotes.', function() {
    var fn = parse('"abc"');
    fn().should.equal('abc');
  });

  it('will not parse a string with mismacthing quotes.', function() {
    (function() { parse('"abc\''); }).should.throw();
  });

  it('can parse a string with single quote inside.', function () {
    var fn = parse("'a\\\'b'");
    fn().should.equal('a\'b');
  });

  it('can parse a string with double quotes inside.', function() {
    var fn = parse('"a\\\"b"');
    fn().should.equal('a\"b');
  });

  it('will parse a string with unicode escape.', function() {
    var fn = parse('"\\u00A0"');
    fn().should.equal('\u00A0');
  });

  it('will not parse a string with invalid unicode escapes.', function() {
    (function() { parse('\\u00T0'); }).should.throw();
  });

  it('will parse null.', function() {
    var fn = parse('null');
    should(fn()).be.null();
  });

  it('will parse true.', function () {
    var fn = parse('true');
    fn().should.be.true();
  });

  it('will parse false.', function () {
    var fn = parse('false');
    fn().should.be.false();
  });

  it('ignores whitespace.', function() {
    var fn = parse('\n42 ');
    fn().should.equal(42);
  });

  it('will parse an empty array.', function() {
    var fn = parse('[]');
    fn().should.eql([]);
  });

  it('will parse a non-empty array.', function() {
    var fn = parse('[1, "two", [3], true]');
    fn().should.eql([1, "two", [3], true]);
  });

  it('will parse an array with trailing commas.', function () {
    var fn = parse('[1, 2, 3, ]');
    fn().should.eql([1, 2, 3]);
  });

  it('will parse an empty object.', function() {
    var fn = parse('{}');
    fn().should.eql({});
  });

  it('will parse a non-empty object.', function() {
    var fn = parse('{"a key": 1, "another-key": 2}');
    fn().should.eql({"a key": 1, "another-key": 2});
  });

  it('will parse an object with identifier keys.', function() {
    var fn = parse('{a: 1, b: [2, 3], c: {d: 4}}');
    fn().should.eql({a: 1, b: [2, 3], c: {d: 4}});
  });

  it('looks up an attribute from the scope.', function() {
    var fn = parse('aKey');
    fn({aKey: 42}).should.eql(42);
    should(fn({})).be.undefined();
  });

  it('returns undefined when looking up attribute from undefined', function() {
    var fn = parse('aKey');
    should(fn()).be.undefined();
  });

  it('will parse this.', function () {
    var fn = parse('this');
    var scope = {};
    fn(scope).should.be.exactly(scope);
    should(fn()).be.undefined();
  });

  it('looks up a 2-part identifier path from the scope.', function() {
    var fn = parse('aKey.anotherKey');
    should(fn({aKey: {anotherKey: 42}})).eql(42);
    should(fn({aKey: {}})).be.undefined();
    should(fn({})).be.undefined();
  });

  it('looks up a member from an object.', function() {
    var fn = parse('{aKey: 42}.aKey');
    fn().should.eql(42);
  });

  it('looks up a 4-part identifier path from the scope.', function () {
    var fn = parse('aKey.secondKey.thirdKey.fourthKey');
    should(fn({aKey: {secondKey: {thirdKey: {fourthKey: 42}}}})).eql(42);
    should(fn({aKey: {secondKey: {thirdKey: {}}}})).be.undefined();
    should(fn({aKey: {}})).be.undefined();
    should(fn()).be.undefined();
  });

  it('uses local instead of scope when there is a matching key.', function() {
    var fn = parse('aKey');
    var scope = {aKey: 42};
    var locals = {aKey: 43};

    fn(scope, locals).should.eql(43);
  });

  it('does not use locals instead of scope when no matching key.', function() {
    var fn = parse('aKey');
    var scope = {aKey: 42};
    var locals = {otherKey: 43};

    fn(scope, locals).should.eql(42);
  });

  it('uses locals instead of scope when the first part matches.', function() {
    var fn = parse('aKey.anotherKey');
    var scope = {akey: {anotherKey: 42}};
    var locals = {akey: {}};

    should(fn(scope, locals)).be.undefined();
  });

  it('parses a simple computed property access.', function() {
    var fn = parse('aKey["anotherKey"]');
    fn({aKey: {anotherKey: 42}}).should.eql(42);
  });

  it('parses a computed numeric array access.', function() {
    var fn = parse('anArray[1]');
    fn({anArray: [1,2,3]}).should.eql(2);
  });

  it('parses a computed access with another key as property.', function() {
    var fn = parse('lock[key]');
    fn({key: 'theKey', lock: {theKey: 42}}).should.eql(42);
  });

  it('parses computed access with another access as property.', function() {
    var fn = parse('lock[keys["aKey"]]');
    fn({keys: {aKey: 'theKey'}, lock: {theKey: 42}}).should.eql(42);
  });

  it('parses a function call.', function() {
    var fn = parse('aFunction()');
    fn({aFunction: function() {return 42;}}).should.eql(42);
  });

  it('parses a function call with a single number argument.', function() {
    var fn = parse('aFunction(42)');
    fn({aFunction: function(n) {return n;}}).should.eql(42);
  });

  it('parses a function call with a single identifier argument.', function() {
    var fn = parse('aFunction(n)');
    fn({n: 42, aFunction: function(n) {return n;}}).should.eql(42);
  });

  it('parses a function call with a single function call arugment.', function() {
    var fn = parse('aFunction(argFn())');
    fn({
      argFn: _.constant(42),
      aFunction: function (arg) {return arg; }
    }).should.eql(42);
  });

  it('parses a function call with multiple arguments.', function() {
    var fn = parse('aFunction(37, n, argFn())');
    fn({
      n: 3,
      argFn: _.constant(2),
      aFunction: function (a1, a2, a3) { return a1 + a2 + a3; }
    }).should.eql(42);
  });

  it('calls methods accessed as computed properties.', function () {
    var scope = {
      anObject: {
        aMember: 42,
        aFunction: function() {
          return this.aMember;
        }
      }
    };
    var fn = parse('anObject["aFunction"]()');
    fn(scope).should.eql(42);
  });

  it('calls method access as non-computed properties.', function() {
    var scope = {
      anObject: {
        aMember: 42,
        aFunction: function() {
          return this.aMember;
        }
      }
    };
    var fn = parse('anObject.aFunction()');
    fn(scope).should.eql(42);
  });

  it('binds bare functions to the scope.', function() {
    var scope = {
      aFunction: function() {
        return this;
      }
    };

    var fn = parse('aFunction()');
    fn(scope).should.be.exactly(scope);
  });

  it('binds bare functions on locals to the locals.', function() {
    var scope = {};
    var locals = {
      aFunction: function() {
        return this;
      }
    };
    var fn = parse('aFunction()');
    fn(scope, locals).should.be.exactly(locals);
  });

  it('parses a simple attribute assignment.', function() {
    var fn = parse('anAttribute = 42');
    var scope = {};
    fn(scope);
    scope.anAttribute.should.eql(42);
  });

  it('can assign any primary expression.', function() {
    var fn = parse('anAttribute = aFunction()');
    var scope = {aFunction: _.constant(42)};
    fn(scope);
    scope.anAttribute.should.eql(42);
  });

  it('can assign a computed object property.', function() {
    var fn = parse('anObject["anAttribute"] = 42');
    var scope = {anObject: {}};
    fn(scope);
    scope.anObject.anAttribute.should.eql(42);
  });

  it('can assign a nested object property.', function() {
    var fn = parse('anArray[0].anAttribute = 42');
    var scope = {anArray: [{}]};
    fn(scope);
    scope.anArray[0].anAttribute.should.eql(42);
  });

  it('creates the objects in the assignment path that do not exist.', function() {
    var fn = parse('some["nested"].property.path = 42');
    var scope = {};
    fn(scope);
    scope.some.nested.property.path.should.eql(42);
  });

  it('does not allow calling the function constructor.', function() {
    (function() {
      var fn = parse('aFunction.constructor("return window;")');
      fn({aFunction: function () {}});
    }).should.throw();
  });

  it('does not allow calling __proto__', function () {
    (function() {
      var fn = parse('obj.__proto__');
      fn({obj: {}});
    }).should.throw();
  });

  it('does not allow calling __defineGetter__', function () {
    (function() {
      var fn = parse('obj.__defineGetter__("evil", fn)');
      fn({obj: {}, fn: function() {}});
    }).should.throw();
  });

  it('does not allow calling __defineSetter__', function () {
    (function() {
      var fn = parse('obj.__defineSetter__("evil", fn)');
      fn({obj: {}, fn: function() {}});
    }).should.throw();
  });

  it('does not allow calling __lookupGetter__', function () {
    (function() {
      var fn = parse('obj.__lookupGetter__("evil")');
      fn({obj: {}});
    }).should.throw();
  });

  it('does not allow calling __lookupSetter__', function () {
    (function() {
      var fn = parse('obj.__lookupSetter__("evil")');
      fn({obj: {}});
    }).should.throw();
  });

  it('does not allow accessing window as computed property.', function () {
    (function() {
      var fn = parse('anObject["wnd"]');
      fn({anObject: {wnd: window}});
    }).should.throw();
  });

  it('does not allow accessing window as non-computed property.', function () {
    (function() {
      var fn = parse('anObject.wnd');
      fn({anObject: {wnd: window}});
    }).should.throw();
  });

  it('does not allow passing window as function argument.', function () {
    (function() {
      var fn = parse('aFunction(wnd)');
      fn({aFunction: function() {}, wnd: window});
    }).should.throw();
  });

  it('does not allow calling methods on window.', function() {
    (function () {
      var fn = parse('wnd.scrollTo(0)');
      fn({wnd: window});
    }).should.throw();
  });

  it('does not allow functions to return window.', function () {
    (function() {
      var fn = parse('getWnd()');
      fn({getWnd: _.constant(window)});
    }).should.throw();
  });

  it('does not allow assigning window.', function () {
    (function() {
      var fn = parse('wnd = anObject');
      fn({anObject: window});
    }).should.throw();
  });

  it('does not allow referenceing window.', function () {
    (function() {
      var fn = parse('wnd');
      fn({wnd:window});
    }).should.throw();
  });

  it('does not allow calling functions on DOM elements.', function() {
    (function () {
      var fn = parse('el.setAttribute("evil", "true")');
      fn({el: document.documentElement});
    }).should.throw();
  });

  it('does not allow calling the aliased function constructor.', function () {
    (function () {
      var fn = parse('fnConstructor("return window;")');
      fn({fnConstructor:(function() {}).constructor});
    }).should.throw();
  });

  it('does not allow calling function on Object.', function() {
    (function() {
      var fn = parse('obj.create({})');
      fn({obj: Object});
    }).should.throw();
  });

  if ('does not allow calling call.', function() {
    (function() {
      var fn = parse('fun.call(obj)');
      fn({fun: function() {}, obj: {}});
    }).should.throw();
  });

  if ('does not allow calling apply.', function() {
    (function() {
      var fn = parse('fun.apply(obj)');
      fn({fun: function() {}, obj: {}});
    }).should.throw();
  });

  it('parses a unary +', function() {
    parse('+42')().should.eql(42);
    parse('+a')({a: 42}).should.eql(42);
  });

  it('replaces undefined with zero for unary +.', function() {
    parse('+a')({}).should.eql(0);
  });

  it('parses a unary !', function () {
    parse('!true')().should.be.false();
    parse('!42')().should.be.false();
    parse('!a')({a: false}).should.be.true();
    parse('!!a')({a: false}).should.be.false();
  });

  it('parses a unary -', function() {
    parse('-42')().should.eql(-42);
    parse('-a')({a: -42}).should.eql(42);
    parse('--a')({a: -42}).should.eql(-42);
    parse('-a')({}).should.equal(0);
  });

  it('parses a ! in a string.', function() {
    parse('"!"')().should.eql('!');
  });

  it('parses a multiplication.', function() {
    parse('21*2')().should.eql(42);
  });

  it('parses a division.', function() {
    parse('84 / 2')().should.eql(42);
  });

  it('parses a remainder.', function() {
    parse('85 % 43')().should.eql(42);
  });

  it('parses several multiplicatives.', function () {
    parse('36 * 2 % 5')().should.eql(2);
  });

  it('parses an addition.', function() {
    parse('20 + 22')().should.eql(42);
  });

  it('parses a subtraction.', function () {
    parse('42 - 22')().should.eql(20);
  });

  it('parses multiplicatives on a higher precedence than additives.', function() {
    parse('2 + 3 * 5')().should.eql(17);
    parse('2 + 3 * 2 + 3')().should.eql(11);
  });

  it('substitues undefined with zero in addition.', function() {
    parse('a + 22')().should.eql(22);
    parse('42 + a')().should.eql(42);
  });

  it('substitues undefined with zero in subtraction.', function() {
    parse('a - 22')().should.eql(-22);
    parse('42 - a')().should.eql(42);
  });

  it('parses relational operators.', function () {
    parse('1 < 2')().should.be.true();
    parse('1 > 2')().should.be.false();
    parse('2 <= 1')().should.be.false();
    parse('1 <= 2')().should.be.true();
    parse('2 <= 2')().should.be.true();
    parse('1 >= 2')().should.be.false();
    parse('2 >= 2')().should.be.true();
    parse('2 >= 1')().should.be.true();
  });

  it('parses equality operators.', function() {
    parse('42 == 42')().should.be.true();
    parse('42 == "42"')().should.be.true();
    parse('42 != 42')().should.be.false();

    parse('42 === 42')().should.be.true();
    parse('42 === "42"')().should.be.false();
    parse('42 !== 42')().should.be.false();
  });

  it('parses relationals on a higher precedence than equality.', function() {
    parse('2 == "2" > 2 === "2"')().should.be.false();
  });

  it('parses additives on a higher precedence than relationals.', function() {
    parse('2 + 3 < 6 - 2')().should.be.false();
  });

  it('parses logical AND', function () {
    parse('true && true')().should.be.true();
    parse('true && false')().should.be.false();
  });

  it('parses logical OR', function () {
    parse('true || true')().should.be.true();
    parse('true || false')().should.be.true();
    parse('false || false')().should.be.false();
  });

  it('parses multiple ANDs', function () {
    parse('true && true && true')().should.be.true();
    parse('true && true && false')().should.be.false();
  });

  it('parse multiple ORs', function () {
    parse('true || true || true')().should.be.true();
    parse('true || true || false')().should.be.true();
    parse('false || false || true')().should.be.true();
    parse('false || false || false')().should.be.false();
  });

  it('short-circuits AND', function () {
    var invoked;
    var scope = {fn: function () {
      invoked = true;
    }};

    parse('false && fn()')(scope);

    should(invoked).be.undefined();
  });

  it('short-circuits OR', function () {
    var invoked;
    var scope = {fn: function () {
      invoked = true;
    }};

    parse('true || fn()')(scope);

    should(invoked).be.undefined();
  });

  it('parses AND with a higher precedence than OR', function() {
    parse('false && true || true')().should.be.true();
  });

  it('parses OR with a lower precedence than equality.', function() {
    parse('1 === 2 || 2 === 2')().should.be.true();
  });

  it('parses the ternary expression.', function() {
    parse('a === 42 ? true : false')({a: 42}).should.be.true();
    parse('a === 42 ? true : false')({a: 43}).should.be.false();
  });

  it('parses OR with a higher precedence than ternary', function() {
    parse(' 0 || 1 ? 0 || 2 : 0 || 3')().should.eql(2);
  });

  it('parse nested ternaries', function() {

    parse('a === 42 ? b === 42 ? "a and b" : "a" : c === 42 ? "c" : "none"')({
      a: 44,
      b: 43,
      c: 42
    }).should.eql('c');

  });

  it('parses parentheses altering precedence order', function () {
    parse('21 * (3 - 1)')().should.eql(42);
    parse('false && (true || true)')().should.be.false();
    parse('-((a % 2) === 0 ? 1 : 2)')({a : 42}).should.eql(-1);
  });

  it('parses serveral statements', function() {
    var fn = parse('a = 1; b = 2; c = 3');
    var scope = {};
    fn(scope);
    scope.should.eql({
      a: 1,
      b: 2,
      c: 3
    });
  });

  it('returns the value of the last statment', function() {
    parse('a = 1; b = 2; a + b')({}).should.eql(3);
  });

  it('can parse filter expressions', function() {
    parse = createInjector(['ng', function($filterProvider) {
      $filterProvider.register('upcase', function () {
        return function (str) {
          return str.toUpperCase();
        };
      });
    }]).get('$parse');

    var fn = parse('aString | upcase');
    fn({aString: 'Hello'}).should.eql('HELLO');
  });

  it('can parse filter chain expression.', function() {
    parse = createInjector(['ng', function($filterProvider) {
      $filterProvider.register('upcase', function() {
        return function(s) {
          return s.toUpperCase();
        };
      });
      $filterProvider.register('exclamate', function() {
        return function(s) {
          return s + '!';
        };
      });
    }]).get('$parse');


    var fn = parse('"hello" | upcase | exclamate');
    fn().should.eql('HELLO!');
  });

  it('can parse an additional arugment to filter', function() {
    parse = createInjector(['ng', function($filterProvider) {
      $filterProvider.register('repeat', function() {
        return function (s, times) {
          return _.repeat(s, times);
        };
      });
    }]).get('$parse');

    var fn = parse('"hello" | repeat:3');
    fn().should.eql('hellohellohello');
  });

  it('can parse serveral additional arguments to filter.', function () {
    parse = createInjector(['ng', function($filterProvider) {
      $filterProvider.register('surround', function () {
        return function(s, left, right) {
          return left + s + right;
        };
      });
    }]).get('$parse');

    var fn = parse('"hello" | surround:"*":"!"');
    fn().should.eql('*hello!');
  });

  it('return the function itself when given one.', function() {
    var fn = function () {};
    parse(fn).should.be.exactly(fn);
  });

  it('still return a function when given no argument', function() {
    parse().should.be.Function();
  });

  it('makes integers literal', function() {
    var fn = parse('42');
    fn.literal.should.be.true();
  });

  it('make string literal', function() {
    var fn = parse('"abc"');
    fn.literal.should.be.true();
  });

  it('marks boolean literal ', function() {
    var fn = parse('true');
    fn.literal.should.be.true();
  });

  it('marks arrays literal', function() {
    var fn = parse('[1, 2, aVariable]');
    fn.literal.should.be.true();
  });

  it('marks objects literal', function() {
    var fn = parse('{a: 1, b: aVariable}');
    fn.literal.should.be.true();
  });

  it('marks unary expressions non-literal.', function() {
    var fn = parse('!false');
    fn.literal.should.be.false();
  });

  it('marks binary expressions non-literal', function() {
    var fn = parse('1 + 2');
    fn.literal.should.be.false();
  });

  it('marks integers constant', function() {
    var fn = parse('42');
    fn.constant.should.be.true;
  });

  it('marks strings constant', function() {
    var fn = parse('"abc"');
    fn.constant.should.be.true;
  });

  it('marks boolean constant', function() {
    var fn = parse('true');
    fn.constant.should.be.true;
  });

  it('marks identifier non-constant', function() {
    var fn = parse('a');
    fn.constant.should.be.false();
  });

  it('marks array constant when element are constant.', function() {
    parse('[1, 2, 3]').constant.should.be.true();
    parse('[1, [2, [3]]]').constant.should.be.true();
    parse('[1, 2, a]').constant.should.be.false();
    parse('[1, [2, [a]]]').constant.should.be.false();
  });

  it('marks object constant when values are constant', function() {
    parse('{a: 1, b: 2}').constant.should.be.true();
    parse('{a: 1, b: {c: 2}}').constant.should.be.true();
    parse('{a: 1, b: something}').constant.should.be.false();
    parse('{a: 1, b: {c: something}}').constant.should.be.false();
  });

  it('marks this as non-constant', function() {
    parse('this').constant.should.be.false();
  });

  it('marks non-computed lookup constant when object is constant', function() {
    parse('{a: 1}.a').constant.should.be.true();
    parse('obj.a').constant.should.be.false();
  });

  it('marks computed lookup constant when object and key are', function() {
    parse('{a: 1}["a"]').constant.should.be.true();
    parse('obj["a"]').constant.should.be.false();
    parse('{a: 1}[something]').constant.should.be.false();
    parse('obj[something]').constant.should.be.false();
  });

  it('marks function calls non-constant', function () {
    parse('aFunction()').constant.should.be.false();
  });

  it('marks filters constant if arguments are', function () {
    parse = createInjector(['ng', function ($filterProvider) {
      $filterProvider.register('aFilter', function() {
        return _.identity;
      });
    }]).get('$parse');

    parse('[1, 2, 3] | aFilter').constant.should.be.true();
    parse('[1, 2, a] | aFilter').constant.should.be.false();
    parse('[1, 2, 3] | aFilter:42').constant.should.be.true();
    parse('[1, 2, 3] | aFilter:a').constant.should.be.false();
  });

  it('marks assignments constant when both sides are', function() {
    parse('1 = 2').constant.should.be.true();
    parse('a = 2').constant.should.be.false();
    parse('1 = b').constant.should.be.false();
    parse('a = b').constant.should.be.false();
  });

  it('marks unaries constant when arguments are constant.', function() {
    parse('+42').constant.should.be.true();
    parse('+a').constant.should.be.false();
  });

  it('marks binaries constant when both arguments are constant.', function() {
    parse('1 + 2').constant.should.be.true();
    parse('1 + 2').literal.should.be.false();

    parse('1 + a').constant.should.be.false();
    parse('a + 1').constant.should.be.false();
    parse('a + a').constant.should.be.false();
  });

  it('marks logicals constant when both arguments are cosntant.', function() {
    parse('true && false').constant.should.be.true();
    parse('true && false').literal.should.be.false();

    parse('true && a').constant.should.be.false();
    parse('true && a').literal.should.be.false();

    parse('a && false').constant.should.be.false();
    parse('a && false').literal.should.be.false();

    parse('a && b').constant.should.be.false();
    parse('a && b').literal.should.be.false();
  });

  it('marks ternaries constant when all arguments are', function() {
    parse('true ? 1 : 2').constant.should.true();
    parse('a ? 1: 2').constant.should.be.false();
    parse('true ? a: 2').constant.should.be.false();
    parse('true ? 1: b').constant.should.be.false();
    parse('a ? b: c').constant.should.be.false();
  });

  it('allows calling assign on identifier expressions.', function () {
    var fn = parse('anAttribute');
    fn.assign.should.not.be.undefined();

    var scope = {};
    fn.assign(scope, 42);
    scope.anAttribute.should.eql(42);
  });

  it('allows calling assign on member expressions.', function() {
    var fn = parse('anObject.anAttribute');
    fn.assign.should.not.be.undefined();

    var scope = {};
    fn.assign(scope, 42);
    scope.anObject.should.eql({anAttribute: 42});
  });

});
