'use strict';

var sinon = require('sinon');
var _ = require('lodash');
var $ = require('jquery');

var publishExternalAPI = require('../src/angular_public');
var createInjector = require('../src/injector');

function makeInjectorWithDirective() {
  var args = arguments;
  return createInjector(['ng', function ($compileProvider) {
    $compileProvider.directive.apply($compileProvider, args);
  }]);
}

function registerAndCompile(dirName, domString, callback) {
  var givenAttrs;
  var injector = makeInjectorWithDirective(dirName, function() {
    return {
      restrict: 'EACM',
      compile: function (element, attrs) {
        givenAttrs = attrs;
      }
    };
  });
  injector.invoke(function ($compile, $rootScope) {
    var el = $(domString);
    $compile(el);
    callback(el, givenAttrs, $rootScope);
  });
}

describe('$compile', function () {

  beforeEach(function () {
    delete window.angular;
    publishExternalAPI();
  });

  it('allows creating directives', function () {
    var myModule = window.angular.module('myModule', []);
    myModule.directive('testing', function() {});
    var injector = createInjector(['ng', 'myModule']);
    injector.has('testingDirective').should.be.true();
  });

  it('allows creating many directives with the same name', function () {
    var myModule = window.angular.module('myModule', []);
    myModule.directive('testing', _.constant({d: 'one'}));
    myModule.directive('testing', _.constant({d: 'two'}));

    var injector = createInjector(['ng', 'myModule']);
    var result = injector.get('testingDirective');
    result.length.should.eql(2);
    result[0].d.should.eql('one');
    result[1].d.should.eql('two');
  });

  it('does not allow a directive called hasOwnProperty', function () {
    var myModule = window.angular.module('myModule', []);
    myModule.directive('hasOwnProperty', function () {});
    (function () {
      createInjector(['ng', 'myModule']);
    }).should.throw();
  });

  it('allows creating directives with object notation', function () {
    var myModule = window.angular.module('myModule', []);
    myModule.directive({
      a: function() {},
      b: function() {},
      c: function() {}
    });
    var injector = createInjector(['ng', 'myModule']);

    injector.has('aDirective').should.be.true();
    injector.has('bDirective').should.be.true();
    injector.has('cDirective').should.be.true();
  });

  it('compiles element directive from a single element', function () {
    var injector = makeInjectorWithDirective('myDirective', function () {
      return {
        restrict: 'EACM',
        compile: function(element) {
          element.data('hasCompiled', true);
        }
      };
    });

    injector.invoke(function($compile) {
      var el = $('<my-directive></my-directive>');
      $compile(el);
      el.data('hasCompiled').should.be.true();
    });
  });

  it('compiles element directives found from several elements', function () {
    var idx = 1;
    var injector = makeInjectorWithDirective('myDirective', function () {
      return {
        restrict: 'EACM',
        compile: function(element) {
          element.data('hasCompiled', idx++);
        }
      };
    });

    injector.invoke(function($compile) {
      var el = $('<my-directive></my-directive><my-directive></my-directive>');
      $compile(el);
      el.eq(0).data('hasCompiled').should.eql(1);
      el.eq(1).data('hasCompiled').should.eql(2);
    });
  });

  it('compiles element directives from child elements', function () {
    var idx = 1;
    var injector = makeInjectorWithDirective('myDirective', function () {
      return {
        restrict: 'EACM',
        compile: function(element) {
          element.data('hasCompiled', idx++);
        }
      };
    });

    injector.invoke(function($compile) {
      var el = $('<div><my-directive></my-directive></div>');
      $compile(el);
      should(el.data('hasCompiled')).be.undefined();
      el.find('> my-directive').data('hasCompiled').should.eql(1);
    });
  });

  it('compiles nested directives', function () {
    var idx = 1;
    var injector = makeInjectorWithDirective('myDir', function () {
      return {
        restrict: 'EACM',
        compile: function(element) {
          element.data('hasCompiled', idx++);
        }
      };
    });

    injector.invoke(function($compile) {
      var el = $('<my-dir><my-dir><my-dir/></my-dir></my-dir>');
      $compile(el);
      el.data('hasCompiled').should.eql(1);
      el.find('> my-dir').data('hasCompiled').should.eql(2);
      el.find('> my-dir > my-dir').data('hasCompiled').should.eql(3);
    });
  });

  _.forEach(['x', 'data'], function(prefix) {
    _.forEach([':', '-', '_'], function (delim) {
      it('compiles element directives with ' + prefix + delim + 'prefix', function () {
        var injector = makeInjectorWithDirective('myDir', function () {
          return {
            restrict: 'EACM',
            compile: function(element) {
              element.data('hasCompiled', true);
            }
          };
        });
        injector.invoke(function ($compile) {
          var el = $('<' + prefix + delim + 'my-dir></' + prefix + delim + 'my-dir>');
          $compile(el);
          el.data('hasCompiled').should.be.true();
        });
      });
    });
  });

  it('compiles attribute directives', function () {
    var injector = makeInjectorWithDirective('myDirective', function () {
      return {
        restrict: 'EACM',
        compile: function (element) {
          element.data('hasCompiled', true);
        }
      };
    });
    injector.invoke(function ($compile) {
      var el = $('<div my-directive></div>');
      $compile(el);
      el.data('hasCompiled').should.be.true();
    });
  });

  it('compiles attribute directives with prefixs', function() {
    var injector = makeInjectorWithDirective('myDirective', function () {
      return {
        restrict: 'EACM',
        compile: function (element) {
          element.data('hasCompiled', true);
        }
      };
    });
    injector.invoke(function ($compile) {
      var el = $('<div x:my-directive></div>');
      $compile(el);
      el.data('hasCompiled').should.be.true();
    });
  });

  it('compiles serval attribut directives in an element', function () {
    var injector = makeInjectorWithDirective({
      myDirective: function() {
        return {
          restrict: 'EACM',
          compile: function (element) {
            element.data('hasCompiled', true);
          }
        };
      },
      mySecondDirective: function () {
        return {
          restrict: 'EACM',
          compile: function(element) {
            element.data('secondCompiled', true);
          }
        };
      }
    });
    injector.invoke(function($compile) {
      var el = $('<div my-directive my-second-directive></div>');
      $compile(el);
      el.data('hasCompiled').should.be.true();
      el.data('secondCompiled').should.be.true();
    });
  });

  it('compiles both element and attributes directives in an element', function () {
    var injector = makeInjectorWithDirective({
      myDirective: function() {
        return {
          restrict: 'EACM',
          compile: function (element) {
            element.data('hasCompiled', true);
          }
        };
      },
      mySecondDirective: function () {
        return {
          restrict: 'EACM',
          compile: function(element) {
            element.data('secondCompiled', true);
          }
        };
      }
    });
    injector.invoke(function ($compile) {
      var el = $('<my-directive my-second-directive></my-directive>');
      $compile(el);
      el.data('hasCompiled').should.be.true();
      el.data('secondCompiled').should.be.true();
    });
  });

  it('compiles attribute directives with ng-attr prefix', function () {
    var injector = makeInjectorWithDirective('myDirective', function () {
      return {
        restrict: 'EACM',
        compile: function (element) {
          element.data('hasCompiled',true);
        }
      };
    });
    injector.invoke(function ($compile) {
      var el = $('<div ng-attr-my-directive></div>');
      $compile(el);
      el.data('hasCompiled').should.be.true();
    });
  });

  it('compiles attribute directives with data:ng-attr prefix', function () {
    var injector = makeInjectorWithDirective('myDirective', function () {
      return {
        restrict: 'EACM',
        compile: function (element) {
          element.data('hasCompiled',true);
        }
      };
    });
    injector.invoke(function ($compile) {
      var el = $('<div data:ng-attr-my-directive></div>');
      $compile(el);
      el.data('hasCompiled').should.be.true();
    });
  });

  it('compiles class directives', function () {
    var injector = makeInjectorWithDirective('myDirective', function () {
      return {
        restrict: 'EACM',
        compile: function (element) {
          element.data('hasCompiled',true);
        }
      };
    });
    injector.invoke(function ($compile) {
      var el = $('<div class="my-directive"></div>');
      $compile(el);
      el.data('hasCompiled').should.be.true();
    });
  });

  it('compiles several class directives in an element', function () {
    var injector = makeInjectorWithDirective({
      myDirective: function() {
        return {
          restrict: 'EACM',
          compile: function (element) {
            element.data('hasCompiled', true);
          }
        };
      },
      mySecondDirective: function () {
        return {
          restrict: 'EACM',
          compile: function(element) {
            element.data('secondCompiled', true);
          }
        };
      }
    });
    injector.invoke(function ($compile) {
      var el = $('<div class="my-directive my-second-directive"></div>');
      $compile(el);
      el.data('hasCompiled').should.be.true();
      el.data('secondCompiled').should.be.true();
    });
  });

  it('compiles class directives with prefixes', function () {
    var injector = makeInjectorWithDirective('myDirective', function () {
      return {
        restrict: 'EACM',
        compile: function (element) {
          element.data('hasCompiled',true);
        }
      };
    });
    injector.invoke(function ($compile) {
      var el = $('<div class="x-my-directive"></div>');
      $compile(el);
      el.data('hasCompiled').should.be.true();
    });
  });

  it('compiles comment directives', function () {
    var hasCompiled;
    var injector = makeInjectorWithDirective('myDirective', function () {
      return {
        restrict: 'EACM',
        compile: function (element) {
          hasCompiled = true;
        }
      };
    });
    injector.invoke(function ($compile) {
      var el = $('<!-- directive: my-directive -->');
      $compile(el);
      hasCompiled.should.be.true();
    });
  });

  _.forEach({
    E: {element: true, attribute: false, class: false, comment: false},
    A: {element: false, attribute: true, class: false, comment: false},
    C: {element: false, attribute: false, class: true, comment: false},
    M: {element: false, attribute: false, class: false, comment: true},
    EA: {element: true, attribute: true, class: false, comment: false},
    AC: {element: false, attribute: true, class: true, comment: false},
    EAM: {element: true, attribute: true, class: false, comment: true},
    EACM: {element: true, attribute: true, class: true, comment: true}
  }, function (expected, restrict) {
    describe('restricted to ' + restrict, function () {
      _.forEach({
        element: '<my-directive></my-directive>',
        attribute: '<div my-directive></div>',
        class: '<div class="my-directive"></div>',
        comment: '<!-- directive: my-directive -->'
      }, function (dom, type) {
        it((expected[type] ? 'matches' : 'does not match') + ' on ' + type, function () {
          var hasCompiled = false;
          var injector = makeInjectorWithDirective('myDirective', function () {
            return {
              restrict: restrict,
              compile: function (element) {
                hasCompiled = true;
              }
            };
          });
          injector.invoke(function ($compile) {
            var el = $(dom);
            $compile(el);
            should(hasCompiled).be.exactly(expected[type]);
          });
        });
      });
    });
  });

  it('applies to attributes when no restrict given', function () {
    var hasCompiled = false;
    var injector = makeInjectorWithDirective('myDirective', function () {
      return {
        compile: function (element) {
          hasCompiled = true;
        }
      };
    });
    injector.invoke(function ($compile) {
      var el = $('<div my-directive></div>');
      $compile(el);
      hasCompiled.should.be.true();
    });
  });

  it('applies to elements when no restrict given', function () {
    var hasCompiled = false;
    var injector = makeInjectorWithDirective('myDirective', function () {
      return {
        compile: function (element) {
          hasCompiled = true;
        }
      };
    });
    injector.invoke(function ($compile) {
      var el = $('<my-directive></my-directive>');
      $compile(el);
      hasCompiled.should.be.true();
    });
  });

  it('does not apply to classes when no restrict given', function () {
    var hasCompiled = false;
    var injector = makeInjectorWithDirective('myDirective', function () {
      return {
        compile: function (element) {
          hasCompiled = true;
        }
      };
    });
    injector.invoke(function ($compile) {
      var el = $('<div class="my-directive"></div>');
      $compile(el);
      hasCompiled.should.be.false();
    });
  });


  it('does not apply to comments when no restrict given', function () {
    var hasCompiled = false;
    var injector = makeInjectorWithDirective('myDirective', function () {
      return {
        compile: function (element) {
          hasCompiled = true;
        }
      };
    });
    injector.invoke(function ($compile) {
      var el = $('<!-- directive: my-directive -->');
      $compile(el);
      hasCompiled.should.be.false();
    });
  });

  it('applies in priority order', function () {
    var compilations = [];
    var injector = makeInjectorWithDirective({
      lowerDirective: function () {
        return {
          priority: 1,
          compile: function (element) {
            compilations.push('lower');
          }
        };
      },
      higherDirective: function () {
        return {
          priority: 2,
          compile: function (element) {
            compilations.push('higher');
          }
        };
      }
    });
    injector.invoke(function ($compile) {
      var el = $('<div lower-directive higher-directive></div>');
      $compile(el);
      compilations.should.eql(['higher', 'lower']);
    });
  });

  it('applies in same order when priorities are the same', function () {
    var compilations = [];
    var injector = makeInjectorWithDirective({
      firstDirective: function () {
        return {
          priority: 1,
          compile: function (element) {
            compilations.push('first');
          }
        };
      },
      secondDirective: function () {
        return {
          priority: 1,
          compile: function (element) {
            compilations.push('second');
          }
        };
      }
    });
    injector.invoke(function ($compile) {
      var el = $('<div second-directive first-directive></div>');
      $compile(el);
      compilations.should.eql(['first', 'second']);
    });
  });

  it('applies in registration order when names are the same', function () {
    var compilations = [];
    var myModule = window.angular.module('myModule', []);
    myModule.directive('aDirective', function () {
      return {
        priority: 1,
        compile: function (element) {
          compilations.push('first');
        }
      };
    });
    myModule.directive('aDirective', function () {
      return {
        priority: 1,
        compile: function (element) {
          compilations.push('second');
        }
      };
    });

    var injector = createInjector(['ng', 'myModule']);
    injector.invoke(function ($compile) {
      var el = $('<div a-directive></div>');
      $compile(el);
      compilations.should.eql(['first', 'second']);
    });
  });

  it('uses default priority when one not given', function () {
    var compilations = [];
    var injector = makeInjectorWithDirective({
      firstDirective: function () {
        return {
          priority: 1,
          compile: function (element) {
            compilations.push('first');
          }
        };
      },
      secondDirective: function () {
        return {
          compile: function (element) {
            compilations.push('second');
          }
        };
      }
    });
    injector.invoke(function ($compile) {
      var el = $('<div second-directive first-directive></div>');
      $compile(el);
      compilations.should.eql(['first', 'second']);
    });
  });

  it('stops compiling at a terminal directive', function () {
    var compilations = [];
    var myModule = window.angular.module('myModule', []);
    myModule.directive('firstDirective', function () {
      return {
        priority: 1,
        terminal: true,
        compile: function (element) {
          compilations.push('first');
        }
      };
    });
    myModule.directive('secondDirective', function () {
      return {
        priority: 0,
        compile: function (element) {
          compilations.push('second');
        }
      };
    });

    var injector = createInjector(['ng', 'myModule']);
    injector.invoke(function ($compile) {
      var el = $('<div first-directive second-directive></div>');
      $compile(el);
      compilations.should.eql(['first']);
    });

  });

  it('still compiles directives with same priority after terminal', function () {
    var compilations = [];
    var myModule = window.angular.module('myModule', []);
    myModule.directive('firstDirective', function () {
      return {
        priority: 1,
        terminal: true,
        compile: function (element) {
          compilations.push('first');
        }
      };
    });
    myModule.directive('secondDirective', function () {
      return {
        priority: 1,
        compile: function (element) {
          compilations.push('second');
        }
      };
    });

    var injector = createInjector(['ng', 'myModule']);
    injector.invoke(function ($compile) {
      var el = $('<div first-directive second-directive></div>');
      $compile(el);
      compilations.should.eql(['first', 'second']);
    });
  });

  it('stops child compilations after a terminal directive', function () {
    var compilations = [];
    var myModule = window.angular.module('myModule', []);
    myModule.directive('parentDirective', function () {
      return {
        terminal: true,
        compile: function (element) {
          compilations.push('parent');
        }
      };
    });
    myModule.directive('childDirective', function () {
      return {
        compile: function (element) {
          compilations.push('child');
        }
      };
    });
    var injector = createInjector(['ng', 'myModule']);
    injector.invoke(function ($compile) {
      var el = $('<div parent-directive><div child-directive></div></div>');
      $compile(el);
      compilations.should.eql(['parent']);
    });
  });

  it('allows applying a directive to multiple elements', function () {
    var compileEl = false;
    var injector = makeInjectorWithDirective('myDir', function () {
      return {
        multiElement: true,
        compile: function (element) {
          compileEl = element;
        }
      };
    });
    injector.invoke(function ($compile) {
      var el = $('<div my-dir-start></div><span></span><div my-dir-end></div>');
      $compile(el);
      compileEl.length.should.eql(3);
    });
  });

  describe('attribute', function () {

    it('passes the element attributes to the compile function', function () {
      registerAndCompile(
        'myDirective',
        '<my-directive my-attr="1" my-other-attr="two"></my-directive>',
        function (element, attrs) {
          attrs.myAttr.should.eql('1');
          attrs.myOtherAttr.should.eql('two');
        }
      );
    });

    it('trims attribute values', function () {
      registerAndCompile(
        'myDirective',
        '<my-directive my-attr="  val  "></my-directive>',
        function (element, attrs) {
          attrs.myAttr.should.eql('val');
        }
      );
    });

    it('sets the value of boolean attributes to true', function () {
      registerAndCompile(
        'myDirective',
        '<input my-directive disabled>',
        function (element, attrs) {
          attrs.disabled.should.be.true();
        }
      );
    });

    it('does not set the value of custom boolean attributes to true', function () {
      registerAndCompile(
        'myDirective',
        '<input my-directive whatever>',
        function (element, attrs) {
          attrs.whatever.should.eql('');
        }
      );
    });

    it('overrides attributes with ng-atr- versions', function () {
      registerAndCompile(
        'myDirective',
        '<input my-directive ng-attr-whatever="42" whatever="41">',
        function (element, attrs) {
          attrs.whatever.should.eql('42');
        }
      );
    });

    it('allows setting attributes', function () {
      registerAndCompile(
        'myDirective',
        '<my-directive attr="true"></my-directive>',
        function (element, attrs) {
          attrs.$set('attr', 'false');
          attrs.attr.should.eql('false');
        }
      );
    });

    it('sets attributes to DOM', function () {
      registerAndCompile(
        'myDirective',
        '<my-directive attr="true"></my-directive>',
        function (element, attrs) {
          attrs.$set('attr', 'false');
          element.attr('attr').should.eql('false');
        }
      );
    });

    it('does not set attributes to DOM when flag is false', function () {
      registerAndCompile(
        'myDirective',
        '<my-directive attr="true"></my-directive>',
        function (element, attrs) {
          attrs.$set('attr', 'false', false);
          element.attr('attr').should.eql('true');
        }
      );
    });

    it('shares attributes between directives', function () {
      var attrs1, attrs2;
      var injector = makeInjectorWithDirective({
        myDir: function () {
          return {
            compile: function (element, attrs) {
              attrs1 = attrs;
            }
          };
        },
        myOtherDir: function () {
          return {
            compile: function (element, attrs) {
              attrs2 = attrs;
            }
          };
        }
      });
      injector.invoke(function ($compile) {
        var el = $('<div my-dir my-other-dir></div>');
        $compile(el);
        attrs1.should.be.exactly(attrs2);
      });
    });

    it('sets prop for boolean attributes', function () {
      registerAndCompile(
        'myDirective',
        '<input my-directive>',
        function (element, attrs) {
          attrs.$set('disabled', true);
          element.prop('disabled').should.be.true();
        }
      );
    });

    it('sets prop for boolean attributes even when not flushing', function () {
      registerAndCompile(
        'myDirective',
        '<input my-directive>',
        function (element, attrs) {
          attrs.$set('disabled', true, false);
          element.prop('disabled').should.be.true();
        }
      );
    });

    it('denormalizes attribute name when explicitly given', function () {
      registerAndCompile(
        'myDirective',
        '<my-directive some-attribute="42"></my-directive>',
        function (element, attrs) {
          attrs.$set('someAttribute', 43, true, 'some-attribute');
          element.attr('some-attribute').should.eql('43');
        }
      );
    });

    it('denormalizes attribute by snake-casing', function () {
      registerAndCompile(
        'myDirective',
        '<my-directive some-attribute="42"></my-directive>',
        function (element, attrs) {
          attrs.$set('someAttribute', 43);
          element.attr('some-attribute').should.eql('43');
        }
      );
    });

    it('denormalizes attribute by using original attribute name', function () {
      registerAndCompile(
        'myDirective',
        '<my-directive x-some-attribute="42"></my-directive>',
        function (element, attrs) {
          attrs.$set('someAttribute', 43);
          element.attr('x-some-attribute').should.eql('43');
        }
      );
    });

    it('does not use ng-attr- prefix in denormalized name', function () {
      registerAndCompile(
        'myDirective',
        '<my-directive ng-attr-some-attribute="42"></my-directive>',
        function (element, attrs) {
          attrs.$set('someAttribute', 43);
          element.attr('some-attribute').should.eql('43');
        }
      );
    });

    it('uses new attribute name after once given', function () {
      registerAndCompile(
        'myDirective',
        '<my-directive x-some-attribute="42"></my-directive>',
        function (element, attrs) {
          attrs.$set('someAttribute', 43, true, 'some-attribute');
          attrs.$set('someAttribute', 44);

          element.attr('some-attribute').should.eql('44');
          element.attr('x-some-attribute').should.eql('42');
        }
      );
    });

    it('calls observer immediately when attribute is $set', function () {
      registerAndCompile(
        'myDirective',
        '<my-directive some-attribute="42"></my-directive>',
        function (eleent, attrs) {
          var gotValue;
          attrs.$observe('someAttribute', function (value) {
            gotValue = value;
          });
          attrs.$set('someAttribute', '43');
          gotValue.should.eql('43');
        }
      );
    });

    it('calls observer on next $digest after registration', function () {
      registerAndCompile(
        'myDirective',
        '<my-directive some-attribute="42"></my-directive>',
        function (element, attrs, $rootScope) {
          var gotValue;
          attrs.$observe('someAttribute', function (value) {
            gotValue = value;
          });

          $rootScope.$digest();
          gotValue.should.eql('42');
        }
      );
    });

    it('lets obserers be deregistered', function () {
      registerAndCompile(
        'myDirective',
        '<my-directive some-attribute="42"></my-directive>',
        function (element, attrs) {
          var gotValue;
          var remove = attrs.$observe('someAttribute', function (value) {
            gotValue = value;
          });
          attrs.$set('someAttribute', '43');
          gotValue.should.eql('43');
          remove();
          attrs.$set('someAttribute', '44');
          gotValue.should.eql('43');
        }
      );
    });

    it('adds an attribute from a class directive', function () {
      registerAndCompile(
        'myDirective',
        '<div class="my-directive"></div>',
        function (element, attrs) {
          attrs.hasOwnProperty('myDirective').should.be.true();
        }
      );
    });

    it('does not add attribute from class without a direcitve', function () {
      registerAndCompile(
        'myDirective',
        '<my-directive class="some-class"></my-directive>',
        function (element, attrs) {
          attrs.hasOwnProperty('someClass').should.be.false();
        }
      );
    });

    it('supports values for class directive attributes', function () {
      registerAndCompile(
        'myDirective',
        '<div class="my-directive: my attribute value"></div>',
        function (element, attrs) {
          attrs.myDirective.should.eql('my attribute value');
        }
      );
    });

    it('terminates class directive attribute value at semicolon', function () {
      registerAndCompile(
        'myDirective',
        '<div class="my-directive: my attribute value; some-other-class"></div>',
        function (element, attrs) {
          attrs.myDirective.should.eql('my attribute value');
        }
      );
    });

    it('adds an attribute with a value from a comment directive', function () {
      registerAndCompile(
        'myDirective',
        '<!-- directive: my-directive and the attribute value -->',
        function (element, attrs) {
          attrs.hasOwnProperty('myDirective').should.be.true();
          attrs.myDirective.should.eql('and the attribute value');
        }
      );
    });

    it('allows adding classes', function () {
      registerAndCompile(
        'myDirective',
        '<my-directive></my-directive>',
        function (element, attrs) {
          attrs.$addClass('some-class');
          element.hasClass('some-class').should.be.true();
        }
      );
    });

    it('allows removing classes', function () {
      registerAndCompile(
        'myDirective',
        '<my-directive class="some-class"></my-directive>',
        function (element, attrs) {
          attrs.$removeClass('some-class');
          element.hasClass('some-class').should.be.false();
        }
      );
    });

    it('allows updating classes', function () {
      registerAndCompile(
        'myDirective',
        '<my-directive class="one three four"></my-directive>',
        function (element, attrs) {
          attrs.$updateClass('one two three', 'one three four');
          element.hasClass('one').should.be.true();
          element.hasClass('two').should.be.true();
          element.hasClass('three').should.be.true();
          element.hasClass('four').should.be.false();
        }
      );
    });

  });

  it('returns a public link function from compile', function () {
    var injector = makeInjectorWithDirective(
      'myDirective',
      function () {
        return {compile: _.noop};
      }
    );
    injector.invoke(function ($compile) {
      var el = $('<div my-directive></div>');
      var linkFn = $compile(el);
      linkFn.should.be.Function();
    });
  });

  describe('linking', function () {

    it('takes a scope and attaches it to elements', function () {
      var injector = makeInjectorWithDirective('myDirective', function () {
        return {compile: _.noop};
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive></div>');
        $compile(el)($rootScope);
        el.data('$scope').should.be.exactly($rootScope);
      });
    });

    it('calls directive link function with scope', function () {
      var givenScope, givenElement, givenAttrs;
      var injector = makeInjectorWithDirective('myDirective', function () {
        return {
          compile: function () {
            return function link(scope, element, attrs) {
              givenScope = scope;
              givenElement = element;
              givenAttrs = attrs;
            };
          }
        };
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive></div>');
        $compile(el)($rootScope);
        givenScope.should.be.exactly($rootScope);
        givenElement[0].should.be.exactly(el[0]);
        givenAttrs.should.be.Object();
        givenAttrs.myDirective.should.not.be.undefined();
      });
    });

    it('supports link function in directive definition obect', function () {
      var givenScope, givenElement, givenAttrs;
      var injector = makeInjectorWithDirective('myDirective', function () {
        return {
          link: function (scope, element, attrs) {
            givenScope = scope;
            givenElement = element;
            givenAttrs = attrs;
          }
        };
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive></div>');
        $compile(el)($rootScope);
        givenScope.should.be.exactly($rootScope);
        givenElement[0].should.be.exactly(el[0]);
        givenAttrs.should.be.Object();
        givenAttrs.myDirective.should.not.be.undefined();
      });
    });

    it('links directive on child elements first', function () {
      var givenElements = [];
      var injector = makeInjectorWithDirective('myDirective', function () {
        return {
          link: function (scope, element, attrs) {
            givenElements.push(element);
          }
        };
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive><div my-directive></div></div>');
        $compile(el)($rootScope);
        givenElements.length.should.eql(2);
        givenElements[0][0].should.be.exactly(el[0].firstChild);
        givenElements[1][0].should.be.exactly(el[0]);
      });
    });

    it('links children when parent has no directives', function () {
      var givenElements = [];
      var injector = makeInjectorWithDirective('myDirective', function () {
        return {
          link: function (scope, element, attrs) {
            givenElements.push(element);
          }
        };
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div><div my-directive></div></div>');
        $compile(el)($rootScope);
        givenElements.length.should.eql(1);
        givenElements[0][0].should.be.exactly(el[0].firstChild);
      });
    });

    it('supports link function objects', function () {
      var linked;
      var injector = makeInjectorWithDirective('myDirective', function () {
        return {
          link: {
            post: function (scope, element, attrs) {
              linked = true;
            }
          }
        };
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div><div my-directive></div></div>');
        $compile(el)($rootScope);
        linked.should.be.true();
      });
    });

    it('supports prelinking and postlinking', function () {
      var linkings = [];
      var injector = makeInjectorWithDirective('myDirective', function () {
        return {
          link: {
            pre: function (scope, element) {
              linkings.push(['pre', element[0]]);
            },
            post: function (scope, element) {
              linkings.push(['post', element[0]]);
            }
          }
        };
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive><div my-directive></div></div>');
        $compile(el)($rootScope);
        linkings.length.should.eql(4);
        linkings.should.eql([
          ['pre', el[0]],
          ['pre', el[0].firstChild],
          ['post', el[0].firstChild],
          ['post', el[0]]
        ]);
      });
    });

    it('reverses priority for postlink functions', function () {
      var linkings = [];
      var injector = makeInjectorWithDirective({
        firstDirective: function () {
          return {
            priority: 2,
            link: {
              pre: function (scope, element) {
                linkings.push('first-pre');
              },
              post: function (scope, element) {
                linkings.push('first-post');
              }
            }
          };
        },
        secondDirective: function () {
          return {
            priority: 1,
            link: {
              pre: function (scope, element) {
                linkings.push('second-pre');
              },
              post: function (scope, element) {
                linkings.push('second-post');
              }
            }
          };
        }
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div first-directive second-directive></div>');
        $compile(el)($rootScope);
        linkings.should.eql([
          'first-pre',
          'second-pre',
          'second-post',
          'first-post'
        ]);
      });
    });

    it('stabilizes node list during linking', function () {
      var givenElements = [];
      var injector = makeInjectorWithDirective('myDirective', function () {
        return {
          link: function (scope, element, $rootScope) {
            givenElements.push(element[0]);
            element.after('<div></div>');
          }
        };
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div><div my-directive></div><div my-directive><div><div>');
        var el1 = el[0].childNodes[0], el2 = el[0].childNodes[1];
        $compile(el)($rootScope);
        givenElements.should.eql([el1, el2]);
      });
    });

    it('invokes multi-element directive link functions with whole group', function () {
      var givenElements;
      var injector = makeInjectorWithDirective('myDirective', function () {
        return {
          multiElement: true,
          link: function (scope, element, attrs) {
            givenElements = element;
          }
        };
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $(
          '<div my-directive-start></div>' +
          '<p></p>' +
          '<div my-directive-end></div>'
        );
        $compile(el)($rootScope);
        givenElements.length.should.eql(3);
      });
    });

    it('makes new scope for element when directive asks for it.', function () {
      var givenScope;
      var injector = makeInjectorWithDirective('myDirective', function () {
        return {
          scope: true,
          link: function (scope) {
            givenScope = scope;
          }
        };
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive></div>');
        $compile(el)($rootScope);
        givenScope.$parent.should.be.exactly($rootScope);
      });
    });

    it('gives inherited scope to all directives on element', function () {
      var givenScope;
      var injector = makeInjectorWithDirective({
        myDirective: function () {
          return {
            scope: true
          };
        },
        myOtherDirective: function () {
          return {
            link: function (scope) {
              givenScope = scope;
            }
          };
        }
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive my-other-directive></div>');
        $compile(el)($rootScope);
        givenScope.$parent.should.be.exactly($rootScope);
      });
    });

    it('adds scope class and data for element with new scope', function () {
      var givenScope;
      var injector = makeInjectorWithDirective('myDirective', function () {
        return {
          scope: true,
          link: function (scope) {
            givenScope = scope;
          }
        };
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive></div>');
        $compile(el)($rootScope);
        el.hasClass('ng-scope').should.be.true();
        el.data('$scope').should.be.exactly(givenScope);
      });
    });

    it('creates an isolate scope when requested', function () {
      var givenScope;
      var injector = makeInjectorWithDirective('myDirective', function () {
        return {
          scope: {},
          link: function (scope) {
            givenScope = scope;
          }
        };
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive></div>');
        $compile(el)($rootScope);
        givenScope.$parent.should.be.exactly($rootScope);
        Object.getPrototypeOf(givenScope).should.not.be.equal($rootScope);
      });
    });

    it('does not share isolate scope with other directives', function () {
      var givenScope;
      var injector = makeInjectorWithDirective({
        myDirective: function () {
          return {
            scope: {}
          };
        },
        myOtherDirective: function () {
          return {
            link: function (scope) {
              givenScope = scope;
            }
          };
        }
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive my-other-directive></div>');
        $compile(el)($rootScope);
        givenScope.should.be.exactly($rootScope);
      });
    });

    it('does not use isolate scope on child elements', function () {
      var givenScope;
      var injector = makeInjectorWithDirective({
        myDirective: function () {
          return {
            scope: {}
          };
        },
        myOtherDirective: function () {
          return {
            link: function (scope) {
              givenScope = scope;
            }
          };
        }
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive><div my-other-directive></div></div>');
        $compile(el)($rootScope);
        givenScope.should.equal($rootScope);
      });

    });

    it('does not allow two isolate scope directives on an element', function () {
      var injector = makeInjectorWithDirective({
        myDirective: function () {
          return {
            scope: {}
          };
        },
        myOtherDirective: function () {
          return {
            scope: {}
          };
        }
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive my-other-directive></div>');
        (function() {
          $compile(el);
        }).should.throw();
      });
    });

    it('does not allow both isolate and inherited scope on an element', function () {
      var injector = makeInjectorWithDirective({
        myDirective: function () {
          return {
            scope: {}
          };
        },
        myOtherDirective: function () {
          return {
            scope: true
          };
        }
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive my-other-directive></div>');
        (function () {
          $compile(el);
        }).should.throw();
      });
    });

    it('adds clas and data for element with isolated scope', function () {
      var givenScope;
      var injector = makeInjectorWithDirective('myDirective', function () {
        return {
          scope: {},
          link: function (scope) {
            givenScope = scope;
          }
        };
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive></div>');
        $compile(el)($rootScope);
        el.hasClass('ng-isolate-scope').should.be.true();
        el.hasClass('ng-scope').should.be.false();
        el.data('isolateScope').should.be.exactly(givenScope);
      });
    });

    it('allows observing attribute to the isolate scope.', function () {
      var givenScope, givenAttrs;
      var injector = makeInjectorWithDirective('myDirective', function () {
        return {
          scope: {
            anAttr: '@'
          },
          link: function (scope, element, attrs) {
            givenScope = scope;
            givenAttrs = attrs;
          }
        };
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive></div>');
        $compile(el)($rootScope);

        givenAttrs.$set('anAttr', '42');
        givenScope.anAttr.should.eql('42');
      });
    });

    it('sets initial value of observed attr to the isolate scope', function () {
      var givenScope;
      var injector = makeInjectorWithDirective('myDirective', function () {
        return {
          scope: {
            anAttr: '@'
          },
          link: function (scope, element, attrs) {
            givenScope = scope;
          }
        };
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive an-attr="42"></div>');
        $compile(el)($rootScope);

        givenScope.anAttr.should.eql('42');
      });
    });

    it('allows aliasing observed attribute', function () {
      var givenScope;
      var injector = makeInjectorWithDirective('myDirective', function () {
        return {
          scope: {
            aScopeAttr: '@anAttr'
          },
          link: function (scope, element, attrs) {
            givenScope = scope;
          }
        };
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive an-attr="42"></div>');
        $compile(el)($rootScope);

        givenScope.aScopeAttr.should.eql('42');
      });
    });

    it('allows binding expression to isolate scope', function () {
      var givenScope;
      var injector = makeInjectorWithDirective('myDirective', function () {
        return {
          scope: {
            anAttr: '='
          },
          link: function (scope) {
            givenScope = scope;
          }
        };
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive an-attr="42"></div>');
        $compile(el)($rootScope);
        givenScope.anAttr.should.eql(42);
      });
    });

    it('allows aliasing expression attribute on isolate scope', function () {
      var givenScope;
      var injector = makeInjectorWithDirective('myDirective', function () {
        return {
          scope: {
            anAttr: '=theAttr'
          },
          link: function (scope) {
            givenScope = scope;
          }
        };
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive the-attr="42"></div>');
        $compile(el)($rootScope);
        givenScope.anAttr.should.eql(42);
      });
    });

    it('evaluates isolate scope expression on parent scope', function () {
      var givenScope;
      var injector = makeInjectorWithDirective('myDirective', function () {
        return {
          scope: {
            myAttr: '='
          },
          link: function (scope) {
            givenScope = scope;
          }
        };
      });
      injector.invoke(function ($compile, $rootScope) {
        $rootScope.parentAttr = 41;
        var el = $('<div my-directive my-attr="parentAttr + 1"></div>');
        $compile(el)($rootScope);
        givenScope.myAttr.should.eql(42);
      });
    });

    it('allows assigning to isolated scope expressions', function () {
      var givenScope;
      var injector = makeInjectorWithDirective('myDirective', function () {
        return {
          scope: {
            myAttr: '='
          },
          link: function (scope) {
            givenScope = scope;
          }
        };
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive my-attr="parentAttr"></div>');
        $compile(el)($rootScope);
        givenScope.myAttr = 42;
        $rootScope.$digest();
        $rootScope.parentAttr.should.eql(42);
      });

    });

    it('gives parent change precedence when both parent and child change', function () {
      var givenScope;
      var injector = makeInjectorWithDirective('myDirective', function () {
        return {
          scope: {
            myAttr: '='
          },
          link: function (scope) {
            givenScope = scope;
          }
        };
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive my-attr="parentAttr"></div>');
        $compile(el)($rootScope);
        $rootScope.parentAttr = 42;
        givenScope.myAttr = 43;
        $rootScope.$digest();
        givenScope.myAttr.should.eql(42);
        $rootScope.parentAttr.should.eql(42);
      });

    });

    it('throws when isolate scope expression return new Arrays', function () {
      var givenScope;
      var injector = makeInjectorWithDirective('myDirective', function () {
        return {
          scope: {
            myAttr: '='
          },
          link: function (scope) {
            givenScope = scope;
          }
        };
      });
      injector.invoke(function ($compile, $rootScope) {
        $rootScope.parentFunction = function () {
          return [1, 2, 3];
        };
        var el = $('<div my-directive my-attr="parentFunction()"></div>');
        $compile(el)($rootScope);
        (function () {
          $rootScope.$digest();
        }).should.throw();
      });

    });

    it('can watch isolateed scope expression as collections', function () {
      var givenScope;
      var injector = makeInjectorWithDirective('myDirective', function () {
        return {
          scope: {
            myAttr: '=*'
          },
          link: function (scope) {
            givenScope = scope;
          }
        };
      });
      injector.invoke(function ($compile, $rootScope) {
        $rootScope.parentFunction = function () {
          return [1, 2, 3];
        };
        var el = $('<div my-directive my-attr="parentFunction()"></div>');
        $compile(el)($rootScope);
        $rootScope.$digest();
        givenScope.myAttr.should.eql([1, 2, 3]);
      });

    });

    it('does not watch optional missing isolate scope expressions', function () {
      var givenScope;
      var injector = makeInjectorWithDirective('myDirective', function () {
        return {
          scope: {
            myAttr: '=?'
          },
          link: function (scope) {
            givenScope = scope;
          }
        };
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive></div>');
        $compile(el)($rootScope);
        $rootScope.$$watchers.length.should.eql(0);
      });
    });

    it('allows binding an invokeable expression on the parent scope', function () {
      var givenScope;
      var injector = makeInjectorWithDirective('myDirective', function () {
        return {
          scope: {
            myExpr: '&'
          },
          link: function (scope) {
            givenScope = scope;
          }
        };
      });
      injector.invoke(function ($compile, $rootScope) {
        $rootScope.parentFunction = function () {
          return 42;
        };
        var el = $('<div my-directive my-expr="parentFunction() + 1"></div>');
        $compile(el)($rootScope);
        givenScope.myExpr().should.eql(43);
      });
    });

    it('allows passing arguments to parent scope expression', function () {
      var givenScope;
      var injector = makeInjectorWithDirective('myDirective', function () {
        return {
          scope: {
            myExpr: '&'
          },
          link: function (scope) {
            givenScope = scope;
          }
        };
      });
      injector.invoke(function ($compile, $rootScope) {
        var gotArg;
        $rootScope.parentFunction = function (arg) {
          gotArg = arg;
        };
        var el = $('<div my-directive my-expr="parentFunction(argFromChild)"></div>');
        $compile(el)($rootScope);
        givenScope.myExpr({argFromChild: 42});
        gotArg.should.eql(42);
      });
    });

    it('sets missing optional parent scope expression to undefined', function () {
      var givenScope;
      var injector = makeInjectorWithDirective('myDirective', function () {
        return {
          scope: {
            myExpr: '&?'
          },
          link: function (scope) {
            givenScope = scope;
          }
        };
      });
      injector.invoke(function ($compile, $rootScope) {
        var gotArg;
        $rootScope.parentFunction = function (arg) {
          gotArg = arg;
        };
        var el = $('<div my-directive></div>');
        $compile(el)($rootScope);
        should(givenScope.myExpr).be.undefined();
      });
    });

  });


  describe('controllers', function () {


    it('can be attached to directives as function', function () {
      var controllerInvoked;
      var injector = makeInjectorWithDirective('myDirective', function () {
        return {
          controller: function MyController() {
            controllerInvoked = true;
          }
        };
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive></div>');
        $compile(el)($rootScope);
        controllerInvoked.should.be.true();
      });
    });

    it('can be attached to directives as string reference', function () {
      var controllerInvoked;
      function MyController() {
        controllerInvoked = true;
      }

      var injector = createInjector(['ng', function ($controllerProvider, $compileProvider) {
        $controllerProvider.register('MyController', MyController);
        $compileProvider.directive('myDirective', function () {
          return { controller: 'MyController' };
        });
      }]);

      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive></div>');
        $compile(el)($rootScope);
        controllerInvoked.should.be.true();
      });
    });

    it('can be applied in the same element independent of each other', function () {
      var controllerInvoked;
      var otherControllerInvoked;

      function MyController() {
        controllerInvoked = true;
      }
      function MyOtherController() {
        otherControllerInvoked = true;
      }

      var injector = createInjector(['ng', function ($controllerProvider, $compileProvider) {
        $controllerProvider.register('MyController', MyController);
        $controllerProvider.register('MyOtherController', MyOtherController);
        $compileProvider.directive('myDirective', function () {
          return { controller: 'MyController' };
        });
        $compileProvider.directive('myOtherDirective', function () {
          return { controller: 'MyOtherController'};
        });
      }]);

      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive my-other-directive></div>');
        $compile(el)($rootScope);
        controllerInvoked.should.be.true();
        otherControllerInvoked.should.be.true();
      });
    });

    it('can be applied to different directives, as different instances', function() {
      var invocations = 0;
      function MyController() {
        invocations++;
      }
      var injector = createInjector(['ng', function ($controllerProvider, $compileProvider) {
        $controllerProvider.register('MyController', MyController);
        $compileProvider.directive('myDirective', function() {
          return {controller: 'MyController'};
        });
        $compileProvider.directive('myOtherDirective', function() {
          return {controller: 'MyController'};
        });
      }]);
      injector.invoke(function($compile, $rootScope) {
        var el = $('<div my-directive my-other-directive></div>');
        $compile(el)($rootScope);
        invocations.should.eql(2);
      });
    });

    it('can be aliased with @ when given in directive attribute', function() {
      var controllerInvoked;
      function MyController() {
        controllerInvoked = true;
      }
      var injector = createInjector(['ng', function ($controllerProvider, $compileProvider) {
        $controllerProvider.register('MyController', MyController);
        $compileProvider.directive('myDirective', function() {
          return {controller: '@'};
        });
      }]);
      injector.invoke(function($compile, $rootScope) {
        var el = $('<div my-directive="MyController"></div>');
        $compile(el)($rootScope);
        controllerInvoked.should.be.true();
      });
    });

    it('gets scope, element, and attrs through DI', function () {
      var gotScope, gotElement, gotAttrs;
      function MyController($element, $scope, $attrs) {
        gotElement = $element;
        gotScope = $scope;
        gotAttrs = $attrs;
      }

      var injector = createInjector(['ng', function ($controllerProvider, $compileProvider) {
        $controllerProvider.register('MyController', MyController);
        $compileProvider.directive('myDirective', function () {
          return {controller: 'MyController'};
        });
      }]);
      injector.invoke(function($compile, $rootScope) {
        var el = $('<div my-directive an-attr="abc"></div>');
        $compile(el)($rootScope);
        gotElement[0].should.be.exactly(el[0]);
        gotScope.should.be.exactly($rootScope);
        gotAttrs.should.be.Object();
        gotAttrs.anAttr.should.eql('abc');
      });
    });

    it('can be attached on the scope', function() {
      function MyController() {}
      var injector = createInjector(['ng', function($controllerProvider, $compileProvider) {
        $controllerProvider.register('MyController', MyController);
        $compileProvider.directive('myDirective', function () {
          return {
            controller: 'MyController',
            controllerAs: 'myCtrl'
          };
        });
      }]);
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive ></div>');
        $compile(el)($rootScope);
        $rootScope.myCtrl.should.be.Object();
        $rootScope.myCtrl.should.be.instanceOf(MyController);
      });
    });

    it('gets isolate scope as injected $scope', function () {
      var gotScope;
      function MyController($scope) {
        gotScope = $scope;
      }
      var injector = createInjector(['ng', function($controllerProvider, $compileProvider) {
        $controllerProvider.register('MyController', MyController);
        $compileProvider.directive('myDirective', function() {
          return {
            scope: {},
            controller: 'MyController'
          };
        });
      }]);
      injector.invoke(function($compile, $rootScope) {
        var el = $('<div my-directive></div>');
        $compile(el)($rootScope);
        gotScope.should.not.be.exactly($rootScope);
      });
    });

    it('has isolate scope bindings available during construction', function () {
      var gotMyAttr;
      function MyController($scope) {
        gotMyAttr = $scope.myAttr;
      }

      var injector = createInjector(['ng', function ($controllerProvider, $compileProvider) {
        $controllerProvider.register('MyController', MyController);
        $compileProvider.directive('myDirective', function () {
          return {
            scope: {
              myAttr: '@myDirective'
            },
            controller: 'MyController'
          };
        });
      }]);
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive="abc"></div>');
        $compile(el)($rootScope);
        gotMyAttr.should.eql('abc');
      });
    });

    it('can bind isolate scope bindings directly to self', function () {
      var gotMyAttr;
      function MyController() {
        gotMyAttr = this.myAttr;
      }

      var injector = createInjector(['ng', function ($controllerProvider, $compileProvider) {
        $controllerProvider.register('MyController', MyController);
        $compileProvider.directive('myDirective', function () {
          return {
            scope: {
              myAttr: '@myDirective'
            },
            controller: 'MyController',
            bindToController: true
          };
        });
      }]);
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive="abc"></div>');
        $compile(el)($rootScope);
        gotMyAttr.should.eql('abc');
      });
    });

    it('can bind isolate scope bindings through bindToController', function () {
      var gotMyAttr;
      function MyController() {
        gotMyAttr = this.myAttr;
      }

      var injector = createInjector(['ng', function ($controllerProvider, $compileProvider) {
        $controllerProvider.register('MyController', MyController);
        $compileProvider.directive('myDirective', function() {
          return {
            scope: {},
            controller: 'MyController',
            bindToController: {
              myAttr: '@myDirective'
            }
          };
        });
      }]);
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive="abc"></div>');
        $compile(el)($rootScope);
        gotMyAttr.should.eql('abc');
      });
    });

    it('can bind through bindToController without isolate scope', function () {
      var gotMyAttr;
      function MyController() {
        gotMyAttr = this.myAttr;
      }

      var injector = createInjector(['ng', function ($controllerProvider, $compileProvider) {
        $controllerProvider.register('MyController', MyController);
        $compileProvider.directive('myDirective', function() {
          return {
            scope: true,
            controller: 'MyController',
            bindToController: {
              myAttr: '@myDirective'
            }
          };
        });
      }]);
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive="abc"></div>');
        $compile(el)($rootScope);
        gotMyAttr.should.eql('abc');
      });
    });

    it('can be required from a sibling directive', function () {
      function MyController() {}
      var gotMyController;
      var injector = createInjector(['ng', function ($compileProvider) {
        $compileProvider.directive('myDirective', function () {
          return {
            scope: {},
            controller: MyController
          };
        });
        $compileProvider.directive('myOtherDirective', function () {
          return {
            require: 'myDirective',
            link: function (scope, element, attrs, myController) {
              gotMyController = myController;
            }
          };
        });
      }]);
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive my-other-directive></div>');
        $compile(el)($rootScope);
        gotMyController.should.be.Object();
        gotMyController.should.be.instanceOf(MyController);
      });
    });

    it('can be required from multiple sibling directives', function () {
      function MyController() {}
      function MyOtherController() {}
      var gotControllers;
      var injector = createInjector(['ng', function ($compileProvider) {
        $compileProvider.directive('myDirective', function () {
          return {
            scope: true,
            controller: MyController
          };
        });
        $compileProvider.directive('myOtherDirective', function () {
          return {
            scope: true,
            controller: MyOtherController
          };
        });
        $compileProvider.directive('myThirdDirective', function () {
          return {
            require: ['myDirective', 'myOtherDirective'],
            link: function (scope, element, attrs, controllers) {
              gotControllers = controllers;
            }
          };
        });
      }]);
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive my-other-directive my-third-directive></div>');
        $compile(el)($rootScope);
        gotControllers.should.be.Array();
        gotControllers.length.should.eql(2);
        gotControllers[0].should.be.instanceOf(MyController);
        gotControllers[1].should.be.instanceOf(MyOtherController);
      });
    });

    it('is passed to link functions if there is no require', function () {
      function MyController() {}
      var gotMyController;
      var injector = createInjector(['ng', function ($compileProvider) {
        $compileProvider.directive('myDirective', function () {
          return {
            scope: {},
            controller: MyController,
            link: function (scope, element, attrs, myController) {
              gotMyController = myController;
            }
          };
        });
      }]);
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive></div>');
        $compile(el)($rootScope);
        gotMyController.should.be.Object();
        gotMyController.should.be.instanceOf(MyController);
      });
    });

    it('is passed through grouped link wrapper', function () {
      function MyController() {}
      var gotMyController;
      var injector = createInjector(['ng', function ($compileProvider) {
        $compileProvider.directive('myDirective', function () {
          return {
            multiElement: true,
            scope: {},
            controller: MyController,
            link: function (scope, element, attrs, myController) {
              gotMyController = myController;
            }
          };
        });
      }]);
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive-start></div><div my-directive-end></div>');
        $compile(el)($rootScope);
        gotMyController.should.be.Object();
        gotMyController.should.be.instanceOf(MyController);
      });
    });

    it('can be required from a parent directive', function () {
      function MyController() {}
      var gotMyController;
      var injector = createInjector(['ng', function ($compileProvider) {
        $compileProvider.directive('myDirective', function () {
          return {
            scope: {},
            controller: MyController
          };
        });
        $compileProvider.directive('myOtherDirective', function () {
          return {
            require: '^myDirective',
            link: function (scope, element, attrs, myController) {
              gotMyController = myController;
            }
          };
        });
      }]);
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive><div my-other-directive></div></div>');
        $compile(el)($rootScope);
        gotMyController.should.be.Object();
        gotMyController.should.be.instanceOf(MyController);
      });
    });

    it('finds from sibling directive when requiring with parent prefix', function () {
      function MyController() {}
      var gotMyController;
      var injector = createInjector(['ng', function ($compileProvider) {
        $compileProvider.directive('myDirective', function () {
          return {
            scope: {},
            controller: MyController
          };
        });
        $compileProvider.directive('myOtherDirective', function () {
          return {
            require: '^myDirective',
            link: function (scope, element, attrs, myController) {
              gotMyController = myController;
            }
          };
        });
      }]);
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive my-other-directive></div>');
        $compile(el)($rootScope);
        gotMyController.should.be.Object();
        gotMyController.should.be.instanceOf(MyController);
      });
    });

    it('can be required from a parent directive with ^^', function () {
      function MyController() {}
      var gotMyController;
      var injector = createInjector(['ng', function ($compileProvider) {
        $compileProvider.directive('myDirective', function () {
          return {
            scope: {},
            controller: MyController
          };
        });
        $compileProvider.directive('myOtherDirective', function () {
          return {
            require: '^^myDirective',
            link: function (scope, element, attrs, myController) {
              gotMyController = myController;
            }
          };
        });
      }]);
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive><div my-other-directive></div></div>');
        $compile(el)($rootScope);
        gotMyController.should.be.Object();
        gotMyController.should.be.instanceOf(MyController);
      });
    });

    it('does not find from sibling directive when requiring with ^^', function () {
      function MyController() {}
      var gotMyController;
      var injector = createInjector(['ng', function ($compileProvider) {
        $compileProvider.directive('myDirective', function () {
          return {
            scope: {},
            controller: MyController
          };
        });
        $compileProvider.directive('myOtherDirective', function () {
          return {
            require: '^^myDirective',
            link: function (scope, element, attrs, myController) {
              gotMyController = myController;
            }
          };
        });
      }]);
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive my-other-directive></div>');
        (function() {
          $compile(el)($rootScope);
        }).should.throw();
      });
    });

    it('does not throw on required missing controller when optional', function () {
      var gotCtrl;
      var injector = createInjector(['ng', function ($compileProvider) {
        $compileProvider.directive('myDirective', function () {
          return {
            require: '?noSuchDirective',
            link: function (scope, element, attrs, ctrl) {
              gotCtrl = ctrl;
            }
          };
        });
      }]);
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive></div>');
        $compile(el)($rootScope);
        should(gotCtrl).be.null();
      });

    });

    it('allows optional marker after parent marker', function () {
      var gotCtrl;
      var injector = createInjector(['ng', function ($compileProvider) {
        $compileProvider.directive('myDirective', function () {
          return {
            require: '^?noSuchDirective',
            link: function functionName(scope, element, attrs, ctrl) {
              gotCtrl = ctrl;
            }
          };
        });
      }]);
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive></div>');
        $compile(el)($rootScope);
        should(gotCtrl).be.null();
      });
    });

    it('allows optional marker before parent marker', function () {
      function MyController() {}
      var gotMyController;
      var injector = createInjector(['ng', function ($compileProvider) {
        $compileProvider.directive('myDirective', function () {
          return {
            scope: {},
            controller: MyController
          };
        });
        $compileProvider.directive('myOtherDirective', function () {
          return {
            require: '?^myDirective',
            link: function (scope, element, attrs, ctrl) {
              gotMyController = ctrl;
            }
          };
        });
      }]);
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive my-other-directive></div>');
        $compile(el)($rootScope);
        gotMyController.should.be.Object();
        gotMyController.should.be.instanceOf(MyController);
      });
    });
  });
  describe('template', function() {

    it('populates an element during comilation', function() {
      var injector = makeInjectorWithDirective('myDirective', function() {
        return {
          template: '<div class="from-template"></div>'
        };
      });
      injector.invoke(function($compile) {
        var el = $('<div my-directive></div>');
        $compile(el);
        el.find('> .from-template').length.should.eql(1);
      });
    });

    it('replaces any existing children', function() {
      var injector = makeInjectorWithDirective('myDirective', function() {
        return {
          template: '<div class="from-template"></div>'
        };
      });
      injector.invoke(function($compile) {
        var el = $('<div my-directive><div class="existing"></div></div>');
        $compile(el);
        el.find('> .existing').length.should.eql(0);
      });
    });

    it('compiles template contents also', function() {
      var compileSpy = sinon.spy();
      var injector = makeInjectorWithDirective({
        myDirective: function() {
          return {
            template: '<div my-other-directive></div>'
          };
        },
        myOtherDirective: function() {
          return {
            compile: compileSpy
          };
        }
      });
      injector.invoke(function($compile) {
        var el = $('<div my-directive></div>');
        $compile(el);
        compileSpy.called.should.be.true();
      });
    });

    it('does not allow two directives with templates', function() {
      var injector = makeInjectorWithDirective({
        myDirective: function() {
          return {
            template: '<div></div>'
          };
        },
        myOtherDirective: function() {
          return {
            template: '<div></div>'
          };
        }
      });
      injector.invoke(function($compile) {
        var el = $('<div my-directive my-other-directive></div>');
        (function() {
          $compile(el);
        }).should.throw();
      });
    });

    it('supports functions as template values', function () {
      var templateStub = sinon.stub();
      templateStub.returns('<div class="from-template"></div>');
      var injector = makeInjectorWithDirective({
        myDirective: function () {
          return {
            template: templateStub
          };
        }
      });
      injector.invoke(function ($compile) {
        var el = $('<div my-directive></div>');
        $compile(el);
        el.find('> .from-template').length.should.eql(1);
        templateStub.args[0][0][0].should.be.exactly(el[0]);
        templateStub.args[0][1].myDirective.should.not.be.undefined(); // 需要看看代码这个值是什么
      });
    });

    it('uses isolate scope for template contents', function () {
      var linkSpy = sinon.spy();
      var injector = makeInjectorWithDirective({
        myDirective: function () {
          return {
            scope: {
              isoValue: '=myDirective'
            },
            template: '<div my-other-directive></div>'
          };
        },
        myOtherDirective: function () {
          return {link: linkSpy};
        }
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive="42"></div>');
        $compile(el)($rootScope);
        linkSpy.args[0][0].should.not.be.exactly($rootScope);
        linkSpy.args[0][0].isoValue.should.eql(42);
      });
    });

  });


  describe('templateUrl', function () {

    var xhr, requests;

    beforeEach(function () {
      xhr = sinon.useFakeXMLHttpRequest();
      requests = [];
      xhr.onCreate = function (req) {
        requests.push(req);
      };
    });

    afterEach(function () {
      xhr.restore();
    });

    it('defers remaining directive compilation', function () {
      var otherCompileSpy = sinon.spy();
      var injector = makeInjectorWithDirective({
        myDirective: function () {
          return {templateUrl: '/my_directive.html'};
        },
        myOtherDirective: function () {
          return {compile: otherCompileSpy};
        }
      });
      injector.invoke(function ($compile) {
        var el = $('<div my-directive my-other-directive></div>');
        $compile(el);
        otherCompileSpy.called.should.be.false();
      });
    });

    it('defers current directive compilation', function () {
      var compileSpy = sinon.spy();
      var injector = makeInjectorWithDirective({
        myDirective: function () {
          return {
            templateUrl: '/my_directive.html',
            compile: compileSpy
          };
        }
      });
      injector.invoke(function ($compile) {
        var el = $('<div my-directive></div>');
        $compile(el);
        compileSpy.called.should.be.false();
      });
    });

    it('immediately empites out the element', function () {
      var injector = makeInjectorWithDirective({
        myDirective: function () {
          return {templateUrl: '/my_directive.html'};
        }
      });
      injector.invoke(function ($compile) {
        var el = $('<div my-directive>Hello</div>');
        $compile(el);
        el.is(':empty').should.be.true();
      });
    });

    it('fetch the template', function () {
      var injector = makeInjectorWithDirective({
        myDirective: function () {
          return {templateUrl: '/my_directive.html'};
        }
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive></div>');

        $compile(el);
        // 为什么要tick off Promise chain？ 不是应该自己触发吗？
        // 确实已经是这样了，因为config是通过promise返回的。
        // ？？？
        $rootScope.$apply();

        requests.length.should.eql(1);
        requests[0].method.should.eql('GET');
        requests[0].url.should.eql('/my_directive.html');
      });
    });

    it('populates element with template', function () {
      var injector = makeInjectorWithDirective({
        myDirective: function () {
          return {templateUrl: '/my_directive.html'};
        }
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive></div>');

        $compile(el);
        $rootScope.$apply();

        requests[0].respond(200, {}, '<div class="from-template"></div>');
        el.find('> .from-template').length.should.eql(1);
      });
    });

    it('compiles currrent directive when template received', function () {
      var compileSpy = sinon.spy();
      var injector = makeInjectorWithDirective({
        myDirective: function () {
          return {
            templateUrl: '/my_directive.html',
            compile: compileSpy
          };
        }
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive></div>');

        $compile(el);
        $rootScope.$apply();

        requests[0].respond(200, {}, '<div class="from-template"></div>');
        compileSpy.called.should.be.true();
      });


    });

    it('resumes compilation when template received', function () {
      var otherCompileSpy = sinon.spy();
      var injector = makeInjectorWithDirective({
        myDirective: function () {
          return {templateUrl: '/my_directive.html'};
        },
        myOtherDirective: function () {
          return {compile: otherCompileSpy};
        }
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive my-other-directive></div>');

        $compile(el);
        $rootScope.$apply();
        requests[0].respond(200, {}, '<div class="from-template"></div>');
        otherCompileSpy.called.should.be.true();
      });

    });

    it('resumes child compilation after template received', function () {
      var otherCompileSpy = sinon.spy();
      var injector = makeInjectorWithDirective({
        myDirective: function () {
          return {templateUrl: '/my_directive.html'};
        },
        myOtherDirective: function () {
          return {compile: otherCompileSpy};
        }
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive></div>');

        $compile(el);
        $rootScope.$apply();

        requests[0].respond(200, {}, '<div my-other-directive></div>');
        otherCompileSpy.called.should.be.true();
      });
    });

    it('supports functions as values', function () {
      var templateUrlStub = sinon.stub();
      templateUrlStub.returns('/my_directive.html');
      var injector = makeInjectorWithDirective({
        myDirective: function () {
          return {
            templateUrl: templateUrlStub
          };
        }
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive></div>');

        $compile(el);
        $rootScope.$apply();

        requests[0].url.should.eql('/my_directive.html');
        templateUrlStub.args[0][0][0].should.be.exactly(el[0]);
        templateUrlStub.args[0][1].myDirective.should.not.be.undefined();
      });
    });

    it('does not allow templateUrl directive after tempalte directive', function () {
      var injector = makeInjectorWithDirective({
        myDirective: function () {
          return {template: '<div></div>'};
        },
        myOtherDirective: function () {
          return {templateUrl: '/my_other_directive.html'};
        }
      });
      injector.invoke(function ($compile) {
        var el = $('<div my-directive my-other-directive></div>');
        (function() {
          $compile(el);
        }).should.throw();
      });
    });

    it('does not allow template directive after tempalteUrl directive', function () {
      var injector = makeInjectorWithDirective({
        myDirective: function () {
          return {templateUrl: '/my_directive.html'};
        },
        myOtherDirective: function () {
          return {template: '<div></div>'};
        }
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive my-other-directive></div>');

        $compile(el);
        $rootScope.$apply();

        requests[0].respond(200, {}, '<div class="replacement"></div>');
        el.find('> .replacement').length.should.eql(1);

      });
    });

    it('links the directive when public link function is invoked', function () {
      var linkSpy = sinon.spy();
      var injector = makeInjectorWithDirective({
        myDirective: function () {
          return {
            templateUrl: '/my_directive.html',
            link: linkSpy
          };
        }
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive></div>');

        var linkFunction = $compile(el);

        $rootScope.$apply();
        requests[0].respond(200, {}, '<div></div>');

        linkFunction($rootScope);
        linkSpy.called.should.be.true();
        linkSpy.args[0][1][0].should.be.exactly(el[0]);
        linkSpy.args[0][2].should.be.Object();
      });
    });

    it('links child elements when public link function is invoked', function () {
      var linkSpy = sinon.spy();
      var injector = makeInjectorWithDirective({
        myDirective: function () {
          return { templateUrl: '/my_directive.html' };
        },
        myOtherDirective: function () {
          return { link: linkSpy };
        }
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<my-directive></div>');

        var linkFunction = $compile(el);
        $rootScope.$apply();

        requests[0].respond(200, {}, '<div my-other-directive></div>');

        linkFunction($rootScope);
        linkSpy.called.should.be.true();
        linkSpy.args[0][1][0].should.be.exactly(el[0].firstChild);
        linkSpy.args[0][2].should.be.Object();
      });
    });

    it('links when template arrives if node link fn was called', function () {
      var linkSpy = sinon.spy();
      var injector = makeInjectorWithDirective({
        myDirective: function () {
          return {
            templateUrl: '/my_directive.html',
            link: linkSpy
          };
        }
      });
      injector.invoke(function ($compile, $rootScope) {

        var el = $('<div my-directive></div>');
        var linkFunction = $compile(el)($rootScope); // link first

        $rootScope.$apply();
        requests[0].respond(200, {}, '<div></div>'); // then receive template

        linkSpy.called.should.be.true();
        linkSpy.args[0][0].should.be.exactly($rootScope);
        linkSpy.args[0][1][0].should.be.exactly(el[0]);
        linkSpy.args[0][2].should.be.Object();
      });
    });

    it('links directives that were compiled earlier', function () {
      var linkSpy = sinon.spy();
      var injector = makeInjectorWithDirective({
        myDirective: function () {
          return {link: linkSpy};
        },
        myOtherDirective: function () {
          return {templateUrl: '/my_other_directive.html'};
        }
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive my-other-directive></div>');

        var linkFunction = $compile(el);
        $rootScope.$apply();

        linkFunction($rootScope);

        requests[0].respond(200, {}, '<div></div>');
        linkSpy.called.should.be.true();
        linkSpy.args[0][0].should.be.exactly($rootScope);
        linkSpy.args[0][1][0].should.be.exactly(el[0]);
        linkSpy.args[0][2].should.be.Object();
      });
    });

    it('retains isolate scope directives from earlier', function () {
      var linkSpy = sinon.spy();
      var injector = makeInjectorWithDirective({
        myDirective: function () {
          return {
            scope: {var: '=myDirective'},
            link: linkSpy
          };
        },
        myOtherDirective: function () {
          return {templateUrl: '/my_other_directive.html'};
        }
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive="42" my-other-directive></div>');

        var linkFunction = $compile(el);
        $rootScope.$apply();
        linkFunction($rootScope);

        requests[0].respond(200, {}, '<div></div>');
        linkSpy.called.should.be.true();
        linkSpy.args[0][0].should.not.be.exactly($rootScope);
        linkSpy.args[0][1][0].should.be.exactly(el[0]);
        linkSpy.args[0][2].should.be.Object();
      });
    });

    it('sets up controllers for all controller directive', function () {
      var myDirectiveControllerInstantiated, myOtherDirectiveControllerInstantiated;
      var injector = makeInjectorWithDirective({
        myDirective: function () {
          return {
            controller: function MyDirectiveController() {
              myDirectiveControllerInstantiated = true;
            }
          };
        },
        myOtherDirective: function () {
          return {
            templateUrl: '/my_other_directive.html',
            controller: function MyOtherDirectiveController() {
              myOtherDirectiveControllerInstantiated = true;
            }
          };
        }
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive my-other-directive></div>');

        $compile(el)($rootScope);
        $rootScope.$apply();

        requests[0].respond(200, {}, '<div></div>');
        myDirectiveControllerInstantiated.should.be.true();
        myOtherDirectiveControllerInstantiated.should.be.true();
      });
    });


    describe('with transclusion', function () {

      it('works when template arrves first', function () {

        var injector = makeInjectorWithDirective({
          myTranscluder: function () {
            return {
              transclude: true,
              templateUrl: 'my_template.html',
              link: function (scope, element, attrs, ctrl, transclude) {
                element.find('[in-template]').append(transclude());
              }
            };
          }
        });
        injector.invoke(function ($compile, $rootScope) {
          var el = $('<div my-transcluder><div in-transclude></div></div>');

          var linkFunction = $compile(el);
          $rootScope.$apply();
          requests[0].respond(200, {}, '<div in-template></div>'); //respond first
          linkFunction($rootScope); // then link

          el.find('> [in-template] > [in-transclude]').length.should.eql(1);
        });

      });

      it('works when template arrves after', function () {

        var injector = makeInjectorWithDirective({
          myTranscluder: function () {
            return {
              transclude: true,
              templateUrl: 'my_template.html',
              link: function (scope, element, attrs, ctrl, transclude) {
                element.find('[in-template]').append(transclude());
              }
            };
          }
        });
        injector.invoke(function ($compile, $rootScope) {
          var el = $('<div my-transcluder><div in-transclude></div></div>');

          var linkFunction = $compile(el);
          $rootScope.$apply();
          linkFunction($rootScope); // link first
          requests[0].respond(200, {}, '<div in-template></div>'); // then respond

          el.find('> [in-template] > [in-transclude]').length.should.eql(1);
        });

      });

      it('is only allowed once', function () {
        var otherCompileSpy = sinon.spy();
        var injector = makeInjectorWithDirective({
          myTranscluder: function () {
            return {
              priority: 1,
              transclude: true,
              templateUrl: 'my_template.html'
            };
          },
          mySecondTranscluder: function () {
            return {
              priority: 0,
              transclude: true,
              compile: otherCompileSpy
            };
          }
        });
        injector.invoke(function ($compile, $rootScope) {
          var el = $('<div my-transcluder my-second-transcluder></div>');

          $compile(el);
          $rootScope.$apply();
          requests[0].respond(200, {}, '<div in-template></div>');

          otherCompileSpy.called.should.be.false();
        });
      });

    });

  });

  describe('transclude', function () {

    it('removes the children of the element from the DOM', function () {
      var injector = makeInjectorWithDirective({
        myTranscluder: function () {
          return {transclude: true};
        }
      });
      injector.invoke(function($compile) {
        var el = $('<div my-transcluder><div>Must go</div></div>');

        $compile(el);
        el.is(':empty').should.be.true();
      });
    });

    it('compiles child elements', function () {
      var insideCompileSpy = sinon.spy();
      var injector = makeInjectorWithDirective({
        myTranscluder: function () {
          return {transclude: true};
        },
        insideTranscluder: function () {
          return {compile: insideCompileSpy};
        }
      });
      injector.invoke(function($compile) {
        var el = $('<div my-transcluder><div inside-transcluder></div></div>');

        $compile(el);

        insideCompileSpy.called.should.be.true();
      });
    });

    it('makes contents available to directive link function.', function () {
      var injector = makeInjectorWithDirective({
        myTranscluder: function () {
          return {
            transclude: true,
            template: '<div in-template></div>',
            link: function (scope, element, attrs, ctrl, transclude) {
              element.find('[in-template]').append(transclude());
            }
          };
        }
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-transcluder><div in-transcluder></div></div>');

        $compile(el)($rootScope);

        el.find('> [in-template] > [in-transcluder]').length.should.eql(1);
      });
    });

    it('is only allowed once per element', function () {
      var injector = makeInjectorWithDirective({
        myTranscluder: function () {
          return {transclude: true};
        },
        mySecondTranscluder: function () {
          return {transclude: true};
        }
      });
      injector.invoke(function ($compile) {
        var el = $('<div my-transcluder my-second-transcluder></div>');
        (function () {
          $compile(el);
        }).should.throw();
      });
    });

    it('makes scope available to link functions inside', function () {
      var injector = makeInjectorWithDirective({
        myTranscluder: function () {
          return {
            transclude: true,
            link: function (scope, element, attrs, ctrl, transclude) {
              element.append(transclude());
            }
          };
        },
        myInnerDirective: function () {
          return {
            link: function (scope, element) {
              element.html(scope.anAttr);
            }
          };
        }
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-transcluder><div my-inner-directive></div>');
        $rootScope.anAttr = 'Hello from root';

        $compile(el)($rootScope);

        el.find('> [my-inner-directive]').html().should.eql('Hello from root');
      });
    });

    it('does not use the inherited scope of the directive', function () {
      var injector = makeInjectorWithDirective({
        myTranscluder: function () {
          return {
            transclude: true,
            scope: true,
            link: function (scope, element, attrs, ctrl, transclude) {
              scope.anAttr = 'Shadowed attribute';
              element.append(transclude());
            }
          };
        },
        myInnerDirective: function () {
          return {
            link: function (scope, element) {
              element.html(scope.anAttr);
            }
          };
        }
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-transcluder><div my-inner-directive></div>');
        $rootScope.anAttr = 'Hello from root';

        $compile(el)($rootScope);

        el.find('> [my-inner-directive]').html().should.eql('Hello from root');
      });
    });

    it('stop watching when transcluding directive is destoryed', function () {
      var watchSpy = sinon.spy();
      var injector = makeInjectorWithDirective({
        myTranscluder: function () {
          return {
            transclude: true,
            scope: true,
            link: function (scope, element, attrs, ctrl, transclude) {
              element.append(transclude());
              scope.$on('destroyNow', function () {
                scope.$destroy();
              });
            }
          };
        },
        myInnerDirective: function () {
          return {
            link: function (scope) {
              scope.$watch(watchSpy);
            }
          };
        }
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-transcluder><div my-inner-directive></div></div>');
        $compile(el)($rootScope);

        $rootScope.$apply();
        watchSpy.callCount.should.eql(2);

        $rootScope.$apply();
        watchSpy.callCount.should.eql(3);

        $rootScope.$broadcast('destroyNow');
        $rootScope.$apply();

        watchSpy.callCount.should.eql(3);

      });
    });

    it('allows passing another scope to transclusion function', function () {

      var otherLinkSpy = sinon.spy();
      var injector = makeInjectorWithDirective({
        myTranscluder: function () {
          return {
            transclude: true,
            scope: {},
            template: '<div></div>',
            link: function (scope, element, attrs, ctrl, transclude) {
              var mySpecialScope = scope.$new(true);
              mySpecialScope.specialAttr = 42;
              transclude(mySpecialScope);
            }
          };
        },
        myOtherDirective: function () {
          return {link: otherLinkSpy};
        }
      });
      injector.invoke(function($compile, $rootScope) {
        var el = $('<div my-transcluder><div my-other-directive></div></div>');

        $compile(el)($rootScope);

        var transcludeScope = otherLinkSpy.args[0][0];
        transcludeScope.specialAttr.should.eql(42);
      });

    });

    it('makes contents available to child elements', function () {
      var injector = makeInjectorWithDirective({
        myTranscluder: function () {
          return {
            transclude: true,
            template: '<div in-template></div>'
          };
        },
        inTemplate: function () {
          return {
            link: function (scope, element, attrs, ctrl, transcludeFn) {
              element.append(transcludeFn());
            }
          };
        }
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-transcluder><div in-transclude></div></div>');

        $compile(el)($rootScope);

        el.find('> [in-template] > [in-transclude]').length.should.eql(1);
      });
    });

    it('makes contents available to indirect child elements', function () {
      var injector = makeInjectorWithDirective({
        myTranscluder: function () {
          return {
            transclude: true,
            template: '<div><div in-template></div></div>'
          };
        },
        inTemplate: function () {
          return {
            link: function (scope, element, attrs, ctrl, transcludeFn) {
              element.append(transcludeFn());
            }
          };
        }
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-transcluder><div in-transclude></div></div>');

        $compile(el)($rootScope);

        el.find('> div > [in-template] > [in-transclude]').length.should.eql(1);
      });
    });

    it('supports passing transclusion function to public link function', function () {
      var injector = makeInjectorWithDirective({
        myTranscluder: function ($compile) {
          return {
            transclude: true,
            link: function (scope, element, attrs, ctrl, transclude) {
              var customTemplate = $('<div in-custom-template></div>');
              element.append(customTemplate);
              $compile(customTemplate)(scope, undefined, {
                parentBoundTranscludeFn: transclude
              });
            }
          };
        },
        inCustomTemplate: function () {
          return {
            link: function (scope, element, attrs, ctrl, transclude) {
              element.append(transclude());
            }
          };
        }
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-transcluder><div in-transclude></div></div>');
        $compile(el)($rootScope);
        el.find('> [in-custom-template] > [in-transclude]').length.should.eql(1);
      });
    });

    it('destroys scope passed through public link fn at the right time', function () {
      var watchSpy = sinon.spy();
      var injector = makeInjectorWithDirective({
        myTranscluder: function ($compile) {
          return {
            transclude: true,
            link:function (scope, element, attrs, ctrl, transclude) {
              var customTemplate = $('<div in-custom-template></div>');
              element.append(customTemplate);
              $compile(customTemplate)(scope, undefined, {
                parentBoundTranscludeFn: transclude
              });
            }
          };
        },
        inCustomTemplate: function () {
          return {
            scope: true,
            link: function (scope, element, attrs, ctrl, transclude) {
              element.append(transclude());
              scope.$on('destroyNow', function () {
                scope.$destroy();
              });
            }
          };
        },
        inTransclude: function () {
          return {
            link:function (scope) {
              scope.$watch(watchSpy);
            }
          };
        }
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-transcluder><div in-transclude></div></div>');
        $compile(el)($rootScope);

        $rootScope.$apply();
        watchSpy.callCount.should.eql(2);

        $rootScope.$apply();
        watchSpy.callCount.should.eql(3);

        $rootScope.$broadcast('destroyNow');
        $rootScope.$apply();
        watchSpy.callCount.should.eql(3);
      });
    });

    it('makes contents available to controller', function () {
      var injector = makeInjectorWithDirective({
        myTranscluder: function () {
          return {
            transclude: true,
            template: '<div in-template></div>',
            controller: function ($element, $transclude) {
              $element.find('[in-template]').append($transclude());
            }
          };
        }
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-transcluder><div in-transclude></div></div>');
        $compile(el)($rootScope);
        el.find('> [in-template] > [in-transclude]').length.should.eql(1);
      });
    });

  });

  describe('clone attach function', function () {

    it('can be passed to public link fn', function () {
      var injector = makeInjectorWithDirective({});
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div>Hello</div>');
        var myScope = $rootScope.$new();
        var gotEl, gotScope;

        $compile(el)(myScope, function cloneAttachFn(el, scope) {
          gotEl = el;
          gotScope = scope;
        });

        gotEl[0].isEqualNode(el[0]).should.be.true();
        gotScope.should.be.exactly(myScope);
      });
    });

    it('causes compiled elements to be cloned', function () {
      var injector = makeInjectorWithDirective({});
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div>Hello</div>');
        var myScope = $rootScope.$new();
        var gotCloneEl;

        $compile(el)(myScope, function (cloneEl) {
          gotCloneEl = cloneEl;
        });

        gotCloneEl[0].isEqualNode(el[0]).should.be.true();
        gotCloneEl[0].should.not.be.exactly(el[0]);
      });
    });

    it('causes cloned DOM to be linked', function () {
      var gotCompileEl, gotLinkEl;
      var injector = makeInjectorWithDirective({
        myDirective: function () {
          return {
            compile: function (compileEl) {
              gotCompileEl = compileEl;
              return function link(scope, linkEl) {
                gotLinkEl = linkEl;
              };
            }
          };
        }
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive></div>');
        var myScope = $rootScope.$new();

        $compile(el)(myScope, function () {});

        gotCompileEl[0].should.not.equal(gotLinkEl[0]);
      });
    });

    it('allows connecting transcluded content', function () {
      var injector = makeInjectorWithDirective({
        myTranscluder: function () {
          return {
            transclude: true,
            template: '<div in-template></div>',
            link: function (scope, element, attrs, ctrl, transcludeFn) {
              var myScope = scope.$new();
              transcludeFn(myScope, function (transclNode) {
                element.find('[in-template]').append(transclNode);
              });
            }
          };
        }
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-transcluder><div in-transclude></div></div>');
        $compile(el)($rootScope);
        el.find('> [in-template] > [in-transclude]').length.should.eql(1);
      });
    });

    it('can be used as the only transclusion function argument', function () {
      var injector = makeInjectorWithDirective({
        myTranscluder: function () {
          return {
            transclude: true,
            template: '<div in-template></div>',
            link: function (scope, element, attrs, ctrl, transcludeFn) {
              transcludeFn(function (transclNode) {
                element.find('[in-template]').append(transclNode);
              });
            }
          };
        }
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-transcluder><div in-transclude></div></div>');
        $compile(el)($rootScope);
        el.find('> [in-template] > [in-transclude]').length.should.eql(1);
      });
    });

    it('allows passing data to transclusion', function () {
      var injector = makeInjectorWithDirective({
        myTranscluder: function () {
          return {
            transclude: true,
            template: '<div in-template></div>',
            link: function (scope, element, attrs, ctrl, transcludeFn) {
              transcludeFn(function (transclNode, transclScope) {
                transclScope.dataFromTranscluder = 'Hello from transcluder';
                element.find('[in-template]').append(transclNode);
              });
            }
          };
        },
        myOtherDirective: function () {
          return {
            link: function (scope, element) {
              element.html(scope.dataFromTranscluder);
            }
          };
        }
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-transcluder><div my-other-directive><div></div>');
        $compile(el)($rootScope);
        console.log(el.find('> [in-template] > [my-other-directive]'));
        el.find('> [in-template] > [my-other-directive]').html().should.eql('Hello from transcluder');
      });
    });

    it('can be used with multi-element directives', function () {
      var injector = makeInjectorWithDirective({
        myTranscluder: function ($compile) {
          return {
            transclude: true,
            multiElement: true,
            template: '<div in-template></div>',
            link: function (scope, element, attrs, ctrl, transclude) {
              element.find('[in-template]').append(transclude());
            }
          };
        }
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $(
          '<div>' +
          '<div my-transcluder-start><div in-transclude></div></div>' +
          '<div my-transcluder-end></div>' +
          '</div>'
        );
        $compile(el)($rootScope);
        el.find('[my-transcluder-start] [in-template] [in-transclude]').length.should.eql(1);
      });
    });

  });

  describe('element transclusion', function () {

    it('removes the element from the DOM', function () {
      var injector = makeInjectorWithDirective({
        myTranscluder: function () {
          return {
            transclude: 'element'
          };
        }
      });
      injector.invoke(function ($compile) {
        var el = $('<div><div my-transcluder></div></div>');

        $compile(el);

        el.is(':empty').should.be.true();
      });
    });

    it('replaces the with a comment', function () {
      var injector = makeInjectorWithDirective({
        myTranscluder: function () {
          return {
            transclude: 'element'
          };
        }
      });
      injector.invoke(function ($compile) {
        var el = $('<div><div my-transcluder></div></div>');

        $compile(el);

        el.html().should.eql('<!-- myTranscluder:  -->');
      });
    });

    it('includes directive attribute value in comment', function () {
      var injector = makeInjectorWithDirective({
        myTranscluder: function () {
          return {
            transclude: 'element'
          };
        }
      });
      injector.invoke(function ($compile) {
        var el = $('<div><div my-transcluder=42></div></div>');

        $compile(el);

        el.html().should.eql('<!-- myTranscluder: 42 -->');
      });
    });

    it('calls directive compile and link with comment', function () {
      var gotCompileEl, gotLinkedEl;
      var injector = makeInjectorWithDirective({
        myTranscluder: function () {
          return {
            transclude: 'element',
            compile: function (compileEl) {
              gotCompileEl = compileEl;
              return function (scope, linkedEl) {
                gotLinkedEl = linkedEl;
              };
            }
          };
        }
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div><div my-transcluder></div></div>');

        $compile(el)($rootScope);

        gotCompileEl[0].nodeType.should.eql(Node.COMMENT_NODE);
        gotLinkedEl[0].nodeType.should.eql(Node.COMMENT_NODE);
      });
    });

    it('calls lower priority compile with original', function () {
      var gotCompileEl;
      var injector = makeInjectorWithDirective({
        myTranscluder: function () {
          return {
            priority: 2,
            transclude: 'element'
          };
        },
        myOtherDirective: function () {
          return {
            priority: 1,
            compile: function (compiledEl) {
              gotCompileEl = compiledEl;
            }
          };
        }
      });
      injector.invoke(function ($compile) {
        var el = $('<div><div my-transcluder my-other-directive></div></div>');

        $compile(el);

        gotCompileEl[0].nodeType.should.eql(Node.ELEMENT_NODE);
      });

    });

    it('calls compile on child element direcitves', function () {
      var compileSpy = sinon.spy();
      var injector = makeInjectorWithDirective({
        myTranscluder: function () {
          return {
            transclude: 'element'
          };
        },
        myOtherDirective: function () {
          return {
            compile: compileSpy
          };
        }
      });
      injector.invoke(function ($compile) {
        var el = $('<div><div my-transcluder><div my-other-directive></div></div></div>');

        $compile(el);
        compileSpy.called.should.be.true();
      });
    });

    it('compiles orignal element contents once', function () {
      var compileSpy = sinon.spy();
      var injector = makeInjectorWithDirective({
        myTranscluder: function () {
          return {
            transclude: 'element'
          };
        },
        myOtherDirective: function () {
          return {
            compile: compileSpy
          };
        }
      });
      injector.invoke(function ($compile) {
        var el = $('<div><div my-transcluder><div my-other-directive></div></div></div>');

        $compile(el);

        compileSpy.callCount.should.eql(1);
      });
    });

    it('makes orignal element available for transclusion', function () {
      var injector = makeInjectorWithDirective({
        myDouble: function () {
          return {
            transclude: 'element',
            link: function (scope, el, attrs, ctrl, transclude) {
              transclude(function (clone) {
                el.after(clone);
              });
              transclude(function (clone) {
                el.after(clone);
              });
            }
          };
        }
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div><div my-double>Hello</div></div>');
        $compile(el)($rootScope);
        el.find('[my-double]').length.should.eql(2);
      });
    });
    
    it('sets directive attributes element to comment', function () {
      var injector = makeInjectorWithDirective({
        myTranscluder: function () {
          return {
            transclude: 'element',
            link: function (scoe, element, attrs, ctrl, transclude) {
              attrs.$set('testing', '42');
              element.after(transclude());
            }
          };
        }
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div><div my-transcluder></div></div>');
        
        $compile(el)($rootScope);
        should(el.find('[my-transcluder]').attr('testing')).be.undefined();
      });
    });
    
    it('supports requiring controllers', function () {
      var MyController = function() {};
      var gotCtrl;
      var injector = makeInjectorWithDirective({
        myCtrlDirective: function () {
          return {controller: MyController};
        },
        myTranscluder: function () {
          return {
            transclude: 'element',
            link: function (scope, el, attrs, ctrl, transclude) {
              console.log('vv', el);
              el.after(transclude());
            }
          };
        },
        myOtherDirective: function () {
          return {
            require: '^myCtrlDirective',
            link: function (scope, el, attrs, ctrl, transclude) {
              console.log('GG', el, attrs);
              gotCtrl = ctrl;
            }
          };
        }
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $(
          '<div><div my-ctrl-directive my-transcluder><div my-other-directive></div></div></div>'
        );
        $compile(el)($rootScope);
        gotCtrl.should.be.Object();
        gotCtrl.should.be.instanceOf(MyController);
      });
    });

  });

  describe('interpolation', function () {
    
    it('is done for text nodes', function () {
      var injector = makeInjectorWithDirective({});
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div>My expression: {{myExpr}}</div>');
        $compile(el)($rootScope);
        
        $rootScope.$apply();
        el.html().should.eql('My expression: ');

        $rootScope.myExpr = 'Hello';
        $rootScope.$apply();
        el.html().should.eql('My expression: Hello');
      });
    });

    it('adds binding class to text node parents', function () {
      
      var injector = makeInjectorWithDirective({});
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div>My expression: {{myExpr}}</div>');
        $compile(el)($rootScope);
        el.hasClass('ng-binding').should.be.true();
      });

    });

    it('adds binding data to text node parents', function () {
      var injector = makeInjectorWithDirective({});
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div>{{myExpr}} and {{myOtherExpr}}</div>');
        $compile(el)($rootScope);

        el.data('$binding').should.eql(['myExpr', 'myOtherExpr']);
      });
    });

    it('adds binding data to parent from multiple text nodes', function () {
      var injector = makeInjectorWithDirective({});
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div>{{myExpr}} <span>and</span> {{myOtherExpr}}<div>');
        $compile(el)($rootScope);
        el.data('$binding').should.eql(['myExpr', 'myOtherExpr']);
      });
    });
    
    it('is done for attributes', function () {
      var injector = makeInjectorWithDirective({});
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<img alt="{{myAltText}}">');
        $compile(el)($rootScope);
        
        $rootScope.$apply();
        el.attr('alt').should.eql('');

        $rootScope.myAltText = 'My favourite photo';
        $rootScope.$apply();
        el.attr('alt').should.eql('My favourite photo');
      });
    });

    it('fires observers on attribute expression changes', function () {
      var observerSpy = sinon.spy();
      var injector = makeInjectorWithDirective({
        myDirective: function () {
          return {
            link: function (scope, element, attrs) {
              attrs.$observe('alt', observerSpy);
            }
          };
        }
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<img alt="{{myAltText}}" my-directive>');
        $compile(el)($rootScope);

        $rootScope.myAltText = 'My favourite photo';
        $rootScope.$apply();
        observerSpy.args[observerSpy.args.length - 1][0].should.eql('My favourite photo');
        
      });
    });

    it('fires observers just once upon registration', function () {
      var observerSpy = sinon.spy();
      var injector = makeInjectorWithDirective({
        myDirective: function () {
          return {
            link: function (scope, element, attrs) {
              attrs.$observe('alt', observerSpy);
            }
          };
        }
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<img alt="{{myAltText}}" my-directive>');
        $compile(el)($rootScope);
        $rootScope.$apply();
        observerSpy.callCount.should.eql(1);
      });
    });

    it('is done for attributes by the time other directive is linked', function () {
      var gotMyAttr;
      var injector = makeInjectorWithDirective({
        myDirective: function () {
          return {
            link: function (scope, element, attrs) {
              gotMyAttr = attrs.myAttr;  
            }
          };
        }
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive my-attr="{{myExpr}}"></div>');
        $rootScope.myExpr = 'Hello';
        $compile(el)($rootScope);

        gotMyAttr.should.eql('Hello');
      });
    });

    it('is done for attributes by the time bound to iso scope', function () {
      var gotMyAttr;
      var injector = makeInjectorWithDirective({
        myDirective: function () {
          return {
            scope: {myAttr: '@'},
            link: function (scope, element, attrs) {
              console.log('xagxddd');
              gotMyAttr = scope.myAttr;
            }
          };
        }
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive my-attr="{{myExpr}}"></div>');
        $rootScope.myExpr = 'Hello';
        $compile(el)($rootScope);
        gotMyAttr.should.eql('Hello');
      });
    });

    it('is done for attributes so that compile-time changes apply', function () {
      var injector = makeInjectorWithDirective({
        myDirective: function () {
          return {
            compile: function (element, attrs) {
              attrs.$set('myAttr', '{{myDifferentExpr}}');
            }
          };
        }
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive my-attr="{{myExpr}}"></div>');
        $rootScope.myExpr= 'Hello';
        $rootScope.myDifferentExpr = 'Other Hello';
        $compile(el)($rootScope);
        $rootScope.$apply();

        el.attr('my-attr').should.eql('Other Hello');
      });
    });

    it('is done for attributes so that compile-time removals apply', function () {
      var injector = makeInjectorWithDirective({
        myDirective: function () {
          return {
            compile: function (element, attrs) {
              attrs.$set('myAttr', null);
            }
          };
        }
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive my-attr="{{myExpr}}"></div>');
        $rootScope.myExpr= 'Hello';
        $rootScope.myDifferentExpr = 'Other Hello';
        $compile(el)($rootScope);
        $rootScope.$apply();

        should(el.attr('my-attr')).be.undefined();
      });     
    });

    it('cannot be done for event handler attributes', function () {
      var injector = makeInjectorWithDirective({});
      injector.invoke(function ($compile, $rootScope) {
        $rootScope.myFunction = function() {};
        var el = $('<button onclick="{{myFunction()}}"></button>');
        (function() {
          $compile(el)($rootScope);
        }).should.throw();
      });
    });

    
    it('denormalizes directive templates', function () {
      var injector = createInjector(['ng', function ($interpolateProvider, $compileProvider) {
        $interpolateProvider.startSymbol('[[').endSymbol(']]');
        $compileProvider.directive('myDirective', function () {
          return {
            template: 'Value is {{myExpr}}'
          };
        });
      }]);
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive></div>');
        $rootScope.myExpr = 42;
        $compile(el)($rootScope);
        $rootScope.$apply();

        el.html().should.eql('Value is 42');
      });
    });

  });

});
