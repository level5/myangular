'use strict';

var parse = require('../src/parse');
var sinon = require('sinon');
var _ = require('lodash');

var register = require('../src/filter').register;
var filter = require('../src/filter').filter;

describe('filter', function() {

  it('can be registered an obtained.', function() {
    var myFilter = function() {};
    var myFilterFactory = function() {
      return myFilter;
    };
    register('my', myFilterFactory);
    filter('my').should.be.exactly(myFilter);
  });

  it('allows registering multiple filters with an object.', function() {
    var myFilter = function() {};
    var myOtherFilter = function() {};
    register({
      my: function() {
        return myFilter;
      },
      myOther: function() {
        return myOtherFilter;
      }
    })
    filter('my').should.be.exactly(myFilter);
    filter('myOther').should.be.exactly(myOtherFilter);
  });


});
