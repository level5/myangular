'use strict';

var sinon = require('sinon');
var _ = require('lodash');

var setupModuleLoader = require('../src/loader');

describe('setupModuleLoader', function () {
 
  beforeEach(function() {
    delete window.angular;
  });
 
  it('exposes angular on the window', function() {
    setupModuleLoader(window);
    window.angular.should.not.be.undefined();
  });
  
  it('creates angular just once.', function () {
    setupModuleLoader(window);
    var ng = window.angular;
    setupModuleLoader(window);
    window.angular.should.be.exactly(ng);
  });
  
  it('exposes the angular module function', function () {
    setupModuleLoader(window);
    window.angular.module.should.be.Function();
  });
  
  it('exposes the angular module function just once.', function () {
    setupModuleLoader(window);
    var module = window.angular.module;
    setupModuleLoader(window);
    window.angular.module.should.be.exactly(module);
  });
  
  describe('modules', function () {
    
    beforeEach(function() {
      setupModuleLoader(window);
    });
    
    it('allows registering a module', function () {
      var myModule = window.angular.module('myModule', []);
      myModule.should.be.Object();
      myModule.name.should.be.eql('myModule');
    });
    
    it('replaces a module when registered with same name agian.', function () {
      var myModule = window.angular.module('myModule', []);
      var myNewModule = window.angular.module('myModule', []);
      myNewModule.should.not.equal(myModule);
    });
    
    it('attaches the requires array to the registered module', function () {
      var myModule = window.angular.module('myModule', ['myOtherModule']);
      myModule.requires.should.eql(['myOtherModule']);
    });
    
    it('allows getting a module', function () {
      var myModule = window.angular.module('myModule', []);
      var gotModule = window.angular.module('myModule');
      
      gotModule.should.be.Object();
      gotModule.should.be.exactly(myModule);
    });
    
    it('throws when trying to get a nonexistent module', function () {
      (function() {
        window.angular.module('myModule');
      }).should.throw();
    });
    
    it('does not allow a module to be called hasOwnProperty.', function () {
      (function () {
        window.angular.module('hasOwnProperty', []);
      }).should.throw();
    });
    
  });
  
});