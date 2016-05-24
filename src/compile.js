'use strict';

var _ = require('lodash');
var $ = require('jquery');

function nodeName(node) {
  return node.nodeName ? node.nodeName : node[0].nodeName;
}

function $CompileProvider($provide) {

  var hasDirectives = {};

  this.directive = function (name, directiveFactory) {
    if (_.isString(name)) {
      if (name === 'hasOwnProperty') {
        throw 'hasOwnProperty is not a valid directive name';
      }
      if(!hasDirectives.hasOwnProperty(name)) {
        hasDirectives[name] = [];
        $provide.factory(name + 'Directive', ['$injector', function ($injector) {
          var factories = hasDirectives[name];
          return _.map(factories, $injector.invoke);
        }]);
      }
      hasDirectives[name].push(directiveFactory);
    } else {
      _.forEach(name, function (directoryFactory, name) {
        this.directive(name, directiveFactory);
      }.bind(this));
    }
  };

  this.$get = ['$injector', function ($injector) {

    function compile($compileNodes) {
      return compileNodes($compileNodes);
    }

    function compileNodes($compileNodes) {
      _.forEach($compileNodes, function(node) {
        var directives = collectDirectives(node);
        applyDirectivesToNode(directives, node);
      });
    }

    function applyDirectivesToNode(directives, compileNode) {
      var $compileNode = $(compileNode);
      _.forEach(directives, function (directive) {
        if (directive.compile) {
          directive.compile($compileNode);
        }
      })
    }

    function collectDirectives(node) {
      var directives = [];

      var normalizedNodeName = _.camelCase(nodeName(node).toLowerCase());
      addDirective(directives, normalizedNodeName);
      return directives;
    }

    function addDirective(directives, name) {
      if (hasDirectives.hasOwnProperty(name)) {
        directives.push.apply(directives, $injector.get(name + 'Directive'));
      }
    }

    return compile;
  }];
}
$CompileProvider.$inject = ['$provide'];

module.exports = $CompileProvider;
