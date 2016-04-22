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
    fn().should.equal('abc');
  });

    it('can parse a string in double quotes.', function() {
      var fn = parse('"abc"');
      fn().should.equal('abc');
    });
});
