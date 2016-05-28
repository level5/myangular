'use strict';

var _ = require('lodash');
var $ = require('jquery');

function nodeName(element) {
  return element.nodeName ? element.nodeName : element[0].nodeName;
}

var PREFIX_REGXP = /(x[\:\-_])|data[\:\-_]/i;
function directiveNormalize(name) {
  return _.camelCase(name.replace(PREFIX_REGXP, ''));
}

function byPriority(a, b) {
    var diff = b.priority - a.priority;
    if (diff !== 0) {
      return diff;
    } else {
      if (a.name != b.name) {
        return (a.name < b.name ? -1 : 1);
      } else {
        return a.index - b.index;
      }
    }
}
var BOOLEAN_ATTRS = {
  multiple: true,
  selected: true,
  checked: true,
  disabled: true,
  readOnly: true,
  required: true,
  open: true
};
var BOOLEAN_ELEMENTS = {
  INPUT: true,
  SELECT: true,
  OPTION: true,
  TEXTAREA: true,
  BUTTON: true,
  FORM: true,
  DETAILS: true
};
function isBooleanAttribute(node, attrName) {
  return BOOLEAN_ATTRS[attrName] && BOOLEAN_ELEMENTS[node.nodeName];
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
          return _.map(factories, function (factory, i) {
            var directive = $injector.invoke(factory);
            directive.restrict = directive.restrict || 'EA';
            directive.priority = directive.priority || 0;
            if (directive.link && !directive.compile) {
              directive.compile = _.constant(directive.link);
            }
            directive.name = directive.name || name;
            directive.index = i;
            return directive;
          });
        }]);
      }
      hasDirectives[name].push(directiveFactory);
    } else {
      _.forEach(name, function (directiveFactory, name1) {
        this.directive(name1, directiveFactory);
      }.bind(this));
    }
  };

  this.$get = ['$injector', '$rootScope', function ($injector, $rootScope) {

    function Attributes(element) {
      this.$$element = element;
      this.$attr = {};
    }
    Attributes.prototype.$set = function (key, value, writeAttr, attrName) {
      this[key] = value;

      if (isBooleanAttribute(this.$$element[0], key)) {
        this.$$element.prop(key, value);
      }
      if (!attrName) {
        if (this.$attr[key]) {
          attrName = this.$attr[key];
        } else {
          attrName = this.$attr[key] =  _.kebabCase(key, '-');
        }
      } else {
        this.$attr[key] = attrName;
      }
      if (writeAttr !== false) {
        this.$$element.attr(attrName, value);
      }
      if (this.$$obserers) {
        _.forEach(this.$$obserers[key], function (observer) {
          try {
            observer(value);
          } catch(e) {
            console.log(e);
          }
        })
      }
    };
    Attributes.prototype.$observe = function (key, fn) {
      var self = this;
      this.$$obserers = this.$$obserers || Object.create(null);
      this.$$obserers[key] = this.$$obserers[key] || [];
      this.$$obserers[key].push(fn);
      $rootScope.$evalAsync(function () {
        fn(self[key]);
      });
      return function () {
        var index = self.$$obserers[key].indexOf(fn);
        if (index >= 0) {
          self.$$obserers[key].splice(index, 1);
        }
      }
    }

    Attributes.prototype.$addClass = function (classVal) {
      this.$$element.addClass(classVal);
    };

    Attributes.prototype.$removeClass = function (classVal) {
      this.$$element.removeClass(classVal);
    }

    Attributes.prototype.$updateClass = function (newClassVal, oldClassVal) {
      var newClasses = newClassVal.split(/\s+/);
      var oldClasses = oldClassVal.split(/\s+/);

      var addedClasses = _.difference(newClasses, oldClasses);
      var removedClasses = _.difference(oldClasses, newClasses);
      if (addedClasses.length) {
        this.$addClass(addedClasses.join(' '))
      }
      if (removedClasses.length) {
        this.$removeClass(removedClasses.join(' '));
      }
    }


    function compile($compileNodes) {
      var compositeLinkFn = compileNodes($compileNodes);

      return function publicLinkFn(scope) {
        $compileNodes.data('$scope', scope);
        compositeLinkFn(scope, $compileNodes);
      };
    }

    function compileNodes($compileNodes) {
      var linkFns = [];
      _.forEach($compileNodes, function(node, i) {
        var attrs = new Attributes($(node));
        var directives = collectDirectives(node, attrs);
        var nodeLinkFn;
        if (directives.length) {
          nodeLinkFn = applyDirectivesToNode(directives, node, attrs);
        }
        var childLinkFn;
        if ((!nodeLinkFn || !nodeLinkFn.terminal) &&
            node.childNodes && node.childNodes.length) {
          childLinkFn = compileNodes(node.childNodes);
        }
        if (nodeLinkFn || childLinkFn) {
          linkFns.push({
            nodeLinkFn: nodeLinkFn,
            childLinkFn: childLinkFn,
            idx: i
          });
        }
      });

      function compositeLinkFn(scope, linkNodes) {
        _.forEach(linkFns, function (linkFn) {
          if (linkFn.nodeLinkFn) {
            linkFn.nodeLinkFn(linkFn.childLinkFn, scope, linkNodes[linkFn.idx]);
          } else {
            linkFn.childLinkFn(scope, linkNodes[linkFn.idx].childNodes);
          }
        });
      }

      return compositeLinkFn;
    }

    function applyDirectivesToNode(directives, compileNode, attrs) {
      var $compileNode = $(compileNode);
      var terminalPriority = - Number.MAX_VALUE;
      var terminal = false;
      var preLinkFns = [], postLinkFns = [];
      _.forEach(directives, function (directive) {
        if (directive.$$start) {
          $compileNode = groupScan(compileNode, directive.$$start, directive.$$end);
        }
        if (directive.priority < terminalPriority) {
          return false;
        }

        if (directive.compile) {
          var linkFn = directive.compile($compileNode, attrs);
          if (_.isFunction(linkFn)) {
            postLinkFns.push(linkFn);
          } else if (linkFn) {
            if (linkFn.pre) {
              preLinkFns.push(linkFn.pre);
            }
            if (linkFn.post) {
              postLinkFns.push(linkFn.post);
            }
          }
        }
        if (directive.terminal) {
          terminal = true;
          terminalPriority = directive.priority;
        }
      });

      function nodeLinkFn(childLinkFn, scope, linkNode) {
        var $element = $(linkNode);

        _.forEach(preLinkFns, function (linkFn) {
          linkFn(scope, $element, attrs);
        });

        if (childLinkFn) {
          childLinkFn(scope, linkNode.childNodes);
        }

        _.forEachRight(postLinkFns, function (linkFn) {
          linkFn(scope, $element, attrs);
        });
      }
      nodeLinkFn.terminal = terminal;
      return nodeLinkFn;
    }

    function groupScan(node, startAttr, endAttr) {
      var nodes = [];
      if (startAttr && node && node.hasAttribute(startAttr)) {
        var depth = 0;
        do {
          if (node.nodeType === node.ELEMENT_NODE) {
            if (node.hasAttribute(startAttr)) {
              depth++;
            } else if (node.hasAttribute(endAttr)) {
              depth--;
            }
          }
          nodes.push(node);
          node = node.nextSibling;
        } while (depth > 0);
      } else {
        nodes.push(node);
      }
      return $(nodes);
    }

    function collectDirectives(node, attrs) {
      var directives = [];
      if (node.nodeType === node.ELEMENT_NODE) {
        // 元素名
        var normalizedNodeName = directiveNormalize(nodeName(node).toLowerCase());
        addDirective(directives, normalizedNodeName, 'E');
        // 属性名
        _.forEach(node.attributes, function(attr) {
          var attrStartName, attrEndName;
          var name = attr.name;
          var normalizedAttrName = directiveNormalize(name.toLowerCase());
          var isNgAttr = /^ngAttr[A-Z]/.test(normalizedAttrName);
          if (isNgAttr) {
            name =
              _.kebabCase(
                normalizedAttrName[6].toLowerCase() + normalizedAttrName.substring(7)
              );
              normalizedAttrName = directiveNormalize(name.toLowerCase());
          }
          attrs.$attr[normalizedAttrName] = name;
          var directiveNName = normalizedAttrName.replace(/(Start|End)$/, '');
          if (directiveIsMultiElement(directiveNName)) {
            if (/Start$/.test(normalizedAttrName)) {
              attrStartName = name;
              attrEndName = name.substring(0, name.length - 5) + 'end';
              name = name.substring(0, name.length - 6);            }
          }
          normalizedAttrName = directiveNormalize(name.toLowerCase());
          addDirective(directives, normalizedAttrName, 'A',
                          attrStartName, attrEndName);
          if (isNgAttr || !attrs.hasOwnProperty(normalizedAttrName)) {
            attrs[normalizedAttrName] = attr.value.trim();
            if (isBooleanAttribute(node, normalizedAttrName)) {
              attrs[normalizedAttrName] = true;
            }
          }
        });
        // 类名
        var className = node.className;
        if (_.isString(className) && !_.isEmpty(className)) {
          while((match = /([\d\w\-_]+)(?:\:([^;]+))?;?/.exec(className))) {
            var normalizedClassName = directiveNormalize(match[1]);
            if (addDirective(directives, normalizedClassName, 'C')) {
              attrs[normalizedClassName] = match[2] ? match[2].trim() : undefined;
            }
            className = className.substr(match.index + match[0].length);
          }
        }
      } else if (node.nodeType === node.COMMENT_NODE){
        var match = /^\s*directive\:\s*([\d\w\-_]+)\s*(.*)$/.exec(node.nodeValue);
        if (match) {
          var normalizedName = directiveNormalize(match[1]);
          if (addDirective(directives, directiveNormalize(match[1]), 'M')) {
            attrs[normalizedName] = match[2] ? match[2].trim() : undefined;
          }
        }
      }
      directives.sort(byPriority);
      return directives;
    }

    function directiveIsMultiElement(name) {
      if (hasDirectives.hasOwnProperty(name)) {
        var directives = $injector.get(name + 'Directive');
        return _.some(directives, function (directive) {
          return directive.multiElement === true;
        });
      }
      return false;
    }

    function addDirective(directives, name, mode, attrStartName, attrEndName) {
      var match;
      if (hasDirectives.hasOwnProperty(name)) {
        var foundDirectives = $injector.get(name + 'Directive');
        var applicableDirectives = _.filter(foundDirectives, function (dir) {
          return dir.restrict.indexOf(mode) !== -1;
        });
        _.forEach(applicableDirectives, function (directive) {
          if (attrStartName) {
            directive = _.create(directive, {
              $$start: attrStartName,
              $$end: attrEndName
            });
          }
          directives.push(directive);
          match = directive;
        });
      }
      return match;
    }

    return compile;
  }];
}
$CompileProvider.$inject = ['$provide']

module.exports = $CompileProvider;
