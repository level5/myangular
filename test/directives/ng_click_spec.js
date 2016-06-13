'use strict';

var sinon = require('sinon');
var $ = require('jquery');

var publishExternalAPI = require('../../src/angular_public');
var createInjector = require('../../src/injector');

describe('ngClick', function () {
  
  var $compile, $rootScope;

  beforeEach(function () {
    delete window.angular;
    publishExternalAPI();

    var injector = createInjector(['ng']);
    $compile = injector.get('$compile');
    $rootScope = injector.get('$rootScope');    
  });

  it('starts a digest on click', function () {
    var watchSpy = sinon.spy();
    $rootScope.$watch(watchSpy);

    var button = $('<button ng-click="doSomething()"></button>');
    $compile(button)($rootScope);

    button.click();
    watchSpy.called.should.be.true();
  });

  it('evaluates given expression on click', function () {
    $rootScope.doSomething = sinon.spy();
    var button = $('<button ng-click="doSomething()"></button>');
    $compile(button)($rootScope);

    button.click();
    $rootScope.doSomething.called.should.be.true();
  });

  it('passes $event to expression', function () {
    $rootScope.doSomething = sinon.spy();
    var button = $('<button ng-click="doSomething($event)"></button>');
    
    $compile(button)($rootScope);

    button.click();
    var evt = $rootScope.doSomething.args[0][0];
    evt.should.not.be.undefined();
    evt.type.should.eql('click');
    evt.target.should.not.be.undefined();
  });

});
