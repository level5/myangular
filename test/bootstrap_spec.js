'use strict';

var sinon = require('sinon');
var $ = require('jquery');

var publishExternalAPI = require('../src/angular_public');
var createInjector = require('../src/injector');

describe('bootstrap', function () {
  

  describe('manual', function () {
    
    it('is available', function () {
      window.angular.bootstrap.should.not.be.undefined();
    });

    it('creates and returns an injector', function () {
      var element = $('<div></div>');
      var injector = window.angular.bootstrap(element);

      injector.should.not.be.undefined();
      injector.invoke.should.be.Function();
    });

    it('attaches the injector to the bootstrapped element', function () {
      var element = $('<div></div>');
      var injector = window.angular.bootstrap(element);

      element.data('$injector').should.equal(injector);
    });

    it('loads built-ins into the injector', function () {
      var element = $('<div></div>');
      var injector = window.angular.bootstrap(element);

      injector.has('$compile').should.be.true();
      injector.has('$rootScope').should.be.true();

    });

    it('loads other specified modules into the injector', function () {
      var element = $('<div></div>');

      window.angular.module('myModule', []).constant('aValue', 42);
      window.angular.module('mySecondModule', []).constant('mySecondValue', 43);

      window.angular.bootstrap(element, ['myModule', 'mySecondModule']);

      var injector = element.data('$injector');
      injector.get('aValue').should.eql(42);
      injector.get('mySecondValue').should.eql(43);
    });

    it('makes root element available for injection', function () {
      var element = $('<div></div>');

      window.angular.bootstrap(element);

      var injector = element.data('$injector');
      injector.has('$rootElement').should.be.true();
      injector.get('$rootElement')[0].should.equal(element[0]);
    });

    it('compiles the element', function () {
      var element = $('<div><div my-directive></div></div>');
      var compileSpy = sinon.spy();

      window.angular.module('myModule', [])
        .directive('myDirective', function () {
          return {compile: compileSpy};
        });
      window.angular.bootstrap(element, ['myModule']);

      compileSpy.called.should.be.true();
    });

    it('links the element', function () {
      var element = $('<div><div my-directive></div></div>');
      var linkSpy = sinon.spy();
      window.angular.module('myModule', [])
        .directive('myDirective', function () {
          return {link: linkSpy};
        });
      
      window.angular.bootstrap(element, ['myModule']);
      linkSpy.called.should.be.true();
    });

    it('runs a digest', function () {
      var element = $('<div><div my-directive>{{expr}}</div></div>');
      window.angular.module('myModule', [])
        .directive('myDirective', function () {
          return {
            link: function (scope) {
              scope.expr = '42';
            }
          };
        });
      window.angular.bootstrap(element, ['myModule']);
      element.find('div').text().should.eql('42');
    });

    it('supports enabling strictDi mode', function () {
      var element = $('<div><div my-directive></div></div>');

      window.angular.module('myModule', [])
        .constant('aValue', 42)
        .directive('myDirective', function (aValue) {
          return {};
        });

      (function () {
        window.angular.bootstrap(element, ['myModule'], {strictDi: true});
      }).should.throw();
    });

  });

});
