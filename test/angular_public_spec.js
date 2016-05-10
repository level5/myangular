'use strict';

var sinon = require('sinon');
var _ = require('lodash');

var publishExternalAPI = require('../src/angular_public');
var createInjector = require('../src/injector');

describe('angularPublic', function () {
  
  it('sets up the angular object and the module loader', function () {
    publishExternalAPI();
    
    window.angular.should.be.Object();
    window.angular.module.should.be.Function();
  });
  
  it('sets up the ng module', function () {
    publishExternalAPI();
    should(createInjector(['ng'])).be.Object();
  });
  
  it('sets up the $filter service.', function () {
    publishExternalAPI();
    
    var injector = createInjector(['ng']);
    
    injector.has('$filter').should.be.true();
  });
  
  it('sets up the $parse service', function () {
    publishExternalAPI();
    var injector = createInjector(['ng']);
    
    injector.has('$parse').should.be.true();
  });
  
  it('sets up the $rootScope', function () {
    publishExternalAPI();
    var injector = createInjector(['ng']);
    injector.has('$rootScope').should.be.true();
  });
 
  
});