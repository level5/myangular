'use strict';

var _ = require('lodash');

var setupModuleLoader = require('./loader');

function publishExternalAPI() {
  setupModuleLoader(window);

  var ngModule = window.angular.module('ng', []);
  ngModule.provider('$filter', require('./filter'));
  ngModule.provider('$parse', require('./parse'));
  ngModule.provider('$rootScope', require('./scope'));
  ngModule.provider('$q', require('./q').$QProvider);
  ngModule.provider('$$q', require('./q').$$QProvider);
  ngModule.provider('$httpBackend', require('./http_backend'));
  ngModule.provider('$http', require('./http').$HttpProvider);
  ngModule.provider('$httpParamSerializer',
    require('./http').$httpParamSerializerProvider);
  ngModule.provider('$httpParamSerializerJQLike',
    require('./http').$httpParamSerializerJQLikeProvider);
  ngModule.provider('$compile', require('./compile'));
  ngModule.provider('$controller', require('./controller'));
  ngModule.directive('ngController', require('./directives/ng_controller'));
}

module.exports = publishExternalAPI;
