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
  }])
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
          }
        });
        injector.invoke(function ($compile) {
          var el = $('<' + prefix + delim + 'my-dir></' + prefix + delim + 'my-dir>')
          $compile(el);
          el.data('hasCompiled').should.be.true();
        })
      });
    })
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
    })
  });

  it('compiles attribute directives with ng-attr prefix', function () {
    var injector = makeInjectorWithDirective('myDirective', function () {
      return {
        restrict: 'EACM',
        compile: function (element) {
          element.data('hasCompiled',true);
        }
      }
    });
    injector.invoke(function ($compile) {
      var el = $('<div ng-attr-my-directive></div>')
      $compile(el);
      el.data('hasCompiled').should.be.true();
    })
  });

  it('compiles attribute directives with data:ng-attr prefix', function () {
    var injector = makeInjectorWithDirective('myDirective', function () {
      return {
        restrict: 'EACM',
        compile: function (element) {
          element.data('hasCompiled',true);
        }
      }
    });
    injector.invoke(function ($compile) {
      var el = $('<div data:ng-attr-my-directive></div>')
      $compile(el);
      el.data('hasCompiled').should.be.true();
    })
  });

  it('compiles class directives', function () {
    var injector = makeInjectorWithDirective('myDirective', function () {
      return {
        restrict: 'EACM',
        compile: function (element) {
          element.data('hasCompiled',true);
        }
      }
    });
    injector.invoke(function ($compile) {
      var el = $('<div class="my-directive"></div>')
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
    })
  });

  it('compiles class directives with prefixes', function () {
    var injector = makeInjectorWithDirective('myDirective', function () {
      return {
        restrict: 'EACM',
        compile: function (element) {
          element.data('hasCompiled',true);
        }
      }
    });
    injector.invoke(function ($compile) {
      var el = $('<div class="x-my-directive"></div>')
      $compile(el);
      el.data('hasCompiled').should.be.true();
    })
  });

  it('compiles comment directives', function () {
    var hasCompiled;
    var injector = makeInjectorWithDirective('myDirective', function () {
      return {
        restrict: 'EACM',
        compile: function (element) {
          hasCompiled = true;
        }
      }
    });
    injector.invoke(function ($compile) {
      var el = $('<!-- directive: my-directive -->')
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
            }
          });
          injector.invoke(function ($compile) {
            var el = $(dom);
            $compile(el);
            should(hasCompiled).be.exactly(expected[type]);
          })
        });
      })
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
        }
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
    })
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
          attrs.myAttr.should.eql('val')
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
          }
        }
      });
      injector.invoke(function ($compile) {
        var el = $('<div my-dir my-other-dir></div>');
        $compile(el);
        attrs1.should.be.exactly(attrs2);
      })
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
      )
    });

    it('allows removing classes', function () {
      registerAndCompile(
        'myDirective',
        '<my-directive class="some-class"></my-directive>',
        function (element, attrs) {
          attrs.$removeClass('some-class');
          element.hasClass('some-class').should.be.false();
        }
      )
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
        }
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
      })
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
        }
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
        }
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
        }
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
          }
        }
      });
      injector.invoke(function ($compile, $rootScope) {
        var el = $('<div my-directive my-other-directive></div>')
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
          }
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
      })
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
        }
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

    })

  });

});
