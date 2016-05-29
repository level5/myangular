'use strict';

var sinon = require('sinon');
var _ = require('lodash');

var publishExternalAPI = require('../src/angular_public');
var createInjector = require('../src/injector');

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

});
