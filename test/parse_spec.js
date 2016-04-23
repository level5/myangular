'use strict';

var parse = require('../src/parse');
var sinon = require('sinon');
var _ = require('lodash');

describe('parse', function() {

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
    (function(){ parse('42e-'); }).should.throw();
    (function(){ parse('42e+'); }).should.throw();
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

});
