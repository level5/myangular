'use strict';

var sinon = require('sinon');
var _ = require('lodash');

var filter = require('../src/filter').filter;
var parse = require('../src/parse');


describe('filter filter', function () {
  
  it('is avaliable', function() {
    filter('filter').should.be.a.Function();
  });
  
  
  it('can filter an array with a predicate function.', function() {
    var fn = parse('[1, 2, 3, 4] | filter: isOdd');
    fn({
      isOdd: function(n) {return n % 2 !== 0;}
    }).should.eql([1, 3]);
  });
  
  it('can filter an array of string with a string', function () {
    var fn = parse('arr | filter: "a"');
    fn({arr: ["a", "b", "a"]}).should.eql(["a", "a"]);
  });
  
  it('filters an array of strings with substring matching', function() {
    var fn = parse('arr | filter: "o"');
    fn({arr: ["quick", "brown", "fox"]}).should.eql(["brown", "fox"]);
  });
});