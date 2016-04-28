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

  it('filters an array of strings ignoring case.', function() {
    var fn = parse('arr | filter: "o"');
    fn({arr: ['quick', 'BROWN', 'fox']}).should.eql(['BROWN', 'fox']);
  });

  it('filters an array of objects where any value matches', function() {
    var fn = parse('arr | filter: "o"');
    fn({arr: [
      {firstName: 'John', lastName: "Brown"},
      {firstName: 'Jane', lastName: "Fox"},
      {firstName: 'Mary', lastName: "Quick"}
    ]}).should.eql([
      {firstName: 'John', lastName: "Brown"},
      {firstName: 'Jane', lastName: "Fox"}
    ]);
  });

  it('filters an array of object where a nested value matches', function() {

    var fn = parse('arr | filter: "o"');
    fn({
      arr: [
        {name: {first: 'John', last: 'Brown'}},
        {name: {first: 'Jane', last: 'Fox'}},
        {name: {first: 'Mary', last: 'Quick'}}
      ]
    }).should.eql([
      {name: {first: 'John', last: 'Brown'}},
      {name: {first: 'Jane', last: 'Fox'}}
    ]);

  });

  it('filters an array of arrays where a nested value matches', function() {
    var fn = parse('arr | filter: "o"');
    fn({
      arr: [
        [{name: 'John'}, {name: 'Mary'}],
        [{name: 'Jane'}]
      ]
    }).should.eql([
      [{name: 'John'}, {name: 'Mary'}]
    ]);


  });

  it('filters with a number', function() {
    var fn = parse('arr | filter: 42');
    fn({
      arr:[
      {name: 'Mary', age: 42},
      {name: 'John', age: 43},
      {name: 'Jane', age: 44}
      ]
    }).should.eql([{name: 'Mary', age: 42}]);
  });

  it('filters with a boolean value', function() {
    var fn = parse('arr | filter: true');

    fn({
      arr: [
        {name: 'Mary', admin: true},
        {name: 'John', admin: true},
        {name: 'Jane', admin: false}
      ]
    }).should.eql([
      {name: 'Mary', admin: true},
      {name: 'John', admin: true}
    ])
  });

  it('filters with a substring numeric value', function() {
    var fn = parse('arr | filter: 42');
    fn({arr: ['contains 42']}).should.eql(['contains 42']);
  });

  it('filters matching null', function() {
    var fn = parse('arr | filter: null');
    fn({arr: [null, 'not null']}).should.eql([null]);
  });

  it('does not match undefined values.', function() {
    var fn = parse('arr | filter: "undefined"');
    fn({arr: [undefined, 'undefined']}).should.eql(['undefined']);
  });

  it('allows negating string filter.', function() {
    var fn = parse('arr | filter: "!o"');
    fn({arr: ['quick', 'brown', 'fox']}).should.eql(['quick']);
  });

  it('filters with an object', function() {
    var fn = parse('arr | filter: {name: "o"}');
    fn({
      arr: [
        {name: 'Joe', role: 'admin'},
        {name: 'Jane', role: 'moderator'}
      ]
    }).should.eql([{name: 'Joe', role: 'admin'}]);
  });

  it('must match all criteria in an object.', function() {
    var fn = parse('arr | filter: {name: "o", role: "m"}');
    fn({
      arr: [
        {name: 'Joe', role: 'admin'},
        {name: 'Jane', role: 'moderator'}
      ]
    }).should.eql([{name: 'Joe', role: 'admin'}]);
  });

  it('matches everything when filteredwith an empty object', function() {
    var fn = parse('arr | filter: {}');
    fn({
      arr: [
        {name: 'Joe', role: 'admin'},
        {name: 'Jane', role: 'moderator'}
      ]
    }).should.eql([
      {name: 'Joe', role: 'admin'},
      {name: 'Jane', role: 'moderator'}
    ]);
  });

  it('filters with a nested object.', function() {
    var fn = parse('arr | filter: {name: {first: "o"}}');
    fn({
      arr: [
        {name: {first: 'Joe'}, role: 'admin'},
        {name: {first: 'Jane'}, role: 'moderator'}
      ]
    }).should.eql([
      {name: {first: 'Joe'}, role: 'admin'}
    ]);
  });

  it('allows negation when filtering with an object.', function() {
    var fn = parse('arr | filter: {name: {first: "!o"}}');
    fn({
      arr: [
        {name: {first: 'Joe'}, role: 'admin'},
        {name: {first: 'Jane'}, role: 'moderator'}
      ]
    }).should.eql([
      {name: {first: 'Jane'}, role: 'moderator'}
    ]);
  });

  it('ignores undefined value in expectation object.', function() {
    var fn = parse('arr | filter: {name: thisIsUndefined}');
    fn({
      arr: [
        {name: 'Joe', role: 'amdin'},
        {name: 'Jane', role: 'moderator'}
      ]
    }).should.eql([
      {name: 'Joe', role: 'amdin'},
      {name: 'Jane', role: 'moderator'}
    ]);
  });

  it('filters with a nested object in array.', function() {
    var fn = parse('arr | filter: {users: {name: {first: "o"}}}');
    fn({
      arr: [
        {users: [{name: {first: 'Joe'}, role: 'admin'},
                 {name: {first: 'Jane'}, role: 'moderator'}]},
        {users: [{name: {first: 'Mary'}, role: 'admin'}]}
      ]
    }).should.eql([
      {users: [{name: {first: 'Joe'}, role: 'admin'},
               {name: {first: 'Jane'}, role: 'moderator'}]}
    ]);
  });


  it('filters with nested objects on the same level only', function() {
    var fn = parse('arr | filter: {user: {name: "Bob"}}');
    fn({
      arr: [
        {user: 'Bob'},
        {user: {name: 'Bob'}},
        {user: {name: {first: 'Bob', last: 'Fox'}}}
      ]
    }).should.eql([{user: {name: 'Bob'}}]);
  });

  it('filtters with a wildcard property', function() {
    var fn = parse('arr | filter: {$:"o"}');
    fn({arr: [
      {name: 'Joe', role: 'admin'},
      {name: 'Jane', role: 'moderator'},
      {name: 'mary', role: 'admin'}
    ]}).should.eql([
      {name: 'Joe', role: 'admin'},
      {name: 'Jane', role: 'moderator'}
    ])
  });

  it('filtters nested objects with a wildcard property', function() {
    var fn = parse('arr | filter: {$:"o"}');
    fn({arr: [
      {name: {first: 'Joe'}, role: 'admin'},
      {name: {first: 'Jane'}, role: 'moderator'},
      {name: {first: 'mary'}, role: 'admin'}
    ]}).should.eql([
      {name: {first: 'Joe'}, role: 'admin'},
      {name: {first: 'Jane'}, role: 'moderator'}
    ])
  });

  it('filtters wildcard properties scoped to parent', function() {
    var fn = parse('arr | filter: {name: {$:"o"}}');
    fn({arr: [
      {name: {first: 'Joe', last: 'Fox'}, role: 'admin'},
      {name: {first: 'Jane', last: 'Quick'}, role: 'moderator'},
      {name: {first: 'mary', last: 'Brown'}, role: 'admin'}
    ]}).should.eql([
      {name: {first: 'Joe', last: 'Fox'}, role: 'admin'},
      {name: {first: 'mary', last: 'Brown'}, role: 'admin'}
    ])
  });

  it('filters primitives with a wildcard property', function() {
    var fn = parse('arr | filter: {$:"o"}');
    fn({arr: ['Joe', 'Jane', 'Mary']}).should.eql(['Joe']);
  });
});
