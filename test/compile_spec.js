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
          compile: function (element) {
            element.data('hasCompiled', true);
          }
        };
      },
      mySecondDirective: function () {
        return {
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
          compile: function (element) {
            element.data('hasCompiled', true);
          }
        };
      },
      mySecondDirective: function () {
        return {
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
        compile: function (element) {
          element.data('hasCompiled',true);
        }
      }
    });
    injector.invoke(function ($compile) {
      var el = $('<div class="my-drective"></div>')
      $compile(el);
      el.data('hasCompiled').should.be.true();
    });
  });

  it('compiles several class directives in an element', function () {
    var injector = makeInjectorWithDirective({
      myDirective: function() {
        return {
          compile: function (element) {
            element.data('hasCompiled', true);
          }
        };
      },
      mySecondDirective: function () {
        return {
          compile: function(element) {
            element.data('secondCompiled', true);
          }
        };
      }
    });
    injector.invoke(function ($compile) {
      var el = $('<div class="my-drective my-second-directive"></div>');
      $compile(el);
      el.data('hasCompiled').should.be.true();
      el.data('secondCompiled').should.be.true();
    })
  });

  it('compiles class directives with prefixes', function () {
    var injector = makeInjectorWithDirective('myDirective', function () {
      return {
        compile: function (element) {
          element.data('hasCompiled',true);
        }
      }
    });
    injector.invoke(function ($compile) {
      var el = $('<div class="x-my-drective"></div>')
      $compile(el);
      el.data('hasCompiled').should.be.true();
    })
  });

});
