'use strict';

var sinon = require('sinon');
var _ = require('lodash');

var publishExternalAPI = require('../src/angular_public');

describe('angularPublic', function () {
  
  it('sets up the angular object and the module loader', function () {
    publishExternalAPI();
    
    window.angular.should.be.Object();
    window.angular.module.should.be.Function();
  });
  
});