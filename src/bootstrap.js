'use strict';

var $ = require('jquery');
var _ = require('lodash');
var publishExternalAPI = require('./angular_public');
var createInjector = require('./injector');

publishExternalAPI();

window.angular.bootstrap = function (element, modules, config) {
  var $element = $(element);
  modules = modules || [];
  config = config || {};
  modules.unshift(['$provide', function ($provide) {
    $provide.value('$rootElement', element);
  }]);
  modules.unshift('ng');
  var injector = createInjector(modules, config.strictDi);
  $element.data('$injector', injector);
  injector.invoke(['$compile', '$rootScope', function ($compile, $rootScope) {
    $rootScope.$apply(function() {
      $compile($element)($rootScope);
    });
  }]);
  return injector;
};

var ngAttrPrefixs = ['ng-', 'data-ng-', 'ng:', 'x-ng-'];
$(document).ready(function () {
  var foundAppElement, foundModule, config = {};
  _.forEach(ngAttrPrefixs, function (prefix) {
    var attrName = prefix + 'app';
    var selector = '[' + attrName.replace(':', '\\:') + ']';
    var element;
    if (!foundAppElement && (element = document.querySelector(selector))) {
      foundAppElement = element;
      foundModule = element.getAttribute(attrName);
    }
    if (foundAppElement) {
      config.strictDi = _.some(ngAttrPrefixs, function (prefix) {
        var attrName = prefix + 'strict-di';
        return foundAppElement.hasAttribute(attrName);
      });
      window.angular.bootstrap(
        foundAppElement,
        foundModule ? [foundModule] : [],
        config
      );
    }
  });
});
