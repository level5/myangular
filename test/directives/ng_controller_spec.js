'use strict';

var sinon = require('sinon');
var _ = require('lodash');
var $ = require('jquery');

var publishExternalAPI = require('../../src/angular_public');
var createInjector = require('../../src/injector');

describe('ngController', function () {


  beforeEach(function () {
    delete window.angular;
    publishExternalAPI();
  });

  it('is instantiated during compilation & link', function () {
    var instantiated;
    function MyController() {
      instantiated = true;
    }
    var injector = createInjector(['ng', function ($controllerProvider) {
      $controllerProvider.register('MyController', MyController);
    }]);

    injector.invoke(function ($compile, $rootScope) {
      var el = $('<div ng-controller="MyController"></div>');
      $compile(el)($rootScope);
      instantiated.should.be.true();
    });
  });

  it('may inject scope, element, and attrs', function () {
    var gotScope, gotElement, gotAttrs;
    function MyController($scope, $element, $attrs) {
      gotScope = $scope;
      gotElement = $element;
      gotAttrs = $attrs;
    }
    var injector = createInjector(['ng', function ($controllerProvider) {
      $controllerProvider.register('MyController', MyController);
    }]);

    injector.invoke(function ($compile, $rootScope) {
      var el = $('<div ng-controller="MyController"></div>');
      $compile(el)($rootScope);
      gotScope.should.be.Object();
      gotElement.should.be.Object();
      gotAttrs.should.be.Object();
    });
  });

  it('has an inherited scope', function () {
    var gotScope;
    function MyController($scope, $element, $attrs) {
      gotScope = $scope;
    }
    var injector = createInjector(['ng', function ($controllerProvider) {
      $controllerProvider.register('MyController', MyController);
    }]);
    injector.invoke(function ($compile, $rootScope) {
      var el = $('<div ng-controller="MyController"></div>');
      $compile(el)($rootScope);
      gotScope.should.not.be.exactly($rootScope);
      gotScope.$parent.should.be.exactly($rootScope);
      Object.getPrototypeOf(gotScope).should.be.exactly($rootScope);
    });
  });

  it('allows aliasing controller in expression', function () {
    var gotScope;
    function MyController($scope) {
      gotScope = $scope;
    }
    var injector = createInjector(['ng', function ($controllerProvider) {
      $controllerProvider.register('MyController', MyController);
    }]);
    injector.invoke(function ($compile, $rootScope) {
      var el = $('<div ng-controller="MyController as myCtrl"></div>');
      $compile(el)($rootScope);
      gotScope.myCtrl.should.be.Object();
      gotScope.myCtrl.should.be.instanceOf(MyController);
    });
  });

  it('allows looking up controller from surrounding scope', function () {
    var gotScope;
    function MyController($scope) {
      gotScope = $scope;
    }
    var injector = createInjector(['ng']);
    injector.invoke(function ($compile, $rootScope) {
      var el = $('<div ng-controller="MyCtrlOnScope as myCtrl"></div>');
      $rootScope.MyCtrlOnScope = MyController;
      $compile(el)($rootScope);
      gotScope.myCtrl.should.be.Object();
      gotScope.myCtrl.should.be.instanceOf(MyController);
    });
  });

});
