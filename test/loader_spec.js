'use strict';

var sinon = require('sinon');
var _ = require('lodash');

var setupModuleLoader = require('../src/loader');

describe('exposes angular on the window', function() {
  setupModuleLoader(window);
  window.angular.should.not.be.undefined();
});