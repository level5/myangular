'use strict';

var parse = require('../src/parse');
var sinon = require('sinon');
var _ = require('lodash');

var publishExternalAPI = require('../src/angular_public');
var createInjector = require('../src/injector');

describe('filter', function() {
  
  beforeEach(function () {
    publishExternalAPI();
  });

  it('can be registered an obtained.', function() {
    var myFilter = function() {};
    var myFilterFactory = function() {
      return myFilter;
    };
    
    var injector = createInjector(['ng', function ($filterProvider) {
      $filterProvider.register('my', myFilterFactory);
    }]);
    
    var $filter = injector.get('$filter');
    $filter('my').should.be.exactly(myFilter);
  });

  it('allows registering multiple filters with an object.', function() {
    var myFilter = function() {};
    var myOtherFilter = function() {};
    var injector = createInjector(['ng', function ($filterProvider) {
      $filterProvider.register({
        my: function() {
          return myFilter;
        },
        myOther: function() {
          return myOtherFilter;
        }
      });
    }]);
    var $filter = injector.get('$filter');
    $filter('my').should.be.exactly(myFilter);
    $filter('myOther').should.be.exactly(myOtherFilter);
  });
  
  it('may have dependencies in factory', function () {
    var injector = createInjector(['ng', function ($provide, $filterProvider) {
      $provide.constant('suffix', '!');
      $filterProvider.register('my', function (suffix) {
        return function (v) {
          return suffix + v;
        };
      });
    }]);
    
    injector.has('myFilter').should.be.true();
  });
  
  
  it('can be registered through module API', function () {
    
    var myFilter = function() {};
    var module = window.angular.module('myModule', [])
      .filter('my', function() {
        return myFilter;
      });
    
    var injector = createInjector(['ng', 'myModule']);
    
    injector.has('myFilter').should.be.true();
    injector.get('myFilter').should.be.exactly(myFilter);
    
  });


});
