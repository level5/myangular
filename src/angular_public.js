'use strict';

var _ = require('lodash');

var setupModuleLoader = require('./loader');

function publishExternalAPI() {
  setupModuleLoader(window);
}

module.exports = publishExternalAPI;